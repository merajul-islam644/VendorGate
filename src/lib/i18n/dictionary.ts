export const defaultDictionary = {
  // app / nav / auth / common
  "app.name": "Blocks App",
  "nav.dashboard": "Dashboard",
  "nav.assets": "Assets",
  "nav.profile": "Profile",
  "nav.logout": "Log out",
  "auth.welcome": "Welcome back",
  "auth.subtitle": "Sign in with your Blocks account to continue.",
  "auth.continue": "Continue with Blocks",
  "auth.redirecting": "Redirecting...",
  "auth.notConfigured": "Login is not configured yet. Register a public OIDC client and set VITE_BLOCKS_OIDC_CLIENT_ID in .env.",
  "auth.failed": "Sign-in failed",
  "auth.back": "Back to sign in",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.refresh": "Refresh",
  "common.loading": "Loading",
  "common.error": "Something went wrong",
  "common.errorBoundary.body":
    "The page could not finish loading. Try again or return to the dashboard.",
  "common.notAvailable": "Not available",
  "common.unknown": "unknown",
  "common.userMenu.open": "Open user menu",
  "common.userMenu.loading": "Loading...",
  "common.userMenu.guest": "Guest",

  // sidebar
  "sidebar.expand": "Expand sidebar",
  "sidebar.collapse": "Collapse sidebar",

  // topbar
  "topbar.language.switch": "Switch language",
  "topbar.language.aria": "Switch language, current: {language}",

  // notifications
  "notifications.title": "Notifications",
  "notifications.empty.title": "You're all caught up",
  "notifications.empty.body": "No new notifications right now.",

  // dashboard
  "dashboard.title": "Dashboard",
  "dashboard.subtitle": "Reference app state and Blocks SDK usage.",
  "dashboard.check.apiUrl": "API URL",
  "dashboard.check.tenantId": "Tenant id (x-blocks-key)",
  "dashboard.check.appDomain": "App domain",
  "dashboard.metric.cloud.label": "Cloud",
  "dashboard.metric.cloud.value.ready": "Connected",
  "dashboard.metric.cloud.value.pending": "Pending",
  "dashboard.metric.cloud.detail": "Environment variables",
  "dashboard.metric.session.label": "Session",
  "dashboard.metric.session.value.signedIn": "Signed in",
  "dashboard.metric.session.value.signedOut": "Signed out",
  "dashboard.metric.session.detail.expires": "Expires {time}",
  "dashboard.metric.session.detail.oidc": "OIDC login",
  "dashboard.metric.iam.label": "IAM",
  "dashboard.metric.iam.value": "Me only",
  "dashboard.metric.iam.detail": "Safe identity scope",
  "dashboard.status.ready": "Ready",
  "dashboard.status.configNeeded": "Config needed",
  "dashboard.info.notConfigured": "Not configured",
  "dashboard.userAndProfile.heading": "User & profile",
  "dashboard.userAndProfile.body":
    "This starter is scoped to the signed-in user only. Open Profile from the sidebar to see the current session's identity, roles, and permissions from Blocks IAM.",
  "dashboard.nextSteps.heading": "Next steps",
  "dashboard.nextSteps.oidcConfigured":
    "A public OIDC client is configured -- hosted login is ready to test.",
  "dashboard.nextSteps.oidcUnconfigured":
    "Register a public OIDC client in Blocks IAM, then set VITE_BLOCKS_OIDC_CLIENT_ID in .env (see README.md).",
  "dashboard.nextSteps.assetsHint":
    "Open Assets in the sidebar for a full CRUD example built on blocksClient.data.collection().",
  "dashboard.nextSteps.localizationHint":
    "Edit blocks/localization/*.en.json, then run blocks localization push to sync copy to Blocks.",

  // assets
  "assets.title": "Assets",
  "assets.subtitle": "CRUD reference backed by Blocks Data collection Assets.",
  "assets.create": "Add asset",
  "assets.edit": "Edit asset",
  "assets.empty": "No assets found",
  "assets.empty.description":
    "Add the first Assets collection item to see the table flow.",
  "assets.error.load": "Could not load assets from Blocks Data.",
  "assets.search": "Search assets",
  "assets.name": "Name",
  "assets.assetTag": "Asset tag",
  "assets.category": "Category",
  "assets.status": "Status",
  "assets.assignedTo": "Assigned to",
  "assets.value": "Value",
  "assets.actions": "Actions",
  "assets.filters.toggle": "Filters",
  "assets.filters.any": "Any",
  "assets.filters.minValue": "Min value",
  "assets.filters.maxValue": "Max value",
  "assets.filters.clear": "Clear filters",
  "assets.filters.empty": "No assets match the current filters.",
  "assets.delete.title": "Delete asset",
  "assets.delete.confirm": "Delete {name}?",
  "assets.pagination.rows": "Rows",
  "assets.pagination.previous": "Previous",
  "assets.pagination.next": "Next",
  "assets.pagination.pageOf": "Page {page} of {pageCount}",
  "assets.pagination.count/one": "{count} asset",
  "assets.pagination.count/other": "{count} assets",

  // profile
  "profile.title": "Profile",
  "profile.subtitle": "Signed-in user details from Blocks IAM.",
  "profile.refresh": "Refresh profile",
  "profile.userId": "User ID",
  "profile.tenantId": "Tenant id (x-blocks-key)",
  "profile.sessionExpires": "Session expires",
  "profile.status.authenticated": "Authenticated",
  "profile.status.unavailable": "Session unavailable",
  "profile.unknownUser": "Unknown user",
  "profile.roles": "Roles",
  "profile.roles.empty": "No roles assigned",
  "profile.permissions": "Permissions ({count})",
  "profile.permissions.empty": "No permissions returned",
  "profile.session": "Session",
  "profile.session.signedIn": "Signed in {time}",
  "profile.session.expires": "Expires {time}",
  "profile.raw.toggle": "View raw response",

  // 404
  "notFound.title": "404",
  "notFound.message": "This page does not exist.",
  "notFound.home": "Back home"
} as const;

export type TranslationKey = keyof typeof defaultDictionary;

/**
 * Locale-aware date/time helpers. The active language comes from
 * LocalizationProvider; pages pass it explicitly so these helpers stay
 * pure and don't need to know about React context.
 */

export function formatDateTime(
  value: Date | string | number | undefined,
  language: string
): string {
  if (value === undefined || value === null) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return date.toLocaleString(language, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return date.toLocaleString();
  }
}

export function formatTime(
  value: Date | string | number | undefined,
  language: string
): string {
  if (value === undefined || value === null) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return date.toLocaleTimeString(language, {
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return date.toLocaleTimeString();
  }
}