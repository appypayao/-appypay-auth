import { memo, type ReactNode } from "react";
import type { Action, ResourceCode } from "../types";
import { usePermission } from "./use-permission";

/**
 * Known permission actions.
 *
 * The intersection with `(string & {})` keeps autocomplete for the well-known
 * actions while still letting callers pass custom action codes without a cast.
 */
export type PermissionAction =
  | "VIEW"
  | "CREATE"
  | "EDIT"
  | "DELETE"
  | "CANCEL"
  | "REFUND"
  | "VIEW-PII"
  | "EDIT-PII"
  | (string & {});

export type ProtectedRenderMode = "unmount" | "hide";

export type ProtectedProps = {
  /** Resource code (e.g. "MP-DASH", "MP-ONPAY") the child depends on. */
  resource: ResourceCode;
  /** Action required on that resource. */
  action: PermissionAction;
  /** Rendered when the current user has the permission. */
  children: ReactNode;
  /** Rendered instead of children when access is denied. Defaults to `null`. */
  fallback?: ReactNode;
  /**
   * Controls how denied content is treated:
   * - `unmount` (default): children are removed from the DOM.
   * - `hide`: children stay mounted but are hidden with `display: none`.
   *
   * Use `hide` when you need to keep child state alive or when a wrapping
   * element (e.g. a tooltip) needs the DOM node to remain.
   */
  mode?: ProtectedRenderMode;
};

/**
 * Generic permission gate.
 *
 * Renders `children` only when the current user holds `action` on `resource`.
 * Otherwise renders `fallback` (or nothing).
 *
 * The component is memoized and the underlying selector returns a primitive
 * boolean, so it only re-renders when the resolved permission flips.
 */
function ProtectedComponent({
  resource,
  action,
  children,
  fallback = null,
  mode = "unmount",
}: ProtectedProps) {
  const allowed = usePermission(resource, action as Action);

  if (allowed) {
    return <>{children}</>;
  }

  if (mode === "hide") {
    return (
      <>
        <span aria-hidden="true" style={{ display: "none" }}>
          {children}
        </span>
        {fallback}
      </>
    );
  }

  return <>{fallback}</>;
}

export const Protected = memo(ProtectedComponent);
Protected.displayName = "Protected";
