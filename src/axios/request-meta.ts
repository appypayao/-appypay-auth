import type { Action, ResourceCode } from "../types";

/**
 * Optional metadata callers can attach to an Axios request via
 * `config.meta` so the shared interceptors can log the permission being
 * exercised and react correctly when the backend returns 403. The
 * backend remains the source of truth: this metadata is used for
 * observability and UX only, never to short-circuit a request.
 */
export type PermissionRequestMeta = {
  resource: ResourceCode;
  action: Action;
  /**
   * When true, a 403 response causes a hard navigation to the configured
   * access-denied path. Defaults to false so a denied side-action (e.g. a
   * delete inside a form) surfaces via toast without ejecting the user
   * from the page they are on.
   */
  redirectOnForbidden?: boolean;
};

declare module "axios" {
  interface AxiosRequestConfig {
    meta?: PermissionRequestMeta;
  }
  interface InternalAxiosRequestConfig {
    meta?: PermissionRequestMeta;
  }
}
