from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    """User account model for CreatorIQ with role-based authorization"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default='creator')  # 'creator', 'agency', 'marketing', 'admin'
    status = db.Column(db.String(20), nullable=False, default='active')  # 'active', 'pending', 'suspended'
    avatar_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)

    # One-to-one relationship with CreatorProfile
    creator_profile = db.relationship('CreatorProfile', backref='user', uselist=False, cascade='all, delete-orphan')

    def set_password(self, password: str):
        """Hash and store the password securely using pbkdf2:sha256 / bcrypt"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify password against securely stored hash"""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_profile: bool = True):
        """Serialize user object without sensitive password hash"""
        data = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'status': self.status,
            'avatar_url': self.avatar_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={self.email}",
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
        if include_profile and self.creator_profile:
            data['creator_profile'] = self.creator_profile.to_dict()
        return data


class CreatorProfile(db.Model):
    """Detailed profile data for creator accounts"""
    __tablename__ = 'creator_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    handle = db.Column(db.String(80), nullable=False, default='@creator')
    bio = db.Column(db.Text, nullable=True, default='')
    niche = db.Column(db.String(100), nullable=True, default='Digital Content & Tech')
    location = db.Column(db.String(100), nullable=True, default='Global / Remote')
    website = db.Column(db.String(200), nullable=True, default='')
    contact_email = db.Column(db.String(120), nullable=True, default='')
    base_rate = db.Column(db.Float, nullable=False, default=1500.0)
    collaboration_status = db.Column(db.String(30), nullable=False, default='open')  # 'open', 'booked', 'selective'
    
    # Social channels & performance metrics
    youtube_handle = db.Column(db.String(80), nullable=True, default='')
    youtube_subscribers = db.Column(db.Integer, nullable=False, default=125000)
    
    instagram_handle = db.Column(db.String(80), nullable=True, default='')
    instagram_followers = db.Column(db.Integer, nullable=False, default=85400)
    
    tiktok_handle = db.Column(db.String(80), nullable=True, default='')
    tiktok_followers = db.Column(db.Integer, nullable=False, default=240000)
    
    twitter_handle = db.Column(db.String(80), nullable=True, default='')
    
    engagement_rate = db.Column(db.Float, nullable=False, default=4.8)
    monthly_reach = db.Column(db.Integer, nullable=False, default=1250000)
    verified = db.Column(db.Boolean, nullable=False, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'handle': self.handle,
            'bio': self.bio,
            'niche': self.niche,
            'location': self.location,
            'website': self.website,
            'contact_email': self.contact_email,
            'base_rate': self.base_rate,
            'collaboration_status': self.collaboration_status,
            'youtube_handle': self.youtube_handle,
            'youtube_subscribers': self.youtube_subscribers,
            'instagram_handle': self.instagram_handle,
            'instagram_followers': self.instagram_followers,
            'tiktok_handle': self.tiktok_handle,
            'tiktok_followers': self.tiktok_followers,
            'twitter_handle': self.twitter_handle,
            'engagement_rate': self.engagement_rate,
            'monthly_reach': self.monthly_reach,
            'verified': self.verified
        }


class AuditLog(db.Model):
    """Audit logs for user management actions and administrative events"""
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
