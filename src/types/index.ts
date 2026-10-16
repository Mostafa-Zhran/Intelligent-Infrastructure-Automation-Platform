export type PageId = 
  | 'signin' 
  | 'signup' 
  | 'forgot-password' 
  | 'reset-password' 
  | 'profile' 
  | 'no-access';

export type PlatformRole = 'USER' | 'ADMIN';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarInitials: string;
  isVerified: boolean;
  role: PlatformRole | string;
  status?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}
