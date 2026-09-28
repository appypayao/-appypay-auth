import { authStore } from "../stores";
import type { UserPermissions } from "../types";

export const buildPermissions = (): UserPermissions => ({
  roleCode: "ADMIN",
  resources: [
    {
      resourceCode: "MP-DASH",
      permissionCodes: ["VIEW", "CREATE", "EDIT"],
    },
    {
      resourceCode: "MP-ONPAY",
      permissionCodes: ["VIEW", "DELETE"],
    },
  ],
});

export const grantPermissions = (perms: UserPermissions = buildPermissions()) =>
  authStore.getState().setPermissions(perms);

export const clearPermissions = () => authStore.getState().clearPermissions();
