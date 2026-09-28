// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CanEdit } from "../can";
import { clearPermissions, grantPermissions } from "./test-utils";

describe("<CanEdit>", () => {
  beforeEach(() => {
    clearPermissions();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders children when the user has EDIT on the resource", () => {
    grantPermissions();
    const { queryByRole } = render(
      <CanEdit resource="MP-DASH">
        <button type="button">Edit</button>
      </CanEdit>
    );
    expect(queryByRole("button")).not.toBeNull();
  });

  it("hides children when the user lacks EDIT", () => {
    grantPermissions();
    const { queryByRole } = render(
      <CanEdit resource="MP-ONPAY">
        <button type="button">Edit</button>
      </CanEdit>
    );
    expect(queryByRole("button")).toBeNull();
  });
});
