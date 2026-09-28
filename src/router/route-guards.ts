import { redirect } from "@tanstack/react-router";
import { type AuthRoutesConfig, getAuthConfigOrNull } from "../config";
import { hasPermission } from "../permissions/guards";
import { authStore } from "../stores";
import type { Action, ResourceCode } from "../types";

/**
 * Minimal shape of the argument TanStack Router passes to a `beforeLoad`
 * function. We accept only what we need (location) so this factory can be
 * used with any file / lazy file route without pulling in unexported
 * internal router types.
 */
export type RouteGuardContext = {
  location: {
    href: string;
    pathname: string;
  };
};

/**
 * Max time we're willing to wait for the auth store to hydrate permissions
 * before treating the request as denied. Permissions are populated right
 * after the operator /me query resolves in the root route, so this only
 * matters on a hard refresh with a race between hydration and the first
 * navigation.
 */
const PERMISSIONS_HYDRATION_TIMEOUT_MS = 5000;

const hasAuth = () => Boolean(authStore.getState().auth?.access_token);
const arePermissionsLoaded = () => authStore.getState().permissions !== null;

/**
 * Waits for the auth store to have permissions set. Resolves as soon as
 * `permissions` becomes non-null. Also resolves early (with `false`) if the
 * auth session is cleared while waiting so callers can send the user to
 * login. Rejects nothing — falls through on timeout.
 */
const waitForPermissions = (
  timeoutMs = PERMISSIONS_HYDRATION_TIMEOUT_MS
): Promise<boolean> =>
  new Promise((resolve) => {
    if (arePermissionsLoaded()) {
      resolve(true);
      return;
    }
    if (!hasAuth()) {
      resolve(false);
      return;
    }

    const unsubscribe = authStore.subscribe((state) => {
      if (state.permissions !== null) {
        cleanup();
        resolve(true);
        return;
      }
      if (!state.auth?.access_token) {
        cleanup();
        resolve(false);
      }
    });

    const timer = setTimeout(() => {
      cleanup();
      resolve(arePermissionsLoaded());
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      unsubscribe();
    };
  });

/**
 * Best-effort analytics hook. Uses the analytics callback registered via
 * `configureAuth`, falling back to the legacy `mixpanel` global and finally
 * to a dev-only `console.warn` so denied attempts are visible.
 */
export const trackAccessDenied = (payload: {
  resource: ResourceCode;
  action: Action;
  path: string;
}): void => {
  const config = getAuthConfigOrNull();
  try {
    if (config?.analytics) {
      config.analytics("route.access_denied", payload);
    } else {
      type MixpanelLike = { track?: (event: string, props: unknown) => void };
      const mp = (globalThis as { mixpanel?: MixpanelLike }).mixpanel;
      mp?.track?.("route.access_denied", payload);
    }
  } catch {
    // Swallow analytics errors — never block navigation on tracking.
  }

  if (
    typeof import.meta !== "undefined" &&
    (import.meta as { env?: { DEV?: boolean } }).env?.DEV
  ) {
    console.warn("[route-guard] access denied", payload);
  }
};

const DEFAULT_ROUTES_FALLBACK: AuthRoutesConfig = {
  login: "/login",
  accessDenied: "/access-denied",
};

const readRoutes = (): AuthRoutesConfig =>
  getAuthConfigOrNull()?.routes ?? DEFAULT_ROUTES_FALLBACK;

/**
 * Route guard factory. Returns a `beforeLoad`-compatible function that
 * throws a redirect to the configured access-denied path when the current
 * user lacks the required permission, and to the login path when no auth
 * session exists.
 *
 * @example
 * export const Route = createFileRoute('/_app/transactions/')({
 *   beforeLoad: requirePermission('MP-ONPAY', 'VIEW'),
 *   component: Transactions,
 * })
 */
export function requirePermission(
  resource: ResourceCode,
  action: Action = "VIEW"
) {
  return async (opts: RouteGuardContext) => {
    const routes = readRoutes();

    if (!hasAuth()) {
      throw redirect({
        to: routes.login,
        search: { returnTo: opts.location.href },
      });
    }

    if (!arePermissionsLoaded()) {
      const loaded = await waitForPermissions();
      if (!(loaded || hasAuth())) {
        throw redirect({
          to: routes.login,
          search: { returnTo: opts.location.href },
        });
      }
      // Hydration timed out but session is still valid — fall through to
      // the permission check so the user gets a clear denial rather than
      // an infinite spinner.
    }

    if (hasPermission(resource, action)) {
      return;
    }

    trackAccessDenied({
      resource,
      action,
      path: opts.location.pathname,
    });

    throw redirect({
      to: routes.accessDenied,
      search: { returnTo: opts.location.href },
    });
  };
}
