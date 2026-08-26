import { Check, Languages, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { languageBadge, useT } from "../../lib/i18n/LocalizationProvider";
import { blocksClient } from "../../lib/blocks/client";
import { blocksConfig } from "../../lib/blocks/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../shared/ui/dropdown-menu";

type LanguageRecord = Record<string, unknown> & {
  code?: string;
  culture?: string;
  displayName?: string;
  isDefault?: boolean;
  itemId?: string;
  languageCode?: string;
  languageName?: string;
  name?: string;
};

function pickIdentifier(record: LanguageRecord): string | undefined {
  return record.code ?? record.languageCode ?? record.culture ?? record.itemId;
}

function pickLabel(record: LanguageRecord, fallback: string): string {
  return record.displayName ?? record.languageName ?? record.name ?? fallback;
}

/**
 * Topbar language switcher. Reads the languages enabled for the active
 * tenant from Blocks Localization and renders one item per language.
 *
 * Renders nothing when the tenant has fewer than two languages so the
 * topbar stays clean for single-locale deployments.
 */
export function LanguageSwitcher() {
  const { language, setLanguage, t, cloudStatus } = useT();
  const tenantKey = blocksConfig.xBlocksKey;
  const isLoading = cloudStatus === "loading";

  const languagesQuery = useQuery({
    queryKey: ["localization", "languages", tenantKey],
    queryFn: () => blocksClient.localization.languagesForCurrentTenant(),
    enabled: Boolean(tenantKey),
    staleTime: 5 * 60_000
  });

  const records = (languagesQuery.data ?? []) as LanguageRecord[];
  const normalized = records
    .map((record) => {
      const code = pickIdentifier(record);
      if (!code) return undefined;
      return { code, label: pickLabel(record, code) };
    })
    .filter((value): value is { code: string; label: string } => value !== undefined);

  if (normalized.length < 2) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="icon-button"
        aria-label={t("topbar.language.aria", { values: { language } })}
        title={t("topbar.language.switch")}
        data-loading={isLoading ? "true" : undefined}
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Languages size={18} />}
        <span className="language-badge" aria-hidden="true">{languageBadge(language)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuLabel>{t("topbar.language.switch")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {normalized.map((entry) => {
          const isActive = entry.code === language;
          return (
            <DropdownMenuItem
              key={entry.code}
              onSelect={() => setLanguage(entry.code)}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate">{entry.label}</span>
              <span className="flex items-center gap-2">
                <small className="language-badge language-badge-inline" aria-hidden="true">{languageBadge(entry.code)}</small>
                {isActive ? <Check size={16} className="text-[hsl(var(--primary))]" /> : null}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}