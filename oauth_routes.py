import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from models import db, User, CreatorProfile, AuditLog
from auth_utils import generate_jwt_token, token_required

oauth_bp = Blueprint('oauth', __name__, url_prefix='/api/oauth')

SUPPORTED_PROVIDERS = {
    'google': {
        'name': 'Google Workspace / YouTube',
        'auth_url': 'https://accounts.google.com/o/oauth2/v2/auth',
        'scopes': ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/youtube.readonly']
    },
    'tiktok': {
        'name': 'TikTok for Creators',
        'auth_url': 'https://www.tiktok.com/v2/auth/authorize/',
        'scopes': ['user.info.basic', 'video.list']
    },
    'instagram': {
        'name': 'Instagram Basic Display',
        'auth_url': 'https://api.instagram.com/oauth/authorize',
        'scopes': ['user_profile', 'user_media']
    }
}

@oauth_bp.route('/providers', methods=['GET'])
def list_providers():
    """List available OAuth2 identity and social channel providers"""
    return jsonify({
        'success': True,
        'providers': [
            {'id': k, 'name': v['name'], 'scopes': v['scopes']}
            for k, v in SUPPORTED_PROVIDERS.items()
        ]
    }), 200


@oauth_bp.route('/authorize/<provider>', methods=['GET'])
def get_auth_url(provider: str):
    """Generate authorization redirect URL with state parameter to prevent CSRF"""
    provider = provider.lower()
    if provider not in SUPPORTED_PROVIDERS:
        return jsonify({'success': False, 'message': f'Unsupported OAuth2 provider: {provider}'}), 400

    state = str(uuid.uuid4())
    info = SUPPORTED_PROVIDERS[provider]
    
    # In production, redirect_uri points to frontend /oauth/callback
    redirect_uri = request.args.get('redirect_uri', 'http://localhost:3000/oauth/callback')

    constructed_url = (
        f"{info['auth_url']}?client_id=creator-iq-client"
        f"&response_type=code"
        f"&scope={'+'.join(info['scopes'])}"
        f"&redirect_uri={redirect_uri}"
        f"&state={state}"
    )

    return jsonify({
        'success': True,
        'provider': provider,
        'authorization_url': constructed_url,
        'state': state
    }), 200


@oauth_bp.route('/callback', methods=['POST'])
def oauth_callback():
    """Handle OAuth2 authorization code callback and link or create user"""
    data = request.get_json() or {}
    provider = (data.get('provider') or 'google').lower()
    code = data.get('code')
    mock_email = data.get('email')

    if not code:
        return jsonify({'success': False, 'message': 'Authorization code is missing.'}), 400

    # In a simulated/live OAuth2 flow, exchange code for provider tokens
    email = mock_email or f"creator.{code[:6]}@example.com"
    name = data.get('name') or f"Creator {provider.capitalize()}"

    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(
            name=name,
            email=email,
            role='creator',
            status='active',
            avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}"
        )
        user.set_password(str(uuid.uuid4()))  # Secure random password for OAuth accounts
        db.session.add(user)
        db.session.flush()

        profile = CreatorProfile(
            user_id=user.id,
            handle=f"@{name.lower().replace(' ', '')}",
            bio=f"Authenticated via {provider.capitalize()}.",
            contact_email=email,
            verified=True
        )
        if provider == 'google':
            profile.youtube_handle = f"@{name.lower().replace(' ', '')}YT"
        elif provider == 'tiktok':
            profile.tiktok_handle = f"@{name.lower().replace(' ', '')}TT"
        db.session.add(profile)

    user.last_login = datetime.utcnow()
    token = generate_jwt_token(user)

    log = AuditLog(
        user_id=user.id,
        action='OAUTH_LOGIN',
        details=f"Successful OAuth2 login via {provider}",
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Authenticated successfully via {provider.capitalize()}',
        'token': token,
        'user': user.to_dict()
    }), 200
