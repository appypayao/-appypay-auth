import { beforeEach, describe, expect, it } from "vitest";
import authStore from "../../stores/auth-store";
import type { UserPermissions } from "../../types";
import {
  canCancel,
  canCreate,
  canDelete,
  canEdit,
  canEditPII,
  canRefund,
  canView,
  canViewPII,
  hasPermission,
} from "../guards";

const buildPermissions = (): UserPermissions => ({
  roleCode: "ADMIN",
  resources: [
    {
      resourceCode: "MERCHANTS",
      permissionCodes: [
        "VIEW",
        "CREATE",
        "EDIT",
        "DELETE",
        "VIEW-PII",
        "EDIT-PII",
      ],
    },
    {
      resourceCode: "PAYMENTS",
      permissionCodes: ["VIEW", "CANCEL", "REFUND"],
    },
  ],
});

const setPermissions = (perms: UserPermissions | null) => {
  if (perms) {
    authStore.getState().setPermissions(perms);
  } else {
    authStore.getState().clearPermissions();
  }
};

describe("permission guards", () => {
  beforeEach(() => {
    authStore.getState().clearPermissions();
  });

  describe("hasPermission", () => {
    it("returns true when the user has the permission", () => {
      setPermissions(buildPermissions());
      expect(hasPermission("MERCHANTS", "VIEW")).toBe(true);
      expect(hasPermission("PAYMENTS", "REFUND")).toBe(true);
    });

    it("returns false when the user lacks the permission on that resource", () => {
      setPermissions(buildPermissions());
      expect(hasPermission("PAYMENTS", "DELETE")).toBe(false);
      expect(hasPermission("MERCHANTS", "REFUND")).toBe(false);
    });

    it("returns false when permissions are not loaded", () => {
      setPermissions(null);
      expect(hasPermission("MERCHANTS", "VIEW")).toBe(false);
    });

    it("returns false for an unknown resource", () => {
      setPermissions(buildPermissions());
      expect(hasPermission("UNKNOWN_RESOURCE", "VIEW")).toBe(false);
    });

    it("returns false for empty resource or action", () => {
      setPermissions(buildPermissions());
      expect(hasPermission("", "VIEW")).toBe(false);
      expect(hasPermission("MERCHANTS", "")).toBe(false);
    });
  });

  describe("action-specific helpers", () => {
    beforeEach(() => {
      setPermissions(buildPermissions());
    });

    it("canView reflects VIEW permission", () => {
      expect(canView("MERCHANTS")).toBe(true);
      expect(canView("UNKNOWN")).toBe(false);
    });

    it("canCreate reflects CREATE permission", () => {
      expect(canCreate("MERCHANTS")).toBe(true);
      expect(canCreate("PAYMENTS")).toBe(false);
    });

    it("canEdit reflects EDIT permission", () => {
      expect(canEdit("MERCHANTS")).toBe(true);
      expect(canEdit("PAYMENTS")).toBe(false);
    });

    it("canDelete reflects DELETE permission", () => {
      expect(canDelete("MERCHANTS")).toBe(true);
      expect(canDelete("PAYMENTS")).toBe(false);
    });

    it("canCancel reflects CANCEL permission", () => {
      expect(canCancel("PAYMENTS")).toBe(true);
      expect(canCancel("MERCHANTS")).toBe(false);
    });

    it("canRefund reflects REFUND permission", () => {
      expect(canRefund("PAYMENTS")).toBe(true);
      expect(canRefund("MERCHANTS")).toBe(false);
    });

    it("canViewPII reflects VIEW-PII permission", () => {
      expect(canViewPII("MERCHANTS")).toBe(true);
      expect(canViewPII("PAYMENTS")).toBe(false);
    });

    it("canEditPII reflects EDIT-PII permission", () => {
      expect(canEditPII("MERCHANTS")).toBe(true);
      expect(canEditPII("PAYMENTS")).toBe(false);
    });
  });

  describe("when auth is cleared", () => {
    it("all guards return false", () => {
      setPermissions(buildPermissions());
      authStore.getState().clearAuthSession?.();

      expect(canView("MERCHANTS")).toBe(false);
      expect(canCreate("MERCHANTS")).toBe(false);
      expect(canEdit("MERCHANTS")).toBe(false);
      expect(canDelete("MERCHANTS")).toBe(false);
      expect(canCancel("PAYMENTS")).toBe(false);
      expect(canRefund("PAYMENTS")).toBe(false);
      expect(canViewPII("MERCHANTS")).toBe(false);
      expect(canEditPII("MERCHANTS")).toBe(false);
    });
  });
});
