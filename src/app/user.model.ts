export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role?: UserRole;
  accessRequested?: boolean;
}
