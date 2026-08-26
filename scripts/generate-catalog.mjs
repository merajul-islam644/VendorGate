#!/usr/bin/env node
//
// Convert the scanned routes.tsv into a TypeScript audit catalog that the
// audit page can import. Each input row produces one or more
// `AuditEntry` objects: at minimum a GET; for POST endpoints we also add
// a GET probe against the same path if applicable. Routes with
// `[action]` / `[controller]` placeholders are skipped -- those are
// MCP-style route conventions with unknown targets.
//
// Output: src/features/api-audit/auditCatalog.routes.generated.ts
//   const rawHttpCatalog: AuditEntry[]
//
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "d:/OFFICE_PROJECT/ALL_REPOSITORY/PLATFORM_REPO/VendorGate";
const TSV = join(ROOT, "scripts", "routes.tsv");
const OUT = join(ROOT, "src", "features", "api-audit", "auditCatalog.routes.generated.ts");

// The deployment prefix each block's microservice is mounted under.
const REPO_TO_PREFIX = {
  "blocks-iam": "iam/v4",
  "blocks-data": "data/v4",
  "blocks-localization": "localization/v4",
  "blocks-os": "os/v4",
  "blocks-studio": "studio/v4",
  "blocks-logic": "logic/v4",
  "blocks-monitor": "monitor/v4",
  "blocks-release": "release/v4",
  "blocks-utilities": "utilities/v4"
};

const DUMMY_ID = "audit-probe-id";
const DUMMY_EMAIL = "audit-probe@example.invalid";
const DUMMY_KEY = "audit";
const DUMMY_NAME = "audit-probe";

function isToken(path) {
  return /\[(action|controller|verb)\]/.test(path);
}

/**
 * Replace `{id}`, `{guid}`, etc. with sensible dummy values, and inject a
 * routing-time query string for GET-list probes (so they're actually
 * callable without throwing 500s). Returns the substituted path with any
 * `?query` appended.
 */
function instantiatePath(rawPath, repo) {
  let path = rawPath;
  // The path format used by raw routes is `/api/foo/{id}/...` - replace
  // path params in order with placeholder values.
  let useId = DUMMY_ID;
  let useEmail = DUMMY_EMAIL;
  path = path.replace(/{id}/g, useId)
             .replace(/{guid}/g, useId)
             .replace(/{email}/g, encodeURIComponent(useEmail))
             .replace(/{tenantId}/g, "audit-tenant")
             .replace(/{language}/g, "en")
             .replace(/{module}/g, "common")
             .replace(/{name}/g, "audit")
             .replace(/{key}/g, "audit")
             .replace(/{fileName}/g, "audit.txt")
             .replace(/{fileId}/g, DUMMY_ID)
             .replace(/{providerId}/g, DUMMY_ID)
             .replace(/{roleId}/g, DUMMY_ID)
             .replace(/{permissionId}/g, DUMMY_ID)
             .replace(/{userId}/g, DUMMY_ID)
             .replace(/{deviceId}/g, DUMMY_ID)
             .replace(/{clientId}/g, DUMMY_ID)
             .replace(/{sessionId}/g, DUMMY_ID)
             .replace(/{subscriptionId}/g, DUMMY_ID)
             .replace(/{planId}/g, DUMMY_ID)
             .replace(/{paymentId}/g, DUMMY_ID)
             .replace(/{versionId}/g, DUMMY_ID)
             .replace(/{domainId}/g, DUMMY_ID)
             .replace(/{projectId}/g, DUMMY_ID)
             .replace(/{featureId}/g, DUMMY_ID)
             .replace(/{appId}/g, DUMMY_ID)
             .replace(/{modelId}/g, DUMMY_ID)
             .replace(/{promptId}/g, DUMMY_ID)
             .replace(/{questionId}/g, DUMMY_ID)
             .replace(/{dashboardId}/g, DUMMY_ID)
             .replace(/{tableId}/g, DUMMY_ID)
             .replace(/{resourceId}/g, DUMMY_ID)
             .replace(/{serviceId}/g, DUMMY_ID)
             .replace(/{storageId}/g, DUMMY_ID)
             .replace(/{traceId}/g, DUMMY_ID)
             .replace(/{logId}/g, DUMMY_ID)
             .replace(/{deploymentId}/g, DUMMY_ID)
             .replace(/{schedulerId}/g, DUMMY_ID)
             .replace(/{workflowId}/g, DUMMY_ID)
             .replace(/{destination}/g, DUMMY_ID);
  return path;
}

/**
 * Map the controller route to the deployed URL prefix.
 *   /api/auth/login-options (from blocks-iam) -> /iam/v4/auth/login-options
 *   /api/Language/Gets (from blocks-localization) -> /localization/v4/Language/Gets
 */
function deployedPath(rawPath, repo) {
  const prefix = REPO_TO_PREFIX[repo];
  // Strip leading "/api" and replace with deployed prefix.
  if (rawPath.startsWith("/api/")) {
    return `/${prefix}${rawPath.slice("/api".length)}`;
  }
  if (rawPath === "/api" || rawPath === "/api/") {
    return `/${prefix}`;
  }
  return rawPath;
}

function escapeString(s) {
  return JSON.stringify(s);
}

function buildRawHttpCall({ repo, controller, verb, methodPath, fullPath }) {
  const deployed = deployedPath(fullPath, repo);
  const instantiated = instantiatePath(methodPath, repo);
  // The fullPath in the TSV has the controller route baked in (it
  // prepended the [Route] attribute). The instantiated version uses the
  // per-row method path however, so re-derive the final URL from the
  // controller route + method route separately.
  //
  // We have only the precomputed `fullPath` in the TSV, so we can't
  // simply substitute in the method path. Instead, use the fullPath
  // directly -- the controller [Route] attribute is the controller
  // root, the verb attribute is appended, and the TSV combines those.
  // Substituting path params on the combined result is correct.
  return { deployed, instantiated };
}

function makeEntry(inputRow, opts) {
  const { method, deployed, instantiated, repo } = opts;
  const methodName = `${method} ${instantiated}`;
  return {
    service: repo,
    method: methodName,
    endpoint: deployed,
    requiresAuth: opts.requiresAuth,
    run: opts.run
  };
}

// Build entries from each row.
const raw = readFileSync(TSV, "utf8").split(/\r?\n/).filter(Boolean);
const entries = [];
const seenKeys = new Set();

for (const row of raw) {
  const [repo, controller, verb, methodPath, fullPath, abs] = row.split("\t");
  if (!repo || !fullPath) continue;
  if (isToken(fullPath) || isToken(methodPath)) continue;

  // Skip HEAD/OPTIONS server probes.
  if (verb === "HEAD" || verb === "OPTIONS") continue;

  // Skip health probes -- they're reachable but uninteresting.
  if (controller === "HealthController" && verb === "GET") continue;
  if (verb === "GET" && fullPath.endsWith("/health")) continue;

  const repoPrefix = REPO_TO_PREFIX[repo];
  if (!repoPrefix) continue;
  const deployed = deployedPath(fullPath, repo);
  const instantiated = instantiatePath(fullPath, repo);

  // Use the deployed URL; substitute path placeholders in the rendered URL.
  let rendered = deployed;
  rendered = rendered.replace(/{id}/g, DUMMY_ID)
    .replace(/{guid}/g, DUMMY_ID)
    .replace(/{email}/g, encodeURIComponent(DUMMY_EMAIL))
    .replace(/{tenantId}/g, "audit-tenant")
    .replace(/{language}/g, "en")
    .replace(/{module}/g, "common")
    .replace(/{name}/g, "audit")
    .replace(/{key}/g, "audit")
    .replace(/{fileName}/g, "audit.txt")
    .replace(/{fileId}/g, DUMMY_ID)
    .replace(/{providerId}/g, DUMMY_ID)
    .replace(/{roleId}/g, DUMMY_ID)
    .replace(/{permissionId}/g, DUMMY_ID)
    .replace(/{userId}/g, DUMMY_ID)
    .replace(/{deviceId}/g, DUMMY_ID)
    .replace(/{clientId}/g, DUMMY_ID)
    .replace(/{sessionId}/g, DUMMY_ID)
    .replace(/{subscriptionId}/g, DUMMY_ID)
    .replace(/{planId}/g, DUMMY_ID)
    .replace(/{paymentId}/g, DUMMY_ID)
    .replace(/{versionId}/g, DUMMY_ID)
    .replace(/{domainId}/g, DUMMY_ID)
    .replace(/{projectId}/g, DUMMY_ID)
    .replace(/{featureId}/g, DUMMY_ID)
    .replace(/{appId}/g, DUMMY_ID)
    .replace(/{modelId}/g, DUMMY_ID)
    .replace(/{promptId}/g, DUMMY_ID)
    .replace(/{questionId}/g, DUMMY_ID)
    .replace(/{dashboardId}/g, DUMMY_ID)
    .replace(/{tableId}/g, DUMMY_ID)
    .replace(/{resourceId}/g, DUMMY_ID)
    .replace(/{serviceId}/g, DUMMY_ID)
    .replace(/{storageId}/g, DUMMY_ID)
    .replace(/{traceId}/g, DUMMY_ID)
    .replace(/{logId}/g, DUMMY_ID)
    .replace(/{deploymentId}/g, DUMMY_ID)
    .replace(/{schedulerId}/g, DUMMY_ID)
    .replace(/{workflowId}/g, DUMMY_ID)
    .replace(/{destination}/g, DUMMY_ID);

  const label = `${verb} ${fullPath}`;
  const key = `${repo}|${verb}|${fullPath}`;
  if (seenKeys.has(key)) continue;
  seenKeys.add(key);

  // Substitute any remaining `{param}` placeholders with the dummy id.
  // Most controllers use `{id}`, but a handful use domain-specific
  // names like `{clientId}`, `{tableId}`, `{shareRef}`. For the audit
  // probe we don't care about the real value -- we just want the URL
  // to be routable so we hit the controller.
  rendered = rendered.replace(/\{[a-zA-Z]+\}/g, DUMMY_ID);

  entries.push({ repo, controller, verb, methodPath, fullPath, deployed, rendered: rendered || deployed, label });
}

process.stderr.write(`Routes accepted: ${entries.length}\n`);

// Now emit TypeScript.
//
// Strategy:
//   1) Emit one entry per route, with a `method` for raw HTTP that calls
//      blocksClient.http.request({ method: VERB }).
//   2) Use sentinels for body / query so the same probe works for read,
//      write and list endpoints.
//   3) Group by repo so the SERVICE column on the audit page is the repo
//      name (matches Blocks-OS / Blocks-Studio in the admin docs).
//
// Encoding rules:
//   - GET: probe body undefined
//   - POST/PUT/PATCH: send an empty JSON body `{}` (server may ignore or 405)
//   - DELETE: send undefined body
//   - Always add a `requiresAuth: true` flag except for routes that
//     internally look public (auth-prefix, /idp/, /oidc/) -- those are
//     false.

function isLikelyPublic(verb, fullPath) {
  // Anything under /auth/login*, /auth/login-options, /auth/recover,
  // /auth/reset-password, /auth/signup, /auth/identity-providers,
  // /auth/forgot-password, /auth/activate, /auth/resend-activation,
  // /auth/validate-activation, /auth/social/*, /idp/* -- the catalog
  // treats these as public.
  if (fullPath.match(/\/(api\/)?(auth\/(login-options|login|signup|recover|reset-password|change-password|activate|resend-activation|validate-activation|social|identity-providers|me|refresh|logout|switch-org|impersonate|impersonation|logout-all|forgot-password))(\/|$)/)) {
    return verb === "GET" || fullPath.includes("/login-options") || fullPath.includes("/identity-providers") || fullPath.includes("social/initiate") || fullPath.includes("forgot-password");
  }
  if (fullPath.includes("/idp/")) return true;
  if (fullPath.includes("/oidc/authorize")) return true;
  if (fullPath.includes("/oidc/callback")) return true;
  return false;
}

// Emit.
const header = `// AUTOGENERATED by scripts/generate-catalog.mjs -- DO NOT EDIT BY HAND.
// Source: scripts/routes.tsv produced by scripts/scan-routes.mjs.

import { blocksClient } from "../../lib/blocks/client";
import type { AuditEntry } from "./auditCatalog";

/**
 * Probe every controller route the scanners found, expressed as raw HTTP
 * calls against \`blocksClient.http.request\`. The probe bodies are
 * intentionally minimal -- the goal is to confirm reachability and shape,
 * not to drive every controller through to success.
 *
 * Each entry uses \`DUMMY_*\` constants for path placeholders and an empty
 * JSON body (or undefined for GET/DELETE) so the runnable catalog stays
 * deterministic.
 */
export const rawHttpCatalog: AuditEntry[] = [
`;

const lines = [];
for (const e of entries) {
  const isPublic = isLikelyPublic(e.verb, e.fullPath);
  const requiresAuth = !isPublic;
  // Determine the body encoding:
  //   GET / HEAD / DELETE -> no body
  //   POST / PUT / PATCH -> empty JSON object
  let bodyExpr;
  if (e.verb === "GET" || e.verb === "DELETE" || e.verb === "HEAD") {
    bodyExpr = "";
  } else {
    bodyExpr = "body: {}";
  }
  const methodExpr = `method: "${e.verb}"`;
  const label = `${e.verb} ${e.fullPath}`;
  const labelJs = label.replace(/\"/g, '\\"');
  const endpointJs = e.deployed.replace(/\"/g, '\\"');
  // Render path placeholders in the displayed endpoint string.
  let displayEndpoint = e.deployed;
  displayEndpoint = displayEndpoint
    .replace(/\\{id\\}/g, DUMMY_ID)
    .replace(/\\{email\\}/g, DUMMY_EMAIL)
    .replace(/\\{language\\}/g, "en");

  lines.push(`  {`);
  lines.push(`    service: ${JSON.stringify(e.repo)},`);
  lines.push(`    method: ${JSON.stringify(labelJs)},`);
  lines.push(`    endpoint: ${JSON.stringify(displayEndpoint)},`);
  lines.push(`    requiresAuth: ${requiresAuth ? "true" : "false"},`);
  if (bodyExpr) {
    lines.push(`    run: () => blocksClient.http.request(${JSON.stringify(e.rendered)}, { ${methodExpr}, ${bodyExpr} })`);
  } else {
    lines.push(`    run: () => blocksClient.http.request(${JSON.stringify(e.rendered)}, { ${methodExpr} })`);
  }
  lines.push(`  },`);
}

const footer = `
];
`;

writeFileSync(OUT, header + lines.join("\n") + footer);
process.stderr.write(`Wrote ${entries.length} entries to ${OUT}\n`);
