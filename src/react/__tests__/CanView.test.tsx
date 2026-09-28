// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CanView } from "../can";
import { clearPermissions, grantPermissions } from "./test-utils";

describe("<CanView>", () => {
  beforeEach(() => {
    clearPermissions();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders children when the user has VIEW on the resource", () => {
    grantPermissions();
    const { queryByText } = render(
      <CanView resource="MP-DASH">
        <span>Dashboard</span>
      </CanView>
    );
    expect(queryByText("Dashboard")).not.toBeNull();
  });

  it("renders fallback when the user lacks VIEW", () => {
    const { queryByText } = render(
      <CanView fallback={<span>Denied</span>} resource="MP-DASH">
        <span>Dashboard</span>
      </CanView>
    );
    expect(queryByText("Dashboard")).toBeNull();
    expect(queryByText("Denied")).not.toBeNull();
  });
});
