// lib/rbac.ts
// Single source of truth for all role/permission definitions

export type UserRole = "admin" | "support" | "user";

/** Higher number = more permissions */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin:   3,
  support: 2,
  user:    1,
};

/** What each role can do */
export const PERMISSIONS = {
  // Tenant-scoped
  VIEW_OWN_DASHBOARD:    ["admin", "support", "user"] as UserRole[],
  MANAGE_OWN_AGENTS:     ["admin", "support", "user"] as UserRole[],
  VIEW_OWN_CALLS:        ["admin", "support", "user"] as UserRole[],
  MANAGE_OWN_SETTINGS:   ["admin", "user"] as UserRole[],
  MANAGE_OWN_BILLING:    ["admin"] as UserRole[],

  // Platform-admin
  ACCESS_ADMIN_PANEL:    ["admin"] as UserRole[],
  IMPERSONATE_TENANT:    ["admin"] as UserRole[],
  MANAGE_FEATURE_FLAGS:  ["admin"] as UserRole[],
  VIEW_ALL_TENANTS:      ["admin", "support"] as UserRole[],
  VIEW_ALL_CALLS:        ["admin", "support"] as UserRole[],
  MANAGE_PLATFORM_CONFIG:["admin"] as UserRole[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/** Route-level protection rules checked in middleware */
export const ROUTE_GUARDS: Array<{
  pattern: RegExp;
  requiredRole: UserRole;
  /** If true, unauthenticated → 401/403 JSON instead of redirect */
  isApi?: boolean;
}> = [
  { pattern: /^\/admin/,                    requiredRole: "admin" },
  { pattern: /^\/api\/admin/,               requiredRole: "admin",   isApi: true },
  { pattern: /^\/api\/auth\/set-role/,      requiredRole: "admin",   isApi: true },
];

/** Check if a role satisfies the minimum required role */
export function hasRole(userRole: UserRole | null | undefined, required: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

/** Check if a role has a specific permission */
export function hasPermission(userRole: UserRole | null | undefined, permission: Permission): boolean {
  if (!userRole) return false;
  return (PERMISSIONS[permission] as UserRole[]).includes(userRole);
}