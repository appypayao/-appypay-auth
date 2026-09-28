import { authStore } from "../stores";
import type { Action, ResourceCode, UserPermissions } from "../types";

const getPermissions = (): UserPermissions | null => {
  const state = authStore.getState();
  return state?.permissions ?? null;
};

export function hasPermission(resource: ResourceCode, action: Action): boolean {
  if (!(resource && action)) {
    return false;
  }
  const perms = getPermissions();
  if (!perms) {
    return false;
  }
  const entry = perms.resources.find((r) => r.resourceCode === resource);
  if (!entry) {
    return false;
  }
  return entry.permissionCodes.includes(action);
}

export function canView(resource: ResourceCode): boolean {
  return hasPermission(resource, "VIEW");
}

export function canCreate(resource: ResourceCode): boolean {
  return hasPermission(resource, "CREATE");
}

export function canEdit(resource: ResourceCode): boolean {
  return hasPermission(resource, "EDIT");
}

export function canDelete(resource: ResourceCode): boolean {
  return hasPermission(resource, "DELETE");
}

export function canCancel(resource: ResourceCode): boolean {
  return hasPermission(resource, "CANCEL");
}

export function canRefund(resource: ResourceCode): boolean {
  return hasPermission(resource, "REFUND");
}

export function canViewPII(resource: ResourceCode): boolean {
  return hasPermission(resource, "VIEW-PII");
}

export function canEditPII(resource: ResourceCode): boolean {
  return hasPermission(resource, "EDIT-PII");
}
