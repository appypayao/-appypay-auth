import type { Role, UserPermissions } from "../types";

/**
 * Maps a backend `Role` (as returned in `Operator.accessRole[]`) into the
 * flat `UserPermissions` shape that the auth store, permission gates and
 * route guards consume.
 *
 * Missing / malformed nested arrays are treated as empty so a partial
 * payload never crashes the app.
 */
export const roleToUserPermissions = (role: Role): UserPermissions => ({
  roleCode: role.code ?? "",
  resources: (role.resources ?? []).map((resource) => ({
    resourceCode: resource.resourceCode,
    permissionCodes: (resource.permissions ?? [])
      .map((permission) => permission.permissionCode)
      .filter(
        (code): code is string => typeof code === "string" && code.length > 0
      ),
  })),
});
