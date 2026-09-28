import { getAuthConfigOrNull } from "../config";
import { authStore, organizationStore } from "../stores";

/**
 * Clears the auth + organization stores, then delegates to the
 * `onLogout` callback registered via `configureAuth`. When no callback is
 * registered we fall back to a full page reload in browser environments.
 */
export const logout = (): void => {
  authStore.getState().clearAuthSession?.();
  organizationStore.getState().clearOrganization?.();

  const config = getAuthConfigOrNull();
  if (config?.onLogout) {
    config.onLogout();
    return;
  }
  if (typeof window !== "undefined") {
    window.location.reload();
  }
};
