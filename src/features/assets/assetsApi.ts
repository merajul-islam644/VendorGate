import { blocksClient } from "../../lib/blocks/client";

export const ASSET_CATEGORIES = ["Laptop", "Monitor", "Phone", "Furniture", "Other"] as const;
export const ASSET_STATUSES = ["Available", "Assigned", "Maintenance", "Retired"] as const;

export type Asset = Record<string, unknown> & {
  itemId?: string;
  id?: string;
  name?: string;
  assetTag?: string;
  category?: string;
  status?: string;
  assignedTo?: string;
  value?: number;
};

export type AssetInput = {
  assetTag: string;
  assignedTo: string;
  category: string;
  name: string;
  status: string;
  value: number;
};

// Advanced filters here are applied client-side. The collection helper uses
// Data Gateway GraphQL and sends only paging plus the optional search filter
// below, so category/status/value filters narrow the page already fetched.
export type AssetFilters = { category?: string; maxValue?: number; minValue?: number; status?: string };

const assets = blocksClient.data.collection<Asset>("Asset", {
  fields: ["name", "assetTag", "category", "status", "assignedTo", "value"]
});

export async function listAssets({ page, pageSize, search }: { page: number; pageSize: number; search: string }) {
  const response = await assets.list({
    pageNo: page,
    pageSize,
    filter: search ? { name: { $regex: search, $options: "i" } } : undefined
  });
  return normalizeAssetList(response);
}

export function createAsset(input: AssetInput) {
  return assets.create(input);
}

export function updateAsset(asset: Asset) {
  const id = assetId(asset);
  return assets.update(id, asset);
}

export function deleteAsset(asset: Asset) {
  return assets.delete(assetId(asset));
}

export function assetId(asset: Asset): string {
  const id = asset.itemId ?? asset.id;
  if (!id) throw new Error("Asset item id is missing.");
  return String(id);
}

export function matchesFilters(asset: Asset, filters: AssetFilters): boolean {
  if (filters.category && asset.category !== filters.category) return false;
  if (filters.status && asset.status !== filters.status) return false;

  const value = Number(asset.value ?? 0);
  if (filters.minValue !== undefined && value < filters.minValue) return false;
  if (filters.maxValue !== undefined && value > filters.maxValue) return false;

  return true;
}

function normalizeAssetList(response: unknown): { items: Asset[]; totalCount: number } {
  const record = response as { data?: { getAssets?: { items?: Asset[]; totalCount?: number }; items?: Asset[]; totalCount?: number } | Asset[]; items?: Asset[]; totalCount?: number };
  if (Array.isArray(record.data)) return { items: record.data, totalCount: record.data.length };
  const gateway = record.data?.getAssets;
  const items = gateway?.items ?? record.data?.items ?? record.items ?? [];
  return { items, totalCount: gateway?.totalCount ?? record.data?.totalCount ?? record.totalCount ?? items.length };
}
