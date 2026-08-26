import { useT } from "../../lib/i18n/LocalizationProvider";
import { ASSET_CATEGORIES, ASSET_STATUSES } from "./assetsApi";
import type { AssetFilters as AssetFiltersValue } from "./assetsApi";

function numberOrUndefined(raw: string): number | undefined {
  return raw === "" ? undefined : Number(raw);
}

export function AssetFiltersPanel({ filters, onChange, onClear }: {
  filters: AssetFiltersValue;
  onChange: (next: AssetFiltersValue) => void;
  onClear: () => void;
}) {
  const { t } = useT();

  return (
    <div className="panel">
      <div className="filter-grid">
        <label className="form-field">
          <span>{t("assets.category")}</span>
          <select value={filters.category ?? ""} onChange={(event) => onChange({ ...filters, category: event.target.value || undefined })}>
            <option value="">{t("assets.filters.any")}</option>
            {ASSET_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>{t("assets.status")}</span>
          <select value={filters.status ?? ""} onChange={(event) => onChange({ ...filters, status: event.target.value || undefined })}>
            <option value="">{t("assets.filters.any")}</option>
            {ASSET_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <FormFieldNumber label={t("assets.filters.minValue")} value={filters.minValue} onChange={(next) => onChange({ ...filters, minValue: next })} />
        <FormFieldNumber label={t("assets.filters.maxValue")} value={filters.maxValue} onChange={(next) => onChange({ ...filters, maxValue: next })} />
      </div>
      <div className="form-actions">
        <button className="link-button" type="button" onClick={onClear}>{t("assets.filters.clear")}</button>
      </div>
    </div>
  );
}

function FormFieldNumber({ label, onChange, value }: { label: string; onChange: (next: number | undefined) => void; value: number | undefined }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input min={0} type="number" value={value ?? ""} onChange={(event) => onChange(numberOrUndefined(event.target.value))} />
    </label>
  );
}
