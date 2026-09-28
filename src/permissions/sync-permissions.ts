import { authStore, organizationStore } from "../stores";
import type { Operator, Role } from "../types";
import { roleToUserPermissions } from "./role-to-permissions";

/**
 * Picks the `Role` in `operator.accessRole` that matches the currently
 * selected organization (by `merchantId`), falling back to the first
 * entry when no organization is selected or none matches.
 *
 * Returns `undefined` when the operator has no access roles at all.
 */
export const resolveActiveRole = (
  operator: Operator | undefined
): Role | undefined => {
  if (!operator?.accessRole?.length) {
    return undefined;
  }
  const current = organizationStore.getState().organization;
  if (current) {
    const match = operator.accessRole.find(
      (role) => role.merchantId === current.merchantId
    );
    if (match) {
      return match;
    }
  }
  return operator.accessRole[0];
};

/**
 * Single source of truth for hydrating permission state from a `/users/me`
 * response. It resolves the active role for the currently selected
 * organization, initialises the organization store when unset, and mirrors
 * the role's resources/permissions into the auth store so gates and route
 * guards can consume them.
 *
 * Call this whenever the operator payload changes (initial fetch, refetch,
 * or an org switch triggered from the UI).
 */
export const syncPermissionsFromOperator = (
  operator: Operator | undefined
): void => {
  const role = resolveActiveRole(operator);

  if (!role) {
    authStore.getState().clearPermissions();
    return;
  }

  const orgState = organizationStore.getState();
  if (!orgState.organization) {
    orgState.setOrganization(role);
  }

  authStore.getState().setPermissions(roleToUserPermissions(role));
};
