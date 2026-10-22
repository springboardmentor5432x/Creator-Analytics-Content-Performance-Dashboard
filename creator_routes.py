from flask import Blueprint, request, jsonify
from models import db, User, CreatorProfile, AuditLog
from auth_utils import token_required

creator_bp = Blueprint('creators', __name__, url_prefix='/api/creators')

@creator_bp.route('/me', methods=['GET'])
@token_required
def get_my_creator_profile(current_user: User):
    """Get authenticated user's own creator profile and analytics"""
    profile = current_user.creator_profile
    if not profile:
        # Automatically initialize profile if user is a creator
        profile = CreatorProfile(
            user_id=current_user.id,
            handle=f"@{current_user.name.lower().replace(' ', '')}",
            bio="Passionate content creator sharing authentic perspectives.",
            niche="General / Digital Media",
            contact_email=current_user.email,
            base_rate=1000.0,
            collaboration_status="open"
        )
        db.session.add(profile)
        db.session.commit()

    return jsonify({
        'success': True,
        'profile': profile.to_dict(),
        'user': current_user.to_dict(include_profile=False)
    }), 200


@creator_bp.route('/me', methods=['PUT'])
@token_required
def update_my_creator_profile(current_user: User):
    """Update profile details, social links, bio, and collaboration rates"""
    data = request.get_json() or {}
    profile = current_user.creator_profile
    
    if not profile:
        profile = CreatorProfile(user_id=current_user.id)
        db.session.add(profile)

    # Update basic profile fields
    if 'handle' in data:
        handle = data['handle'].strip()
        profile.handle = handle if handle.startswith('@') else f"@{handle}"
    if 'bio' in data:
        profile.bio = data['bio'].strip()
    if 'niche' in data:
        profile.niche = data['niche'].strip()
    if 'location' in data:
        profile.location = data['location'].strip()
    if 'website' in data:
        profile.website = data['website'].strip()
    if 'contact_email' in data:
        profile.contact_email = data['contact_email'].strip()
    if 'base_rate' in data:
        try:
            profile.base_rate = float(data['base_rate'])
        except (ValueError, TypeError):
            pass
    if 'collaboration_status' in data:
        if data['collaboration_status'] in ['open', 'booked', 'selective']:
            profile.collaboration_status = data['collaboration_status']

    # Update social media handles
    if 'youtube_handle' in data:
        profile.youtube_handle = data['youtube_handle'].strip()
    if 'instagram_handle' in data:
        profile.instagram_handle = data['instagram_handle'].strip()
    if 'tiktok_handle' in data:
        profile.tiktok_handle = data['tiktok_handle'].strip()
    if 'twitter_handle' in data:
        profile.twitter_handle = data['twitter_handle'].strip()

    # Allow updating user name and avatar
    if 'name' in data and data['name'].strip():
        current_user.name = data['name'].strip()
    if 'avatar_url' in data and data['avatar_url'].strip():
        current_user.avatar_url = data['avatar_url'].strip()

    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        action='CREATOR_PROFILE_UPDATE',
        details="Creator updated profile settings and social metrics",
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Creator profile updated successfully.',
        'profile': profile.to_dict(),
        'user': current_user.to_dict(include_profile=False)
    }), 200


@creator_bp.route('/<int:user_id>', methods=['GET'])
def get_creator_public_profile(user_id: int):
    """Public creator profile view (preventing exposure of private data if unauthorized)"""
    user = User.query.get(user_id)
    if not user or user.status == 'suspended':
        return jsonify({'success': False, 'message': 'Creator not found.'}), 404

    profile = user.creator_profile
    if not profile:
        return jsonify({'success': False, 'message': 'Creator profile not configured.'}), 404

    # Public-safe payload
    return jsonify({
        'success': True,
        'creator': {
            'id': user.id,
            'name': user.name,
            'avatar_url': user.avatar_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}",
            'profile': profile.to_dict()
        }
    }), 200


@creator_bp.route('', methods=['GET'])
def list_creators():
    """List creators for agency discovery and marketing campaigns"""
    niche = request.args.get('niche')
    search = request.args.get('q')

    query = User.query.filter_by(role='creator', status='active')
    
    if search:
        query = query.filter(User.name.ilike(f"%{search}%"))

    users = query.all()
    results = []
    for u in users:
        p = u.creator_profile
        if niche and p and niche.lower() not in p.niche.lower():
            continue
        results.append({
            'user': u.to_dict(include_profile=False),
            'profile': p.to_dict() if p else None
        })

    return jsonify({
        'success': True,
        'count': len(results),
        'creators': results
    }), 200
