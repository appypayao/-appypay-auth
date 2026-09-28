import authStore from "../../stores/auth-store";
import type { UserPermissions } from "../../types";

export const buildPermissions = (): UserPermissions => ({
  roleCode: "ADMIN",
  resources: [
    {
      resourceCode: "MP-DASH",
      permissionCodes: ["VIEW", "CREATE", "EDIT", "VIEW-PII", "EDIT-PII"],
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
