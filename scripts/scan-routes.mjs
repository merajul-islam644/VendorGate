#!/usr/bin/env node
//
// Walk every Controller.cs file under the per-block server trees and emit
// one line per route. Output TSV columns:
//   repo, controller, verb, methodPath, fullPath, file
//
// For controllers that use the `[action]` convention with no explicit
// route on each method, we infer the literal action name from the C#
// method name (PascalCase -> kebab-case). For controllers that use
// `[controller]`, we substitute the controller name minus the "Controller"
// suffix in kebab-case.
//
import { readFileSync, statSync, readdirSync } from "node:fs";
import { dirname, join, sep } from "node:path";

const PLATFORM_REPO = "d:/OFFICE_PROJECT/ALL_REPOSITORY/PLATFORM_REPO";
const prefix = "api";

const HTTP_VERBS = new Set([
  "HttpGet",
  "HttpPost",
  "HttpPut",
  "HttpPatch",
  "HttpDelete",
  "HttpHead",
  "HttpOptions"
]);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

function attrLiteral(text, startIdx) {
  const open = text.indexOf("(", startIdx);
  if (open < 0) return "";
  const close = text.indexOf(")", open);
  if (close < 0) return "";
  let body = text.slice(open + 1, close).trim();
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      body = body.slice(0, i);
      break;
    }
  }
  body = body.trim();
  if (
    (body.startsWith('"') && body.endsWith('"')) ||
    (body.startsWith("'") && body.endsWith("'"))
  ) {
    return body.slice(1, -1);
  }
  return body;
}

/** PascalCase -> kebab-case, lowercased. */
function toKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/_+/g, "-")
    .toLowerCase();
}

/** Substitute [controller] and [action] placeholders. */
function substituteTokens(template, controllerName, actionName) {
  const segments = template.split("/").map((seg) => {
    if (seg === "[controller]") return toKebab(controllerName.replace(/Controller$/, ""));
    if (seg === "[action]") return toKebab(actionName);
    return seg;
  });
  return segments.join("/");
}

function normalizePath(prefix, controllerRoute, verbPath) {
  const segments = [prefix];
  const push = (s) => {
    if (!s) return;
    const parts = s.split("/").filter(Boolean);
    segments.push(...parts);
  };
  push(controllerRoute);
  push(verbPath);
  return "/" + segments.join("/");
}

/** Parse a controller file -> routes. */
function processFile(absPath) {
  const text = readFileSync(absPath, "utf8");
  const lines = text.split(/\r?\n/);

  let controllerRoute = "";
  let controllerName = "";
  const routes = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const routeIdx = line.indexOf("[Route(");
    if (routeIdx >= 0 && controllerRoute === "") {
      controllerRoute = attrLiteral(line, routeIdx);
    }
    const classMatch = line.match(/(?:public|sealed|internal)\s*class\s+(\w+)\s*:?/);
    if (classMatch) controllerName = classMatch[1];
  }

  // Walk through the file, tracking the most recent method-signature line
  // we've matched. When we hit a verb attribute, attach it to that method.
  // This handles multi-attribute methods and bare `[HttpGet]`/`[HttpPost]`
  // with no path (which means the action name comes from the method).
  const lines2 = text.split(/\r?\n/);
  const methodRegex = /(?:public|private|protected|internal)\s+(?:async\s+)?(?:[\w<>,\s\[\]?]+?)\s+(\w+)\s*\(/;
  let currentMethod = null;
  let pendingVerbs = [];
  let inClass = false;
  let braceDepth = 0;

  for (let i = 0; i < lines2.length; i++) {
    const line = lines2[i];
    if (!inClass) {
      if (/class\s+\w+/.test(line) && line.includes("{")) inClass = true;
      else if (/class\s+\w+/.test(line)) inClass = true;
      continue;
    }

    // Track brace depth to find class end.
    braceDepth += (line.match(/{/g) || []).length;
    braceDepth -= (line.match(/}/g) || []).length;
    if (braceDepth <= 0) break;

    // Detect verb attribute on its own line (preceding current method).
    let hadVerb = false;
    for (const verb of HTTP_VERBS) {
      const marker = `[${verb}`;
      if (line.includes(marker)) {
        hadVerb = true;
        const literal = attrLiteral(line, line.indexOf(marker));
        pendingVerbs.push({ verb: verb.replace("Http", "").toUpperCase(), literal });
        break;
      }
    }

    // Method signature on this line.
    const m = line.match(methodRegex);
    if (m && !line.includes("class ") && !line.includes("record ") && !line.includes("=>")) {
      currentMethod = m[1];
      const controllerHasToken = controllerRoute.includes("[action]") || controllerRoute.includes("[controller]");
      // Resolve pending verbs now.
      for (const pv of pendingVerbs) {
        let controllerPath;
        let actionPath;
        if (controllerHasToken) {
          // The literal action name in the controller route becomes the
          // method name; the verb attribute literal -- if present -- is
          // a sub-path appended to that.
          const controllerSeg = substituteTokens("[controller]", controllerName, currentMethod);
          const actionSeg = substituteTokens("[action]", controllerName, currentMethod);
          if (pv.literal) {
            // Method has a verb template. The verb template replaces the
            // [action] token when written as `{x}`; otherwise it's a
            // sub-segment after the action.
            if (controllerRoute.includes("[action]")) {
              actionPath = pv.literal.startsWith("/")
                ? pv.literal.slice(1)
                : actionSeg + "/" + pv.literal;
            } else {
              // [controller] only -- action path is literal.
              actionPath = pv.literal;
            }
            controllerPath = controllerSeg;
          } else {
            // Bare [HttpXxx] with no arg -- the action IS the path.
            controllerPath = controllerSeg;
            actionPath = actionSeg;
          }
        } else {
          // Standard controller (literal [Route] attribute).
          controllerPath = controllerRoute;
          actionPath = pv.literal || "";
        }

        const fullPath = normalizePath(prefix, controllerPath, actionPath);
        routes.push({ method: actionPath, verb: pv.verb, fullPath });
      }
      pendingVerbs = [];
    }
  }

  return { controllerName, controllerRoute, routes };
}

function isControllerFile(path) {
  return path.endsWith(".cs") && !path.includes(`${sep}.claude${sep}`);
}

const REPOS = [
  "blocks-iam",
  "blocks-data",
  "blocks-localization",
  "blocks-monitor",
  "blocks-os",
  "blocks-studio",
  "blocks-logic",
  "blocks-release",
  "blocks-utilities"
];

let total = 0;
const counts = {};

for (const repo of REPOS) {
  const repoPath = join(PLATFORM_REPO, repo);
  try {
    statSync(repoPath);
  } catch {
    continue;
  }
  const candidates = [
    join(repoPath, "server", "Api", "Controllers"),
    join(repoPath, "server", "Api"),
    join(repoPath, "server")
  ];
  const seen = new Set();

  for (const dir of candidates) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const ctrlSubdir = entries.find(
      (e) => e.isDirectory() && e.name.toLowerCase() === "controllers"
    );
    if (!ctrlSubdir) continue;
    const ctrlDir = join(dir, ctrlSubdir.name);

    function walkControllers(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walkControllers(full);
        } else if (entry.isFile() && entry.name.endsWith("Controller.cs")) {
          if (seen.has(full)) return;
          seen.add(full);
          const { controllerName, routes } = processFile(full);
          for (const r of routes) {
            const m = controllerName.replace(/Controller$/, "") + "." + (r.method || "<root>");
            process.stdout.write(
              [repo, controllerName, r.verb, r.method, r.fullPath, full, m].join("\t") + "\n"
            );
            total++;
            counts[repo] = (counts[repo] || 0) + 1;
          }
        }
      }
    }
    walkControllers(ctrlDir);
  }
}

process.stderr.write(`\nTotal routes: ${total}\n`);
for (const [repo, n] of Object.entries(counts)) {
  process.stderr.write(`  ${repo}: ${n}\n`);
}
