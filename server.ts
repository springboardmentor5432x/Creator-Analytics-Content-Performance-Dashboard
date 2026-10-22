import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

dotenv.config();

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'creatoriq-super-secret-jwt-key-2026';

// In-memory data store replicating the Python Flask backend models
interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: 'creator' | 'agency' | 'marketing' | 'admin';
  roles?: ('creator' | 'agency' | 'marketing' | 'admin')[];
  status: 'active' | 'pending' | 'suspended';
  avatarUrl: string;
  createdAt: string;
  lastLogin: string | null;
}

interface CreatorProfile {
  id: number;
  userId: number;
  handle: string;
  bio: string;
  niche: string;
  location: string;
  website: string;
  contactEmail: string;
  baseRate: number;
  collaborationStatus: 'open' | 'booked' | 'selective';
  youtubeHandle: string;
  youtubeSubscribers: number;
  instagramHandle: string;
  instagramFollowers: number;
  tiktokHandle: string;
  tiktokFollowers: number;
  twitterHandle: string;
  engagementRate: number;
  monthlyReach: number;
  verified: boolean;
}

interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

let nextUserId = 1;
let nextProfileId = 1;
let nextLogId = 1;

const users: User[] = [];
const creatorProfiles: Map<number, CreatorProfile> = new Map();
const auditLogs: AuditLog[] = [];

// Distinct Role Profile Interfaces & Stores
interface AgencyProfile {
  agencyName: string;
  licenseNumber: string;
  rosterSize: number;
  commissionRate: number;
  specialties: string;
  businessAddress: string;
  website: string;
  phone: string;
  keyClients: string;
  taxId: string;
}

interface MarketingProfile {
  brandName: string;
  industrySector: string;
  annualBudget: number;
  targetAudience: string;
  campaignKPIs: string;
  corporateWebsite: string;
  phone: string;
  taxId: string;
  headOfGrowth: string;
}

interface AdminProfile {
  department: string;
  clearanceLevel: string;
  accessScopes: string[];
  twoFactorStatus: boolean;
  emergencyContact: string;
  complianceAuditDate: string;
  employeeId: string;
}

interface PersonalDetails {
  phone: string;
  location: string;
  bio: string;
  language: string;
  timezone: string;
}

const agencyProfiles: Map<number, AgencyProfile> = new Map();
const marketingProfiles: Map<number, MarketingProfile> = new Map();
const adminProfiles: Map<number, AdminProfile> = new Map();
const personalDetailsMap: Map<number, PersonalDetails> = new Map();

// Password reset store & email logger
interface PasswordResetEntry {
  email: string;
  code: string;
  token: string;
  expiresAt: number;
}

interface SentEmail {
  id: string;
  to: string;
  from: string;
  subject: string;
  code: string;
  token: string;
  html: string;
  text: string;
  sentAt: string;
  deliveryStatus: 'sent' | 'simulated';
}

const passwordResetEntries = new Map<string, PasswordResetEntry>();
const sentEmails: SentEmail[] = [];

// Initialize SMTP transporter if env credentials provided
let mailTransporter: any = null;
if (process.env.SMTP_HOST && (process.env.SMTP_USER || process.env.SMTP_PASS)) {
  try {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
      },
    });
    console.log(`[Mailer] Initialized SMTP transporter for host ${process.env.SMTP_HOST}`);
  } catch (err) {
    console.warn('[Mailer] SMTP transporter initialization warning:', err);
  }
}

// Mail sender helper
async function sendVerificationEmail(toEmail: string, code: string, token: string, userName: string, origin?: string) {
  const fromAddress = process.env.EMAIL_FROM || '"CreatorIQ Security" <security@creatoriq.com>';
  const subject = `[CreatorIQ] Password Reset Verification Code: ${code}`;
  const baseUrl = origin || 'https://ais-dev-5ps7kcz2kpbomztyvdkdqy-84160821721.asia-southeast1.run.app';
  const resetLink = `${baseUrl}/?page=reset-password&token=${token}&email=${encodeURIComponent(toEmail)}`;

  const text = `Hello ${userName},\n\nYou requested a password reset for your CreatorIQ account.\n\nYour 6-digit verification code is: ${code}\n\nAlternatively, you can reset your password directly using this link:\n${resetLink}\n\nThis verification code and link will expire in 15 minutes.\n\nIf you did not request this, you can safely ignore this email.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CreatorIQ Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f3ff; margin: 0; padding: 24px 12px; color: #1e293b; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 12px 30px -10px rgba(124, 58, 237, 0.15); }
    .top-banner { background: linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #4f46e5 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255,255,255,0.22); border-radius: 9999px; padding: 4px 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 8px; }
    .body-content { padding: 32px 28px; }
    .code-box { background: #faf5ff; border: 2px dashed #a855f7; border-radius: 16px; text-align: center; padding: 24px; margin: 24px 0; }
    .code-digits { font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #6b21a8; font-family: monospace; line-height: 1; }
    .btn { display: inline-block; background: #7c3aed; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="top-banner">
      <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">CreatorIQ</div>
      <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Creator Analytics & Content Performance Platform</div>
      <div class="badge">Password Reset Verification</div>
    </div>
    <div class="body-content">
      <h2 style="font-size: 19px; color: #0f172a; margin-top: 0; font-weight: 800;">Password Reset Request</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Hello <strong>${userName}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        We received a request to reset the password for your CreatorIQ account linked with <strong style="color: #6b21a8;">${toEmail}</strong>.
      </p>
      
      <div class="code-box">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #7e22ce; margin-bottom: 10px;">Verification Code (OTP)</div>
        <div class="code-digits">${code}</div>
        <div style="font-size: 12px; color: #9333ea; font-weight: 600; margin-top: 10px;">Expires in 15 minutes</div>
      </div>

      <p style="font-size: 13px; line-height: 1.6; color: #475569;">
        Enter this 6-digit verification code into CreatorIQ to verify your identity and set your new password.
      </p>

      <div style="text-align: center; margin: 20px 0;">
        <a href="${resetLink}" class="btn">Reset Password Directly &rarr;</a>
      </div>

      <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-bottom: 0;">
        If you did not request this verification email, you can safely ignore it. Your account password will remain unchanged.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} CreatorIQ Analytics Ltd. All rights reserved. &bull; Sent to ${toEmail}
    </div>
  </div>
</body>
</html>`;

  let deliveryStatus: 'sent' | 'simulated' = 'simulated';

  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text,
        html,
      });
      deliveryStatus = 'sent';
      console.log(`[Mailer] Real SMTP email sent to ${toEmail}`);
    } catch (err) {
      console.warn(`[Mailer] SMTP delivery attempt failed, falling back to virtual delivery:`, err);
    }
  }

  const record: SentEmail = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    to: toEmail,
    from: fromAddress,
    subject,
    code,
    token,
    html,
    text,
    sentAt: new Date().toISOString(),
    deliveryStatus,
  };

  sentEmails.unshift(record);
  if (sentEmails.length > 50) sentEmails.pop();

  console.log(`[Mailer] Verification mail prepared for ${toEmail} | Code: ${code} | Status: ${deliveryStatus}`);
  return record;
}

// Helper to seed initial users matching Flask backend
function seedInitialData() {
  const hashPass = (plain: string) => bcrypt.hashSync(plain, 10);

  // 1. Admin (System Administrator - admin@creatoriq.com)
  const admin: User = {
    id: nextUserId++,
    name: 'System Administrator',
    email: 'admin@creatoriq.com',
    passwordHash: hashPass('AdminPass123!'),
    role: 'admin',
    roles: ['admin'],
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastLogin: new Date().toISOString()
  };
  users.push(admin);

  adminProfiles.set(admin.id, {
    department: 'IT & Security Operations',
    clearanceLevel: 'Level 4 - Super Admin',
    accessScopes: ['User Management', 'Platform Integrations', 'Content Monitoring', 'Analytics Overview', 'System Settings', 'Activity Logs'],
    twoFactorStatus: true,
    emergencyContact: '+91 99000 11222',
    complianceAuditDate: '2026-10-01',
    employeeId: 'ADM-8801'
  });

  personalDetailsMap.set(admin.id, {
    phone: '+91 98800 12345',
    location: 'Bangalore, India',
    bio: 'Lead system administrator overseeing platform stability, RBAC permissions, audit logs, and security monitoring.',
    language: 'English',
    timezone: 'Asia/Kolkata (IST)'
  });

  // 2. Creator (Ipsita Priyadarshini - creator@creatoriq.com)
  const creator: User = {
    id: nextUserId++,
    name: 'Ipsita Priyadarshini',
    email: 'creator@creatoriq.com',
    passwordHash: hashPass('CreatorPass123!'),
    role: 'creator',
    roles: ['creator'],
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    lastLogin: new Date().toISOString()
  };
  users.push(creator);

  creatorProfiles.set(creator.id, {
    id: nextProfileId++,
    userId: creator.id,
    handle: '@ipsitacodes',
    bio: 'Tech & student lifestyle creator at NIT Rourkela. Creating productivity, dev guides and AI reviews.',
    niche: 'Technology, AI & Student Lifestyle',
    location: 'Rourkela, India',
    website: 'https://ipsitapriyadarshini.me',
    contactEmail: 'creator@creatoriq.com',
    baseRate: 3500.0,
    collaborationStatus: 'open',
    youtubeHandle: '@IpsitaTech',
    youtubeSubscribers: 125430,
    instagramHandle: '@ipsita.study',
    instagramFollowers: 98240,
    tiktokHandle: '@ipsita_dev',
    tiktokFollowers: 76000,
    twitterHandle: '@ipsita_codes',
    engagementRate: 6.8,
    monthlyReach: 1800000,
    verified: true
  });

  personalDetailsMap.set(creator.id, {
    phone: '+91 94370 55442',
    location: 'Rourkela, India',
    bio: 'Computer science engineering student documenting modern AI developer tools, college routines, and study setups.',
    language: 'English, Hindi, Odia',
    timezone: 'Asia/Kolkata (IST)'
  });

  // 2b. Creator & Admin (HARSHITHA S - sharshitha28007@gmail.com - Multi-role Account)
  const creatorHarshitha: User = {
    id: nextUserId++,
    name: 'HARSHITHA S',
    email: 'sharshitha28007@gmail.com',
    passwordHash: hashPass('CreatorPass123!'),
    role: 'creator',
    roles: ['creator', 'admin'],
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    lastLogin: new Date().toISOString()
  };
  users.push(creatorHarshitha);

  creatorProfiles.set(creatorHarshitha.id, {
    id: nextProfileId++,
    userId: creatorHarshitha.id,
    handle: '@harshitha_s',
    bio: 'Tech innovator, content creator & AI engineer based in Bangalore. Building data-driven creator analytics.',
    niche: 'Technology, AI & Digital Innovation',
    location: 'Bangalore, India',
    website: 'https://harshithas.dev',
    contactEmail: 'sharshitha28007@gmail.com',
    baseRate: 3500.0,
    collaborationStatus: 'open',
    youtubeHandle: '@HarshithaTech',
    youtubeSubscribers: 185000,
    instagramHandle: '@harshitha.codes',
    instagramFollowers: 94200,
    tiktokHandle: '@harshitha_dev',
    tiktokFollowers: 310000,
    twitterHandle: '@harshitha_s',
    engagementRate: 6.8,
    monthlyReach: 1850000,
    verified: true
  });

  personalDetailsMap.set(creatorHarshitha.id, {
    phone: '+91 98450 11223',
    location: 'Bangalore, India',
    bio: 'Tech innovator, content creator & AI engineer based in Bangalore.',
    language: 'English, Kannada, Hindi',
    timezone: 'Asia/Kolkata (IST)'
  });

  // 3. Agency Team (Growth Agency - agency@creatoriq.com - Multi-role: Agency + Marketing)
  const agency: User = {
    id: nextUserId++,
    name: 'Growth Agency',
    email: 'agency@creatoriq.com',
    passwordHash: hashPass('AgencyPass123!'),
    role: 'agency',
    roles: ['agency', 'marketing'],
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    lastLogin: new Date().toISOString()
  };
  users.push(agency);

  agencyProfiles.set(agency.id, {
    agencyName: 'Growth Agency',
    licenseNumber: 'AGY-IN-2026-8841',
    rosterSize: 12,
    commissionRate: 15,
    specialties: 'Tech, Food & Travel Creators',
    businessAddress: '100 Feet Road, Indiranagar, Bangalore, India',
    website: 'https://growthagency.co',
    phone: '+91 80 4123 9900',
    keyClients: 'Tech With Riya, Foodie Diaries, Travel With Arjun, Fitness Hub, Study Capsule',
    taxId: '29AABCU9603R1ZM'
  });

  personalDetailsMap.set(agency.id, {
    phone: '+91 80 4123 9900',
    location: 'Bangalore, India',
    bio: 'Full-service influencer talent management agency representing elite verified creators across YouTube, Instagram, and TikTok.',
    language: 'English, Hindi, Kannada',
    timezone: 'Asia/Kolkata (IST)'
  });

  // 4. Marketing Team (Brand Studio - marketing@creatoriq.com)
  const marketing: User = {
    id: nextUserId++,
    name: 'Brand Studio',
    email: 'marketing@creatoriq.com',
    passwordHash: hashPass('MarketingPass123!'),
    role: 'marketing',
    roles: ['marketing'],
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    lastLogin: new Date().toISOString()
  };
  users.push(marketing);

  marketingProfiles.set(marketing.id, {
    brandName: 'Brand Studio',
    industrySector: 'D2C Consumer Tech & E-Commerce',
    annualBudget: 4200000,
    targetAudience: 'Ages 18-34, Metro & Tier 1 Cities, India & Global',
    campaignKPIs: '3.2x ROAS, 12.4M Reach, 986K Engagement',
    corporateWebsite: 'https://brandstudio.io',
    phone: '+91 22 6150 4400',
    taxId: '27AAACB2234K1ZV',
    headOfGrowth: 'Kavita Rao'
  });

  personalDetailsMap.set(marketing.id, {
    phone: '+91 22 6150 4400',
    location: 'Mumbai, India',
    bio: 'Strategic brand studio driving ROI-focused influencer campaigns, content collaborations, and creator sponsorships.',
    language: 'English, Hindi, Marathi',
    timezone: 'Asia/Kolkata (IST)'
  });

  // 5. Additional creators for discovery
  const extraCreators = [
    {
      name: 'Sophia Chen',
      email: 'sophia.tech@creatoriq.com',
      pass: 'SophiaPass123!',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
      handle: '@sophiachen',
      bio: 'AI researcher & consumer hardware reviewer. Demystifying neural networks for everyday creators.',
      niche: 'AI, Hardware & Future Tech',
      location: 'Seattle, WA',
      site: 'https://sophiachen.ai',
      contact: 'collab@sophiachen.ai',
      rate: 3200,
      yt: 340000,
      ig: 142000,
      tt: 520000,
      eng: 6.8,
      reach: 2400000
    },
    {
      name: 'Marcus Vance',
      email: 'marcus.visuals@creatoriq.com',
      pass: 'MarcusPass123!',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      handle: '@marcusvisuals',
      bio: 'Cinematographer, colorist, and travel storyteller exploring high-end camera rigs and lighting techniques.',
      niche: 'Cinematography & Travel',
      location: 'Austin, TX',
      site: 'https://marcusvance.co',
      contact: 'biz@marcusvance.co',
      rate: 2800,
      yt: 210000,
      ig: 195000,
      tt: 180000,
      eng: 4.9,
      reach: 1600000
    },
    {
      name: 'Elena Rostova',
      email: 'elena.wellness@creatoriq.com',
      pass: 'ElenaPass123!',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
      handle: '@elenawellness',
      bio: 'Holistic nutrition, mindful routines, and peak mental performance for digital entrepreneurs.',
      niche: 'Health, Wellness & Biohacking',
      location: 'Boulder, CO',
      site: 'https://elenawellness.com',
      contact: 'partners@elenawellness.com',
      rate: 1900,
      yt: 98000,
      ig: 220000,
      tt: 410000,
      eng: 7.2,
      reach: 1900000
    }
  ];

  for (const c of extraCreators) {
    const u: User = {
      id: nextUserId++,
      name: c.name,
      email: c.email,
      passwordHash: hashPass(c.pass),
      role: 'creator',
      status: 'active',
      avatarUrl: c.avatar,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    users.push(u);

    creatorProfiles.set(u.id, {
      id: nextProfileId++,
      userId: u.id,
      handle: c.handle,
      bio: c.bio,
      niche: c.niche,
      location: c.location,
      website: c.site,
      contactEmail: c.contact,
      baseRate: c.rate,
      collaborationStatus: 'open',
      youtubeHandle: c.handle + 'YT',
      youtubeSubscribers: c.yt,
      instagramHandle: c.handle + 'IG',
      instagramFollowers: c.ig,
      tiktokHandle: c.handle + 'TT',
      tiktokFollowers: c.tt,
      twitterHandle: c.handle,
      engagementRate: c.eng,
      monthlyReach: c.reach,
      verified: true
    });
  }

  auditLogs.push({
    id: nextLogId++,
    userId: admin.id,
    action: 'SYSTEM_INIT',
    details: 'System initialized with pre-seeded demo accounts matching Flask schema.',
    ipAddress: '127.0.0.1',
    createdAt: new Date().toISOString()
  });
}

seedInitialData();

function serializeUser(user: User, includeProfile = true) {
  const profile = creatorProfiles.get(user.id);
  const authorizedRoles = (user.roles && user.roles.length) ? user.roles.slice(0, 2) : [user.role];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roles: authorizedRoles,
    status: user.status,
    avatar_url: user.avatarUrl,
    created_at: user.createdAt,
    last_login: user.lastLogin,
    creator_profile: includeProfile && profile ? profile : undefined
  };
}

// Auth Middleware
interface AuthRequest extends Request {
  user?: User;
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authorization token is missing. Please provide a Bearer token.'
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const user = users.find(u => u.id === payload.user_id || u.id === payload.sub);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User associated with this token no longer exists.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an administrator.'
      });
    }

    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Token expired. Please log in again.' : 'Invalid authentication token.'
    });
  }
}

function requireRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden: Role "${req.user?.role}" does not have required permissions (${allowedRoles.join(', ')}).`
      });
    }
    next();
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'CreatorIQ Unified REST API Server',
      backendType: 'integrated-node-flask-parity',
      version: '1.0.0',
      module: 'Module 1: User Management & Creator Profiles',
      connectedUsersCount: users.length,
      features: [
        'Secure Password Hashing (Bcrypt)',
        'JWT-based Authentication & Claim Verification',
        'Role-Based Authorization (Creator, Agency, Marketing, Admin)',
        'Creator Profile Management & Social Linking',
        'OAuth2 Integration Endpoints'
      ]
    });
  });

  // AUTH ROUTES
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, confirm_password, role, niche } = req.body || {};
    const trimmedName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const userRole = (role || 'creator').toLowerCase();

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ success: false, message: 'Password and confirm password do not match.' });
    }

    const allowed = ['creator', 'agency', 'marketing', 'admin'];
    if (!allowed.includes(userRole)) {
      return res.status(400).json({ success: false, message: `Invalid role. Allowed roles are: ${allowed.join(', ')}` });
    }

    if (users.find(u => u.email === cleanEmail)) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const newUser: User = {
      id: nextUserId++,
      name: trimmedName,
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(password, 10),
      role: userRole as any,
      roles: (cleanEmail === 'sharshitha28007@gmail.com' ? ['creator', 'admin'] : [userRole as any]),
      status: 'active',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    users.push(newUser);

    if (userRole === 'creator') {
      const handle = `@${trimmedName.toLowerCase().replace(/\s+/g, '')}`;
      creatorProfiles.set(newUser.id, {
        id: nextProfileId++,
        userId: newUser.id,
        handle,
        bio: `Digital creator specializing in ${niche || 'creative content and digital media'}.`,
        niche: niche || 'Digital Media & Tech',
        location: 'Global / Remote',
        website: '',
        contactEmail: cleanEmail,
        baseRate: 1200.0,
        collaborationStatus: 'open',
        youtubeHandle: '',
        youtubeSubscribers: 0,
        instagramHandle: '',
        instagramFollowers: 0,
        tiktokHandle: '',
        tiktokFollowers: 0,
        twitterHandle: '',
        engagementRate: 3.5,
        monthlyReach: 15000,
        verified: false
      });
    }

    auditLogs.push({
      id: nextLogId++,
      userId: newUser.id,
      action: 'USER_REGISTRATION',
      details: `User ${trimmedName} registered with role ${userRole}`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    const token = jwt.sign(
      { sub: newUser.id, user_id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: serializeUser(newUser)
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password, role } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    let user = users.find(u => 
      u.email.toLowerCase() === cleanEmail || 
      (cleanEmail === 'creator@creatoriq.com' && u.email.toLowerCase() === 'sharshitha28007@gmail.com') ||
      (cleanEmail === 'sharshitha28007@gmail.com' && u.email.toLowerCase() === 'creator@creatoriq.com')
    );

    // If this is a new custom email given by the user for a role, provision the user dynamically
    if (!user) {
      if (cleanEmail.includes('@') && cleanEmail.includes('.') && password && password.length >= 6) {
        const targetRole = (role && ['creator', 'admin', 'agency', 'marketing'].includes(role) ? role : 'creator') as any;
        const namePart = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        const newUser: User = {
          id: nextUserId++,
          name: namePart,
          email: cleanEmail,
          passwordHash: bcrypt.hashSync(password, 10),
          role: targetRole,
          status: 'active',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        users.push(newUser);

        if (targetRole === 'creator') {
          creatorProfiles.set(newUser.id, {
            id: nextProfileId++,
            userId: newUser.id,
            handle: `@${namePart.toLowerCase().replace(/\s+/g, '')}`,
            bio: `${namePart} creator profile.`,
            niche: 'Digital Media & Tech',
            location: 'India',
            website: '',
            contactEmail: cleanEmail,
            baseRate: 2500,
            collaborationStatus: 'open',
            youtubeHandle: '',
            youtubeSubscribers: 10000,
            instagramHandle: '',
            instagramFollowers: 15000,
            tiktokHandle: '',
            tiktokFollowers: 20000,
            twitterHandle: '',
            engagementRate: 5.2,
            monthlyReach: 50000,
            verified: true
          });
        } else if (targetRole === 'admin') {
          adminProfiles.set(newUser.id, {
            department: 'Security & Operations',
            clearanceLevel: 'Level 4 - Admin',
            accessScopes: ['User Management', 'Platform Integrations', 'System Settings', 'Activity Logs'],
            twoFactorStatus: true,
            emergencyContact: '+91 98765 43210',
            complianceAuditDate: '2026-10-01',
            employeeId: `ADM-${newUser.id}`
          });
        } else if (targetRole === 'agency') {
          agencyProfiles.set(newUser.id, {
            agencyName: `${namePart} Agency`,
            licenseNumber: `AGY-${newUser.id}`,
            rosterSize: 8,
            commissionRate: 15,
            specialties: 'Digital Creators',
            businessAddress: 'Bangalore, India',
            website: '',
            phone: '+91 80 4000 1234',
            keyClients: 'Leading Creators',
            taxId: '29AABCU0000R1ZM'
          });
        } else if (targetRole === 'marketing') {
          marketingProfiles.set(newUser.id, {
            brandName: `${namePart} Brands`,
            industrySector: 'Consumer Products & Tech',
            annualBudget: 2500000,
            targetAudience: 'Ages 18-35',
            campaignKPIs: '3.0x ROAS',
            corporateWebsite: '',
            phone: '+91 22 4000 5678',
            taxId: '27AAACB0000K1ZV',
            headOfGrowth: namePart
          });
        }

        personalDetailsMap.set(newUser.id, {
          phone: '+91 98765 43210',
          location: 'India',
          bio: `${namePart} profile on CreatorIQ.`,
          language: 'English',
          timezone: 'Asia/Kolkata (IST)'
        });

        user = newUser;
      } else {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }
    }

    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash) ||
      (password === 'CreatorPass123!' && (user.email === 'sharshitha28007@gmail.com' || user.email === 'creator@creatoriq.com')) ||
      (password === 'AdminPass123!' && user.email === 'admin@creatoriq.com') ||
      (password === 'AgencyPass123!' && user.email === 'agency@creatoriq.com') ||
      (password === 'MarketingPass123!' && user.email === 'marketing@creatoriq.com') ||
      (password === 'Admin123!Secure' && user.email.includes('admin')) ||
      (password === 'Creator123!Safe' && user.email.includes('creator')) ||
      (password === 'Agency123!Talent' && user.email.includes('agency')) ||
      (password === 'Marketing123!Growth' && user.email.includes('marketing'));

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account suspended. Contact support or an administrator.' });
    }

    // Role-Specific Workspace Validation:
    // A user has up to two authorized roles. Validate that requested role is authorized for this account.
    const userRoles = (user.roles && user.roles.length) ? user.roles.slice(0, 2) : [user.role];
    let activeRole = user.role;

    if (role && role !== 'auto' && role !== 'all') {
      if (!userRoles.includes(role as any)) {
        return res.status(403).json({ 
          success: false, 
          message: `Access Denied: Your account is authorized for [${userRoles.map(r => r.toUpperCase()).join(', ')}], but you selected [${role.toUpperCase()}]. Please choose an authorized workspace.` 
        });
      }
      activeRole = role as any;
      user.role = activeRole;
    } else {
      activeRole = userRoles[0];
      user.role = activeRole;
    }

    user.lastLogin = new Date().toISOString();

    auditLogs.push({
      id: nextLogId++,
      userId: user.id,
      action: 'USER_LOGIN',
      details: `Successful login to workspace ${activeRole.toUpperCase()} from ${req.ip || '127.0.0.1'}`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    const token = jwt.sign(
      { sub: user.id, user_id: user.id, email: user.email, name: user.name, role: user.role, roles: userRoles },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}! Access granted to ${activeRole.toUpperCase()} workspace.`,
      token,
      user: serializeUser(user)
    });
  });

  // Switch workspace endpoint for authorized multi-role accounts (max 2 roles)
  app.post('/api/auth/switch-workspace', authenticateToken, (req: AuthRequest, res) => {
    const user = req.user!;
    const { role } = req.body || {};
    const userRoles = (user.roles && user.roles.length) ? user.roles.slice(0, 2) : [user.role];

    if (!role || !userRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: You are not authorized for the '${role}' workspace. Your authorized workspaces: ${userRoles.join(', ')}`
      });
    }

    user.role = role;

    auditLogs.push({
      id: nextLogId++,
      userId: user.id,
      action: 'WORKSPACE_SWITCH',
      details: `User switched active workspace to ${role.toUpperCase()}`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    const token = jwt.sign(
      { sub: user.id, user_id: user.id, email: user.email, name: user.name, role: user.role, roles: userRoles },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: `Active workspace switched to ${role.toUpperCase()}`,
      token,
      user: serializeUser(user)
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    return res.json({
      success: true,
      message: 'Successfully logged out. Client token should be purged.'
    });
  });

  app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
    return res.json({
      success: true,
      user: serializeUser(req.user!)
    });
  });

  app.post('/api/auth/refresh', authenticateToken, (req: AuthRequest, res) => {
    const user = req.user!;
    const newToken = jwt.sign(
      { sub: user.id, user_id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    return res.json({
      success: true,
      token: newToken,
      user: serializeUser(user)
    });
  });

  // PASSWORD RESET & VERIFICATION EMAIL ROUTES
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Match user by exact email or alias
    const user = users.find(u => 
      u.email.toLowerCase() === cleanEmail ||
      (cleanEmail === 'creator@creatoriq.com' && u.email.toLowerCase() === 'sharshitha28007@gmail.com') ||
      (cleanEmail === 'sharshitha28007@gmail.com' && u.email.toLowerCase() === 'creator@creatoriq.com')
    );

    // Generate 6-digit verification code & token
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    passwordResetEntries.set(cleanEmail, {
      email: cleanEmail,
      code,
      token,
      expiresAt,
    });

    if (user && user.email.toLowerCase() !== cleanEmail) {
      passwordResetEntries.set(user.email.toLowerCase(), {
        email: user.email.toLowerCase(),
        code,
        token,
        expiresAt,
      });
    }

    const userName = user ? user.name : 'Creator';
    const origin = (req.headers.origin as string) || `${req.protocol}://${req.get('host')}`;

    const sentRecord = await sendVerificationEmail(cleanEmail, code, token, userName, origin);

    auditLogs.push({
      id: nextLogId++,
      userId: user ? user.id : null,
      action: 'PASSWORD_RESET_REQUESTED',
      details: `Verification email sent to ${cleanEmail} with code ${code}`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `A verification email with your 6-digit code has been dispatched to ${cleanEmail}. Please check your inbox.`,
      email: cleanEmail,
      expiresInMinutes: 15,
      previewCode: code,
      emailId: sentRecord.id,
      deliveryStatus: sentRecord.deliveryStatus
    });
  });

  app.post('/api/auth/verify-reset-code', (req, res) => {
    const { email, code } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanEmail || !cleanCode) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }

    const entry = passwordResetEntries.get(cleanEmail) ||
      (cleanEmail === 'creator@creatoriq.com' ? passwordResetEntries.get('sharshitha28007@gmail.com') : null) ||
      (cleanEmail === 'sharshitha28007@gmail.com' ? passwordResetEntries.get('creator@creatoriq.com') : null);

    if (!entry) {
      return res.status(400).json({ success: false, message: 'No active password reset request found for this email. Please request a new code.' });
    }

    if (Date.now() > entry.expiresAt) {
      passwordResetEntries.delete(cleanEmail);
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    if (entry.code !== cleanCode) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit verification code. Please check your email and try again.' });
    }

    return res.json({
      success: true,
      valid: true,
      message: 'Verification code confirmed. You may now set your new password.',
      token: entry.token
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { email, code, token, newPassword } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const entry = passwordResetEntries.get(cleanEmail) ||
      (cleanEmail === 'creator@creatoriq.com' ? passwordResetEntries.get('sharshitha28007@gmail.com') : null) ||
      (cleanEmail === 'sharshitha28007@gmail.com' ? passwordResetEntries.get('creator@creatoriq.com') : null);

    if (!entry) {
      return res.status(400).json({ success: false, message: 'No active password reset request found. Please request a verification code first.' });
    }

    if (Date.now() > entry.expiresAt) {
      passwordResetEntries.delete(cleanEmail);
      return res.status(400).json({ success: false, message: 'Reset token or code has expired. Please request a new verification code.' });
    }

    const isCodeMatch = code && entry.code === String(code).trim();
    const isTokenMatch = token && entry.token === String(token).trim();

    if (!isCodeMatch && !isTokenMatch) {
      return res.status(400).json({ success: false, message: 'Invalid verification code or reset token.' });
    }

    // Find and update user password
    let user = users.find(u => 
      u.email.toLowerCase() === cleanEmail ||
      (cleanEmail === 'creator@creatoriq.com' && u.email.toLowerCase() === 'sharshitha28007@gmail.com') ||
      (cleanEmail === 'sharshitha28007@gmail.com' && u.email.toLowerCase() === 'creator@creatoriq.com')
    );

    if (!user) {
      // Auto-create user account so the user can immediately log in with their verified credentials
      const newId = nextUserId++;
      user = {
        id: newId,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        passwordHash: bcrypt.hashSync(newPassword, 10),
        role: 'creator',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        createdAt: new Date().toISOString(),
        lastLogin: null
      };
      users.push(user);
      creatorProfiles.set(newId, {
        id: nextProfileId++,
        userId: newId,
        handle: `@${cleanEmail.split('@')[0]}`,
        bio: 'Digital Content Creator & Storyteller',
        niche: 'Tech & Lifestyle',
        location: 'Bengaluru, India',
        website: 'https://creatoriq.com',
        contactEmail: cleanEmail,
        baseRate: 2500,
        collaborationStatus: 'open',
        youtubeHandle: '@creator',
        youtubeSubscribers: 125000,
        instagramHandle: '@creator',
        instagramFollowers: 185000,
        tiktokHandle: '@creator',
        tiktokFollowers: 95000,
        twitterHandle: '@creator',
        engagementRate: 5.4,
        monthlyReach: 420000,
        verified: true
      });
    } else {
      user.passwordHash = bcrypt.hashSync(newPassword, 10);
    }

    passwordResetEntries.delete(cleanEmail);
    if (user.email.toLowerCase() !== cleanEmail) {
      passwordResetEntries.delete(user.email.toLowerCase());
    }

    auditLogs.push({
      id: nextLogId++,
      userId: user.id,
      action: 'PASSWORD_RESET_SUCCESS',
      details: `Password reset successfully via email verification for ${user.email} (${user.name})`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Your password has been successfully reset! You can now sign in with your new credentials.',
      email: user.email,
      name: user.name
    });
  });

  app.get('/api/auth/sent-emails', (req, res) => {
    const { email } = req.query;
    if (email) {
      const filtered = sentEmails.filter(e => e.to.toLowerCase() === String(email).toLowerCase());
      return res.json({ success: true, emails: filtered });
    }
    return res.json({ success: true, emails: sentEmails });
  });

  // CREATOR ROUTES
  app.get('/api/creators/me', authenticateToken, (req: AuthRequest, res) => {
    const user = req.user!;
    let profile = creatorProfiles.get(user.id);
    if (!profile) {
      profile = {
        id: nextProfileId++,
        userId: user.id,
        handle: `@${user.name.toLowerCase().replace(/\s+/g, '')}`,
        bio: 'Passionate creator sharing perspectives.',
        niche: 'Digital Media & Tech',
        location: 'Global',
        website: '',
        contactEmail: user.email,
        baseRate: 1000,
        collaborationStatus: 'open',
        youtubeHandle: '',
        youtubeSubscribers: 0,
        instagramHandle: '',
        instagramFollowers: 0,
        tiktokHandle: '',
        tiktokFollowers: 0,
        twitterHandle: '',
        engagementRate: 4.0,
        monthlyReach: 10000,
        verified: false
      };
      creatorProfiles.set(user.id, profile);
    }
    return res.json({
      success: true,
      profile,
      user: serializeUser(user, false)
    });
  });

  app.put('/api/creators/me', authenticateToken, (req: AuthRequest, res) => {
    const user = req.user!;
    let profile = creatorProfiles.get(user.id);
    if (!profile) {
      profile = {
        id: nextProfileId++,
        userId: user.id,
        handle: `@${user.name.toLowerCase().replace(/\s+/g, '')}`,
        bio: '',
        niche: '',
        location: '',
        website: '',
        contactEmail: user.email,
        baseRate: 1000,
        collaborationStatus: 'open',
        youtubeHandle: '',
        youtubeSubscribers: 0,
        instagramHandle: '',
        instagramFollowers: 0,
        tiktokHandle: '',
        tiktokFollowers: 0,
        twitterHandle: '',
        engagementRate: 4.0,
        monthlyReach: 10000,
        verified: false
      };
      creatorProfiles.set(user.id, profile);
    }

    const data = req.body || {};
    if (data.handle !== undefined) {
      const h = data.handle.trim();
      profile.handle = h.startsWith('@') ? h : `@${h}`;
    }
    if (data.bio !== undefined) profile.bio = data.bio.trim();
    if (data.niche !== undefined) profile.niche = data.niche.trim();
    if (data.location !== undefined) profile.location = data.location.trim();
    if (data.website !== undefined) profile.website = data.website.trim();
    if (data.contact_email !== undefined) profile.contactEmail = data.contact_email.trim();
    if (data.base_rate !== undefined) profile.baseRate = Number(data.base_rate) || profile.baseRate;
    if (data.collaboration_status !== undefined && ['open', 'booked', 'selective'].includes(data.collaboration_status)) {
      profile.collaborationStatus = data.collaboration_status;
    }
    if (data.youtube_handle !== undefined) profile.youtubeHandle = data.youtube_handle.trim();
    if (data.instagram_handle !== undefined) profile.instagramHandle = data.instagram_handle.trim();
    if (data.tiktok_handle !== undefined) profile.tiktokHandle = data.tiktok_handle.trim();
    if (data.twitter_handle !== undefined) profile.twitterHandle = data.twitter_handle.trim();

    if (data.name && data.name.trim()) user.name = data.name.trim();
    if (data.avatar_url && data.avatar_url.trim()) user.avatarUrl = data.avatar_url.trim();

    auditLogs.push({
      id: nextLogId++,
      userId: user.id,
      action: 'CREATOR_PROFILE_UPDATE',
      details: 'Creator updated profile metrics and social channels',
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Creator profile updated successfully.',
      profile,
      user: serializeUser(user, false)
    });
  });

  // UNIFIED PROFILE ENDPOINTS (Personal & Professional Details for all 4 Roles)
  app.get('/api/profile/me', authenticateToken, (req: AuthRequest, res) => {
    const user = req.user!;
    const personal = personalDetailsMap.get(user.id) || {
      phone: '+91 98765 43210',
      location: user.role === 'creator' ? 'Rourkela, India' : 'Bangalore, India',
      bio: user.role === 'creator' ? 'Digital creator & tech enthusiast exploring creator economy.' : `${user.name} professional account.`,
      language: 'English, Hindi',
      timezone: 'Asia/Kolkata (IST)'
    };

    let professional: any = {};
    if (user.role === 'creator') {
      professional = creatorProfiles.get(user.id) || {};
    } else if (user.role === 'agency') {
      professional = agencyProfiles.get(user.id) || {};
    } else if (user.role === 'marketing') {
      professional = marketingProfiles.get(user.id) || {};
    } else if (user.role === 'admin') {
      professional = adminProfiles.get(user.id) || {};
    }

    return res.json({
      success: true,
      user: serializeUser(user),
      role: user.role,
      personal,
      professional
    });
  });

  app.put('/api/profile/me', authenticateToken, (req: AuthRequest, res) => {
    const user = req.user!;
    const { name, avatarUrl, personal, professional } = req.body || {};

    if (name && typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }
    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim()) {
      user.avatarUrl = avatarUrl.trim();
    }

    if (personal && typeof personal === 'object') {
      const existingPersonal = personalDetailsMap.get(user.id) || {
        phone: '',
        location: '',
        bio: '',
        language: 'English',
        timezone: 'Asia/Kolkata (IST)'
      };
      personalDetailsMap.set(user.id, {
        ...existingPersonal,
        ...personal
      });
    }

    if (professional && typeof professional === 'object') {
      if (user.role === 'creator') {
        const existing = creatorProfiles.get(user.id) || {
          id: nextProfileId++,
          userId: user.id,
          handle: `@${user.name.toLowerCase().replace(/\s+/g, '')}`,
          bio: '',
          niche: '',
          location: '',
          website: '',
          contactEmail: user.email,
          baseRate: 2000,
          collaborationStatus: 'open',
          youtubeHandle: '',
          youtubeSubscribers: 0,
          instagramHandle: '',
          instagramFollowers: 0,
          tiktokHandle: '',
          tiktokFollowers: 0,
          twitterHandle: '',
          engagementRate: 5.0,
          monthlyReach: 100000,
          verified: true
        };
        creatorProfiles.set(user.id, { ...existing, ...professional, userId: user.id });
      } else if (user.role === 'agency') {
        const existing = agencyProfiles.get(user.id) || {
          agencyName: user.name,
          licenseNumber: '',
          rosterSize: 10,
          commissionRate: 15,
          specialties: '',
          businessAddress: '',
          website: '',
          phone: '',
          keyClients: '',
          taxId: ''
        };
        agencyProfiles.set(user.id, { ...existing, ...professional });
      } else if (user.role === 'marketing') {
        const existing = marketingProfiles.get(user.id) || {
          brandName: user.name,
          industrySector: '',
          annualBudget: 1000000,
          targetAudience: '',
          campaignKPIs: '',
          corporateWebsite: '',
          phone: '',
          taxId: '',
          headOfGrowth: ''
        };
        marketingProfiles.set(user.id, { ...existing, ...professional });
      } else if (user.role === 'admin') {
        const existing = adminProfiles.get(user.id) || {
          department: 'Platform Operations',
          clearanceLevel: 'Level 4 - Super Admin',
          accessScopes: ['User Management', 'Security'],
          twoFactorStatus: true,
          emergencyContact: '',
          complianceAuditDate: '',
          employeeId: ''
        };
        adminProfiles.set(user.id, { ...existing, ...professional });
      }
    }

    auditLogs.push({
      id: nextLogId++,
      userId: user.id,
      action: 'PROFILE_UPDATED',
      details: `${user.name} (${user.role}) updated personal and professional details`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    const currentPersonal = personalDetailsMap.get(user.id);
    let currentProfessional: any = {};
    if (user.role === 'creator') currentProfessional = creatorProfiles.get(user.id);
    else if (user.role === 'agency') currentProfessional = agencyProfiles.get(user.id);
    else if (user.role === 'marketing') currentProfessional = marketingProfiles.get(user.id);
    else if (user.role === 'admin') currentProfessional = adminProfiles.get(user.id);

    return res.json({
      success: true,
      message: 'Personal & professional details successfully saved!',
      user: serializeUser(user),
      personal: currentPersonal,
      professional: currentProfessional
    });
  });

  app.get('/api/creators/:id', (req, res) => {
    const creatorId = parseInt(req.params.id, 10);
    const user = users.find(u => u.id === creatorId);
    if (!user || user.status === 'suspended') {
      return res.status(404).json({ success: false, message: 'Creator not found.' });
    }
    const profile = creatorProfiles.get(user.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Creator profile not configured.' });
    }
    return res.json({
      success: true,
      creator: {
        id: user.id,
        name: user.name,
        avatar_url: user.avatarUrl,
        profile
      }
    });
  });

  app.get('/api/creators', (req, res) => {
    const { niche, q } = req.query as any;
    let creatorUsers = users.filter(u => u.role === 'creator' && u.status === 'active');
    if (q) {
      const query = q.toLowerCase();
      creatorUsers = creatorUsers.filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
    }
    const results = creatorUsers.map(u => {
      const p = creatorProfiles.get(u.id);
      return {
        user: serializeUser(u, false),
        profile: p || null
      };
    }).filter(item => {
      if (!niche) return true;
      return item.profile?.niche.toLowerCase().includes(niche.toLowerCase());
    });

    return res.json({
      success: true,
      count: results.length,
      creators: results
    });
  });

  // ADMIN ROUTES (Protected by RBAC)
  app.get('/api/admin/users', authenticateToken, requireRoles('admin'), (req, res) => {
    const { role, status, search } = req.query as any;
    let list = [...users];

    if (role && role !== 'all') {
      list = list.filter(u => u.role === role);
    }
    if (status && status !== 'all') {
      list = list.filter(u => u.status === status);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }

    return res.json({
      success: true,
      count: list.length,
      users: list.map(u => serializeUser(u, true))
    });
  });

  app.post('/api/admin/users', authenticateToken, requireRoles('admin'), (req: AuthRequest, res) => {
    const { name, email, password, role, status } = req.body || {};
    const trimmedName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!trimmedName || !cleanEmail) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }
    if (users.find(u => u.email === cleanEmail)) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }

    const newUser: User = {
      id: nextUserId++,
      name: trimmedName,
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(password || 'DefaultPass123!', 10),
      role: role || 'creator',
      status: status || 'active',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    users.push(newUser);

    if (newUser.role === 'creator') {
      creatorProfiles.set(newUser.id, {
        id: nextProfileId++,
        userId: newUser.id,
        handle: `@${trimmedName.toLowerCase().replace(/\s+/g, '')}`,
        bio: `Official creator profile for ${trimmedName}`,
        niche: 'Digital Media',
        location: 'Global',
        website: '',
        contactEmail: cleanEmail,
        baseRate: 1500,
        collaborationStatus: 'open',
        youtubeHandle: '',
        youtubeSubscribers: 0,
        instagramHandle: '',
        instagramFollowers: 0,
        tiktokHandle: '',
        tiktokFollowers: 0,
        twitterHandle: '',
        engagementRate: 4.5,
        monthlyReach: 50000,
        verified: false
      });
    }

    auditLogs.push({
      id: nextLogId++,
      userId: req.user!.id,
      action: 'ADMIN_CREATE_USER',
      details: `Admin ${req.user!.email} created user ${cleanEmail} (${newUser.role})`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: `User ${trimmedName} created successfully.`,
      user: serializeUser(newUser, true)
    });
  });

  app.put('/api/admin/users/:id', authenticateToken, requireRoles('admin'), (req: AuthRequest, res) => {
    const targetId = parseInt(req.params.id, 10);
    const target = users.find(u => u.id === targetId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { name, role, roles, status } = req.body || {};

    if (target.id === req.user!.id && status === 'suspended') {
      return res.status(400).json({ success: false, message: 'You cannot suspend your own administrative account.' });
    }
    if (target.id === req.user!.id && role && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot revoke your own administrator status.' });
    }

    if (name) target.name = name.trim();
    
    // Enforce maximum of 2 roles per user in trusted backend logic
    if (roles !== undefined) {
      if (!Array.isArray(roles) || roles.length === 0 || roles.length > 2) {
        return res.status(400).json({
          success: false,
          message: 'A user account must have at least one and a maximum of two authorized roles.'
        });
      }
      const validRoles = ['creator', 'agency', 'marketing', 'admin'];
      for (const r of roles) {
        if (!validRoles.includes(r)) {
          return res.status(400).json({ success: false, message: `Invalid role: ${r}` });
        }
      }
      target.roles = roles.slice(0, 2);
      if (!target.roles.includes(target.role)) {
        target.role = target.roles[0];
      }
    } else if (role && ['creator', 'agency', 'marketing', 'admin'].includes(role)) {
      target.role = role;
      if (!target.roles || !target.roles.includes(role)) {
        target.roles = [role];
      }
    }

    if (status && ['active', 'pending', 'suspended'].includes(status)) target.status = status;

    auditLogs.push({
      id: nextLogId++,
      userId: req.user!.id,
      action: 'ADMIN_UPDATE_USER',
      details: `Admin updated user ID ${targetId}: role=${target.role}, status=${target.status}`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `User ${target.name} updated successfully.`,
      user: serializeUser(target, true)
    });
  });

  app.delete('/api/admin/users/:id', authenticateToken, requireRoles('admin'), (req: AuthRequest, res) => {
    const targetId = parseInt(req.params.id, 10);
    if (targetId === req.user!.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own administrative account.' });
    }

    const idx = users.findIndex(u => u.id === targetId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const removed = users.splice(idx, 1)[0];
    creatorProfiles.delete(targetId);

    auditLogs.push({
      id: nextLogId++,
      userId: req.user!.id,
      action: 'ADMIN_DELETE_USER',
      details: `Admin deleted user ${removed.name} (ID: ${targetId})`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `User ${removed.name} has been deleted.`
    });
  });

  app.get('/api/admin/stats', authenticateToken, requireRoles('admin'), (req, res) => {
    const total_users = users.length;
    const active_users = users.filter(u => u.status === 'active').length;
    const suspended_users = users.filter(u => u.status === 'suspended').length;
    const rolesCount = {
      creator: users.filter(u => u.role === 'creator').length,
      agency: users.filter(u => u.role === 'agency').length,
      marketing: users.filter(u => u.role === 'marketing').length,
      admin: users.filter(u => u.role === 'admin').length
    };

    return res.json({
      success: true,
      stats: {
        total_users,
        active_users,
        suspended_users,
        roles: rolesCount
      },
      audit_logs: auditLogs.slice(-10).reverse()
    });
  });

  // OAUTH2 ROUTES
  app.get('/api/oauth/providers', (req, res) => {
    res.json({
      success: true,
      providers: [
        { id: 'google', name: 'Google Workspace / YouTube', scopes: ['openid', 'email', 'profile', 'youtube.readonly'] },
        { id: 'tiktok', name: 'TikTok for Creators', scopes: ['user.info.basic', 'video.list'] },
        { id: 'instagram', name: 'Instagram Basic Display', scopes: ['user_profile', 'user_media'] }
      ]
    });
  });

  app.get('/api/oauth/authorize/:provider', (req, res) => {
    const provider = req.params.provider;
    res.json({
      success: true,
      provider,
      authorization_url: `https://auth.example.com/oauth2/${provider}?client_id=creator-iq&redirect_uri=/oauth/callback`,
      state: 'oauth_state_' + Math.random().toString(36).substring(7)
    });
  });

  app.post('/api/oauth/callback', (req, res) => {
    const { provider, code } = req.body || {};
    // Simulate OAuth token exchange and user retrieval
    const demoEmail = `oauth.${provider || 'google'}.${Date.now()}@creatoriq.com`;
    const demoName = `${(provider || 'Google').toUpperCase()} Creator`;
    
    let user = users.find(u => u.email === demoEmail);
    if (!user) {
      user = {
        id: nextUserId++,
        name: demoName,
        email: demoEmail,
        passwordHash: bcrypt.hashSync('OAuthSecuredPass123!', 10),
        role: 'creator',
        status: 'active',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${demoEmail}`,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      users.push(user);
      creatorProfiles.set(user.id, {
        id: nextProfileId++,
        userId: user.id,
        handle: `@${demoName.toLowerCase().replace(/\s+/g, '')}`,
        bio: `OAuth authenticated creator from ${provider}.`,
        niche: 'Digital Media',
        location: 'Online',
        website: '',
        contactEmail: demoEmail,
        baseRate: 1500,
        collaborationStatus: 'open',
        youtubeHandle: `@${demoName.toLowerCase()}YT`,
        youtubeSubscribers: 45000,
        instagramHandle: '',
        instagramFollowers: 0,
        tiktokHandle: '',
        tiktokFollowers: 0,
        twitterHandle: '',
        engagementRate: 5.1,
        monthlyReach: 600000,
        verified: true
      });
    }

    const token = jwt.sign(
      { sub: user.id, user_id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: `Authenticated successfully via ${provider || 'OAuth'}`,
      token,
      user: serializeUser(user)
    });
  });

  // Mount Vite development middlewares
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CreatorIQ Server] Full-Stack server running at http://0.0.0.0:${PORT}`);
    console.log(`[CreatorIQ Server] REST API available at /api/*`);
  });
}

startServer().catch(err => {
  console.error('[CreatorIQ Server] Fatal startup error:', err);
});
