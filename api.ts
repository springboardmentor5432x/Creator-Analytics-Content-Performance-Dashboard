import { getApiBaseUrl, getToken } from '../config/api';
import { 
  AuthResponse, 
  LoginPayload, 
  RegisterPayload, 
  User, 
  UserRole,
  CreatorProfile, 
  PersonalDetails,
  ProfileUpdatePayload,
  AdminUserUpdatePayload,
  AdminStats,
  AuditLog,
  Campaign,
  ContentItem,
  TaskItem,
  NotificationItem,
  SystemSettings
} from '../types/auth';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    let data: any = {};
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      const errorMessage = data?.message || `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.message || 'Unable to connect to the backend server. Please verify the API URL.',
      0
    );
  }
}

// Authentication Service
export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    return apiFetch<{ success: boolean; user: User }>('/auth/me');
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      return await apiFetch<{ success: boolean; message: string }>('/auth/logout', {
        method: 'POST'
      });
    } catch {
      return { success: true, message: 'Logged out' };
    }
  },

  async switchWorkspace(role: UserRole): Promise<{ success: boolean; message: string; token: string; user: User }> {
    return apiFetch<{ success: boolean; message: string; token: string; user: User }>('/auth/switch-workspace', {
      method: 'POST',
      body: JSON.stringify({ role })
    });
  },

  async refreshToken(): Promise<{ success: boolean; token: string; user: User }> {
    return apiFetch<{ success: boolean; token: string; user: User }>('/auth/refresh', {
      method: 'POST'
    });
  },

  async forgotPassword(email: string): Promise<{
    success: boolean;
    message: string;
    email: string;
    expiresInMinutes: number;
    previewCode?: string;
    emailId?: string;
    deliveryStatus?: 'sent' | 'simulated';
  }> {
    return apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async verifyResetCode(email: string, code: string): Promise<{
    success: boolean;
    valid: boolean;
    message: string;
    token?: string;
  }> {
    return apiFetch('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
  },

  async resetPassword(payload: {
    email: string;
    code?: string;
    token?: string;
    newPassword: string;
  }): Promise<{
    success: boolean;
    message: string;
    email: string;
    name?: string;
  }> {
    return apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getSentEmails(email?: string): Promise<{
    success: boolean;
    emails: Array<{
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
    }>;
  }> {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return apiFetch(`/auth/sent-emails${query}`);
  }
};

// Creator Service
export const creatorService = {
  async getOverview(): Promise<{
    success: boolean;
    stats: {
      totalContentPublished: number;
      totalReach: number;
      totalImpressions: number;
      totalEngagement: number;
      totalFollowers: number;
      engagementRate: number;
      totalRevenue: number;
      followersGrowthRate: string;
      viewsGrowthRate: string;
    };
    profile?: CreatorProfile;
  }> {
    return apiFetch('/creator/overview');
  },

  async getContent(platform?: string, status?: string): Promise<{ success: boolean; count: number; content: ContentItem[] }> {
    const params = new URLSearchParams();
    if (platform && platform !== 'all') params.set('platform', platform);
    if (status && status !== 'all') params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/creator/content${query}`);
  },

  async createContent(payload: {
    title: string;
    platform: string;
    type?: string;
    status?: string;
    scheduledDate?: string;
  }): Promise<{ success: boolean; message: string; content: ContentItem }> {
    return apiFetch('/creator/content', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteContent(id: number): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/creator/content/${id}`, {
      method: 'DELETE'
    });
  },

  async getMyProfile(): Promise<{ success: boolean; profile: CreatorProfile; user: User }> {
    return apiFetch<{ success: boolean; profile: CreatorProfile; user: User }>('/creators/me');
  },

  async updateMyProfile(payload: ProfileUpdatePayload): Promise<{ success: boolean; message: string; profile: CreatorProfile; user: User }> {
    return apiFetch<{ success: boolean; message: string; profile: CreatorProfile; user: User }>('/creators/me', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async listCreators(niche?: string, search?: string): Promise<{ success: boolean; count: number; creators: Array<{ user: User; profile: CreatorProfile | null }> }> {
    const params = new URLSearchParams();
    if (niche) params.set('niche', niche);
    if (search) params.set('q', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ success: boolean; count: number; creators: Array<{ user: User; profile: CreatorProfile | null }> }>(`/creators${query}`);
  }
};

// Agency Service
export const agencyService = {
  async getOverview(): Promise<{
    success: boolean;
    stats: {
      totalCreators: number;
      totalFollowers: string;
      totalViews: string;
      activeCampaigns: number;
      totalRevenue: string;
      revenueGrowth: string;
    };
    profile?: any;
  }> {
    return apiFetch('/agency/overview');
  },

  async getCampaigns(): Promise<{ success: boolean; campaigns: Campaign[] }> {
    return apiFetch('/agency/campaigns');
  },

  async createCampaign(payload: {
    title: string;
    clientOrBrand: string;
    budget: number;
    startDate?: string;
    endDate?: string;
    assignedCreators?: string[];
  }): Promise<{ success: boolean; message: string; campaign: Campaign }> {
    return apiFetch('/agency/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateCampaign(id: number, payload: {
    status?: string;
    spend?: number;
    budget?: number;
  }): Promise<{ success: boolean; message: string; campaign: Campaign }> {
    return apiFetch(`/agency/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async getCreators(): Promise<{
    success: boolean;
    count: number;
    creators: Array<{
      id: number;
      name: string;
      handle: string;
      followers: string;
      niche: string;
      engagement: string;
      rate: string;
      status: string;
      activeCampaigns: number;
    }>;
  }> {
    return apiFetch('/agency/creators');
  },

  async getTasks(): Promise<{ success: boolean; tasks: TaskItem[] }> {
    return apiFetch('/agency/tasks');
  },

  async createTask(payload: {
    title: string;
    campaignId?: number;
    campaignTitle?: string;
    assignee?: string;
    dueDate?: string;
    priority?: string;
  }): Promise<{ success: boolean; message: string; task: TaskItem }> {
    return apiFetch('/agency/tasks', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async toggleTask(id: number): Promise<{ success: boolean; message: string; task: TaskItem }> {
    return apiFetch(`/agency/tasks/${id}/toggle`, {
      method: 'PUT'
    });
  }
};

// Marketing Service
export const marketingService = {
  async getOverview(): Promise<{
    success: boolean;
    stats: {
      totalCampaigns: number;
      activeCampaigns: number;
      totalReach: string;
      totalEngagement: string;
      totalSpend: string;
      roi: string;
      reachGrowth: string;
      engagementGrowth: string;
    };
    profile?: any;
  }> {
    return apiFetch('/marketing/overview');
  },

  async getCampaigns(): Promise<{ success: boolean; campaigns: Campaign[] }> {
    return apiFetch('/agency/campaigns');
  },

  async createCampaign(payload: {
    title: string;
    clientOrBrand: string;
    budget: number;
    startDate?: string;
    endDate?: string;
    assignedCreators?: string[];
  }): Promise<{ success: boolean; message: string; campaign: Campaign }> {
    return apiFetch('/agency/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getAudience(): Promise<{
    success: boolean;
    demographics: {
      age: Array<{ segment: string; pct: number; color: string }>;
      gender: Array<{ segment: string; pct: number; color: string }>;
      locations: Array<{ country: string; pct: number; users: string }>;
    };
  }> {
    return apiFetch('/marketing/audience');
  }
};

// Unified Profile Service
export const profileService = {
  async getMyProfile(): Promise<{
    success: boolean;
    user: User;
    role: UserRole;
    personal: PersonalDetails;
    professional: any;
  }> {
    return apiFetch('/profile/me');
  },

  async updateMyProfile(payload: {
    name?: string;
    avatarUrl?: string;
    personal?: PersonalDetails;
    professional?: any;
  }): Promise<{
    success: boolean;
    message: string;
    user: User;
    personal: PersonalDetails;
    professional: any;
  }> {
    return apiFetch('/profile/me', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    return apiFetch('/profile/change-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

// Administrator Service
export const adminService = {
  async getUsers(role?: string, status?: string, search?: string): Promise<{ success: boolean; count: number; users: User[] }> {
    const params = new URLSearchParams();
    if (role && role !== 'all') params.set('role', role);
    if (status && status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ success: boolean; count: number; users: User[] }>(`/admin/users${query}`);
  },

  async createUser(payload: { name: string; email: string; password?: string; role: string; status?: string }): Promise<{ success: boolean; message: string; user: User }> {
    return apiFetch<{ success: boolean; message: string; user: User }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateUser(id: number | string, payload: AdminUserUpdatePayload): Promise<{ success: boolean; message: string; user: User }> {
    return apiFetch<{ success: boolean; message: string; user: User }>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async resetUserPassword(id: number | string, newPassword?: string): Promise<{ success: boolean; message: string; temporaryPassword?: string }> {
    return apiFetch(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
  },

  async deleteUser(id: number | string): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(`/admin/users/${id}`, {
      method: 'DELETE'
    });
  },

  async getStats(): Promise<{ success: boolean; stats: AdminStats; audit_logs: AuditLog[] }> {
    return apiFetch<{ success: boolean; stats: AdminStats; audit_logs: AuditLog[] }>('/admin/stats');
  },

  async getSettings(): Promise<{ success: boolean; settings: SystemSettings }> {
    return apiFetch('/admin/settings');
  },

  async updateSettings(payload: Partial<SystemSettings>): Promise<{ success: boolean; message: string; settings: SystemSettings }> {
    return apiFetch('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }
};

// Notifications Service
export const notificationService = {
  async getNotifications(): Promise<{ success: boolean; notifications: NotificationItem[] }> {
    return apiFetch('/notifications');
  },

  async markAllRead(): Promise<{ success: boolean; message: string }> {
    return apiFetch('/notifications/mark-all-read', {
      method: 'POST'
    });
  }
};

// Health & System Service
export const healthService = {
  async checkHealth(targetBaseUrl?: string): Promise<{
    ok: boolean;
    data?: any;
    latencyMs?: number;
    error?: string;
  }> {
    const start = performance.now();
    const baseUrl = (targetBaseUrl || getApiBaseUrl()).replace(/\/$/, '');
    const url = `${baseUrl}/health`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}`, latencyMs };
      }

      const data = await response.json();
      return { ok: true, data, latencyMs };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, error: err.message || 'Connection refused', latencyMs };
    }
  }
};
