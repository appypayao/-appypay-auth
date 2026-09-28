import { beforeEach, describe, expect, it, vi } from "vitest";
import authStore from "../../stores/auth-store";
import organizationStore from "../../stores/organization-store";
import type { Operator, Role } from "../../types";
import {
  resolveActiveRole,
  syncPermissionsFromOperator,
} from "../sync-permissions";

const buildRole = (overrides: Partial<Role>): Role =>
  ({
    id: 0,
    azureAdAppId: "app",
    merchantId: 0,
    merchantName: "",
    name: "",
    isAggregator: false,
    isActive: true,
    roleId: 0,
    role: "",
    code: "",
    createdBy: "",
    updatedBy: "",
    createdDate: "",
    updatedDate: "",
    resources: [],
    ...overrides,
  }) as Role;

const roleForMerchant = (merchantId: number, code: string): Role =>
  buildRole({
    merchantId,
    merchantName: `Merchant ${merchantId}`,
    code,
    resources: [
      {
        resourceId: 1,
        resourceName: "Dashboard",
        resourceCode: "MP-DASH",
        permissions: [
          { permissionId: 1, permissionName: "VIEW", permissionCode: "VIEW" },
        ],
      },
    ],
  });

const buildOperator = (roles: Role[]): Operator =>
  ({
    userId: 1,
    email: "u@example.com",
    name: "User",
    aggregatorId: 1,
    azureAdAppId: "app",
    tenantId: "t",
    roleId: 1,
    role: "r",
    roleCode: "",
    isActive: true,
    createdBy: "",
    updatedBy: "",
    createdDate: "",
    updatedDate: "",
    accessRole: roles,
  }) as Operator;

const resetStores = () => {
  authStore.setState({
    auth: undefined,
    permissions: null,
    roleCode: null,
    resourceCodes: [],
    permissionCodes: [],
  });
  organizationStore.setState({ organization: undefined });
};

describe("resolveActiveRole", () => {
  beforeEach(() => resetStores());

  it("returns undefined when the operator has no roles", () => {
    expect(resolveActiveRole(undefined)).toBeUndefined();
    expect(resolveActiveRole(buildOperator([]))).toBeUndefined();
  });

  it("returns the first role when no organization is selected", () => {
    const roles = [roleForMerchant(1, "SDM"), roleForMerchant(2, "OPS")];
    const role = resolveActiveRole(buildOperator(roles));

    expect(role?.merchantId).toBe(1);
  });

  it("returns the role matching the currently selected organization", () => {
    const roles = [roleForMerchant(1, "SDM"), roleForMerchant(2, "OPS")];
    organizationStore.getState().setOrganization(roles[1]);

    const role = resolveActiveRole(buildOperator(roles));

    expect(role?.merchantId).toBe(2);
    expect(role?.code).toBe("OPS");
  });

  it("falls back to the first role when the selected org has no match", () => {
    const roles = [roleForMerchant(1, "SDM")];
    organizationStore.getState().setOrganization(roleForMerchant(99, "GHOST"));

    const role = resolveActiveRole(buildOperator(roles));

    expect(role?.merchantId).toBe(1);
  });
});

describe("syncPermissionsFromOperator", () => {
  beforeEach(() => resetStores());

  it("clears permissions when the operator is undefined", () => {
    const spy = vi.spyOn(authStore.getState(), "clearPermissions");
    syncPermissionsFromOperator(undefined);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("initialises organizationStore with the first role when unset", () => {
    const roles = [roleForMerchant(1, "SDM"), roleForMerchant(2, "OPS")];
    syncPermissionsFromOperator(buildOperator(roles));

    expect(organizationStore.getState().organization?.merchantId).toBe(1);
  });

  it("mirrors the resolved role's permissions into authStore", () => {
    syncPermissionsFromOperator(buildOperator([roleForMerchant(1, "SDM")]));

    const state = authStore.getState();
    expect(state.roleCode).toBe("SDM");
    expect(state.resourceCodes).toEqual(["MP-DASH"]);
    expect(state.permissionCodes).toEqual(["VIEW"]);
  });

  it("does not overwrite an existing organization selection", () => {
    const roles = [roleForMerchant(1, "SDM"), roleForMerchant(2, "OPS")];
    organizationStore.getState().setOrganization(roles[1]);

    syncPermissionsFromOperator(buildOperator(roles));

    expect(organizationStore.getState().organization?.merchantId).toBe(2);
    expect(authStore.getState().roleCode).toBe("OPS");
  });
});
