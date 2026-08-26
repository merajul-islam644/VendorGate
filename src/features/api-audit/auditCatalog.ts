import { blocksClient } from "../../lib/blocks/client";
import { rawHttpCatalog } from "./auditCatalog.routes.generated";

/**
 * Catalog of every Blocks call we want to exercise from the API Audit page.
 * Each entry is intentionally written as a thunk so a failure in one call
 * (e.g. throws, rejects) does not stop the rest of the matrix.
 *
 * `method` and `endpoint` are display-only; `requiresAuth` controls whether
 * the row is considered "expected pass" vs "expected to need login".
 *
 * Two sources feed the catalog:
 *  1. `sdkCatalog` — hand-curated calls into the typed SDK namespaces
 *     (`blocksClient.auth`, `.iam`, `.mfa`, `.data`, `.localization`,
 *     `.notifier`, `.mail`). These exercise the curated client surface.
 *  2. `rawHttpCatalog` — auto-generated from the per-block ASP.NET
 *     controllers via `scripts/scan-routes.mjs` +
 *     `scripts/generate-catalog.mjs`. These probe every controller route
 *     via `blocksClient.http.request(...)`, which surfaces everything not
 *     wrapped by the SDK.
 */
export type AuditEntry = {
  service: string;
  method: string;
  endpoint: string;
  requiresAuth: boolean;
  run: () => Promise<unknown>;
};

// Static dummy ids reused across the audit run. They keep the calls syntactically
// valid so we can see what the server replies with -- the audit is about
// reachability and shape, not about getting back real resources.
const DUMMY_ID = "audit-probe-id";
const DUMMY_EMAIL = "audit-probe@example.invalid";

const sdkCatalog: AuditEntry[] = [
  // ── auth ─────────────────────────────────────────────────────────────
  {
    service: "auth",
    method: "auth.loginOptions()",
    endpoint: "GET /iam/v4/auth/login-options",
    requiresAuth: false,
    run: () => blocksClient.auth.loginOptions()
  },
  {
    service: "auth",
    method: "auth.userInfo()",
    endpoint: "GET /iam/v4/auth/me",
    requiresAuth: true,
    run: () => blocksClient.auth.userInfo()
  },
  {
    service: "auth",
    method: "auth.idp.uiConfig()",
    endpoint: "GET /iam/v4/idp/oidc-ui-config",
    requiresAuth: false,
    run: () => blocksClient.auth.idp.uiConfig()
  },
  {
    service: "auth",
    method: "auth.idp.initiate({})",
    endpoint: "GET /iam/v4/idp/initiate",
    requiresAuth: false,
    run: () => blocksClient.auth.idp.initiate({})
  },
  {
    service: "auth",
    method: "auth.identityProviders.list()",
    endpoint: "GET /iam/v4/auth/identity-providers",
    requiresAuth: false,
    run: () => blocksClient.auth.identityProviders.list()
  },
  {
    service: "auth",
    method: "auth.identityProviders.get(id)",
    endpoint: "GET /iam/v4/auth/identity-providers/{id}",
    requiresAuth: false,
    run: () => blocksClient.auth.identityProviders.get(DUMMY_ID)
  },
  {
    service: "auth",
    method: "auth.config.get()",
    endpoint: "GET /iam/v4/auth/config",
    requiresAuth: true,
    run: () => blocksClient.auth.config.get()
  },
  {
    service: "auth",
    method: "auth.userCodes.list()",
    endpoint: "GET /iam/v4/auth/user-codes",
    requiresAuth: true,
    run: () => blocksClient.auth.userCodes.list()
  },
  {
    service: "auth",
    method: "auth.clientCredentials.list()",
    endpoint: "GET /iam/v4/auth/client-credentials",
    requiresAuth: true,
    run: () => blocksClient.auth.clientCredentials.list()
  },

  // ── iam ──────────────────────────────────────────────────────────────
  {
    service: "iam",
    method: "iam.me()",
    endpoint: "GET /iam/v4/iam/me",
    requiresAuth: true,
    run: () => blocksClient.iam.me()
  },
  {
    service: "iam",
    method: "iam.users.list({pageNo:1,pageSize:5})",
    endpoint: "POST /iam/v4/iam/users",
    requiresAuth: true,
    run: () => blocksClient.iam.users.list({ pageNo: 1, pageSize: 5 })
  },
  {
    service: "iam",
    method: "iam.users.get(id)",
    endpoint: "GET /iam/v4/iam/users/{id}",
    requiresAuth: true,
    run: () => blocksClient.iam.users.get(DUMMY_ID)
  },
  {
    service: "iam",
    method: "iam.users.emailAvailable({email})",
    endpoint: "GET /iam/v4/iam/email/available",
    requiresAuth: false,
    run: () => blocksClient.iam.users.emailAvailable({ email: DUMMY_EMAIL })
  },
  {
    service: "iam",
    method: "iam.users.exists(email)",
    endpoint: "GET /iam/v4/iam/users/exists",
    requiresAuth: false,
    run: () => blocksClient.iam.users.exists(DUMMY_EMAIL)
  },
  {
    service: "iam",
    method: "iam.permissions.list({pageNo:1,pageSize:5})",
    endpoint: "POST /iam/v4/iam/permissions",
    requiresAuth: true,
    run: () => blocksClient.iam.permissions.list({ pageNo: 1, pageSize: 5 })
  },
  {
    service: "iam",
    method: "iam.permissions.bySeverity()",
    endpoint: "GET /iam/v4/iam/permissions/by-severity",
    requiresAuth: true,
    run: () => blocksClient.iam.permissions.bySeverity()
  },
  {
    service: "iam",
    method: "iam.permissions.get(id)",
    endpoint: "GET /iam/v4/iam/permissions/{id}",
    requiresAuth: true,
    run: () => blocksClient.iam.permissions.get(DUMMY_ID)
  },
  {
    service: "iam",
    method: "iam.roles.list({pageNo:1,pageSize:5})",
    endpoint: "POST /iam/v4/iam/roles",
    requiresAuth: true,
    run: () => blocksClient.iam.roles.list({ pageNo: 1, pageSize: 5 })
  },
  {
    service: "iam",
    method: "iam.roles.get(id)",
    endpoint: "GET /iam/v4/iam/roles/{id}",
    requiresAuth: true,
    run: () => blocksClient.iam.roles.get(DUMMY_ID)
  },
  {
    service: "iam",
    method: "iam.roles.assignable()",
    endpoint: "GET /iam/v4/iam/roles/assignable",
    requiresAuth: true,
    run: () => blocksClient.iam.roles.assignable()
  },
  {
    service: "iam",
    method: "iam.resources.groups()",
    endpoint: "GET /iam/v4/iam/resource-groups",
    requiresAuth: true,
    run: () => blocksClient.iam.resources.groups()
  },
  {
    service: "iam",
    method: "iam.resources.features()",
    endpoint: "GET /iam/v4/iam/resource/features",
    requiresAuth: true,
    run: () => blocksClient.iam.resources.features()
  },
  {
    service: "iam",
    method: "iam.organizations.my()",
    endpoint: "GET /iam/v4/iam/organizations/my",
    requiresAuth: true,
    run: () => blocksClient.iam.organizations.my()
  },
  {
    service: "iam",
    method: "iam.organizations.list()",
    endpoint: "GET /iam/v4/iam/organizations",
    requiresAuth: true,
    run: () => blocksClient.iam.organizations.list()
  },
  {
    service: "iam",
    method: "iam.organizations.getConfig()",
    endpoint: "GET /iam/v4/iam/organizations/config",
    requiresAuth: true,
    run: () => blocksClient.iam.organizations.getConfig()
  },
  {
    service: "iam",
    method: "iam.signupSettings.get()",
    endpoint: "GET /iam/v4/iam/signup-settings",
    requiresAuth: false,
    run: () => blocksClient.iam.signupSettings.get()
  },

  // ── mfa ──────────────────────────────────────────────────────────────
  {
    service: "mfa",
    method: "mfa.config()",
    endpoint: "GET /iam/v4/mfa/config",
    requiresAuth: true,
    run: () => blocksClient.mfa.config()
  },
  {
    service: "mfa",
    method: "mfa.backupCodes.list()",
    endpoint: "GET /iam/v4/mfa/backup-codes",
    requiresAuth: true,
    run: () => blocksClient.mfa.backupCodes.list()
  },

  // ── data ─────────────────────────────────────────────────────────────
  {
    service: "data",
    method: "data.schemas.list({pageNo:1,pageSize:5})",
    endpoint: "GET /data/v4/schemas",
    requiresAuth: true,
    run: () => blocksClient.data.schemas.list({ pageNo: 1, pageSize: 5 })
  },
  {
    service: "data",
    method: "data.schemas.get(\"Assets\")",
    endpoint: "GET /data/v4/schemas?SchemaName=Assets",
    requiresAuth: true,
    run: () => blocksClient.data.schemas.get("Assets")
  },
  {
    service: "data",
    method: "data.schemas.aggregation()",
    endpoint: "GET /data/v4/schemas/aggregation",
    requiresAuth: true,
    run: () => blocksClient.data.schemas.aggregation()
  },
  {
    service: "data",
    method: "data.schemas.info()",
    endpoint: "GET /data/v4/schemas/info",
    requiresAuth: true,
    run: () => blocksClient.data.schemas.info()
  },
  {
    service: "data",
    method: "data.schemas.infoByName(\"Assets\")",
    endpoint: "GET /data/v4/schemas/info-by-name",
    requiresAuth: true,
    run: () => blocksClient.data.schemas.infoByName("Assets")
  },
  {
    service: "data",
    method: "data.schemas.getById(id)",
    endpoint: "GET /data/v4/schemas/get-by-id",
    requiresAuth: true,
    run: () => blocksClient.data.schemas.getById(DUMMY_ID)
  },
  {
    service: "data",
    method: "data.validations.list()",
    endpoint: "GET /data/v4/data-validations",
    requiresAuth: true,
    run: () => blocksClient.data.validations.list()
  },
  {
    service: "data",
    method: "data.validations.getById(id)",
    endpoint: "GET /data/v4/data-validations/get-by-id",
    requiresAuth: true,
    run: () => blocksClient.data.validations.getById(DUMMY_ID)
  },
  {
    service: "data",
    method: "data.utilities.mockData()",
    endpoint: "GET /data/v4/mock-data",
    requiresAuth: true,
    run: () => blocksClient.data.utilities.mockData()
  },
  {
    service: "data",
    method: "data.collection(\"Assets\").list({pageNo:1,pageSize:5})",
    endpoint: "POST /data/v4/gateway (graphql)",
    requiresAuth: true,
    run: () => blocksClient.data.collection("Assets").list({ pageNo: 1, pageSize: 5 })
  },
  {
    service: "data",
    method: "data.files.info({pageNo:1,pageSize:5})",
    endpoint: "files info list",
    requiresAuth: true,
    run: () => blocksClient.data.files.info({ pageNo: 1, pageSize: 5 })
  },
  {
    service: "data",
    method: "data.objects.list()",
    endpoint: "objects list",
    requiresAuth: true,
    run: () => blocksClient.data.objects.list()
  },

  // ── localization ────────────────────────────────────────────────────
  {
    service: "localization",
    method: "localization.languages()",
    endpoint: "GET /localization/v4/Language/Gets",
    requiresAuth: false,
    run: () => blocksClient.localization.languages()
  },
  {
    service: "localization",
    method: "localization.modules()",
    endpoint: "GET /localization/v4/Module/Gets",
    requiresAuth: false,
    run: () => blocksClient.localization.modules()
  },
  {
    service: "localization",
    method: "localization.languagesForCurrentTenant()",
    endpoint: "GET /localization/v4/Language/GetLanguagesForCurrentTenant",
    requiresAuth: false,
    run: () => blocksClient.localization.languagesForCurrentTenant()
  },
  {
    service: "localization",
    method: "localization.modulesForCurrentTenant()",
    endpoint: "GET /localization/v4/Module/GetModulesForCurrentTenant",
    requiresAuth: false,
    run: () => blocksClient.localization.modulesForCurrentTenant()
  },
  {
    service: "localization",
    method: "localization.translations(\"common\",\"en\")",
    endpoint: "GET /localization/v4/Key/GetUilmFile?Language=en&ModuleName=common",
    requiresAuth: false,
    run: () => blocksClient.localization.translations("common", "en")
  },
  {
    service: "localization",
    method: "localization.load(\"en\",[\"common\"])",
    endpoint: "GET /localization/v4/Key/GetUilmFile (merged)",
    requiresAuth: false,
    run: () => blocksClient.localization.load("en", ["common"])
  },
  {
    service: "localization",
    method: "localization.keysByNames({keyNames:[\"app.name\"]})",
    endpoint: "POST /localization/v4/Key/GetsByKeyNames",
    requiresAuth: false,
    run: () => blocksClient.localization.keysByNames({ keyNames: ["app.name"] })
  },

  // ── notifier ────────────────────────────────────────────────────────
  {
    service: "notifier",
    method: "notifier.getNotifications()",
    endpoint: "GET /logic/v4/Notifier/GetNotifications",
    requiresAuth: true,
    run: () => blocksClient.notifier.getNotifications()
  },
  {
    service: "notifier",
    method: "notifier.markAllNotificationAsRead()",
    endpoint: "POST /logic/v4/Notifier/MarkAllNotificationAsRead",
    requiresAuth: true,
    run: () => blocksClient.notifier.markAllNotificationAsRead()
  },

  // ── mail ────────────────────────────────────────────────────────────
  {
    service: "mail",
    // mail.send() with a real payload can fire through the tenant's SMTP
    // provider; we send a test message so the audit is safe to rerun.
    method: "mail.sendToAny(test probe)",
    endpoint: "POST /logic/v4/Mail/SendToAny",
    requiresAuth: true,
    run: () =>
      blocksClient.mail.sendToAny({
        to: [DUMMY_EMAIL],
        purpose: "audit-probe",
        language: "en",
        isTestMail: true
      })
  }
];

/**
 * Combined catalog: hand-curated SDK calls + auto-generated raw HTTP
 * probes (~700 entries once the scanner has finished its walk). The
 * `service` column on the audit page is `repository` for raw HTTP rows
 * (e.g. `blocks-iam`, `blocks-data`, `blocks-studio`) so the filter bar
 * collapses by repo, mirroring how the admin docs and DevOps dashboards
 * group endpoints.
 */
export const auditCatalog: AuditEntry[] = [...sdkCatalog, ...rawHttpCatalog];

