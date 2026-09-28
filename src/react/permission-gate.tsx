import {
  cloneElement,
  isValidElement,
  memo,
  type ReactElement,
  type ReactNode,
} from "react";
import { getAuthConfigOrNull } from "../config";
import type { Action, ResourceCode } from "../types";
import type { PermissionAction } from "./protected";
import { usePermission } from "./use-permission";

export type PermissionGateMode = "disable" | "hide";

/**
 * Slot that renders the disabled child wrapped in a tooltip. Consumers pass
 * an implementation using their own design system (e.g. Radix Tooltip +
 * shadcn styling). Return the disabled child unchanged from a headless
 * fallback if no tooltip UI is available.
 */
export type PermissionGateTooltipRenderer = (args: {
  child: ReactNode;
  message: string;
}) => ReactNode;

const defaultRenderTooltip: PermissionGateTooltipRenderer = ({ child }) =>
  child;

export type PermissionGateProps = {
  /** Resource code the child depends on. */
  resource: ResourceCode;
  /** Action required on the resource. */
  action: PermissionAction;
  /**
   * When denied, either disable the child + show a tooltip (default) or
   * remove the child from the tree entirely.
   */
  mode?: PermissionGateMode;
  /**
   * i18n key resolved for the tooltip content and `aria-label` when the
   * gate denies access. Resolved via the `t` function registered with
   * `configureAuth`. Defaults to `common:permissions.denied-tooltip`.
   */
  deniedMessageKey?: string;
  /** Literal fallback message when no i18n `t` function is registered. */
  deniedMessageFallback?: string;
  /**
   * Optional override rendered instead of the disabled child when denied.
   * Only used when `mode="disable"`.
   */
  deniedFallback?: ReactNode;
  /**
   * Slot supplied by the host app to wrap the disabled child in its own
   * tooltip implementation. When omitted the disabled child is returned as-is.
   */
  renderTooltip?: PermissionGateTooltipRenderer;
  /**
   * Exactly one React element (button, input, form field, menu item, ...)
   * that should be gated. In `mode="disable"` the child is cloned with
   * `disabled` + `aria-disabled` + `aria-label`.
   */
  children: ReactElement<{
    disabled?: boolean;
    "aria-disabled"?: boolean | "false" | "true";
    "aria-label"?: string;
    title?: string;
    onClick?: (...args: unknown[]) => unknown;
  }>;
};

const resolveMessage = (key: string, fallback: string): string => {
  const config = getAuthConfigOrNull();
  if (config?.t) {
    return config.t(key, { defaultValue: fallback });
  }
  return fallback;
};

/**
 * Gate a single interactive child on a resource+action permission.
 *
 * - `mode="disable"` (default): when the user lacks the permission the child
 *   is cloned as `disabled` (with `aria-disabled` + `aria-label`) and passed
 *   to `renderTooltip` for the host app to wrap in its own tooltip.
 * - `mode="hide"`: the child is unmounted when the user lacks the permission
 *   (use for controls that would leak information — e.g. "Copy secret" — or
 *   for row-level actions inside menus).
 */
function PermissionGateComponent({
  resource,
  action,
  mode = "disable",
  deniedMessageKey = "permissions.denied-tooltip",
  deniedMessageFallback = "You do not have permission to perform this action.",
  deniedFallback,
  renderTooltip = defaultRenderTooltip,
  children,
}: PermissionGateProps) {
  const allowed = usePermission(resource, action as Action);

  if (allowed) {
    return children;
  }

  if (mode === "hide") {
    return null;
  }

  if (deniedFallback !== undefined) {
    return <>{deniedFallback}</>;
  }

  if (!isValidElement(children)) {
    return null;
  }

  const message = resolveMessage(deniedMessageKey, deniedMessageFallback);

  const disabledChild = cloneElement(children, {
    disabled: true,
    "aria-disabled": true,
    "aria-label": message,
    onClick: undefined,
  });

  return <>{renderTooltip({ child: disabledChild, message })}</>;
}

export const PermissionGate = memo(PermissionGateComponent);
PermissionGate.displayName = "PermissionGate";
