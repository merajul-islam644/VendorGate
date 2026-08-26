import { useEffect, useState } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { FormField } from "../../shared/ui/FormField";
import { ASSET_CATEGORIES, ASSET_STATUSES } from "./assetsApi";
import type { Asset, AssetInput } from "./assetsApi";

const EMPTY: AssetInput = { assetTag: "", assignedTo: "", category: ASSET_CATEGORIES[0], name: "", status: ASSET_STATUSES[0], value: 0 };

export function AssetForm({ asset, onCancel, onSubmit, saving }: {
  asset?: Asset;
  onCancel: () => void;
  onSubmit: (input: AssetInput) => void;
  saving: boolean;
}) {
  const { t } = useT();
  const [value, setValue] = useState<AssetInput>(EMPTY);

  useEffect(() => {
    setValue(asset ? {
      assetTag: String(asset.assetTag ?? ""),
      assignedTo: String(asset.assignedTo ?? ""),
      category: String(asset.category ?? ASSET_CATEGORIES[0]),
      name: String(asset.name ?? ""),
      status: String(asset.status ?? ASSET_STATUSES[0]),
      value: Number(asset.value ?? 0)
    } : EMPTY);
  }, [asset]);

  function update<K extends keyof AssetInput>(key: K, next: AssetInput[K]) {
    setValue((current) => ({ ...current, [key]: next }));
  }

  return (
    <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(value); }}>
      <FormField label={t("assets.name")} required value={value.name} onChange={(event) => update("name", event.target.value)} />
      <FormField label={t("assets.assetTag")} required value={value.assetTag} onChange={(event) => update("assetTag", event.target.value)} />
      <label className="form-field">
        <span>{t("assets.category")}</span>
        <select value={value.category} onChange={(event) => update("category", event.target.value)}>
          {ASSET_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select>
      </label>
      <label className="form-field">
        <span>{t("assets.status")}</span>
        <select value={value.status} onChange={(event) => update("status", event.target.value)}>
          {ASSET_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
      </label>
      <FormField label={t("assets.assignedTo")} value={value.assignedTo} onChange={(event) => update("assignedTo", event.target.value)} />
      <FormField label={t("assets.value")} min={0} type="number" value={value.value} onChange={(event) => update("value", Number(event.target.value))} />
      <div className="form-actions">
        <button className="icon-button" type="button" onClick={onCancel}>{t("common.cancel")}</button>
        <button className="primary-button" disabled={saving || !value.name || !value.assetTag} type="submit">{saving ? t("common.loading") : t("common.save")}</button>
      </div>
    </form>
  );
}
