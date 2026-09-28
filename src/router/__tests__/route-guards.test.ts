import { beforeEach, describe, expect, it, vi } from "vitest";
import authStore from "../../stores/auth-store";
import type { LoginResponse, UserPermissions } from "../../types";
import { requirePermission, trackAccessDenied } from "../route-guards";

const buildPermissions = (): UserPermissions => ({
  roleCode: "ADMIN",
  resources: [
    { resourceCode: "MP-ONPAY", permissionCodes: ["VIEW"] },
    { resourceCode: "MP-CONF-USRS", permissionCodes: ["VIEW", "CREATE"] },
  ],
});

const buildAuth = (): LoginResponse =>
  ({
    access_token: "token",
    refresh_token: "refresh",
    expires_in: 3600,
    token_type: "Bearer",
  }) as LoginResponse;

const ctx = (pathname = "/anywhere") => ({
  location: { href: `http://app${pathname}`, pathname },
});

const resetStore = () => {
  authStore.getState().clearAuthSession?.();
};

describe("requirePermission route guard", () => {
  beforeEach(() => {
    resetStore();
  });

  it("resolves silently when the user has the required permission", async () => {
    authStore.getState().setAuth(buildAuth());
    authStore.getState().setPermissions(buildPermissions());

    const guard = requirePermission("MP-ONPAY", "VIEW");
    await expect(guard(ctx())).resolves.toBeUndefined();
  });

  it("redirects to /access-denied when the permission is missing", async () => {
    authStore.getState().setAuth(buildAuth());
    authStore.getState().setPermissions(buildPermissions());

    const guard = requirePermission("MP-BILL", "VIEW");
    await expect(guard(ctx("/billing"))).rejects.toMatchObject({
      options: {
        to: "/access-denied",
        search: { returnTo: "http://app/billing" },
      },
    });
  });

  it("redirects to /login when no auth session exists", async () => {
    const guard = requirePermission("MP-ONPAY", "VIEW");
    await expect(guard(ctx("/transactions"))).rejects.toMatchObject({
      options: {
        to: "/login",
        search: { returnTo: "http://app/transactions" },
      },
    });
  });

  it("waits for permissions to hydrate before deciding", async () => {
    vi.useFakeTimers();
    authStore.getState().setAuth(buildAuth());

    const guard = requirePermission("MP-CONF-USRS", "CREATE");
    const pending = guard(ctx("/users")).catch((e) => e);

    // Simulate late permission hydration.
    await vi.advanceTimersByTimeAsync(20);
    authStore.getState().setPermissions(buildPermissions());

    await expect(pending).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it("defaults to VIEW when no action is provided", async () => {
    authStore.getState().setAuth(buildAuth());
    authStore.getState().setPermissions(buildPermissions());

    const guard = requirePermission("MP-ONPAY");
    await expect(guard(ctx())).resolves.toBeUndefined();
  });

  it("denies after hydration completes and permission is still missing", async () => {
    vi.useFakeTimers();
    authStore.getState().setAuth(buildAuth());

    const guard = requirePermission("MP-BILL", "VIEW");
    const pending = guard(ctx("/billing")).catch((e) => e);

    await vi.advanceTimersByTimeAsync(20);
    authStore.getState().setPermissions(buildPermissions());

    await expect(pending).resolves.toMatchObject({
      options: {
        to: "/access-denied",
        search: { returnTo: "http://app/billing" },
      },
    });
    vi.useRealTimers();
  });

  it("redirects to /login when the auth session is cleared while waiting", async () => {
    vi.useFakeTimers();
    authStore.getState().setAuth(buildAuth());

    const guard = requirePermission("MP-ONPAY", "VIEW");
    const pending = guard(ctx("/transactions")).catch((e) => e);

    await vi.advanceTimersByTimeAsync(10);
    authStore.getState().clearAuthSession?.();

    await expect(pending).resolves.toMatchObject({
      options: {
        to: "/login",
        search: { returnTo: "http://app/transactions" },
      },
    });
    vi.useRealTimers();
  });

  it("falls back to a permission check when hydration times out", async () => {
    vi.useFakeTimers();
    authStore.getState().setAuth(buildAuth());

    const guard = requirePermission("MP-ONPAY", "VIEW");
    const pending = guard(ctx("/transactions")).catch((e) => e);

    // Exceed the 5s hydration timeout without ever setting permissions.
    await vi.advanceTimersByTimeAsync(6000);

    await expect(pending).resolves.toMatchObject({
      options: {
        to: "/access-denied",
        search: { returnTo: "http://app/transactions" },
      },
    });
    vi.useRealTimers();
  });

  it("emits a track event when access is denied", async () => {
    authStore.getState().setAuth(buildAuth());
    authStore.getState().setPermissions(buildPermissions());

    const track = vi.fn();
    (globalThis as { mixpanel?: { track: typeof track } }).mixpanel = { track };

    const guard = requirePermission("MP-BILL", "VIEW");
    await guard(ctx("/billing")).catch(() => {
      // expected redirect
    });

    expect(track).toHaveBeenCalledWith("route.access_denied", {
      resource: "MP-BILL",
      action: "VIEW",
      path: "/billing",
    });

    (globalThis as { mixpanel?: unknown }).mixpanel = undefined;
  });

  it("does not track when access is granted", async () => {
    authStore.getState().setAuth(buildAuth());
    authStore.getState().setPermissions(buildPermissions());

    const track = vi.fn();
    (globalThis as { mixpanel?: { track: typeof track } }).mixpanel = { track };

    const guard = requirePermission("MP-ONPAY", "VIEW");
    await guard(ctx());

    expect(track).not.toHaveBeenCalled();
    (globalThis as { mixpanel?: unknown }).mixpanel = undefined;
  });
});

describe("trackAccessDenied", () => {
  beforeEach(() => {
    (globalThis as { mixpanel?: unknown }).mixpanel = undefined;
  });

  it("forwards to a Mixpanel-shaped global when present", () => {
    const track = vi.fn();
    (globalThis as { mixpanel?: { track: typeof track } }).mixpanel = { track };

    trackAccessDenied({ resource: "MP-DASH", action: "VIEW", path: "/x" });

    expect(track).toHaveBeenCalledWith("route.access_denied", {
      resource: "MP-DASH",
      action: "VIEW",
      path: "/x",
    });
  });

  it("swallows analytics errors so navigation is never blocked", () => {
    (globalThis as { mixpanel?: unknown }).mixpanel = {
      track: () => {
        throw new Error("boom");
      },
    };

    expect(() =>
      trackAccessDenied({ resource: "MP-DASH", action: "VIEW", path: "/x" })
    ).not.toThrow();
  });

  it("is a no-op when no analytics SDK is wired up", () => {
    expect(() =>
      trackAccessDenied({ resource: "MP-DASH", action: "VIEW", path: "/x" })
    ).not.toThrow();
  });
});
