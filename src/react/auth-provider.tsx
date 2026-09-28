import {
  createContext,
  type PropsWithChildren,
  useEffect,
  useState,
} from "react";
import { createStore, type StoreApi } from "zustand";
import { syncPermissionsFromOperator } from "../permissions/sync-permissions";
import { organizationStore } from "../stores";
import type { Operator } from "../types";

export type OperatorStoreProps = {
  operator?: Operator;
  setOperator: (operator: Operator) => void;
  clearOperatorData?: () => void;
};

type ProviderProps = PropsWithChildren & {
  initialOperator?: Operator;
};

export const UserStoreContext = createContext<
  StoreApi<OperatorStoreProps> | undefined
>(undefined);

/**
 * Wires the authenticated operator payload into the shared permission
 * stores. Wrap the app under this provider once the initial `/users/me`
 * query has resolved.
 *
 * Hydrates permissions whenever the operator payload changes (initial
 * fetch or a background refetch), and re-hydrates when the selected
 * organization changes (org dropdown), so permission gates follow the
 * active org.
 */
export default function AuthProvider({
  children,
  initialOperator,
}: ProviderProps) {
  const [store] = useState(() =>
    createStore<OperatorStoreProps>((set) => ({
      operator: initialOperator,
      clearOperatorData: () => set({ operator: undefined }),
      setOperator: (operator) => set({ operator }),
    }))
  );

  useEffect(() => {
    syncPermissionsFromOperator(initialOperator);

    const unsubscribe = organizationStore.subscribe(() => {
      syncPermissionsFromOperator(initialOperator);
    });

    return unsubscribe;
  }, [initialOperator]);

  return (
    <UserStoreContext.Provider value={store}>
      {children}
    </UserStoreContext.Provider>
  );
}
