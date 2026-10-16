export interface ApiUser {
  id: string;
  name: string;
  email: string;
  platform_role: 'VIEWER' | 'OPERATOR' | 'ADMIN' | string;
  status: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const BACKEND_URL = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '') : '';
const API_BASE = `${BACKEND_URL}/api/v1/auth`;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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
  }): Promise<{ user: ApiUser }> {
    const res = await request<ApiResponse<{ user: ApiUser }>>('/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.data!;
  },

  async signIn(body: {
    email: string;
    password: string;
  }): Promise<{ user: ApiUser }> {
    const res = await request<ApiResponse<{ user: ApiUser }>>('/signin', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.data!;
  },

  async signOut(): Promise<{ message?: string }> {
    return request<ApiResponse>('/signout', {
      method: 'POST',
    });
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
