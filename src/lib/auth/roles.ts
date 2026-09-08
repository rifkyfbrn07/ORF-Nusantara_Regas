import { Role } from '@prisma/client';

export interface RoleInfo {
  code: Role;
  shortLabel: string;
  fullLabel: string;
  badgeClass: string;
}

export function getRoleInfo(role: Role | string): RoleInfo {
  switch (role) {
    case 'ADMIN':
      return {
        code: 'ADMIN' as Role,
        shortLabel: 'Admin',
        fullLabel: 'System Administrator',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    case 'MANAGER':
      return {
        code: 'MANAGER' as Role,
        shortLabel: 'Manager',
        fullLabel: 'Operations Manager',
        badgeClass: 'bg-blue-50 text-[#0066B3] border-blue-200',
      };
    case 'OPERATOR':
    default:
      return {
        code: 'OPERATOR' as Role,
        shortLabel: 'Operator',
        fullLabel: 'Operator Lapangan',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
  }
}
