export type PlatformRole = 'USER' | 'ADMIN';

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  platform_role: PlatformRole;
  status: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const TOKEN_STORAGE_KEY = 'iiap_access_token';

// In local dev, use relative path so Vite proxy forwards requests with zero CORS issues.
// In production, use configured remote Backend_API.
const rawBackendUrl = String(import.meta.env.Backend_API || import.meta.env.BACKEND_API || import.meta.env.VITE_API_URL || '').trim();
const BACKEND_URL = import.meta.env.DEV
  ? ''
  : (rawBackendUrl
      ? (rawBackendUrl.startsWith('http://') || rawBackendUrl.startsWith('https://')
          ? rawBackendUrl
          : `https://${rawBackendUrl}`
        ).replace(/\/$/, '')
      : '');

const API_BASE = `${BACKEND_URL}/api/v1/auth`;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const authApi = {
  async signUp(body: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ user: ApiUser; accessToken?: string }> {
    const res = await request<ApiResponse<{ user: ApiUser; accessToken?: string }>>('/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.data?.accessToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, res.data.accessToken);
    }
    return res.data!;
  },

  async signIn(body: {
    email: string;
    password: string;
  }): Promise<{ user: ApiUser; accessToken?: string }> {
    const res = await request<ApiResponse<{ user: ApiUser; accessToken?: string }>>('/signin', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.data?.accessToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, res.data.accessToken);
    }
    return res.data!;
  },

  async signOut(): Promise<{ message?: string }> {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
    return request<ApiResponse>('/signout', {
      method: 'POST',
    });
  },

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  hasToken(): boolean {
    return Boolean(this.getToken());
  },

  async getProfile(): Promise<{ user: ApiUser }> {
    const res = await request<ApiResponse<{ user: ApiUser }>>('/profile', {
      method: 'GET',
    });
    return res.data!;
  },

  async updateProfile(body: {
    name?: string;
    email?: string;
  }): Promise<{ user: ApiUser }> {
    const res = await request<ApiResponse<{ user: ApiUser }>>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return res.data!;
  },

  async changePassword(body: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ message?: string }> {
    return request<ApiResponse>('/change-password', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async forgotPassword(body: { email: string }): Promise<{ message?: string }> {
    return request<ApiResponse>('/forgot-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async resetPassword(body: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ message?: string }> {
    return request<ApiResponse>('/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
