import { memo } from "react";
import { Protected, type ProtectedProps } from "./protected";

export type CanViewProps = Omit<ProtectedProps, "action">;
export type CanCreateProps = Omit<ProtectedProps, "action">;
export type CanEditProps = Omit<ProtectedProps, "action">;
export type CanDeleteProps = Omit<ProtectedProps, "action">;

/** Shorthand for `<Protected action="VIEW">`. */
export const CanView = memo(function CanViewComponent(props: CanViewProps) {
  return <Protected {...props} action="VIEW" />;
});
CanView.displayName = "CanView";

/** Shorthand for `<Protected action="CREATE">`. */
export const CanCreate = memo(function CanCreateComponent(
  props: CanCreateProps
) {
  return <Protected {...props} action="CREATE" />;
});
CanCreate.displayName = "CanCreate";

/** Shorthand for `<Protected action="EDIT">`. */
export const CanEdit = memo(function CanEditComponent(props: CanEditProps) {
  return <Protected {...props} action="EDIT" />;
});
CanEdit.displayName = "CanEdit";

/** Shorthand for `<Protected action="DELETE">`. */
export const CanDelete = memo(function CanDeleteComponent(
  props: CanDeleteProps
) {
  return <Protected {...props} action="DELETE" />;
});
CanDelete.displayName = "CanDelete";
