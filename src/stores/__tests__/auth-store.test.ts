import { beforeEach, describe, expect, it } from "vitest";
import type { LoginResponse, UserPermissions } from "../../types";
import authStore from "../auth-store";

const initialState = authStore.getState();

const resetStore = () => {
  authStore.setState(
    {
      auth: undefined,
      permissions: null,
      roleCode: null,
      resourceCodes: [],
      permissionCodes: [],
    },
    false
  );
};

const login: LoginResponse = {
  token_type: "Bearer",
  expires_in: 3600,
  access_token: "access-1",
  refresh_token: "refresh-1",
};

const permissions: UserPermissions = {
  roleCode: "ADMIN",
  resources: [
    {
      resourceCode: "merchants",
      permissionCodes: ["read", "write"],
    },
    {
      resourceCode: "transactions",
      // includes a duplicate to verify deduplication in permissionCodes
      permissionCodes: ["read", "export"],
    },
  ],
};

describe("authStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("initializes with empty permissions", () => {
    const state = authStore.getState();
    expect(state.auth).toBeUndefined();
    expect(state.permissions).toBeNull();
    expect(state.roleCode).toBeNull();
    expect(state.resourceCodes).toEqual([]);
    expect(state.permissionCodes).toEqual([]);
  });

  it("exposes the expected setters from the initial factory", () => {
    expect(typeof initialState.setAuth).toBe("function");
    expect(typeof initialState.setAccessToken).toBe("function");
    expect(typeof initialState.setPermissions).toBe("function");
    expect(typeof initialState.setRoleCode).toBe("function");
    expect(typeof initialState.clearPermissions).toBe("function");
    expect(typeof initialState.clearAuthSession).toBe("function");
  });

  it("stores the auth payload via setAuth", () => {
    authStore.getState().setAuth(login);
    expect(authStore.getState().auth).toEqual(login);
  });

  it("updates only the access token via setAccessToken", () => {
    authStore.getState().setAuth(login);
    authStore.getState().setAccessToken("access-2");

    expect(authStore.getState().auth).toEqual({
      ...login,
      access_token: "access-2",
    });
  });

  it("is a no-op when setAccessToken runs without an existing auth", () => {
    authStore.getState().setAccessToken("access-2");
    expect(authStore.getState().auth).toBeUndefined();
  });

  describe("setPermissions", () => {
    it("stores permissions and derives roleCode + code arrays", () => {
      authStore.getState().setPermissions(permissions);

      const state = authStore.getState();
      expect(state.permissions).toEqual(permissions);
      expect(state.roleCode).toBe("ADMIN");
      expect(state.resourceCodes).toEqual(["merchants", "transactions"]);
      expect(state.permissionCodes).toEqual(["read", "write", "export"]);
    });

    it("dedupes permissionCodes across resources", () => {
      authStore.getState().setPermissions(permissions);
      const { permissionCodes } = authStore.getState();

      expect(permissionCodes).toHaveLength(new Set(permissionCodes).size);
    });

    it("handles empty resources", () => {
      authStore
        .getState()
        .setPermissions({ roleCode: "VIEWER", resources: [] });

      const state = authStore.getState();
      expect(state.roleCode).toBe("VIEWER");
      expect(state.resourceCodes).toEqual([]);
      expect(state.permissionCodes).toEqual([]);
    });
  });

  it("overrides roleCode via setRoleCode without touching permissions", () => {
    authStore.getState().setPermissions(permissions);
    authStore.getState().setRoleCode("SUPPORT");

    const state = authStore.getState();
    expect(state.roleCode).toBe("SUPPORT");
    expect(state.permissions).toEqual(permissions);
    expect(state.resourceCodes).toEqual(["merchants", "transactions"]);
  });

  it("clears only permissions with clearPermissions", () => {
    authStore.getState().setAuth(login);
    authStore.getState().setPermissions(permissions);

    authStore.getState().clearPermissions();

    const state = authStore.getState();
    expect(state.auth).toEqual(login);
    expect(state.permissions).toBeNull();
    expect(state.roleCode).toBeNull();
    expect(state.resourceCodes).toEqual([]);
    expect(state.permissionCodes).toEqual([]);
  });

  it("clears auth and permissions with clearAuthSession", () => {
    authStore.getState().setAuth(login);
    authStore.getState().setPermissions(permissions);

    authStore.getState().clearAuthSession?.();

    const state = authStore.getState();
    expect(state.auth).toBeUndefined();
    expect(state.permissions).toBeNull();
    expect(state.roleCode).toBeNull();
    expect(state.resourceCodes).toEqual([]);
    expect(state.permissionCodes).toEqual([]);
  });

  it("persists auth and permissions to localStorage under auth-storage", () => {
    authStore.getState().setAuth(login);
    authStore.getState().setPermissions(permissions);

    const raw = localStorage.getItem("auth-storage");
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string);
    expect(parsed.state.auth).toEqual(login);
    expect(parsed.state.permissions).toEqual(permissions);
    expect(parsed.state.roleCode).toBe("ADMIN");
    expect(parsed.state.resourceCodes).toEqual(["merchants", "transactions"]);
    expect(parsed.state.permissionCodes).toEqual(["read", "write", "export"]);
  });
});
