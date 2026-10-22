from flask import Blueprint, request, jsonify
from models import db, User, CreatorProfile, AuditLog
from auth_utils import token_required, roles_required

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/users', methods=['GET'])
@token_required
@roles_required('admin')
def list_users(current_user: User):
    """Admin-only: Retrieve all registered users with filter and search capabilities"""
    role = request.args.get('role')
    status = request.args.get('status')
    search = request.args.get('search')

    query = User.query

    if role and role.lower() != 'all':
        query = query.filter_by(role=role.lower())

    if status and status.lower() != 'all':
        query = query.filter_by(status=status.lower())

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(db.or_(User.name.ilike(term), User.email.ilike(term)))

    users = query.order_by(User.created_at.desc()).all()

    return jsonify({
        'success': True,
        'count': len(users),
        'users': [u.to_dict(include_profile=True) for u in users]
    }), 200


@admin_bp.route('/users', methods=['POST'])
@token_required
@roles_required('admin')
def create_user_by_admin(current_user: User):
    """Admin-only: Create a new user with pre-assigned role and status"""
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or 'DefaultPass123!'
    role = (data.get('role') or 'creator').lower()
    status = (data.get('status') or 'active').lower()

    if not name or not email:
        return jsonify({'success': False, 'message': 'Name and email are required.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'A user with this email already exists.'}), 409

    if role not in ['creator', 'agency', 'marketing', 'admin']:
        return jsonify({'success': False, 'message': 'Invalid role.'}), 400

    new_user = User(
        name=name,
        email=email,
        role=role,
        status=status,
        avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}"
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.flush()

    if role == 'creator':
        profile = CreatorProfile(
            user_id=new_user.id,
            handle=f"@{name.lower().replace(' ', '')}",
            bio=f"Official profile for {name}",
            contact_email=email
        )
        db.session.add(profile)

    log = AuditLog(
        user_id=current_user.id,
        action='ADMIN_CREATE_USER',
        details=f"Admin {current_user.email} created user {email} ({role})",
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'User {name} created successfully.',
        'user': new_user.to_dict()
    }), 201


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@token_required
@roles_required('admin')
def update_user_by_admin(current_user: User, user_id: int):
    """Admin-only: Update role, status, or details of a user"""
    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    data = request.get_json() or {}

    # Prevent admin from suspending themselves
    if target_user.id == current_user.id and data.get('status') == 'suspended':
        return jsonify({'success': False, 'message': 'You cannot suspend your own administrative account.'}), 400

    # Prevent admin from downgrading their own role
    if target_user.id == current_user.id and data.get('role') and data.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'You cannot revoke your own administrator status.'}), 400

    if 'name' in data and data['name'].strip():
        target_user.name = data['name'].strip()
    if 'role' in data and data['role'] in ['creator', 'agency', 'marketing', 'admin']:
        target_user.role = data['role']
    if 'status' in data and data['status'] in ['active', 'pending', 'suspended']:
        target_user.status = data['status']

    log = AuditLog(
        user_id=current_user.id,
        action='ADMIN_UPDATE_USER',
        details=f"Admin updated user ID {user_id}: role={target_user.role}, status={target_user.status}",
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'User {target_user.name} updated successfully.',
        'user': target_user.to_dict()
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
@roles_required('admin')
def delete_user_by_admin(current_user: User, user_id: int):
    """Admin-only: Permanently delete a user account"""
    if current_user.id == user_id:
        return jsonify({'success': False, 'message': 'You cannot delete your own administrative account.'}), 400

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    user_name = target_user.name
    db.session.delete(target_user)

    log = AuditLog(
        user_id=current_user.id,
        action='ADMIN_DELETE_USER',
        details=f"Admin deleted user {user_name} (ID: {user_id})",
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'User {user_name} has been deleted.'
    }), 200


@admin_bp.route('/stats', methods=['GET'])
@token_required
@roles_required('admin')
def get_admin_stats(current_user: User):
    """Admin-only: Aggregate system statistics for user management dashboard"""
    total_users = User.query.count()
    active_users = User.query.filter_by(status='active').count()
    suspended_users = User.query.filter_by(status='suspended').count()
    
    creators_count = User.query.filter_by(role='creator').count()
    agency_count = User.query.filter_by(role='agency').count()
    marketing_count = User.query.filter_by(role='marketing').count()
    admin_count = User.query.filter_by(role='admin').count()

    recent_logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(10).all()

    return jsonify({
        'success': True,
        'stats': {
            'total_users': total_users,
            'active_users': active_users,
            'suspended_users': suspended_users,
            'roles': {
                'creator': creators_count,
                'agency': agency_count,
                'marketing': marketing_count,
                'admin': admin_count
            }
        },
        'audit_logs': [log.to_dict() for log in recent_logs]
    }), 200
