import { describe, expect, it } from "vitest";
import type { Role } from "../../types";
import { roleToUserPermissions } from "../role-to-permissions";

const buildRole = (overrides: Partial<Role> = {}): Role =>
  ({
    id: 1,
    azureAdAppId: "app",
    merchantId: 1,
    merchantName: "AppyPay Agregador",
    name: "System Administrator",
    isAggregator: true,
    isActive: true,
    roleId: 1,
    role: "System Administrator",
    code: "SDM",
    createdBy: "GG",
    updatedBy: "GG",
    createdDate: "2023-07-07T11:40:48.77",
    updatedDate: "2023-07-07T11:40:48.77",
    resources: [
      {
        resourceId: 1,
        resourceName: "Dashboard",
        resourceCode: "MP-DASH",
        permissions: [
          { permissionId: 2, permissionName: "VIEW", permissionCode: "VIEW" },
        ],
      },
      {
        resourceId: 2,
        resourceName: "Online Payment",
        resourceCode: "MP-ONPAY",
        permissions: [
          { permissionId: 1, permissionName: "EDIT", permissionCode: "EDIT" },
          { permissionId: 2, permissionName: "VIEW", permissionCode: "VIEW" },
          {
            permissionId: 3,
            permissionName: "CREATE",
            permissionCode: "CREATE",
          },
        ],
      },
    ],
    ...overrides,
  }) as Role;

describe("roleToUserPermissions", () => {
  it("maps role.code to roleCode and flattens each resource's permissionCodes", () => {
    const result = roleToUserPermissions(buildRole());

    expect(result.roleCode).toBe("SDM");
    expect(result.resources).toEqual([
      { resourceCode: "MP-DASH", permissionCodes: ["VIEW"] },
      {
        resourceCode: "MP-ONPAY",
        permissionCodes: ["EDIT", "VIEW", "CREATE"],
      },
    ]);
  });

  it("handles missing resources and permissions arrays without throwing", () => {
    const result = roleToUserPermissions(
      buildRole({ resources: undefined as unknown as Role["resources"] })
    );

    expect(result.roleCode).toBe("SDM");
    expect(result.resources).toEqual([]);
  });

  it("falls back to an empty string when role.code is missing", () => {
    const result = roleToUserPermissions(
      buildRole({ code: undefined as unknown as string, resources: [] })
    );

    expect(result.roleCode).toBe("");
    expect(result.resources).toEqual([]);
  });

  it("filters out permissions with no permissionCode", () => {
    const result = roleToUserPermissions(
      buildRole({
        resources: [
          {
            resourceId: 1,
            resourceName: "Dashboard",
            resourceCode: "MP-DASH",
            permissions: [
              {
                permissionId: 1,
                permissionName: "VIEW",
                permissionCode: "VIEW",
              },
              {
                permissionId: 2,
                permissionName: "",
                permissionCode: undefined as unknown as string,
              },
            ],
          },
        ],
      })
    );

    expect(result.resources[0].permissionCodes).toEqual(["VIEW"]);
  });
});
