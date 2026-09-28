import type { AxiosError, AxiosInstance } from "axios";
import { getAuthConfig, getAuthConfigOrNull } from "../config";
import { refreshToken } from "../oauth/client";
import { isTokenExpired } from "../oauth/jwt";
import { logout } from "../oauth/logout";
import { trackAccessDenied } from "../router/route-guards";
import { authStore } from "../stores";
import type { PermissionRequestMeta } from "./request-meta";

export type AuthInterceptorOptions = {
  /**
   * Called on every outgoing request to resolve the current UI language
   * (used to set the `Accept-Language` header). Defaults to reading
   * `localStorage[LANGUAGE_STORAGE_KEY]` when omitted.
   */
  getLanguage?: () => string | null;
  /**
   * localStorage key the app writes the current UI language to. Only used
   * when `getLanguage` is not provided. Defaults to `"i18nextLng"`.
   */
  languageStorageKey?: string;
};

const DEFAULT_LANGUAGE_STORAGE_KEY = "i18nextLng";

const getAuth = () => authStore.getState().auth;
const setAccessToken = (token: string) =>
  authStore.getState().setAccessToken(token);

const describePermission = (meta?: PermissionRequestMeta): string =>
  meta ? ` with ${meta.action} permission on ${meta.resource}` : "";

type PermissionDeniedEnvelope = {
  code?: string;
  message?: string;
  error_description?: string;
};

const extractDeniedMessage = (error: AxiosError): string => {
  const data = error.response?.data as PermissionDeniedEnvelope | undefined;
  return (
    data?.message ?? data?.error_description ?? error.message ?? "Forbidden"
  );
};

const translateForbidden = (): string => {
  const config = getAuthConfigOrNull();
  const fallback = "Permission denied";
  if (config?.t) {
    return config.t("common:errors.permission-denied", {
      defaultValue: fallback,
    });
  }
  return fallback;
};

const showForbiddenToast = (title: string, description: string) => {
  const config = getAuthConfigOrNull();
  const toastFn = config?.toast;
  if (!toastFn) {
    return;
  }
  if (typeof toastFn.error === "function") {
    toastFn.error(title, { description });
    return;
  }
  toastFn(`${title}: ${description}`);
};

const redirectToAccessDenied = () => {
  const { routes } = getAuthConfig();
  if (typeof window === "undefined") {
    return;
  }
  const returnTo = window.location.href;
  window.location.assign(
    `${routes.accessDenied}?returnTo=${encodeURIComponent(returnTo)}`
  );
};

/**
 * Registers request + response interceptors on the caller's axios instance:
 *  - Attaches the current access token as an `Authorization: Bearer …` header.
 *  - Adds an `Accept-Language` header from the app's language storage.
 *  - Handles 401 by refreshing the token (with a shared queue) or logging
 *    the user out.
 *  - Handles 403 by surfacing a toast, tracking the denial, dropping the
 *    cached permission map, and optionally redirecting to `/access-denied`
 *    when `config.meta.redirectOnForbidden === true`.
 *
 * Call once at app bootstrap after `configureAuth`.
 */
export function createAuthInterceptors(
  api: AxiosInstance,
  options: AuthInterceptorOptions = {}
): AxiosInstance {
  const languageStorageKey =
    options.languageStorageKey ?? DEFAULT_LANGUAGE_STORAGE_KEY;
  const resolveLanguage =
    options.getLanguage ??
    (() =>
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(languageStorageKey));

  api.interceptors.request.use((config) => {
    const auth = getAuth();
    if (auth?.access_token) {
      config.headers.Authorization = `Bearer ${auth.access_token}`;
    }

    const language = resolveLanguage();
    config.headers["Accept-Language"] = language === "pt" ? "pt-BR" : language;

    // Observability only: never gate the request client-side.
    // Backend is the source of truth for permission enforcement.
    if (
      typeof import.meta !== "undefined" &&
      (import.meta as { env?: { DEV?: boolean } }).env?.DEV
    ) {
      const method = (config.method ?? "GET").toUpperCase();
      console.debug(
        `[api] Attempting ${method} ${config.url ?? ""}${describePermission(
          config.meta
        )}`
      );
    }

    return config;
  });

  let isRefreshing = false;
  let refreshQueue: ((token: string) => void)[] = [];

  const processQueue = (token: string) => {
    for (const callback of refreshQueue) {
      callback(token);
    }
    refreshQueue = [];
  };

  const handleForbidden = (error: AxiosError) => {
    const originalRequest = error.config;
    const meta = originalRequest?.meta;
    const message = extractDeniedMessage(error);
    const title = translateForbidden();

    showForbiddenToast(title, message);

    trackAccessDenied({
      resource: meta?.resource ?? "UNKNOWN",
      action: meta?.action ?? "UNKNOWN",
      path: originalRequest?.url ?? "",
    });

    authStore.getState().clearPermissions();

    if (meta?.redirectOnForbidden) {
      redirectToAccessDenied();
    }

    return Promise.reject({ ...error, message });
  };

  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config;

      if (error.response?.status === 403) {
        return handleForbidden(error);
      }

      if (error.response?.status !== 401 || !originalRequest) {
        const data = error.response?.data as
          | { error_description?: string }
          | undefined;
        return Promise.reject({
          ...error,
          message: data?.error_description ?? error.message,
        });
      }

      const auth = getAuth();
      const token = auth?.access_token;

      if (!auth || (token && !isTokenExpired(token))) {
        return Promise.reject(error);
      }

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const newAuth = await refreshToken(auth?.refresh_token || "");
          if (!newAuth) {
            throw new Error("Failed to refresh token");
          }

          setAccessToken(newAuth.access_token);
          processQueue(newAuth.access_token);
          originalRequest.headers.Authorization = `Bearer ${newAuth.access_token}`;
          return api(originalRequest);
        } catch (err) {
          logout();
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve) => {
        refreshQueue.push((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }
  );

  return api;
}
