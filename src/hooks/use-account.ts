import { createContext, useContext } from "react";
import { DEFAULT_PREFERENCES, type Preferences } from "../../shared/preferences";
import type { User } from "@/lib/api";

interface AccountContextValue {
  user: User | null;
  preferences: Preferences;
  loading: boolean;
  error: boolean;
  reload: () => void;
  save: (input: { name?: string; preferences?: Partial<Preferences> }) => Promise<User>;
}
export const AccountContext = createContext<AccountContextValue>({
  user: null,
  preferences: { ...DEFAULT_PREFERENCES },
  loading: false,
  error: false,
  reload: () => {},
  save: async () => {
    throw new Error("Account provider unavailable.");
  },
});
export function useAccount() {
  return useContext(AccountContext);
}
