import type { ResourceCode } from "../types";

/**
 * Backoffice resource codes as returned by `GET /users/me`.
 *
 * Keep this list as the single source of truth so features do not sprinkle
 * magic strings across the codebase.
 */
export const RESOURCES = {
  BILL: "MP-BILL",
  DASH: "MP-DASH",
  CONF: "MP-CONF",
  CONF_AML: "MP-CONF-AML",
  CONF_USRS: "MP-CONF-USRS",
  CONF_APP: "MP-CONF-APP",
  CONF_MINFO: "MP-CONF-MINFO",
  ONPAY: "MP-ONPAY",
} as const satisfies Record<string, ResourceCode>;

export type ResourceKey = keyof typeof RESOURCES;

/**
 * Legacy alias table mirroring the historical `RESOURCE_CODES` map used
 * across the app. New code should reference `RESOURCES` above.
 */
export const RESOURCE_CODES = {
  DASHBOARD: RESOURCES.DASH,
  TRANSACTIONS: RESOURCES.ONPAY,
  BILLING: RESOURCES.BILL,
  MERCHANT_INFO: RESOURCES.CONF_MINFO,
  USERS: RESOURCES.CONF_USRS,
  CREDENTIALS: RESOURCES.CONF_APP,
  CONFIGURATIONS: RESOURCES.CONF,
} as const;

export const PERMISSION_CODES = {
  VIEW: "VIEW",
  EDIT: "EDIT",
  CREATE: "CREATE",
  DELETE: "DELETE",
  CANCEL: "CANCEL",
  REFUND: "REFUND",
  VIEW_PII: "VIEW-PII",
  EDIT_PII: "EDIT-PII",
} as const;

export type PermissionCode =
  | (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES]
  | string;

/**
 * TanStack Query keys owned by the auth package so cache invalidation stays
 * coordinated between the permission-refresh hook and consumer app code.
 */
export const AUTH_QUERY_KEYS = {
  OPERATOR_ME: "getOperatorMe",
} as const;
