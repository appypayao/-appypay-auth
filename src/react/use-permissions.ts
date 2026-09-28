import { useMemo } from "react";
import { useStore } from "zustand";
import { PERMISSION_CODES, type PermissionCode } from "../constants";
import { organizationStore } from "../stores";
import type { Resource, ResourceCode } from "../types";

/**
 * Returns a map of resourceCode -> Set<permissionCode> for the current
 * organization. When no organization is active, returns an empty map (no
 * access).
 *
 * This hook derives from the organization store (source of truth for the
 * currently selected role), so consumers stay in sync with the org
 * dropdown.
 */
export function usePermissions(): Map<string, Set<string>> {
  const organization = useStore(organizationStore, (s) => s.organization);
  const resources: Resource[] = organization?.resources ?? [];

  return useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const resource of resources) {
      if (!resource?.resourceCode) {
        continue;
      }
      const permissions = new Set<string>();
      for (const permission of resource.permissions ?? []) {
        if (permission?.permissionCode) {
          permissions.add(permission.permissionCode);
        }
      }
      map.set(resource.resourceCode, permissions);
    }
    return map;
  }, [resources]);
}

/**
 * Returns the set of resource codes the user is allowed to access with the
 * given permission (defaults to VIEW).
 */
export function useAllowedResources(
  permission: PermissionCode = PERMISSION_CODES.VIEW
): Set<string> {
  const permissions = usePermissions();

  return useMemo(() => {
    const allowed = new Set<string>();
    for (const [resourceCode, perms] of permissions.entries()) {
      if (perms.has(permission)) {
        allowed.add(resourceCode);
      }
    }
    return allowed;
  }, [permissions, permission]);
}

/**
 * Returns true if the current user has `permission` on `resourceCode`.
 * When `resourceCode` is undefined/null, returns true (nav item is
 * unrestricted).
 */
export function useHasPermission(
  resourceCode?: ResourceCode | null,
  permission: PermissionCode = PERMISSION_CODES.VIEW
): boolean {
  const permissions = usePermissions();
  if (!resourceCode) {
    return true;
  }
  return permissions.get(resourceCode)?.has(permission) ?? false;
}
