export type UserRole = 'admin' | 'coordinator' | 'volunteer';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
}
