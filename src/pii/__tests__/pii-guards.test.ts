import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import authStore from "../../stores/auth-store";
import type { UserPermissions } from "../../types";
import {
  canEditPII,
  canViewPII,
  maskEmail,
  maskIBAN,
  maskLast4,
  maskName,
  maskPhone,
  maskTaxId,
  pii,
  usePIIPermission,
} from "../index";

const buildPermissions = (): UserPermissions => ({
  roleCode: "ADMIN",
  resources: [
    {
      resourceCode: "USERS",
      permissionCodes: ["VIEW", "VIEW-PII", "EDIT-PII"],
    },
    {
      resourceCode: "MERCHANTS",
      permissionCodes: ["VIEW"],
    },
  ],
});

describe("pii-guards masking helpers", () => {
  describe("maskEmail", () => {
    it("keeps the domain and hides the local part", () => {
      expect(maskEmail("john.doe@example.com")).toBe("••••@example.com");
    });

    it("returns empty for nullish input", () => {
      expect(maskEmail(undefined)).toBe("");
      expect(maskEmail(null)).toBe("");
      expect(maskEmail("")).toBe("");
    });

    it("masks non-email strings entirely", () => {
      expect(maskEmail("not-an-email")).toBe("••••••••••••");
    });
  });

  describe("maskPhone", () => {
    it("keeps only the last two digits", () => {
      expect(maskPhone("+351 912 345 678")).toBe("+••••••••••78");
    });

    it("returns empty for empty input", () => {
      expect(maskPhone("")).toBe("");
    });

    it("fully masks very short phone numbers", () => {
      expect(maskPhone("12")).toBe("••");
    });
  });

  describe("maskIBAN", () => {
    it("keeps the last 4 characters", () => {
      expect(maskIBAN("AO06000600000000000000001")).toBe("XXXX...0001");
    });

    it("supports a custom visible count", () => {
      expect(maskIBAN("AO06000600000000000000001", 6)).toBe("XXXX...000001");
    });

    it("fully masks when the value is not long enough", () => {
      expect(maskIBAN("AO06")).toBe("XXXX");
    });
  });

  describe("maskName", () => {
    it("keeps the initial of each word", () => {
      expect(maskName("John Doe")).toBe("J••• D••");
    });

    it("handles single names", () => {
      expect(maskName("Jane")).toBe("J•••");
    });
  });

  describe("maskTaxId", () => {
    it("keeps the last three characters", () => {
      expect(maskTaxId("123456789")).toBe("••••••789");
    });

    it("fully masks short values", () => {
      expect(maskTaxId("12")).toBe("••");
    });
  });

  describe("maskLast4", () => {
    it("keeps only the last 4 digits", () => {
      expect(maskLast4("4111111111111234")).toBe("•••• •••• •••• 1234");
    });

    it("fully masks short values", () => {
      expect(maskLast4("123")).toBe("•••");
    });
  });
});

describe("pii()", () => {
  beforeEach(() => {
    authStore.getState().clearPermissions();
  });

  it("returns the raw value when the user has VIEW-PII", () => {
    authStore.getState().setPermissions(buildPermissions());
    expect(pii("john.doe@example.com", "USERS", maskEmail)).toBe(
      "john.doe@example.com"
    );
  });

  it("returns the masked value when the user lacks VIEW-PII", () => {
    authStore.getState().setPermissions(buildPermissions());
    expect(pii("john.doe@example.com", "MERCHANTS", maskEmail)).toBe(
      "••••@example.com"
    );
  });

  it("returns an empty string for nullish input regardless of permission", () => {
    authStore.getState().setPermissions(buildPermissions());
    expect(pii(null, "USERS", maskEmail)).toBe("");
    expect(pii(undefined, "MERCHANTS", maskEmail)).toBe("");
    expect(pii("", "MERCHANTS", maskEmail)).toBe("");
  });

  it("masks when permissions are not loaded", () => {
    expect(pii("secret", "USERS", maskName)).toBe("s•••••");
  });
});

describe("usePIIPermission", () => {
  beforeEach(() => {
    authStore.getState().clearPermissions();
  });

  it("reflects VIEW-PII and EDIT-PII flags for the resource", () => {
    authStore.getState().setPermissions(buildPermissions());
    const { result } = renderHook(() => usePIIPermission("USERS"));
    expect(result.current).toEqual({ canView: true, canEdit: true });
  });

  it("returns false/false when the resource is not granted", () => {
    authStore.getState().setPermissions(buildPermissions());
    const { result } = renderHook(() => usePIIPermission("MERCHANTS"));
    expect(result.current).toEqual({ canView: false, canEdit: false });
  });

  it("returns false/false when permissions are not loaded", () => {
    const { result } = renderHook(() => usePIIPermission("USERS"));
    expect(result.current).toEqual({ canView: false, canEdit: false });
  });
});

describe("re-exported guards", () => {
  beforeEach(() => {
    authStore.getState().clearPermissions();
  });

  it("canViewPII and canEditPII proxy through to guards.ts", () => {
    authStore.getState().setPermissions(buildPermissions());
    expect(canViewPII("USERS")).toBe(true);
    expect(canEditPII("USERS")).toBe(true);
    expect(canViewPII("MERCHANTS")).toBe(false);
    expect(canEditPII("MERCHANTS")).toBe(false);
  });
});
