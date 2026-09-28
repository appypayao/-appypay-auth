import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getAuthConfig } from "../config";
import { AUTH_QUERY_KEYS } from "../constants";
import { syncPermissionsFromOperator } from "../permissions/sync-permissions";
import { authStore } from "../stores";
import type { Operator } from "../types";

export type UsePermissionRefreshOptions = {
  /** Interval between background refreshes in ms. Defaults to 10 minutes. */
  intervalMs?: number;
  /**
   * Minimum time between focus/visibility-triggered refreshes in ms. Prevents
   * refresh storms when the user rapidly alt-tabs between windows.
   * Defaults to 30 seconds.
   */
  minRefreshMs?: number;
  /** Show a toast when permissions change. Defaults to false to avoid spam. */
  notifyOnChange?: boolean;
};

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const DEFAULT_MIN_REFRESH_MS = 30 * 1000;
const MAX_BACKOFF_MS = 60 * 1000;
const BASE_BACKOFF_MS = 1000;

type Snapshot = {
  resourceCodes: string[];
  permissionCodes: string[];
  roleCode: string | null;
};

const readSnapshot = (): Snapshot => {
  const state = authStore.getState();
  return {
    resourceCodes: [...state.resourceCodes],
    permissionCodes: [...state.permissionCodes],
    roleCode: state.roleCode,
  };
};

const sameSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(a);
  for (const item of b) {
    if (!set.has(item)) {
      return false;
    }
  }
  return true;
};

const snapshotsEqual = (a: Snapshot, b: Snapshot) =>
  a.roleCode === b.roleCode &&
  sameSet(a.resourceCodes, b.resourceCodes) &&
  sameSet(a.permissionCodes, b.permissionCodes);

const isRevocation = (before: Snapshot, after: Snapshot) =>
  before.resourceCodes.length > 0 && after.resourceCodes.length === 0;

/**
 * Periodically re-fetches the authenticated user's operator profile so
 * long-lived sessions stay in sync with backend permission changes.
 *
 * Uses the `fetchOperatorMe` function registered via `configureAuth`.
 * Updates the `AUTH_QUERY_KEYS.OPERATOR_ME` TanStack Query cache, and
 * pipes the fresh operator through `syncPermissionsFromOperator` — the
 * same code path that hydrates the auth store on initial load.
 *
 * Behaviour:
 *  - Refreshes every `intervalMs` while the tab is visible.
 *  - Also refreshes when the tab regains visibility or window focus, throttled
 *    by `minRefreshMs` to avoid refresh storms.
 *  - Skips ticks while the tab is hidden (Page Visibility API).
 *  - On revocation (previously had resources, now none), navigates to the
 *    configured access-denied path with a `returnTo` search param.
 *  - Silent when permissions are unchanged. Toasts on change only when
 *    `notifyOnChange` is true.
 *  - Errors are logged and retried on an exponential backoff (capped at 60s).
 *    401 handling is delegated to the shared axios interceptor (logout).
 */
export function usePermissionRefresh(
  options: UsePermissionRefreshOptions = {}
): void {
  const {
    intervalMs = DEFAULT_INTERVAL_MS,
    minRefreshMs = DEFAULT_MIN_REFRESH_MS,
    notifyOnChange = false,
  } = options;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const optionsRef = useRef({ intervalMs, minRefreshMs, notifyOnChange });
  optionsRef.current = { intervalMs, minRefreshMs, notifyOnChange };

  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    let lastRefreshAt = 0;
    let consecutiveFailures = 0;

    const scheduleNext = (delayMs: number) => {
      if (cancelled) {
        return;
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        timerId = null;
        runTick("interval").catch(() => undefined);
      }, delayMs);
    };

    const nextIntervalDelay = () => {
      if (consecutiveFailures === 0) {
        return optionsRef.current.intervalMs;
      }
      const backoff = Math.min(
        BASE_BACKOFF_MS * 2 ** (consecutiveFailures - 1),
        MAX_BACKOFF_MS
      );
      return Math.min(backoff, optionsRef.current.intervalMs);
    };

    const shouldSkipVisibilityRefresh = () => {
      const elapsed = Date.now() - lastRefreshAt;
      return elapsed < optionsRef.current.minRefreshMs;
    };

    const canRunTick = (reason: "interval" | "focus") => {
      if (cancelled || inFlight) {
        return false;
      }
      const hidden = typeof document !== "undefined" && document.hidden;
      const hasSession = Boolean(authStore.getState().auth?.access_token);
      if (hidden || !hasSession) {
        if (reason === "interval") {
          scheduleNext(optionsRef.current.intervalMs);
        }
        return false;
      }
      return true;
    };

    const handleRefreshResult = (before: Snapshot, after: Snapshot) => {
      const { routes } = getAuthConfig();
      if (isRevocation(before, after)) {
        const currentPath = pathnameRef.current;
        if (currentPath !== routes.accessDenied) {
          navigate({
            to: routes.accessDenied,
            search: { returnTo: currentPath },
          });
        }
        return;
      }
      if (optionsRef.current.notifyOnChange && !snapshotsEqual(before, after)) {
        toast("Your permissions were updated.");
      }
    };

    const refreshPermissions = async () => {
      const { fetchOperatorMe } = getAuthConfig();
      const operator = await fetchOperatorMe();
      queryClient.setQueryData<Operator>(
        [AUTH_QUERY_KEYS.OPERATOR_ME],
        operator
      );
      syncPermissionsFromOperator(operator);
    };

    const runTick = async (reason: "interval" | "focus") => {
      if (!canRunTick(reason)) {
        return;
      }

      inFlight = true;
      const before = readSnapshot();
      try {
        await refreshPermissions();
        if (cancelled) {
          return;
        }
        consecutiveFailures = 0;
        lastRefreshAt = Date.now();
        handleRefreshResult(before, readSnapshot());
      } catch (err) {
        consecutiveFailures += 1;
        console.error("[usePermissionRefresh] Refresh failed", err);
      } finally {
        inFlight = false;
        if (!cancelled) {
          const delay =
            reason === "interval"
              ? nextIntervalDelay()
              : optionsRef.current.intervalMs;
          scheduleNext(delay);
        }
      }
    };

    const handleVisibility = () => {
      if (typeof document === "undefined") {
        return;
      }
      if (document.visibilityState !== "visible") {
        return;
      }
      if (shouldSkipVisibilityRefresh()) {
        return;
      }
      runTick("focus").catch(() => undefined);
    };

    const handleFocus = () => {
      if (shouldSkipVisibilityRefresh()) {
        return;
      }
      runTick("focus").catch(() => undefined);
    };

    scheduleNext(optionsRef.current.intervalMs);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
    }

    return () => {
      cancelled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
      }
    };
    // Options are read via ref, so we only re-run when the navigate identity
    // or query client identity changes (both stable across renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, queryClient]);
}
