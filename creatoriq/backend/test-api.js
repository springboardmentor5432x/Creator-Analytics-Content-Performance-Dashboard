const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatoriq-api-'));
process.env.CREATORIQ_DATA_DIR = testDataDir;
process.env.ADMIN_SETUP_KEY = 'test-only-admin-setup-key';
const { app } = require('./server.js');

test.after(() => fs.rmSync(testDataDir, { recursive: true, force: true }));

async function request(path, options = {}) {
  const server = app.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
  await new Promise((resolve) => server.close(resolve));

  return response;
}

test('GET /api/health returns service status', async () => {
  const response = await request('/api/health');
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.service, 'CreatorIQ API');
});

test('signup creates an account without establishing a session', async () => {
  const email = `qa-${Date.now()}@example.com`;
  const response = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'QA User',
      email,
      password: 'Password123!',
      role: 'creator'
    })
  });

  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.token, undefined);
  assert.equal(data.user.email, email);
  assert.equal(data.user.role, 'creator');
});

test('public signup cannot assign the administrator role', async () => {
  const response = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Public Admin Attempt',
      email: `public-admin-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'administrator'
    })
  });

  assert.equal(response.status, 400);
});

test('first administrator requires the setup key and can provision another admin', async () => {
  const details = {
    name: 'Bootstrap Admin',
    email: 'bootstrap-admin@example.com',
    password: 'Password123!'
  };
  const deniedResponse = await request('/api/auth/bootstrap-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details)
  });
  assert.equal(deniedResponse.status, 403);

  const bootstrapResponse = await request('/api/auth/bootstrap-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-setup-key': 'test-only-admin-setup-key'
    },
    body: JSON.stringify(details)
  });
  assert.equal(bootstrapResponse.status, 201);
  assert.equal((await bootstrapResponse.json()).user.role, 'administrator');

  const secondBootstrapResponse = await request('/api/auth/bootstrap-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-setup-key': 'test-only-admin-setup-key'
    },
    body: JSON.stringify({ ...details, email: 'second-bootstrap@example.com' })
  });
  assert.equal(secondBootstrapResponse.status, 409);

  const loginResponse = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: details.email, password: details.password })
  });
  const loginData = await loginResponse.json();
  assert.equal(loginResponse.status, 200);
  assert.equal(loginData.user.role, 'administrator');

  const adminRoleChangeResponse = await request('/api/profile/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginData.token}`
    },
    body: JSON.stringify({ name: details.name, email: details.email, role: 'creator' })
  });
  assert.equal(adminRoleChangeResponse.status, 403);

  const createdResponse = await request('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginData.token}`
    },
    body: JSON.stringify({
      name: 'Managed Admin',
      email: 'managed-admin@example.com',
      password: 'Password123!'
    })
  });
  assert.equal(createdResponse.status, 201);
  assert.equal((await createdResponse.json()).user.role, 'administrator');

  const overviewResponse = await request('/api/admin/overview', {
    headers: { Authorization: `Bearer ${loginData.token}` }
  });
  assert.equal(overviewResponse.status, 200);
  const overview = await overviewResponse.json();
  assert.equal(overview.roleCounts.administrator, 2);
  assert.ok(overview.users.some((user) => user.email === details.email));
  assert.ok(overview.users.every((user) => !Object.hasOwn(user, 'passwordHash')));
});

test('profile role can change among public roles but cannot self-assign administrator', async () => {
  const email = `role-update-${Date.now()}@example.com`;
  const signupResponse = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Role Update', email, password: 'Password123!', role: 'creator' })
  });
  assert.equal(signupResponse.status, 201);

  const loginResponse = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!' })
  });
  const loginData = await loginResponse.json();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${loginData.token}`
  };

  const updateResponse = await request('/api/profile/me', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name: 'Role Update', email, role: 'agency' })
  });
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).user.role, 'agency');

  const escalationResponse = await request('/api/profile/me', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name: 'Role Update', email, role: 'administrator' })
  });
  assert.equal(escalationResponse.status, 400);

  const profileResponse = await request('/api/profile/me', { headers: { Authorization: `Bearer ${loginData.token}` } });
  assert.equal((await profileResponse.json()).user.role, 'agency');
});

test('login accepts the seeded demo account', async () => {
  const response = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sample@example.com',
      password: 'Password123!'
    })
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data.token);
  assert.equal(data.user.email, 'sample@example.com');
});

test('profile route returns authenticated user data', async () => {
  const loginResponse = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sample@example.com',
      password: 'Password123!'
    })
  });

  const loginData = await loginResponse.json();
  const profileResponse = await request('/api/profile/me', {
    headers: { Authorization: `Bearer ${loginData.token}` }
  });

  assert.equal(profileResponse.status, 200);
  const profileData = await profileResponse.json();
  assert.equal(profileData.user.email, 'sample@example.com');
});

test('admin overview requires authentication and administrator role', async () => {
  const unauthenticatedResponse = await request('/api/admin/overview');
  assert.equal(unauthenticatedResponse.status, 401);

  const loginResponse = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sample@example.com', password: 'Password123!' })
  });
  const loginData = await loginResponse.json();

  const creatorResponse = await request('/api/admin/overview', {
    headers: { Authorization: `Bearer ${loginData.token}` }
  });
  assert.equal(creatorResponse.status, 403);

  const creatorProvisionResponse = await request('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginData.token}`
    },
    body: JSON.stringify({
      name: 'Unauthorized Admin',
      email: `unauthorized-admin-${Date.now()}@example.com`,
      password: 'Password123!'
    })
  });
  assert.equal(creatorProvisionResponse.status, 403);
});

test('logout revokes the current token and allows a fresh login', async () => {
  const email = `logout-${Date.now()}@example.com`;
  const signupResponse = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Logout Test',
      email,
      password: 'Password123!',
      role: 'creator'
    })
  });
  assert.equal(signupResponse.status, 201);

  const loginResponse = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!' })
  });
  const loginData = await loginResponse.json();
  assert.equal(loginResponse.status, 200);

  const logoutResponse = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginData.token}` }
  });
  assert.equal(logoutResponse.status, 200);

  const revokedProfileResponse = await request('/api/profile/me', {
    headers: { Authorization: `Bearer ${loginData.token}` }
  });
  assert.equal(revokedProfileResponse.status, 401);

  const reloginResponse = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!' })
  });
  const reloginData = await reloginResponse.json();
  assert.equal(reloginResponse.status, 200);
  assert.notEqual(reloginData.token, loginData.token);
});
