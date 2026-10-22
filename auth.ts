export type UserRole = 'creator' | 'agency' | 'marketing' | 'admin';
export type UserStatus = 'active' | 'pending' | 'suspended';

export interface CreatorProfile {
  id?: number;
  userId?: number;
  handle?: string;
  bio?: string;
  niche?: string;
  location?: string;
  website?: string;
  contactEmail?: string;
  baseRate?: number;
  collaborationStatus?: 'open' | 'booked' | 'selective';
  youtubeHandle?: string;
  youtubeSubscribers?: number;
  instagramHandle?: string;
  instagramFollowers?: number;
  tiktokHandle?: string;
  tiktokFollowers?: number;
  twitterHandle?: string;
  engagementRate?: number;
  monthlyReach?: number;
  verified?: boolean;
}

export interface AgencyProfile {
  agencyName?: string;
  licenseNumber?: string;
  rosterSize?: number;
  commissionRate?: number;
  specialties?: string;
  businessAddress?: string;
  website?: string;
  phone?: string;
  keyClients?: string;
  taxId?: string;
}

export interface MarketingProfile {
  brandName?: string;
  industrySector?: string;
  annualBudget?: number;
  targetAudience?: string;
  campaignKPIs?: string;
  corporateWebsite?: string;
  phone?: string;
  taxId?: string;
  headOfGrowth?: string;
}

export interface AdminProfile {
  department?: string;
  clearanceLevel?: string;
  accessScopes?: string[];
  twoFactorStatus?: boolean;
  emergencyContact?: string;
  complianceAuditDate?: string;
  employeeId?: string;
}

export interface PersonalDetails {
  phone?: string;
  location?: string;
  bio?: string;
  language?: string;
  timezone?: string;
}

export interface User {
  id: number | string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  status: UserStatus;
  avatar_url: string;
  created_at: string;
  last_login: string | null;
  email_verified?: boolean;
  creator_profile?: CreatorProfile;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  role: UserRole;
  roles?: UserRole[];
  niche?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  role?: UserRole | string;
}

export interface ProfileUpdatePayload {
  name?: string;
  avatar_url?: string;
  personal?: PersonalDetails;
  professional?: any;
  handle?: string;
  bio?: string;
  niche?: string;
  location?: string;
  website?: string;
  contact_email?: string;
  base_rate?: number;
  collaboration_status?: 'open' | 'booked' | 'selective';
  youtube_handle?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  twitter_handle?: string;
}

export interface AdminUserUpdatePayload {
  name?: string;
  role?: UserRole;
  roles?: UserRole[];
  status?: UserStatus;
  password?: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  details: string;
  ip_address?: string;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  suspended_users: number;
  roles: {
    creator: number;
    agency: number;
    marketing: number;
    admin: number;
  };
  registrations_last_30_days: number;
  audit_logs?: AuditLog[];
}

export interface Campaign {
  id: number;
  title: string;
  clientOrBrand: string;
  agencyId?: number;
  marketingId?: number;
  budget: number;
  spend: number;
  status: 'draft' | 'active' | 'in_review' | 'completed';
  startDate: string;
  endDate: string;
  assignedCreators: string[];
  reach: number;
  engagement: number;
  impressions: number;
  roas?: number;
  deliverablesCount: number;
}

export interface ContentItem {
  id: number;
  creatorId: number;
  title: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'linkedin';
  type: 'video' | 'post' | 'reel' | 'article' | 'short';
  publishedAt?: string;
  scheduledDate?: string;
  status: 'published' | 'scheduled' | 'draft';
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  revenue?: number;
  url?: string;
}

export interface TaskItem {
  id: number;
  title: string;
  campaignId: number;
  campaignTitle: string;
  assignee: string;
  dueDate: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface NotificationItem {
  id: number;
  userId?: number;
  role?: UserRole | 'all';
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'viral' | 'deal' | 'system' | 'campaign';
}

export interface SystemSettings {
  sessionTimeoutMinutes: number;
  allowPublicRegistration: boolean;
  requireTwoFactor: boolean;
  maintenanceMode: boolean;
}
