// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import authStore from "../../stores/auth-store";
import { Protected } from "../protected";
import { clearPermissions, grantPermissions } from "./test-utils";

describe("<Protected>", () => {
  beforeEach(() => {
    clearPermissions();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders children when the user has the permission", () => {
    grantPermissions();
    const { queryByRole } = render(
      <Protected action="EDIT" resource="MP-DASH">
        <button type="button">Edit</button>
      </Protected>
    );
    expect(queryByRole("button")).not.toBeNull();
  });

  it.each([
    "VIEW-PII",
    "EDIT-PII",
  ])("renders children when the user has the %s permission", (action) => {
    grantPermissions();
    const { queryByRole } = render(
      <Protected action={action} resource="MP-DASH">
        <button type="button">Sensitive value</button>
      </Protected>
    );
    expect(queryByRole("button")).not.toBeNull();
  });

  it("renders nothing by default when access is denied", () => {
    grantPermissions();
    const { queryByRole } = render(
      <Protected action="DELETE" resource="MP-DASH">
        <button type="button">Delete</button>
      </Protected>
    );
    expect(queryByRole("button")).toBeNull();
  });

  it("renders the fallback when access is denied", () => {
    grantPermissions();
    const { queryByText } = render(
      <Protected
        action="DELETE"
        fallback={<div>No access</div>}
        resource="MP-DASH"
      >
        <button type="button">Delete</button>
      </Protected>
    );
    expect(queryByText("No access")).not.toBeNull();
  });

  it("renders nothing when no permissions are loaded", () => {
    const { queryByRole } = render(
      <Protected action="VIEW" resource="MP-DASH">
        <button type="button">View</button>
      </Protected>
    );
    expect(queryByRole("button")).toBeNull();
  });

  it('keeps children in the DOM but hidden when mode="hide"', () => {
    grantPermissions();
    const { getByText } = render(
      <Protected action="DELETE" mode="hide" resource="MP-DASH">
        <button type="button">Delete</button>
      </Protected>
    );
    const button = getByText("Delete");
    expect(button).not.toBeNull();
    const wrapper = button.parentElement;
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
    expect(wrapper?.style.display).toBe("none");
  });

  it("emits no console warnings during render", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    grantPermissions();
    render(
      <Protected action="EDIT" resource="MP-DASH">
        <button type="button">Edit</button>
      </Protected>
    );
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });

  it("re-renders when permissions change", () => {
    const { queryByRole, rerender } = render(
      <Protected action="EDIT" resource="MP-DASH">
        <button type="button">Edit</button>
      </Protected>
    );
    expect(queryByRole("button")).toBeNull();

    grantPermissions();
    rerender(
      <Protected action="EDIT" resource="MP-DASH">
        <button type="button">Edit</button>
      </Protected>
    );
    expect(queryByRole("button")).not.toBeNull();
  });

  it("does not re-render children when unrelated auth-store state changes", () => {
    grantPermissions();
    const renderSpy = vi.fn();
    function Child() {
      renderSpy();
      return <span>child</span>;
    }
    render(
      <Protected action="EDIT" resource="MP-DASH">
        <Child />
      </Protected>
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Unrelated update: mutate the access token, permissions unchanged.
    authStore.getState().setAccessToken("new-token");
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
