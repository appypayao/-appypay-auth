import { createStore } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Action,
  LoginResponse,
  ResourceCode,
  UserPermissions,
} from "../types";

export type AuthStoreProps = {
  auth?: LoginResponse;
  permissions: UserPermissions | null;
  roleCode: string | null;
  resourceCodes: ResourceCode[];
  permissionCodes: Action[];
  setAuth: (auth: LoginResponse) => void;
  setAccessToken: (token: string) => void;
  setPermissions: (perms: UserPermissions) => void;
  setRoleCode: (code: string) => void;
  clearPermissions: () => void;
  clearAuthSession?: () => void;
};

const deriveCodes = (perms: UserPermissions) => {
  const resourceCodes = perms.resources.map((r) => r.resourceCode);
  const permissionCodes = Array.from(
    new Set(perms.resources.flatMap((r) => r.permissionCodes))
  );
  return { resourceCodes, permissionCodes };
};

const authStore = createStore<AuthStoreProps>()(
  persist(
    (set) => ({
      permissions: null,
      roleCode: null,
      resourceCodes: [],
      permissionCodes: [],
      setAuth: (auth) => set({ auth }),
      setAccessToken: (token) =>
        set((state) =>
          state.auth ? { auth: { ...state.auth, access_token: token } } : state
        ),
      setPermissions: (perms) => {
        const { resourceCodes, permissionCodes } = deriveCodes(perms);
        set({
          permissions: perms,
          roleCode: perms.roleCode,
          resourceCodes,
          permissionCodes,
        });
      },
      setRoleCode: (code) => set({ roleCode: code }),
      clearPermissions: () =>
        set({
          permissions: null,
          roleCode: null,
          resourceCodes: [],
          permissionCodes: [],
        }),
      clearAuthSession: () =>
        set({
          auth: undefined,
          permissions: null,
          roleCode: null,
          resourceCodes: [],
          permissionCodes: [],
        }),
    }),
    {
      name: "auth-storage",
    }
  )
);

export default authStore;
