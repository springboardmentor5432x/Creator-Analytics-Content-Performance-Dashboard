/**
 * CreatorIQ — Firebase Cloud Functions for YouTube Social Integration
 * -------------------------------------------------------------------
 * Production serverless endpoints for Google OAuth and YouTube Analytics.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// YouTube OAuth Configurations from Firebase Environment Config
function getConfig() {
  const cfg = functions.config().youtube || {};
  return {
    clientId: cfg.client_id || process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: cfg.client_secret || process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: cfg.redirect_uri || process.env.YOUTUBE_REDIRECT_URI || '',
  };
}

/**
 * 1. GET /api/auth/youtube
 */
exports.youtubeAuthStart = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).send('');

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }

  const config = getConfig();
  if (!config.clientId || !config.clientSecret) {
    return res.status(200).json({
      configured: false,
      message: 'YouTube OAuth credentials not configured in Cloud Functions.',
    });
  }

  const state = crypto.randomBytes(24).toString('hex');
  await db.collection('oauth_states').doc(state).set({
    uid: decoded.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ];

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&access_type=offline&prompt=consent&state=${state}`;

  return res.json({ success: true, authUrl });
});

/**
 * 2. GET /api/auth/youtube/callback
 */
exports.youtubeAuthCallback = functions.https.onRequest(async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    return res.status(400).send(`YouTube authorization cancelled: ${error}`);
  }

  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }

  const stateDoc = await db.collection('oauth_states').doc(state).get();
  if (!stateDoc.exists) {
    return res.status(400).send('Invalid or expired state');
  }
  const uid = stateDoc.data().uid;
  await db.collection('oauth_states').doc(state).delete();

  const config = getConfig();

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(400).json(tokenData);
    }

    // Fetch Channel from YouTube Data API v3
    const chRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const chData = await chRes.json();
    const chItem = chData.items?.[0];

    if (!chItem) {
      return res.status(404).send('No YouTube channel found for this Google Account.');
    }

    // Store private tokens in restricted server collection
    await db.collection('youtube_credentials').doc(uid).set({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
      channelId: chItem.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Store public channel info in user record or analytics
    await db.collection('youtube_analytics').doc(uid).set({
      channelId: chItem.id,
      title: chItem.snippet.title,
      customUrl: chItem.snippet.customUrl || `@${chItem.snippet.title}`,
      thumbnail: chItem.snippet.thumbnails?.high?.url || chItem.snippet.thumbnails?.default?.url,
      subscriberCount: parseInt(chItem.statistics.subscriberCount, 10) || 0,
      videoCount: parseInt(chItem.statistics.videoCount, 10) || 0,
      viewCount: parseInt(chItem.statistics.viewCount, 10) || 0,
      status: 'connected',
      lastSynced: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.redirect('/?tab=analytics&youtube_connected=true');
  } catch (err) {
    return res.status(500).send(`Server Error: ${err.message}`);
  }
});

/**
 * 3. GET /api/youtube/channel
 */
exports.youtubeChannel = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).send('');

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1].trim());
    const snap = await db.collection('youtube_analytics').doc(decoded.uid).get();
    if (!snap.exists) {
      return res.json({ connected: false });
    }
    const data = snap.data();
    return res.json({ connected: data.status === 'connected', channel: data });
  } catch (e) {
    return res.status(401).json({ error: e.message });
  }
});

/**
 * 4. POST /api/youtube/disconnect
 */
exports.youtubeDisconnect = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).send('');

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1].trim());
    const credDoc = await db.collection('youtube_credentials').doc(decoded.uid).get();

    if (credDoc.exists) {
      const { refresh_token, access_token } = credDoc.data();
      const token = refresh_token || access_token;
      if (token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).catch(() => {});
      }
      await db.collection('youtube_credentials').doc(decoded.uid).delete();
    }

    await db.collection('youtube_analytics').doc(decoded.uid).delete();

    return res.json({ success: true, message: 'YouTube disconnected' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});
