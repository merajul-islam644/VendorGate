import { createContext, useContext } from "react";

/**
 * App-wide navigation handle. Lives in a context so any page or layout can
 * trigger route changes without prop-drilling through AppShell. The provider
 * is `AppRouter` because that's where the path state and `pushState`/popstate
 * sync actually live.
 */
export type Navigate = (path: string) => void;

const NavigationContext = createContext<Navigate | undefined>(undefined);

export function NavigationProvider({ navigate, children }: { navigate: Navigate; children: React.ReactNode }) {
  return <NavigationContext.Provider value={navigate}>{children}</NavigationContext.Provider>;
}

export function useNavigate(): Navigate {
  const navigate = useContext(NavigationContext);
  if (!navigate) {
    throw new Error("useNavigate must be used within NavigationProvider (i.e. inside AppRouter)");
  }
  return navigate;
}
