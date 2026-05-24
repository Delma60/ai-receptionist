// lib/rbac.ts — Receptionly RBAC
// Single source of truth for all roles and permissions.
// Two-layer model:
//   Platform layer  → admin | support | user   (stored as Firebase custom claim "role")
//   Tenant layer    → owner | admin | member   (stored in /tenants/{id}/members/{uid}.role)

// ─────────────────────────────────────────────
// 1. Platform roles (Firebase custom claim)
// ─────────────────────────────────────────────

export type PlatformRole = "admin" | "support" | "user";

/** Numeric hierarchy — higher = more access */
export const PLATFORM_HIERARCHY: Record<PlatformRole, number> = {
  admin:   3,
  support: 2,
  user:    1,
};

// ─────────────────────────────────────────────
// 2. Tenant-scoped roles (Firestore member doc)
// ─────────────────────────────────────────────

export type TenantRole = "owner" | "admin" | "member";

export const TENANT_HIERARCHY: Record<TenantRole, number> = {
  owner:  3,
  admin:  2,
  member: 1,
};

// ─────────────────────────────────────────────
// 3. Platform permissions
// ─────────────────────────────────────────────

export const PLATFORM_PERMISSIONS = {
  // Admin console
  ACCESS_ADMIN_PANEL:           ["admin"]            as PlatformRole[],
  VIEW_ALL_TENANTS:             ["admin", "support"] as PlatformRole[],
  IMPERSONATE_TENANT:           ["admin"]            as PlatformRole[],
  DELETE_TENANT:                ["admin"]            as PlatformRole[],
  CHANGE_TENANT_PLAN:           ["admin"]            as PlatformRole[],
  MANAGE_FEATURE_FLAGS:         ["admin"]            as PlatformRole[],
  MANAGE_PLATFORM_CONFIG:       ["admin"]            as PlatformRole[],
  VIEW_ALL_PLATFORM_CALLS:      ["admin", "support"] as PlatformRole[],
  VIEW_PLATFORM_BILLING:        ["admin"]            as PlatformRole[],
  VIEW_AUDIT_LOG:               ["admin", "support"] as PlatformRole[],
  MANAGE_INTEGRATIONS_CATALOG:  ["admin"]            as PlatformRole[],
  SET_USER_ROLE:                ["admin"]            as PlatformRole[],
} as const;

export type PlatformPermission = keyof typeof PLATFORM_PERMISSIONS;

// ─────────────────────────────────────────────
// 4. Tenant permissions
// ─────────────────────────────────────────────

export const TENANT_PERMISSIONS = {
  // Agents
  VIEW_AGENTS:             ["owner", "admin", "member"] as TenantRole[],
  CREATE_AGENT:            ["owner", "admin"]           as TenantRole[],
  UPDATE_AGENT:            ["owner", "admin"]           as TenantRole[],
  DELETE_AGENT:            ["owner"]                    as TenantRole[],
  ACTIVATE_AGENT:          ["owner", "admin"]           as TenantRole[],

  // Calls
  VIEW_CALLS:              ["owner", "admin", "member"] as TenantRole[],
  EXPORT_CALLS:            ["owner", "admin"]           as TenantRole[],
  DELETE_CALL:             ["owner"]                    as TenantRole[],

  // Integrations
  VIEW_INTEGRATIONS:       ["owner", "admin", "member"] as TenantRole[],
  CONNECT_INTEGRATION:     ["owner", "admin"]           as TenantRole[],
  DISCONNECT_INTEGRATION:  ["owner"]                    as TenantRole[],

  // Team members
  VIEW_MEMBERS:            ["owner", "admin", "member"] as TenantRole[],
  INVITE_MEMBER:           ["owner", "admin"]           as TenantRole[],
  REMOVE_MEMBER:           ["owner"]                    as TenantRole[],
  CHANGE_MEMBER_ROLE:      ["owner"]                    as TenantRole[],

  // Settings & billing
  VIEW_SETTINGS:           ["owner", "admin", "member"] as TenantRole[],
  UPDATE_BUSINESS_PROFILE: ["owner", "admin"]           as TenantRole[],
  MANAGE_PHONE_NUMBERS:    ["owner", "admin"]           as TenantRole[],
  MANAGE_BILLING:          ["owner"]                    as TenantRole[],
  MANAGE_API_KEYS:         ["owner"]                    as TenantRole[],
  DELETE_WORKSPACE:        ["owner"]                    as TenantRole[],
} as const;

export type TenantPermission = keyof typeof TENANT_PERMISSIONS;

// ─────────────────────────────────────────────
// 5. Route guards (consumed by middleware.ts)
// ─────────────────────────────────────────────

export const ROUTE_GUARDS: Array<{
  pattern: RegExp;
  requiredRole: PlatformRole;
  isApi?: boolean;
}> = [
  { pattern: /^\/admin/,               requiredRole: "admin" },
  { pattern: /^\/api\/admin/,          requiredRole: "admin", isApi: true },
  { pattern: /^\/api\/auth\/set-role/, requiredRole: "admin", isApi: true },
];

// ─────────────────────────────────────────────
// 6. Helper functions
// ─────────────────────────────────────────────

/** True if userRole >= required platform role */
export function hasPlatformRole(
  userRole: PlatformRole | null | undefined,
  required: PlatformRole,
): boolean {
  if (!userRole) return false;
  return PLATFORM_HIERARCHY[userRole] >= PLATFORM_HIERARCHY[required];
}

/** Backward-compat alias (existing code calls hasRole / hasPermission) */
export const hasRole = hasPlatformRole;

/** True if user has the named platform permission */
export function hasPlatformPermission(
  userRole: PlatformRole | null | undefined,
  permission: PlatformPermission,
): boolean {
  if (!userRole) return false;
  return (PLATFORM_PERMISSIONS[permission] as PlatformRole[]).includes(userRole);
}

export const hasPermission = hasPlatformPermission;

/** True if tenantRole >= required tenant role */
export function hasTenantRole(
  tenantRole: TenantRole | null | undefined,
  required: TenantRole,
): boolean {
  if (!tenantRole) return false;
  return TENANT_HIERARCHY[tenantRole] >= TENANT_HIERARCHY[required];
}

/** True if user has the named tenant permission */
export function hasTenantPermission(
  tenantRole: TenantRole | null | undefined,
  permission: TenantPermission,
): boolean {
  if (!tenantRole) return false;
  return (TENANT_PERMISSIONS[permission] as TenantRole[]).includes(tenantRole);
}