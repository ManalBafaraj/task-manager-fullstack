import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AccountContext } from "@/hooks/use-account";
import { accountApi, session, type User } from "@/lib/api";
import { applyAppearance, cachedPreferences, cachePreferences } from "@/lib/appearance";
import { normalizePreferences } from "../../../shared/preferences";

function subscribe(listener: () => void) {
  window.addEventListener("taskflow-session", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("taskflow-session", listener);
    window.removeEventListener("storage", listener);
  };
}
export function AccountProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, session.getRawUser, () => null);
  const cached = useMemo(() => (raw ? session.getUser() : null), [raw]);
  const client = useQueryClient();
  const navigate = useNavigate();
  const key = ["account", cached?.id ?? ""];
  const query = useQuery({
    queryKey: key,
    queryFn: () => accountApi.get(),
    enabled: Boolean(cached && session.getToken()),
    retry: false,
    staleTime: 60000,
  });
  const user = cached ? (query.data ?? cached) : null;
  const preferences = useMemo(
    () =>
      normalizePreferences(user?.preferences ?? (user ? cachedPreferences(user.id) : undefined)),
    [user],
  );
  useEffect(() => {
    if (query.data && raw !== JSON.stringify(query.data)) session.updateUser(query.data);
  }, [query.data, raw]);
  useEffect(() => {
    if (!user && session.getRawUser()) return;
    applyAppearance(user ? preferences.appearance : "light");
    if (user) cachePreferences(user.id, preferences);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const change = () => {
      if (user && preferences.appearance === "system") applyAppearance("system");
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [user, preferences]);
  useEffect(() => {
    const expired = () => {
      client.clear();
      toast.error("Your session expired. Please sign in again.");
      void navigate({ to: "/login", replace: true });
    };
    window.addEventListener("taskflow-auth-expired", expired);
    return () => window.removeEventListener("taskflow-auth-expired", expired);
  }, [client, navigate]);
  const save = async (input: Parameters<typeof accountApi.update>[0]) => {
    const saved = await accountApi.update(input);
    client.setQueryData<User>(["account", saved.id], saved);
    session.updateUser(saved);
    return saved;
  };
  return (
    <AccountContext.Provider
      value={{
        user,
        preferences,
        loading: query.isFetching,
        error: query.isError,
        reload: () => void query.refetch(),
        save,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}
