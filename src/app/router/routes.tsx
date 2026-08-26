import { useEffect, useState } from "react";
import { AppShell } from "../layout/AppShell";
import { RedirectIfAuthenticated, RequireAuth } from "./guards";
import { CallbackPage } from "../../features/auth/CallbackPage";
import { ErrorPage } from "../../features/auth/ErrorPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { NotFoundPage } from "../../features/auth/NotFoundPage";
import { DashboardPage } from "../../features/dashboard/DashboardPage";
import { AssetsPage } from "../../features/assets/AssetsPage";
import { ProfilePage } from "../../features/profile/ProfilePage";
import { ApiAuditPage } from "../../features/api-audit/ApiAuditPage";
import { PlaywrightPage } from "../../features/playwright/PlaywrightPage";
import { RepoBrowserPage } from "../../features/repo-browser/RepoBrowserPage";
import { NavigationProvider } from "../providers/NavigationContext";

const protectedRoutes = {
  "/": DashboardPage,
  "/assets": AssetsPage,
  "/audit": ApiAuditPage,
  "/playwright": PlaywrightPage,
  "/repo-browser": RepoBrowserPage,
  "/error": ErrorPage,
  "/profile": ProfilePage
};

export function AppRouter() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: string) {
    const [nextPathname = "/", queryString = ""] = nextPath.split("?");
    window.history.pushState({}, "", nextPath);
    setPath(nextPathname);
    setSearch(queryString ? `?${queryString}` : "");
  }

  return (
    <NavigationProvider navigate={navigate}>
      <Routes path={path} search={search} navigate={navigate} />
    </NavigationProvider>
  );
}

function Routes({ path, search, navigate }: { path: string; search: string; navigate: (nextPath: string) => void }) {
  if (path === "/login/callback") {
    return <CallbackPage onNavigate={navigate} />;
  }

  if (path === "/login") {
    const returnTo = new URLSearchParams(search).get("returnTo") || undefined;
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <LoginPage returnTo={returnTo} />
      </RedirectIfAuthenticated>
    );
  }

  const Page = protectedRoutes[path as keyof typeof protectedRoutes];
  if (!Page) {
    return <NotFoundPage onNavigate={navigate} />;
  }

  return (
    <RequireAuth currentPath={path} onNavigate={navigate}>
      <AppShell activePath={path} onNavigate={navigate}>
        <Page />
      </AppShell>
    </RequireAuth>
  );
}
