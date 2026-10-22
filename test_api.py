import unittest
import json
from app import create_app
from config import Config
from models import db, User, CreatorProfile

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SECRET_KEY = 'test-secret-key'
    JWT_SECRET_KEY = 'test-secret-key'

class CreatorIQBackendTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_user_registration_and_jwt_generation(self):
        """Test registration endpoint with validation and automatic JWT generation"""
        payload = {
            "name": "Jane Developer",
            "email": "jane@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "creator",
            "niche": "Tech Reviews"
        }
        res = self.client.post('/api/auth/register', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertIn('token', data)
        self.assertEqual(data['user']['email'], "jane@example.com")
        self.assertEqual(data['user']['role'], "creator")

    def test_registration_password_mismatch(self):
        """Test registration rejects mismatched passwords"""
        payload = {
            "name": "Jane Developer",
            "email": "jane@example.com",
            "password": "Password123!",
            "confirm_password": "WrongPassword!",
            "role": "creator"
        }
        res = self.client.post('/api/auth/register', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 400)
        data = json.loads(res.data)
        self.assertFalse(data['success'])

    def test_user_login_success_and_failure(self):
        """Test secure password verification and token generation on login"""
        # Register user
        reg_payload = {
            "name": "Test User",
            "email": "test@example.com",
            "password": "CorrectPassword123!",
            "confirm_password": "CorrectPassword123!",
            "role": "agency"
        }
        self.client.post('/api/auth/register', data=json.dumps(reg_payload), content_type='application/json')

        # Login with correct password
        login_res = self.client.post('/api/auth/login', data=json.dumps({
            "email": "test@example.com",
            "password": "CorrectPassword123!"
        }), content_type='application/json')
        self.assertEqual(login_res.status_code, 200)
        login_data = json.loads(login_res.data)
        self.assertTrue(login_data['success'])
        self.assertIn('token', login_data)

        # Login with wrong password
        fail_res = self.client.post('/api/auth/login', data=json.dumps({
            "email": "test@example.com",
            "password": "WrongPassword!"
        }), content_type='application/json')
        self.assertEqual(fail_res.status_code, 401)

    def test_jwt_protected_me_endpoint(self):
        """Test that /api/auth/me rejects requests without JWT and accepts valid JWT"""
        # Unauthorized access
        res = self.client.get('/api/auth/me')
        self.assertEqual(res.status_code, 401)

        # Register and get token
        reg_payload = {
            "name": "Auth User",
            "email": "auth@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "creator"
        }
        reg_res = self.client.post('/api/auth/register', data=json.dumps(reg_payload), content_type='application/json')
        token = json.loads(reg_res.data)['token']

        # Access with token
        auth_res = self.client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(auth_res.status_code, 200)
        self.assertEqual(json.loads(auth_res.data)['user']['email'], 'auth@example.com')

    def test_role_based_authorization(self):
        """Test RBAC: creators cannot access admin-only endpoints (403 Forbidden)"""
        # Register a creator
        reg_creator = self.client.post('/api/auth/register', data=json.dumps({
            "name": "Regular Creator",
            "email": "creator@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "creator"
        }), content_type='application/json')
        creator_token = json.loads(reg_creator.data)['token']

        # Creator attempts to access Admin User Management
        admin_res = self.client.get('/api/admin/users', headers={'Authorization': f'Bearer {creator_token}'})
        self.assertEqual(admin_res.status_code, 403)

        # Register an admin
        reg_admin = self.client.post('/api/auth/register', data=json.dumps({
            "name": "Super Admin",
            "email": "admin@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "admin"
        }), content_type='application/json')
        admin_token = json.loads(reg_admin.data)['token']

        # Admin accesses Admin User Management
        admin_success_res = self.client.get('/api/admin/users', headers={'Authorization': f'Bearer {admin_token}'})
        self.assertEqual(admin_success_res.status_code, 200)

    def test_creator_profile_update(self):
        """Test updating creator bio, handle, and base rates"""
        reg_res = self.client.post('/api/auth/register', data=json.dumps({
            "name": "Profile Creator",
            "email": "profile@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "creator"
        }), content_type='application/json')
        token = json.loads(reg_res.data)['token']

        update_payload = {
            "handle": "@updated_handle",
            "bio": "Brand new creator bio",
            "base_rate": 3500.0,
            "collaboration_status": "selective",
            "youtube_handle": "@youtube_channel"
        }
        res = self.client.put('/api/creators/me', data=json.dumps(update_payload), content_type='application/json', headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data['profile']['handle'], "@updated_handle")
        self.assertEqual(data['profile']['base_rate'], 3500.0)
        self.assertEqual(data['profile']['collaboration_status'], "selective")

if __name__ == '__main__':
    unittest.main()
