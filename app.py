from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models import db
from routes.auth_routes import auth_bp
from routes.creator_routes import creator_bp
from routes.admin_routes import admin_bp
from routes.oauth_routes import oauth_bp

def create_app(config_class=Config):
    """Application factory for CreatorIQ Flask REST API backend"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(creator_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(oauth_bp)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'CreatorIQ Flask REST API',
            'version': '1.0.0',
            'module': 'Module 1: User Management & Creator Profiles',
            'features': [
                'Secure Password Hashing (Werkzeug PBKDF2/Bcrypt)',
                'JWT-based Authentication & Claim Verification',
                'Role-Based Authorization (Creator, Agency, Marketing, Admin)',
                'Creator Profile Management & Social Linking',
                'OAuth2 Integration Endpoints (Google, YouTube, TikTok)'
            ]
        }), 200

    @app.route('/api', methods=['GET'])
    def api_index():
        return jsonify({
            'message': 'Welcome to CreatorIQ REST API Backend',
            'health': '/api/health',
            'auth': {
                'register': 'POST /api/auth/register',
                'login': 'POST /api/auth/login',
                'me': 'GET /api/auth/me',
                'refresh': 'POST /api/auth/refresh'
            },
            'creators': {
                'my_profile': 'GET /api/creators/me',
                'update_profile': 'PUT /api/creators/me',
                'public_profile': 'GET /api/creators/<id>'
            },
            'admin': {
                'users': 'GET /api/admin/users',
                'stats': 'GET /api/admin/stats'
            }
        }), 200

    # Custom HTTP error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'Resource not found'}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    # Run on port 5000 in local standalone mode
    app.run(host='0.0.0.0', port=5000, debug=True)
