import { useStore } from "zustand";
import { authStore } from "../stores";
import type { ResourceCode } from "../types";

function hasPIIPermission(
  permissions: ReturnType<typeof authStore.getState>["permissions"],
  resource: ResourceCode,
  action: "VIEW-PII" | "EDIT-PII"
): boolean {
  if (!(resource && permissions)) {
    return false;
  }
  const entry = permissions.resources.find((r) => r.resourceCode === resource);
  return entry ? entry.permissionCodes.includes(action) : false;
}

/**
 * Reactive PII permission check bound to the auth store.
 *
 * Returns a stable `{ canView, canEdit }` tuple. Each flag is subscribed
 * independently with a primitive selector so consumers do not re-render on
 * unrelated auth updates and Zustand's snapshot cache stays stable.
 */
export function usePIIPermission(resource: ResourceCode): {
  canView: boolean;
  canEdit: boolean;
} {
  const canView = useStore(authStore, (state) =>
    hasPIIPermission(state.permissions, resource, "VIEW-PII")
  );
  const canEdit = useStore(authStore, (state) =>
    hasPIIPermission(state.permissions, resource, "EDIT-PII")
  );
  return { canView, canEdit };
}
