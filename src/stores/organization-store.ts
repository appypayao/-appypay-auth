import { createStore } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "../types";

export type OrganizationStoreProps = {
  organization?: Role;
  init: (value: Role) => void;
  setOrganization: (value: Role) => void;
  clearOrganization: () => void;
};

const organizationStore = createStore<OrganizationStoreProps>()(
  persist(
    (set) => ({
      init: (organization) =>
        set((state) => (state.organization ? state : { organization })),
      setOrganization: (organization) => set({ organization }),
      clearOrganization: () => set({ organization: undefined }),
    }),
    {
      name: "organization-storage",
    }
  )
);

export default organizationStore;
