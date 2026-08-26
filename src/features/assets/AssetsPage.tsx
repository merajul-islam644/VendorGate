import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Edit3, Plus, RefreshCw, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { ActionButton } from "../../shared/ui/ActionButton";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { DataTable } from "../../shared/ui/DataTable";
import type { Column } from "../../shared/ui/DataTable";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Modal } from "../../shared/ui/Modal";
import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusPill } from "../../shared/ui/StatusPill";
import { AssetFiltersPanel } from "./AssetFilters";
import { AssetForm } from "./AssetForm";
import { assetId, createAsset, deleteAsset, listAssets, matchesFilters, updateAsset } from "./assetsApi";
import type { Asset, AssetFilters, AssetInput } from "./assetsApi";

const PAGE_SIZES = [10, 25, 50] as const;

export function AssetsPage() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(PAGE_SIZES[0]);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<AssetFilters>({});
  const [editing, setEditing] = useState<Asset | undefined>();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Asset | undefined>();

  const assets = useQuery({
    queryFn: () => listAssets({ page, pageSize, search }),
    queryKey: ["assets", page, pageSize, search]
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["assets"] });
  const create = useMutation({ mutationFn: createAsset, onSuccess: () => { setCreating(false); void invalidate(); } });
  const update = useMutation({ mutationFn: updateAsset, onSuccess: () => { setEditing(undefined); void invalidate(); } });
  const remove = useMutation({ mutationFn: deleteAsset, onSuccess: () => { setDeleting(undefined); void invalidate(); } });

  const allRows = assets.data?.items ?? [];
  const totalCount = assets.data?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const activeFilterCount = Object.values(filters).filter((value) => value !== undefined).length;

  // See the comment on AssetFilters in assetsApi.ts -- this narrows the page
  // Data already returned rather than querying the server per field.
  const rows = useMemo(() => allRows.filter((asset) => matchesFilters(asset, filters)), [allRows, filters]);

  const columns = useMemo<Column<Asset>[]>(() => [
    { key: "name", header: t("assets.name"), render: (row) => <strong>{String(row.name ?? "-")}</strong> },
    { key: "assetTag", header: t("assets.assetTag"), render: (row) => <code className="mono">{String(row.assetTag ?? "-")}</code> },
    { key: "category", header: t("assets.category"), render: (row) => String(row.category ?? "-") },
    { key: "status", header: t("assets.status"), render: (row) => <StatusPill tone={row.status === "Available" ? "good" : row.status === "Maintenance" ? "warn" : "neutral"}>{String(row.status ?? "-")}</StatusPill> },
    { key: "assignedTo", header: t("assets.assignedTo"), render: (row) => String(row.assignedTo || "-") },
    { key: "value", header: t("assets.value"), render: (row) => `$${Number(row.value ?? 0).toFixed(2)}` },
    { key: "actions", header: t("assets.actions"), render: (row) => (
      <div className="row-actions">
        <ActionButton variant="icon" title={t("assets.edit")} icon={<Edit3 size={16} />} onClick={() => setEditing(row)} />
        <ActionButton variant="icon" title={t("common.delete")} icon={<Trash2 size={16} />} onClick={() => setDeleting(row)} />
      </div>
    ) }
  ], [t]);

  function submit(input: AssetInput) {
    if (editing) update.mutate({ ...editing, ...input });
    else create.mutate(input);
  }

  return (
    <section>
      <PageHeader
        title={t("assets.title")}
        subtitle={t("assets.subtitle")}
        actions={<button className="primary-button" onClick={() => setCreating(true)}><Plus size={16} /> {t("assets.create")}</button>}
      />

      <div className="toolbar">
        <label className="search-box">
          <Search size={16} />
          <input aria-label={t("assets.search")} placeholder={t("assets.search")} value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
        </label>
        <div className="toolbar-actions">
          <ActionButton
            variant={activeFilterCount > 0 ? "primary" : "icon"}
            title={t("assets.filters.toggle")}
            icon={<SlidersHorizontal size={16} />}
            onClick={() => setFiltersOpen((value) => !value)}
          >
            {activeFilterCount > 0 ? `${t("assets.filters.toggle")} (${activeFilterCount})` : undefined}
          </ActionButton>
          <ActionButton variant="icon" title={t("common.refresh")} icon={<RefreshCw size={16} />} onClick={() => assets.refetch()} />
        </div>
      </div>

      {filtersOpen ? <AssetFiltersPanel filters={filters} onChange={setFilters} onClear={() => setFilters({})} /> : null}

      {assets.isError ? <ErrorState message={t("assets.error.load")} onRetry={() => assets.refetch()} /> : null}

      {assets.isLoading ? <div className="panel">{t("common.loading")}</div> : rows.length > 0 ? <DataTable columns={columns} rows={rows} /> : (
        <EmptyState
          icon={<Boxes size={28} />}
          title={t("assets.empty")}
          description={activeFilterCount > 0 ? t("assets.filters.empty") : t("assets.empty.description")}
          action={<button className="primary-button" onClick={() => setCreating(true)}><Plus size={16} /> {t("assets.create")}</button>}
        />
      )}

      <div className="pagination">
        <span className="pagination-count">{t("assets.pagination.count", { count: totalCount, values: { count: totalCount } })}</span>
        <div className="pagination-controls">
          <label className="pagination-size">
            <span>{t("assets.pagination.rows")}</span>
            <select value={pageSize} onChange={(event) => { setPage(1); setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]); }}>
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <button className="icon-button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t("assets.pagination.previous")}</button>
          <span>{t("assets.pagination.pageOf", { values: { page, pageCount } })}</span>
          <button className="icon-button" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>{t("assets.pagination.next")}</button>
        </div>
      </div>

      {creating || editing ? (
        <Modal title={editing ? t("assets.edit") : t("assets.create")} onClose={() => { setCreating(false); setEditing(undefined); }}>
          <AssetForm asset={editing} saving={create.isPending || update.isPending} onCancel={() => { setCreating(false); setEditing(undefined); }} onSubmit={submit} />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t("assets.delete.title")}
          message={t("assets.delete.confirm", { values: { name: String(deleting.name ?? assetId(deleting)) } })}
          onCancel={() => setDeleting(undefined)}
          onConfirm={() => remove.mutate(deleting)}
        />
      ) : null}
    </section>
  );
}
