export type PageId = 
  | 'signin' 
  | 'signup' 
  | 'forgot-password' 
  | 'reset-password' 
  | 'profile' 
  | 'no-access';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarInitials: string;
  isVerified: boolean;
  role: 'viewer' | 'operator' | 'admin';
  title: string;
  organization: string;
  timezone: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}
