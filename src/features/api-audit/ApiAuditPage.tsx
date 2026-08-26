import { Clipboard, ClipboardCheck, ChevronLeft, ChevronRight, Loader2, Play, RotateCcw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionButton } from "../../shared/ui/ActionButton";
import { PageHeader } from "../../shared/ui/PageHeader";
import { auditCatalog, type AuditEntry } from "./auditCatalog";

type AuditRow = AuditEntry & {
  status: "idle" | "running" | "pass" | "fail";
  durationMs?: number;
  error?: string;
  preview?: string;
};

type ServiceFilter = "all" | string;
type StatusFilter = "all" | "idle" | "running" | "pass" | "fail";
type PageSize = 5 | 10 | 20 | 50;
const PAGE_SIZE_OPTIONS: PageSize[] = [5, 10, 20, 50];

function summarize(value: unknown): string {
  try {
    const text = JSON.stringify(value, null, 2);
    if (text === undefined) return String(value);
    if (text.length <= 240) return text;
    return text.slice(0, 240) + "…";
  } catch {
    return String(value);
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const e = error as Error & { status?: number; code?: string };
    const tag = e.status ? `HTTP ${e.status}` : e.code ? e.code : "error";
    return `${tag}: ${e.message}`;
  }
  return String(error);
}

async function runOne(entry: AuditEntry): Promise<AuditRow> {
  const start = performance.now();
  try {
    const result = await entry.run();
    return {
      ...entry,
      status: "pass",
      durationMs: Math.round(performance.now() - start),
      preview: summarize(result)
    };
  } catch (error) {
    return {
      ...entry,
      status: "fail",
      durationMs: Math.round(performance.now() - start),
      error: describeError(error)
    };
  }
}

/**
 * Serialize a row for clipboard export -- one labelled block per call so the
 * result can be pasted into a bug report and read top-to-bottom without
 * losing which call produced which line.
 */
function serializeRow(row: AuditRow): string {
  const lines: string[] = [];
  lines.push(`[${row.status.toUpperCase()}] ${row.service} · ${row.method}`);
  lines.push(`  endpoint: ${row.endpoint}`);
  lines.push(`  auth:     ${row.requiresAuth ? "required" : "public"}`);
  if (row.durationMs !== undefined) lines.push(`  duration: ${row.durationMs} ms`);
  if (row.error) {
    lines.push(`  error:    ${row.error}`);
  }
  if (row.preview) {
    lines.push(`  response:`);
    for (const ln of row.preview.split("\n")) lines.push(`    ${ln}`);
  }
  return lines.join("\n");
}

export function ApiAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>(() =>
    auditCatalog.map((entry) => ({ ...entry, status: "idle" }))
  );
  const [running, setRunning] = useState(false);
  const [textFilter, setTextFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const services = useMemo(() => {
    const set = new Set(auditCatalog.map((entry) => entry.service));
    return Array.from(set).sort();
  }, []);

  const visibleRows = useMemo(() => {
    const needle = textFilter.trim().toLowerCase();
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        if (serviceFilter !== "all" && row.service !== serviceFilter) return false;
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        if (!needle) return true;
        return (
          row.method.toLowerCase().includes(needle) ||
          row.endpoint.toLowerCase().includes(needle) ||
          row.service.toLowerCase().includes(needle) ||
          (row.error ?? "").toLowerCase().includes(needle)
        );
      });
  }, [rows, serviceFilter, statusFilter, textFilter]);

  /**
   * Pagination is applied AFTER the filter pipeline so it scales with the
   * filtered set, not the full catalog. Resetting back to page 1 happens
   * implicitly whenever filters change (`useMemo` rebuilds the list) --
   * the explicit reset on next render below clamps the cursor in case
   * the user is on a page that no longer exists.
   */
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pageRows = useMemo(
    () => visibleRows.slice(pageStart, pageEnd),
    [visibleRows, pageStart, pageEnd]
  );
  function setPageSizeSafely(next: PageSize) {
    setPageSize(next);
    setCurrentPage(1);
  }

  async function runAll() {
    setRunning(true);
    setRows((current) => current.map((row) => ({ ...row, status: "running" as const })));
    const next: AuditRow[] = [];
    for (const entry of auditCatalog) {
      const result = await runOne(entry);
      next.push(result);
      setRows([...next, ...auditCatalog.slice(next.length).map((entry) => ({ ...entry, status: "idle" as const }))]);
    }
    setRunning(false);
  }

  async function runOneRow(index: number) {
    const entry = auditCatalog[index];
    if (!entry) return;
    setRows((current) => current.map((row, i) => (i === index ? { ...row, status: "running" as const } : row)));
    const result = await runOne(entry);
    setRows((current) => current.map((row, i) => (i === index ? result : row)));
  }

  function reset() {
    setRows(auditCatalog.map((entry) => ({ ...entry, status: "idle" })));
  }

  function clearFilters() {
    setTextFilter("");
    setServiceFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  }

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1500);
    } catch {
      // Older browsers / restricted contexts: best-effort fallback that keeps
      // the rest of the audit UI usable.
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopiedKey(key);
        window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  const total = rows.length;
  const passed = rows.filter((r) => r.status === "pass").length;
  const failed = rows.filter((r) => r.status === "fail").length;
  const visibleCount = visibleRows.length;
  const hasFilters = textFilter !== "" || serviceFilter !== "all" || statusFilter !== "all";
  const firstVisible = visibleCount === 0 ? 0 : pageStart + 1;
  const lastVisible = Math.min(visibleCount, pageEnd);
  const pageWindowStart = Math.max(1, safePage - 2);
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + 4);
  const pageNumbers: number[] = [];
  for (let n = pageWindowStart; n <= pageWindowEnd; n++) pageNumbers.push(n);

  return (
    <section>
      <PageHeader
        title="API Audit"
        subtitle={`Exercises ${total} Blocks calls at once against your tenant (${pageSize} per page).`}
        actions={
          <div className="row-actions">
            <ActionButton
              variant="primary"
              disabled={running}
              onClick={runAll}
              icon={running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            >
              {running ? "Running…" : "Run all"}
            </ActionButton>
            <ActionButton
              variant="icon"
              disabled={running}
              onClick={reset}
              icon={<RotateCcw size={16} />}
              title="Reset"
            />
            <ActionButton
              variant="icon"
              disabled={visibleRows.length === 0}
              onClick={() =>
                copyText(
                  visibleRows.map(({ row }) => serializeRow(row)).join("\n\n"),
                  "all-visible"
                )
              }
              icon={copiedKey === "all-visible" ? <ClipboardCheck size={16} /> : <Clipboard size={16} />}
              title={copiedKey === "all-visible" ? "Copied!" : "Copy visible rows"}
            />
          </div>
        }
      />

      <div className="audit-summary">
        <span className="audit-pill audit-pill-pass">{passed} pass</span>
        <span className="audit-pill audit-pill-fail">{failed} fail</span>
        <span className="audit-pill audit-pill-idle">{total - passed - failed} pending</span>
        <span className="audit-pill audit-pill-total">{total} total</span>
        {hasFilters ? (
          <span className="audit-pill audit-pill-filter">
            showing {visibleCount} of {total}
          </span>
        ) : null}
      </div>

      <div className="audit-toolbar">
        <label className="audit-search">
          <Search size={14} />
          <input
            type="search"
            placeholder="Filter by method, endpoint, service, or error…"
            value={textFilter}
            onChange={(event) => {
              setTextFilter(event.target.value);
              setCurrentPage(1);
            }}
          />
          {textFilter ? (
            <button
              type="button"
              className="audit-search-clear"
              aria-label="Clear search"
              onClick={() => {
                setTextFilter("");
                setCurrentPage(1);
              }}
            >
              <X size={12} />
            </button>
          ) : null}
        </label>
        <label className="audit-select">
          <span>Service</span>
          <select
            value={serviceFilter}
            onChange={(event) => {
              setServiceFilter(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All ({total})</option>
            {services.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
        </label>
        <label className="audit-select">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setCurrentPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="idle">Idle</option>
            <option value="running">Running</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
        </label>
        <label className="audit-select">
          <span>Rows / page</span>
          <select
            value={pageSize}
            onChange={(event) => setPageSizeSafely(Number(event.target.value) as PageSize)}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        {hasFilters ? (
          <button type="button" className="link-button" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="audit-table" role="table">
        <div className="audit-head" role="row">
          <span role="columnheader">Service</span>
          <span role="columnheader">Call</span>
          <span role="columnheader">Endpoint</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Time</span>
          <span role="columnheader" aria-label="actions"></span>
        </div>
        {visibleRows.length === 0 ? (
          <div className="audit-empty" role="row">
            No rows match the current filters.
          </div>
        ) : null}
        {pageRows.map(({ row, index }) => {
          const rowKey = `${row.service}-${row.method}-${index}`;
          const isCopied = copiedKey === rowKey;
          return (
            <div key={rowKey} className={`audit-row audit-row-${row.status}`} role="row">
              <span role="cell" className="mono">{row.service}</span>
              <span role="cell" className="mono">{row.method}</span>
              <span role="cell" className="mono audit-endpoint">{row.endpoint}</span>
              <span role="cell" className="audit-status">
                <StatusBadge status={row.status} authRequired={row.requiresAuth} />
                {row.error ? <small className="audit-error">{row.error}</small> : null}
                {row.preview ? (
                  <details className="audit-preview">
                    <summary>response</summary>
                    <pre>{row.preview}</pre>
                  </details>
                ) : null}
              </span>
              <span role="cell" className="mono">{row.durationMs !== undefined ? `${row.durationMs} ms` : "—"}</span>
              <span role="cell" className="audit-row-actions">
                <button
                  type="button"
                  className="icon-button"
                  disabled={running || row.status === "running"}
                  onClick={() => runOneRow(index)}
                  title="Run this call"
                  aria-label={`Run ${row.method}`}
                >
                  <Play size={14} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={row.status === "idle"}
                  onClick={() => copyText(serializeRow(row), rowKey)}
                  title={isCopied ? "Copied!" : "Copy this result"}
                  aria-label={`Copy ${row.method} result`}
                >
                  {isCopied ? <ClipboardCheck size={14} /> : <Clipboard size={14} />}
                </button>
              </span>
            </div>
          );
        })}
      </div>

      <div className="audit-paginator" role="navigation" aria-label="Pagination">
        <span className="audit-paginator-range">
          {visibleCount === 0
            ? "0 rows"
            : `Showing ${firstVisible}–${lastVisible} of ${visibleCount}`}
        </span>
        <div className="audit-paginator-buttons">
          <button
            type="button"
            className="icon-button"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          {pageWindowStart > 1 ? (
            <>
              <button
                type="button"
                className="audit-page-button"
                onClick={() => setCurrentPage(1)}
                title="Go to page 1"
              >
                1
              </button>
              {pageWindowStart > 2 ? <span className="audit-page-ellipsis">…</span> : null}
            </>
          ) : null}
          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              className={`audit-page-button ${page === safePage ? "audit-page-button-active" : ""}`}
              onClick={() => setCurrentPage(page)}
              aria-current={page === safePage ? "page" : undefined}
              title={`Go to page ${page}`}
            >
              {page}
            </button>
          ))}
          {pageWindowEnd < totalPages ? (
            <>
              {pageWindowEnd < totalPages - 1 ? <span className="audit-page-ellipsis">…</span> : null}
              <button
                type="button"
                className="audit-page-button"
                onClick={() => setCurrentPage(totalPages)}
                title={`Go to page ${totalPages}`}
              >
                {totalPages}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="icon-button"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ status, authRequired }: { status: AuditRow["status"]; authRequired: boolean }) {
  if (status === "running") return <span className="audit-status-pill audit-status-running">running</span>;
  if (status === "pass") return <span className="audit-status-pill audit-status-pass">pass</span>;
  if (status === "fail") {
    return (
      <span className="audit-status-pill audit-status-fail" title={authRequired ? "Sign in to call this endpoint." : undefined}>
        fail {authRequired ? "· auth required" : ""}
      </span>
    );
  }
  return <span className="audit-status-pill audit-status-idle">idle</span>;
}
