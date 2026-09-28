import type { Operator } from "../types";

export type NavigateFn = (opts: {
  to: string;
  search?: Record<string, unknown>;
}) => void;

export type ToastFn = {
  (message: string): void;
  error?: (title: string, opts?: { description?: string }) => void;
};

export type TranslateFn = (
  key: string,
  opts?: { defaultValue?: string }
) => string;

export type AnalyticsFn = (event: string, props: unknown) => void;

export type AuthRoutesConfig = {
  /** Path the user is redirected to when no auth session exists. */
  login: string;
  /** Path the user is redirected to when a permission gate denies access. */
  accessDenied: string;
};

export type OAuthConfig = {
  /** OAuth authority base URL (e.g. Azure AD B2C tenant URL). */
  url: string;
  /** B2C policy segment appended to the base URL. */
  policy: string;
  clientId: string;
  scope: string;
};

export type AuthConfig = {
  oauth: OAuthConfig;
  /**
   * Fetches the current operator profile — the authoritative permission
   * payload. Called by `syncPermissionsFromOperator` consumers and by the
   * `usePermissionRefresh` hook.
   */
  fetchOperatorMe: () => Promise<Operator>;
  /**
   * Called after logout has cleared the auth + organization stores. The
   * backoffice reloads the window; a native shell might exit the app.
   * Defaults to a full page reload in browser environments.
   */
  onLogout?: () => void;
  navigate?: NavigateFn;
  toast?: ToastFn;
  t?: TranslateFn;
  analytics?: AnalyticsFn;
  routes?: Partial<AuthRoutesConfig>;
};

type ResolvedAuthConfig = AuthConfig & { routes: AuthRoutesConfig };

const DEFAULT_ROUTES: AuthRoutesConfig = {
  login: "/login",
  accessDenied: "/access-denied",
};

let currentConfig: ResolvedAuthConfig | null = null;

/**
 * Initialise the shared auth package. Call once at app bootstrap before any
 * component that depends on `@appypay/auth` renders or any auth-decorated
 * axios request fires.
 */
export function configureAuth(config: AuthConfig): void {
  currentConfig = {
    ...config,
    routes: { ...DEFAULT_ROUTES, ...(config.routes ?? {}) },
  };
}

export function getAuthConfig(): ResolvedAuthConfig {
  if (!currentConfig) {
    throw new Error(
      "[@appypay/auth] configureAuth() must be called before accessing the auth config."
    );
  }
  return currentConfig;
}

export function getAuthConfigOrNull(): ResolvedAuthConfig | null {
  return currentConfig;
}

/** Test-only helper. Not exported from the package root. */
export function __resetAuthConfigForTests(): void {
  currentConfig = null;
}
