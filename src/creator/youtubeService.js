/**
 * CreatorIQ — YouTube Frontend Data Service
 * -----------------------------------------
 * Client-side interface to official YouTube OAuth 2.0 & Analytics endpoints.
 * Never stores tokens or sensitive credentials on the client.
 */

const listeners = new Set();

function notifyListeners(data) {
  listeners.forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.warn('[YouTubeService] Listener error:', e);
    }
  });
}

/**
 * Subscribe to YouTube connection changes across the app
 */
export function onYouTubeConnectionChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Resolves Firebase Auth ID token or safe local token
 */
async function getAuthHeader(user) {
  if (!user) return null;
  try {
    if (typeof user.getIdToken === 'function') {
      const token = await user.getIdToken();
      return `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('[YouTubeService] getIdToken note:', err.message);
  }

  // Fallback demo token for demo creator accounts
  const uid = user.uid || 'usr_creator_demo';
  return `Bearer demo_token_${uid}`;
}

/**
 * Retrieves the current YouTube channel connection status for this creator
 */
export async function getYouTubeChannelStatus(user) {
  if (!user) return { connected: false, configured: false };
  const authHeader = await getAuthHeader(user);

  try {
    const res = await fetch('/api/youtube/channel', {
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    if (!res.ok) {
      return { connected: false, configured: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[YouTubeService] Fetch channel status network error:', err);
    return { connected: false, configured: false, error: err.message };
  }
}

/**
 * Initiates Google OAuth 2.0 flow for YouTube channel connection
 */
export async function initiateYouTubeConnection(user) {
  if (!user) {
    return { success: false, error: 'USER_NOT_LOGGED_IN', message: 'You must be logged in to connect YouTube.' };
  }

  const authHeader = await getAuthHeader(user);
  const uid = user.uid || 'usr_creator_demo';

  try {
    const res = await fetch(`/api/auth/youtube?json=true&uid=${encodeURIComponent(uid)}`, {
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    const data = await res.json();

    if (!data.configured) {
      return {
        success: false,
        configured: false,
        error: 'CONFIG_REQUIRED',
        message: data.message || 'Google OAuth credentials are not configured.',
        setupGuideUrl: data.setupGuideUrl || '/YOUTUBE_INTEGRATION_SETUP.md',
      };
    }

    if (!data.authUrl) {
      return { success: false, error: 'NO_AUTH_URL', message: 'Failed to generate Google OAuth URL.' };
    }

    // Launch Google OAuth Consent in a popup window
    return new Promise((resolve) => {
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.authUrl,
        'CreatorIQ_YouTube_Auth',
        `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0`
      );

      let resolved = false;

      // Handle message from popup completion
      const handleMessage = (event) => {
        if (event.data?.type === 'CREATORIQ_YOUTUBE_OAUTH') {
          window.removeEventListener('message', handleMessage);
          clearInterval(pollTimer);
          resolved = true;
          notifyListeners({ connected: event.data.success, channel: event.data.channel });
          resolve({
            success: event.data.success,
            channel: event.data.channel,
            message: event.data.message,
          });
        }
      };

      window.addEventListener('message', handleMessage);

      // Poll popup closure as fallback
      const pollTimer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', handleMessage);
          if (!resolved) {
            resolved = true;
            // Check status if popup closed
            const status = await getYouTubeChannelStatus(user);
            notifyListeners(status);
            resolve({
              success: Boolean(status.connected),
              channel: status.channel,
              message: status.connected ? 'YouTube connected successfully!' : 'Connection window closed.',
            });
          }
        }
      }, 1000);
    });
  } catch (err) {
    return { success: false, error: 'NETWORK_ERROR', message: err.message };
  }
}

/**
 * Fetches real analytics and top videos for connected YouTube channel
 */
export async function getYouTubeAnalytics(user, range = '28d') {
  if (!user) return { connected: false };
  const authHeader = await getAuthHeader(user);

  try {
    const res = await fetch(`/api/youtube/analytics?range=${range}`, {
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    if (!res.ok) {
      return { connected: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[YouTubeService] Analytics fetch network error:', err);
    return { connected: false, error: err.message };
  }
}

/**
 * Fetches daily performance trajectory and metrics for an individual video
 */
export async function getVideoTrendAnalytics(user, videoId, range = '28d') {
  if (!user || !videoId) {
    return { success: false, error: 'MISSING_PARAMS', message: 'User and videoId are required.' };
  }
  const authHeader = await getAuthHeader(user);

  try {
    const res = await fetch(
      `/api/youtube/video-trends?videoId=${encodeURIComponent(videoId)}&range=${encodeURIComponent(range)}`,
      {
        headers: authHeader ? { Authorization: authHeader } : {},
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.error || `HTTP ${res.status}`, message: errJson.message };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[YouTubeService] Video trend fetch network error:', err);
    return { success: false, error: 'NETWORK_ERROR', message: err.message };
  }
}

/**
 * Forces re-sync of YouTube channel and analytics from Google APIs
 */
export async function refreshYouTubeChannel(user, range = '28d') {
  if (!user) return { success: false };
  const authHeader = await getAuthHeader(user);

  try {
    const res = await fetch(`/api/youtube/refresh?range=${encodeURIComponent(range)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    notifyListeners({ connected: true, channel: data.channel });
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Disconnects YouTube channel, revokes Google OAuth tokens, and wipes credentials
 */
export async function disconnectYouTubeChannel(user) {
  if (!user) return { success: false };
  const authHeader = await getAuthHeader(user);

  try {
    const res = await fetch('/api/youtube/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    const data = await res.json();
    notifyListeners({ connected: false, channel: null });
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}
