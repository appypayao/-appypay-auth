// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CanCreate } from "../can";
import { clearPermissions, grantPermissions } from "./test-utils";

describe("<CanCreate>", () => {
  beforeEach(() => {
    clearPermissions();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders children when the user has CREATE on the resource", () => {
    grantPermissions();
    const { queryByRole } = render(
      <CanCreate resource="MP-DASH">
        <button type="button">Create</button>
      </CanCreate>
    );
    expect(queryByRole("button")).not.toBeNull();
  });

  it("hides children when the user lacks CREATE", () => {
    grantPermissions();
    const { queryByRole } = render(
      <CanCreate resource="MP-ONPAY">
        <button type="button">Create</button>
      </CanCreate>
    );
    expect(queryByRole("button")).toBeNull();
  });
});
