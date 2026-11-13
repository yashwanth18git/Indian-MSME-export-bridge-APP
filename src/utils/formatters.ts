import type { CurrencyCode, PermissionKey, TeamMemberAccess, UserRoleKey } from '../types/export';

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatFx(amount: number, currency: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED ',
    AUD: 'A$',
  };
  return `${symbols[currency]}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function hasEntityPermission(
  activeRole: UserRoleKey,
  teamMatrix: TeamMemberAccess[],
  entityId: string,
  permission: PermissionKey
): boolean {
  if (activeRole === 'owner') return true;
  const member = teamMatrix.find((m) => m.roleKey === activeRole);
  if (!member) return false;
  if (entityId === 'all') {
    return Object.values(member.entityPermissions).some((perms) =>
      perms.includes(permission)
    );
  }
  const perms = member.entityPermissions[entityId] || [];
  return perms.includes(permission);
}

export function getAccessibleEntityIds(
  activeRole: UserRoleKey,
  teamMatrix: TeamMemberAccess[],
  allEntityIds: string[]
): string[] {
  if (activeRole === 'owner') return allEntityIds;
  const member = teamMatrix.find((m) => m.roleKey === activeRole);
  if (!member) return [];
  return allEntityIds.filter(
    (id) => (member.entityPermissions[id]?.length ?? 0) > 0
  );
}
