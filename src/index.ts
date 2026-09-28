/**
 * `@appypay/auth` — Shared authorization + OAuth + JWT layer.
 *
 * Subpath exports:
 *  - `@appypay/auth/config`  — configureAuth, getAuthConfig
 *  - `@appypay/auth/stores`  — authStore, organizationStore
 *  - `@appypay/auth/guards`  — hasPermission, canView/Create/Edit/…,
 *                              roleToUserPermissions, syncPermissionsFromOperator
 *  - `@appypay/auth/pii`     — masking helpers + usePIIPermission
 *  - `@appypay/auth/react`   — AuthProvider, usePermission, Protected,
 *                              PermissionGate, Can* shorthands
 *  - `@appypay/auth/router`  — requirePermission (TanStack Router)
 *  - `@appypay/auth/query`   — usePermissionRefresh (TanStack Query)
 *  - `@appypay/auth/axios`   — createAuthInterceptors + PermissionRequestMeta
 *  - `@appypay/auth/oauth`   — login, refreshToken, decodeJWT, isTokenExpired,
 *                              createUserAccountApi, logout
 *  - `@appypay/auth/testing` — buildPermissions, grantPermissions, clearPermissions
 */

export type {
  AnalyticsFn,
  AuthConfig,
  AuthRoutesConfig,
  NavigateFn,
  OAuthConfig,
  ToastFn,
  TranslateFn,
} from "./config";
export { configureAuth, getAuthConfig, getAuthConfigOrNull } from "./config";
export type { PermissionCode, ResourceKey } from "./constants";
export {
  AUTH_QUERY_KEYS,
  PERMISSION_CODES,
  RESOURCE_CODES,
  RESOURCES,
} from "./constants";

export type {
  Action,
  AuthStatusResponse,
  LoginCredentials,
  LoginErrorResponse,
  LoginResponse,
  Operator,
  Permission,
  PermissionEntry,
  Resource,
  ResourceCode,
  Role,
  SendCodeRequest,
  UserPermissions,
} from "./types";
