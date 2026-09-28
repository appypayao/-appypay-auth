import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchOperatorMe = vi.fn();
const syncPermissionsFromOperator = vi.fn();
vi.mock("../../permissions/sync-permissions", () => ({
  syncPermissionsFromOperator: (op: unknown) => syncPermissionsFromOperator(op),
}));

const queryClientSetQueryData = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: queryClientSetQueryData }),
}));

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useRouterState: (opts: {
    select: (s: { location: { pathname: string } }) => unknown;
  }) => opts.select({ location: { pathname: "/current/page" } }),
}));

const toast = vi.fn();
vi.mock("sonner", () => ({
  toast: (message: unknown) => toast(message),
}));

import { __resetAuthConfigForTests, configureAuth } from "../../config";
import authStore from "../../stores/auth-store";
import { usePermissionRefresh } from "../use-permission-refresh";

type ResourceCode = string;
type PermissionState = {
  roleCode: string | null;
  resourceCodes: ResourceCode[];
  permissionCodes: string[];
};

const setStore = (
  state: Partial<PermissionState> & { token?: string | null }
) => {
  authStore.setState({
    auth:
      state.token === null || state.token === undefined
        ? undefined
        : {
            access_token: state.token,
            refresh_token: "r",
            expires_in: 3600,
            token_type: "Bearer",
          },
    roleCode: state.roleCode ?? null,
    resourceCodes: (state.resourceCodes ?? []) as ResourceCode[],
    permissionCodes: (state.permissionCodes ?? []) as never,
    permissions: null,
  });
};

const setVisibility = (state: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => state === "hidden",
  });
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("usePermissionRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchOperatorMe.mockReset();
    syncPermissionsFromOperator.mockReset();
    queryClientSetQueryData.mockReset();
    navigate.mockReset();
    toast.mockReset();
    setVisibility("visible");
    setStore({
      token: "tok",
      resourceCodes: ["MP-DASH"],
      permissionCodes: ["VIEW"],
      roleCode: "admin",
    });
    __resetAuthConfigForTests();
    configureAuth({
      oauth: { url: "u", policy: "p", clientId: "c", scope: "s" },
      fetchOperatorMe: () => fetchOperatorMe(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-fetches permissions on interval and mirrors them into the store", async () => {
    const operator = { id: 1 };
    fetchOperatorMe.mockResolvedValue(operator);

    renderHook(() => usePermissionRefresh({ intervalMs: 10_000 }));

    expect(fetchOperatorMe).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchOperatorMe).toHaveBeenCalledTimes(1);
    expect(queryClientSetQueryData).toHaveBeenCalledWith(
      ["getOperatorMe"],
      operator
    );
    expect(syncPermissionsFromOperator).toHaveBeenCalledWith(operator);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchOperatorMe).toHaveBeenCalledTimes(2);
  });

  it("re-fetches permissions when the tab regains visibility", async () => {
    fetchOperatorMe.mockResolvedValue({});
    renderHook(() =>
      usePermissionRefresh({ intervalMs: 60_000, minRefreshMs: 0 })
    );

    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    await flushMicrotasks();
    expect(fetchOperatorMe).not.toHaveBeenCalled();

    setVisibility("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await flushMicrotasks();
    });
    expect(fetchOperatorMe).toHaveBeenCalledTimes(1);
  });

  it("re-fetches when the window regains focus", async () => {
    fetchOperatorMe.mockResolvedValue({});
    renderHook(() =>
      usePermissionRefresh({ intervalMs: 60_000, minRefreshMs: 0 })
    );

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await flushMicrotasks();
    });
    expect(fetchOperatorMe).toHaveBeenCalledTimes(1);
  });

  it("throttles focus refreshes with minRefreshMs", async () => {
    fetchOperatorMe.mockResolvedValue({});
    renderHook(() =>
      usePermissionRefresh({ intervalMs: 60_000, minRefreshMs: 30_000 })
    );

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await flushMicrotasks();
    });
    expect(fetchOperatorMe).toHaveBeenCalledTimes(1);

    // Immediate second focus: should be throttled.
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await flushMicrotasks();
    });
    expect(fetchOperatorMe).toHaveBeenCalledTimes(1);

    // After the throttle window, focus refreshes again.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
      window.dispatchEvent(new Event("focus"));
      await flushMicrotasks();
    });
    expect(fetchOperatorMe).toHaveBeenCalledTimes(2);
  });

  it("skips interval ticks while the tab is hidden", async () => {
    fetchOperatorMe.mockResolvedValue({});
    setVisibility("hidden");
    renderHook(() => usePermissionRefresh({ intervalMs: 10_000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchOperatorMe).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchOperatorMe).not.toHaveBeenCalled();
  });

  it("redirects to /access-denied when permissions are revoked", async () => {
    fetchOperatorMe.mockResolvedValue({});
    syncPermissionsFromOperator.mockImplementation(() => {
      // Simulate the hydration wiping the store.
      authStore.setState({
        roleCode: null,
        resourceCodes: [],
        permissionCodes: [],
      });
    });

    renderHook(() => usePermissionRefresh({ intervalMs: 10_000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(navigate).toHaveBeenCalledWith({
      to: "/access-denied",
      search: { returnTo: "/current/page" },
    });
  });

  it("stays silent when permissions are unchanged", async () => {
    fetchOperatorMe.mockResolvedValue({});
    renderHook(() =>
      usePermissionRefresh({ intervalMs: 10_000, notifyOnChange: true })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(toast).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("toasts on change when notifyOnChange is enabled", async () => {
    fetchOperatorMe.mockResolvedValue({});
    syncPermissionsFromOperator.mockImplementation(() => {
      authStore.setState({
        roleCode: "admin",
        resourceCodes: ["MP-DASH", "MP-ONPAY"],
        permissionCodes: ["VIEW", "CREATE"],
      });
    });

    renderHook(() =>
      usePermissionRefresh({ intervalMs: 10_000, notifyOnChange: true })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(toast).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("skips the fetch when there is no session token", async () => {
    setStore({ token: null, resourceCodes: [], permissionCodes: [] });
    renderHook(() => usePermissionRefresh({ intervalMs: 10_000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchOperatorMe).not.toHaveBeenCalled();
  });

  it("applies exponential backoff when refresh throws", async () => {
    fetchOperatorMe
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({});

    renderHook(() => usePermissionRefresh({ intervalMs: 10_000 }));

    // First tick after 10s: fails.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchOperatorMe).toHaveBeenCalledTimes(1);

    // Backoff = 1s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetchOperatorMe).toHaveBeenCalledTimes(2);

    // Backoff = 2s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fetchOperatorMe).toHaveBeenCalledTimes(3);

    // After success, backoff resets — next tick waits the full interval.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchOperatorMe).toHaveBeenCalledTimes(3);
  });

  it("cleans up interval and listeners on unmount", async () => {
    fetchOperatorMe.mockResolvedValue({});
    const removeDocSpy = vi.spyOn(document, "removeEventListener");
    const removeWinSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() =>
      usePermissionRefresh({ intervalMs: 10_000, minRefreshMs: 0 })
    );

    unmount();

    expect(removeDocSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
    expect(removeWinSpy).toHaveBeenCalledWith("focus", expect.any(Function));

    // No further fetches should happen after unmount.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
      window.dispatchEvent(new Event("focus"));
      await flushMicrotasks();
    });
    expect(fetchOperatorMe).not.toHaveBeenCalled();

    removeDocSpy.mockRestore();
    removeWinSpy.mockRestore();
  });
});
