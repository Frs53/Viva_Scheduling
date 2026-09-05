export type UserRole = 'student' | 'professor' | 'admin';

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  fullName: string;
  code?: string; // Student ID or Professor Code
  department?: string; // Faculty / Department
  academicRank?: string; // Assistant Prof, Associate Prof, Full Prof (for professors)
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
  code?: string;
  department?: string;
  academicRank?: string;
}
