import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from models import User

def generate_jwt_token(user: User, expires_in_hours: int = 24) -> str:
    """Generate a signed JWT token containing user identity and role claims"""
    payload = {
        'sub': user.id,
        'user_id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'status': user.status,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=expires_in_hours)
    }
    return jwt.encode(
        payload, 
        current_app.config['JWT_SECRET_KEY'], 
        algorithm=current_app.config['JWT_ALGORITHM']
    )

def decode_jwt_token(token: str) -> dict:
    """Verify and decode a JWT token string"""
    try:
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=[current_app.config['JWT_ALGORITHM']]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid authentication token.")

def get_token_from_header():
    """Extract Bearer token from HTTP Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1]
    return None

def token_required(f):
    """Decorator to protect routes requiring valid JWT authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({
                'success': False,
                'message': 'Authorization token is missing. Please provide a Bearer token.'
            }), 401

        try:
            payload = decode_jwt_token(token)
            current_user = User.query.get(payload.get('user_id'))
            if not current_user:
                return jsonify({
                    'success': False,
                    'message': 'User associated with this token no longer exists.'
                }), 401

            if current_user.status == 'suspended':
                return jsonify({
                    'success': False,
                    'message': 'Your account has been suspended by an administrator.'
                }), 403

        except ValueError as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 401
        except Exception as e:
            return jsonify({
                'success': False,
                'message': 'Authentication failed.'
            }), 401

        return f(current_user, *args, **kwargs)
    return decorated

def roles_required(*allowed_roles):
    """Decorator to enforce role-based access control (RBAC)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user: User, *args, **kwargs):
            if current_user.role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': f'Access forbidden: Role "{current_user.role}" does not have required permissions ({", ".join(allowed_roles)}).'
                }), 403
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator
