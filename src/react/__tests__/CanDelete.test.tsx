// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CanDelete } from "../can";
import { clearPermissions, grantPermissions } from "./test-utils";

describe("<CanDelete>", () => {
  beforeEach(() => {
    clearPermissions();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders children when the user has DELETE on the resource", () => {
    grantPermissions();
    const { queryByRole } = render(
      <CanDelete resource="MP-ONPAY">
        <button type="button">Delete</button>
      </CanDelete>
    );
    expect(queryByRole("button")).not.toBeNull();
  });

  it("hides children when the user lacks DELETE", () => {
    grantPermissions();
    const { queryByRole } = render(
      <CanDelete resource="MP-DASH">
        <button type="button">Delete</button>
      </CanDelete>
    );
    expect(queryByRole("button")).toBeNull();
  });
});
