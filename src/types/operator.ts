/**
 * Canonical operator/role/resource/permission shape as returned by
 * `GET /users/me`. Owned by the shared auth package so every client-side
 * app agrees on the payload.
 */

export type Permission = {
  permissionId: number;
  permissionName: string;
  permissionCode: string;
};

export type Resource = {
  resourceId: number;
  resourceName: string;
  resourceCode: string;
  permissions: Permission[];
};

export type Role = {
  id: number;
  azureAdAppId: string;
  merchantId: number;
  merchantName: string;
  internBankCode?: string;
  name: string;
  isAggregator: boolean;
  isActive: boolean;
  roleId: number;
  role: string;
  code: string;
  createdBy: string;
  updatedBy: string;
  createdDate: string;
  updatedDate: string;
  resources: Resource[];
};

export type Operator = {
  userId: number;
  email: string;
  name: string;
  photoUrl?: string;
  aggregatorId: number;
  azureAdAppId: string;
  tenantId: string;
  roleId: number;
  role: string;
  roleCode: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdDate: string;
  updatedDate: string;
  accessRole: Role[];
};
