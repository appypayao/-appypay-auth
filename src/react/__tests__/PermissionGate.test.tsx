// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetAuthConfigForTests, configureAuth } from "../../config";
import { PermissionGate } from "../permission-gate";
import { clearPermissions, grantPermissions } from "./test-utils";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("<PermissionGate>", () => {
  beforeEach(() => {
    clearPermissions();
    __resetAuthConfigForTests();
    configureAuth({
      oauth: { url: "u", policy: "p", clientId: "c", scope: "s" },
      fetchOperatorMe: () => Promise.reject(new Error("not used")),
      t: (key: string) => key,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the child unchanged when permission is granted", () => {
    grantPermissions();
    const onClick = vi.fn();
    const { getByRole } = render(
      <PermissionGate action="EDIT" resource="MP-DASH">
        <button onClick={onClick} type="button">
          Edit
        </button>
      </PermissionGate>
    );
    const button = getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables the child and suppresses onClick when denied", () => {
    grantPermissions();
    const onClick = vi.fn();
    const { getByRole } = render(
      <PermissionGate action="EDIT" resource="MP-ONPAY">
        <button onClick={onClick} type="button">
          Edit
        </button>
      </PermissionGate>
    );
    const button = getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe(
      "permissions.denied-tooltip"
    );
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("hides the child entirely when mode='hide' and permission is denied", () => {
    grantPermissions();
    const { queryByRole } = render(
      <PermissionGate action="EDIT" mode="hide" resource="MP-ONPAY">
        <button type="button">Edit</button>
      </PermissionGate>
    );
    expect(queryByRole("button")).toBeNull();
  });

  it("renders deniedFallback when provided and denied", () => {
    grantPermissions();
    const { queryByRole, queryByText } = render(
      <PermissionGate
        action="EDIT"
        deniedFallback={<span>N/A</span>}
        resource="MP-ONPAY"
      >
        <button type="button">Edit</button>
      </PermissionGate>
    );
    expect(queryByRole("button")).toBeNull();
    expect(queryByText("N/A")).not.toBeNull();
  });

  it("uses the custom deniedMessageKey when provided", () => {
    grantPermissions();
    const { getByRole } = render(
      <PermissionGate
        action="EDIT"
        deniedMessageKey="permissions.denied-field-tooltip"
        resource="MP-ONPAY"
      >
        <button type="button">Edit</button>
      </PermissionGate>
    );
    expect(getByRole("button").getAttribute("aria-label")).toBe(
      "permissions.denied-field-tooltip"
    );
  });
});
