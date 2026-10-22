import re
from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, User, CreatorProfile, AuditLog
from auth_utils import generate_jwt_token, token_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user account with role assignment and creator profile auto-generation"""
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password') or ''
    role = (data.get('role') or 'creator').lower()
    niche = (data.get('niche') or '').strip()

    # Form Validation
    if not name:
        return jsonify({'success': False, 'message': 'Full name is required.'}), 400

    if not email or not re.match(EMAIL_REGEX, email):
        return jsonify({'success': False, 'message': 'A valid email address is required.'}), 400

    if len(password) < 8:
        return jsonify({'success': False, 'message': 'Password must be at least 8 characters long.'}), 400

    if password != confirm_password:
        return jsonify({'success': False, 'message': 'Password and confirm password do not match.'}), 400

    allowed_roles = ['creator', 'agency', 'marketing', 'admin']
    if role not in allowed_roles:
        return jsonify({'success': False, 'message': f'Invalid role. Allowed roles are: {", ".join(allowed_roles)}'}), 400

    # Check for existing email
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'An account with this email already exists.'}), 409

    try:
        user = User(
            name=name,
            email=email,
            role=role,
            status='active',
            avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}"
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        # If user registered as a creator, generate their creator profile automatically
        if role == 'creator':
            handle = f"@{name.lower().replace(' ', '')}"
            profile = CreatorProfile(
                user_id=user.id,
                handle=handle,
                bio=f"Digital creator specializing in {niche if niche else 'creative content and media'}.",
                niche=niche if niche else "Digital Media & Tech",
                contact_email=email,
                base_rate=1200.0,
                collaboration_status='open',
                verified=False
            )
            db.session.add(profile)

        # Log audit action
        log = AuditLog(
            user_id=user.id,
            action='USER_REGISTRATION',
            details=f"User {name} registered with role {role}",
            ip_address=request.remote_addr
        )
        db.session.add(log)
        db.session.commit()

        # Generate JWT token
        token = generate_jwt_token(user)

        return jsonify({
            'success': True,
            'message': 'Account registered successfully.',
            'token': token,
            'user': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Registration failed: {str(e)}'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user with email and password, returning signed JWT token"""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

    if user.status == 'suspended':
        return jsonify({'success': False, 'message': 'Account suspended. Contact support or an administrator.'}), 403

    # Update last login timestamp
    user.last_login = datetime.utcnow()
    
    log = AuditLog(
        user_id=user.id,
        action='USER_LOGIN',
        details=f"Successful login from {request.remote_addr}",
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()

    token = generate_jwt_token(user)

    return jsonify({
        'success': True,
        'message': f'Welcome back, {user.name}!',
        'token': token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout endpoint to clear server sessions / record audit logs"""
    return jsonify({
        'success': True,
        'message': 'Successfully logged out. Client token should be cleared.'
    }), 200


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user: User):
    """Return currently authenticated user data and associated creator profile"""
    return jsonify({
        'success': True,
        'user': current_user.to_dict()
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@token_required
def refresh_token(current_user: User):
    """Issue a fresh JWT token for authenticated active session"""
    new_token = generate_jwt_token(current_user)
    return jsonify({
        'success': True,
        'token': new_token,
        'user': current_user.to_dict()
    }), 200
