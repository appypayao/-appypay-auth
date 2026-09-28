import { useStore } from "zustand";
import { authStore } from "../stores";
import type { Action, ResourceCode } from "../types";

/**
 * Reactive permission check bound to the auth store.
 *
 * The selector returns a boolean, so Zustand's default `Object.is` comparison
 * already prevents re-renders when the derived permission does not change.
 * This means a component using this hook only re-renders when its specific
 * permission flips, not on every unrelated auth-store update.
 */
export function usePermission(resource: ResourceCode, action: Action): boolean {
  return useStore(authStore, (state) => {
    if (!(resource && action && state.permissions)) {
      return false;
    }
    const entry = state.permissions.resources.find(
      (r) => r.resourceCode === resource
    );
    return entry ? entry.permissionCodes.includes(action) : false;
  });
}
