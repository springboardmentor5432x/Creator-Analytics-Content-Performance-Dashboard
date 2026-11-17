const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'creatoriq-local-dev-secret';
const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || '';
const frontendDir = path.join(__dirname, '..', 'frontend');
const dataDir = path.resolve(process.env.CREATORIQ_DATA_DIR || path.join(__dirname, 'data'));
const usersFile = path.join(dataDir, 'users.json');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
  }
}

function readUsers() {
  ensureDataFile();

  try {
    const raw = fs.readFileSync(usersFile, 'utf8');
    const users = JSON.parse(raw);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    return [];
  }
}

function writeUsers(users) {
  ensureDataFile();
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function matchesAdminSetupKey(candidate) {
  const expected = Buffer.from(ADMIN_SETUP_KEY);
  const provided = Buffer.from(String(candidate || ''));
  return expected.length > 0 && expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: Number(user.tokenVersion || 0)
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function createDemoUser() {
  const users = readUsers();

  if (users.some((user) => user.email === 'sample@example.com')) {
    return;
  }

  const demoUser = {
    id: 'demo-user',
    name: 'Sai Creator',
    email: 'sample@example.com',
    role: 'creator',
    passwordHash: bcrypt.hashSync('Password123!', 10),
    createdAt: new Date().toISOString()
  };

  users.push(demoUser);
  writeUsers(users);
}

function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return readUsers().find((user) => user.email.toLowerCase() === normalized);
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const users = readUsers();
    const user = users.find((entry) => entry.id === payload.id || entry.email === payload.email);

    if (!user) {
      return res.status(401).json({ message: 'Session is invalid or expired.' });
    }

    if (Number(payload.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Session is invalid or expired.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Your session is invalid or expired.' });
  }
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CreatorIQ API' });
});

app.post('/api/auth/signup', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = String(req.body.role || '').trim().toLowerCase();

  if (!name || name.length < 2) {
    return res.status(400).json({ message: 'Please enter a valid full name.' });
  }

  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  if (!strongPasswordPattern.test(password)) {
    return res.status(400).json({
      message: 'Use at least 8 characters with uppercase, lowercase, a number, and a special character.'
    });
  }

  if (!['creator', 'agency', 'marketing'].includes(role)) {
    return res.status(400).json({ message: 'Please select a valid workspace role.' });
  }

  const users = readUsers();

  if (users.some((user) => user.email.toLowerCase() === email)) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    email,
    role,
    passwordHash: hashedPassword,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsers(users);

  return res.status(201).json({
    message: 'Account created successfully. Please sign in to continue.',
    user: sanitizeUser(newUser)
  });
});

app.post('/api/auth/bootstrap-admin', async (req, res) => {
  if (!ADMIN_SETUP_KEY) {
    return res.status(404).json({ message: 'Administrator setup is not enabled.' });
  }

  if (!matchesAdminSetupKey(req.get('x-admin-setup-key'))) {
    return res.status(403).json({ message: 'Administrator setup key is invalid.' });
  }

  const users = readUsers();
  if (users.some((user) => user.role === 'administrator')) {
    return res.status(409).json({ message: 'An administrator account has already been provisioned.' });
  }

  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || name.length < 2) {
    return res.status(400).json({ message: 'Please enter a valid full name.' });
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  if (!strongPasswordPattern.test(password)) {
    return res.status(400).json({
      message: 'Use at least 8 characters with uppercase, lowercase, a number, and a special character.'
    });
  }
  if (users.some((user) => user.email.toLowerCase() === email)) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  const latestUsers = readUsers();
  if (latestUsers.some((user) => user.role === 'administrator')) {
    return res.status(409).json({ message: 'An administrator account has already been provisioned.' });
  }
  if (latestUsers.some((user) => user.email.toLowerCase() === email)) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  const admin = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    email,
    role: 'administrator',
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString()
  };
  latestUsers.push(admin);
  writeUsers(latestUsers);

  return res.status(201).json({
    message: 'Administrator account created. Sign in to continue.',
    user: sanitizeUser(admin)
  });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const user = findUserByEmail(email);

  if (!user) {
    return res.status(401).json({ message: 'No account was found for that email.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Incorrect password.' });
  }

  const token = createToken(user);

  return res.json({
    message: 'Login successful.',
    token,
    user: sanitizeUser(user)
  });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const users = readUsers();
  const userIndex = users.findIndex((user) => user.id === req.user.id);

  if (userIndex === -1) {
    return res.status(401).json({ message: 'Session is invalid or expired.' });
  }

  users[userIndex].tokenVersion = Number(users[userIndex].tokenVersion || 0) + 1;
  writeUsers(users);

  return res.json({ message: 'Logout successful.' });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  return res.json({
    message: 'If an account exists for that email, a reset link has been queued. This prototype does not send emails.'
  });
});

app.get('/api/profile/me', requireAuth, (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
});

app.get('/api/admin/overview', requireAuth, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ message: 'Administrator access required.' });
  }

  const users = readUsers();
  const roleCounts = users.reduce((counts, user) => {
    const role = String(user.role || 'unknown');
    counts[role] = (counts[role] || 0) + 1;
    return counts;
  }, {});

  return res.json({
    totalAccounts: users.length,
    roleCounts,
    users: users.map(sanitizeUser)
  });
});

app.post('/api/admin/users', requireAuth, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ message: 'Administrator access required.' });
  }

  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!name || name.length < 2) {
    return res.status(400).json({ message: 'Please enter a valid full name.' });
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  if (!strongPasswordPattern.test(password)) {
    return res.status(400).json({
      message: 'Use at least 8 characters with uppercase, lowercase, a number, and a special character.'
    });
  }

  const users = readUsers();
  if (users.some((user) => user.email.toLowerCase() === email)) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  const admin = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    email,
    role: 'administrator',
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString()
  };
  users.push(admin);
  writeUsers(users);

  return res.status(201).json({ message: 'Administrator account created.', user: sanitizeUser(admin) });
});

app.put('/api/profile/me', requireAuth, async (req, res) => {
  const users = readUsers();
  const targetIndex = users.findIndex((entry) => entry.id === req.user.id);

  if (targetIndex === -1) {
    return res.status(404).json({ message: 'Profile not found.' });
  }

  const targetUser = users[targetIndex];
  const nextName = typeof req.body.name === 'string' ? req.body.name.trim() : targetUser.name;
  const nextEmail = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : targetUser.email;
  const nextRole = typeof req.body.role === 'string' ? req.body.role.trim().toLowerCase() : targetUser.role;
  const nextPassword = typeof req.body.password === 'string' ? req.body.password : null;

  if (!nextName || nextName.length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters long.' });
  }

  if (!emailPattern.test(nextEmail)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  if (targetUser.role === 'administrator' && nextRole !== 'administrator') {
    return res.status(403).json({ message: 'Administrator access cannot be changed from a profile.' });
  }
  if (targetUser.role !== 'administrator' && !['creator', 'agency', 'marketing'].includes(nextRole)) {
    return res.status(400).json({ message: 'Please select a valid workspace role.' });
  }

  if (nextEmail !== targetUser.email && users.some((entry) => entry.email.toLowerCase() === nextEmail && entry.id !== targetUser.id)) {
    return res.status(409).json({ message: 'That email is already associated with another account.' });
  }

  if (nextPassword) {
    if (!strongPasswordPattern.test(nextPassword)) {
      return res.status(400).json({
        message: 'Use at least 8 characters with uppercase, lowercase, a number, and a special character.'
      });
    }

    targetUser.passwordHash = await bcrypt.hash(nextPassword, 10);
  }

  targetUser.name = nextName;
  targetUser.email = nextEmail;
  targetUser.role = nextRole;

  users[targetIndex] = targetUser;
  writeUsers(users);

  return res.json({
    message: 'Profile updated successfully.',
    user: sanitizeUser(targetUser)
  });
});

app.get('/frontend/index.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.get('/frontend/signup.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'signup.html'));
});

app.get('/frontend/forgot-password.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'forgot-password.html'));
});

app.get('/frontend/profile.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'profile.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'dashboard.html'));
});

app.get('/home.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'home.html'));
});

app.get('/analyzer.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'analyzer.html'));
});

app.use(express.static(frontendDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'signup.html'));
});

app.get('/forgot-password.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'forgot-password.html'));
});

app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'profile.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(frontendDir, 'dashboard.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(frontendDir, 'home.html'));
});

app.get('/analyzer', (req, res) => {
  res.sendFile(path.join(frontendDir, 'analyzer.html'));
});

function startServer() {
  ensureDataFile();
  createDemoUser();

  return app.listen(PORT, () => {
    console.log(`CreatorIQ server running at http://localhost:${PORT}`);
  });
}

ensureDataFile();
createDemoUser();

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
