/**
 * Backoffice permission action code (e.g. VIEW, EDIT, CREATE).
 *
 * Kept as a string alias so backend-driven codes flow through without a
 * literal-union bottleneck; `PermissionAction` in `../react` exposes the
 * well-known set for autocomplete.
 */
export type Action = string;

/**
 * Backoffice resource code (e.g. "MP-ONPAY", "MP-CONF-USRS").
 */
export type ResourceCode = string;

export type PermissionEntry = {
  resourceCode: ResourceCode;
  permissionCodes: Action[];
};

/**
 * Flat permission map consumed by guards, hooks and route guards. Produced
 * by `roleToUserPermissions` from a backend `Role`.
 */
export type UserPermissions = {
  roleCode: string;
  resources: PermissionEntry[];
};
