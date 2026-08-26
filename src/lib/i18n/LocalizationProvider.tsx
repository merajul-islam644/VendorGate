import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { blocksClient } from "../blocks/client";
import { defaultDictionary } from "./dictionary";
import type { TranslationKey } from "./dictionary";

type Dictionary = Record<string, string>;

// Vite glob: bundles every JSON file in `blocks/localization/` at build time.
// Each path becomes a key in the resulting map, e.g.
//   "../../../blocks/localization/common.bn.json" -> { "nav.dashboard": "ড্যাশবোর্ড", ... }
// We extract the language code from the filename suffix and merge every
// module's file for a given language into one dictionary so callers don't
// need to know about per-module splits.
//
// IMPORTANT: Vite's static analyser requires the glob pattern to be a string
// literal at the call site; it cannot be a variable. That's why this looks
// like a magic string rather than a nicely named constant.
const rawLocalFiles = import.meta.glob<Record<string, string>>(
  "../../../blocks/localization/*.json",
  { eager: true }
);

function getLocalDictionary(language: string): Dictionary {
  const merged: Dictionary = {};
  for (const [path, content] of Object.entries(rawLocalFiles)) {
    // Filename like "<module>.<lang>.json"; the language is everything between
    // the last dot and `.json`.
    const match = /\/[^/]+\.([A-Za-z0-9-]+)\.json$/.exec(path);
    if (match && match[1] === language) {
      Object.assign(merged, content);
    }
  }
  return merged;
}

export type TOptions = {
  values?: Record<string, string | number>;
  count?: number;
  fallback?: string;
};

export type LocalizationValue = {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: TranslationKey | string, options?: TOptions | string) => string;
  cloudStatus: "idle" | "loading" | "ready" | "error";
};

/**
 * Short display for the active language in tight UI like the topbar switcher
 * trigger. Capitalizes the primary subtag so "en" renders as "EN" without
 * pulling in Intl.DisplayNames for a 2-letter label.
 */
export function languageBadge(language: string): string {
  const primary = String(language).split(/[-_]/)[0] || language;
  return primary.toUpperCase();
}

const LocalizationContext = createContext<LocalizationValue | undefined>(undefined);
const LANGUAGE_KEY = "blocks-app:language";
const MODULES = ["common", "dashboard", "assets"];

/**
 * Resolve a translation source string from the merged dictionaries.
 * Order: cloudDictionary[key] -> localDictionary[key] -> defaultDictionary[key] -> fallback -> key.
 *
 * Cloud wins because it represents the canonical source-of-truth published
 * via `blocks localization push`. Local JSON files (bundled at build time)
 * act as the development fallback so devs can edit translations and see
 * them apply immediately without re-pushing. The hardcoded English
 * defaultDictionary is the ultimate safety net.
 *
 * Returns null when nothing is found, so the caller can fall back to the
 * non-pluralized base key (and then the chain above) without double-work.
 */
function resolveKey(
  key: string,
  cloudDictionary: Dictionary,
  localDictionary: Dictionary,
  fallback?: string
): string | null {
  if (cloudDictionary[key] !== undefined) return cloudDictionary[key];
  if (localDictionary[key] !== undefined) return localDictionary[key];
  if (defaultDictionary[key as TranslationKey] !== undefined) {
    return defaultDictionary[key as TranslationKey];
  }
  if (fallback !== undefined) return fallback;
  return null;
}

/**
 * Substitute {placeholder} tokens in a translation source with values from
 * options.values. Unknown placeholders are left as-is so a translator can
 * notice and fix them.
 */
function interpolate(source: string, values?: Record<string, string | number>): string {
  if (!values) return source;
  return source.replace(/\{(\w+)\}/g, (token, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : token
  );
}

/**
 * Pick a plural variant using Intl.PluralRules for the active language.
 * Variants are encoded as `${key}/${category}` (e.g. `assets.pagination.count/one`).
 * Falls back to the base key (which uses the "other" category by definition),
 * then to the regular resolution chain.
 */
function pickPluralSource(
  key: string,
  count: number,
  language: string,
  cloudDictionary: Dictionary,
  localDictionary: Dictionary,
  fallback?: string
): string | null {
  let category: Intl.LDMLPluralRule = "other";
  try {
    category = new Intl.PluralRules(language).select(count);
  } catch {
    category = "other";
  }
  const variantKey = `${key}/${category}`;
  const variant = resolveKey(variantKey, cloudDictionary, localDictionary, undefined);
  if (variant !== null) return variant;
  return resolveKey(key, cloudDictionary, localDictionary, fallback);
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "en");
  const [cloudDictionary, setCloudDictionary] = useState<Dictionary>({});
  const [cloudStatus, setCloudStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    // Reset before the new fetch so a stale language's keys never flash through
    // the UI; mark the status as loading so consumers (e.g. the switcher) can
    // show a spinner while the new dictionary is in flight.
    setCloudDictionary({});
    setCloudStatus("loading");
    let cancelled = false;
    blocksClient.localization
      .load(language, MODULES)
      .then((loaded) => {
        if (cancelled) return;
        setCloudDictionary(loaded);
        setCloudStatus("ready");
        if (import.meta.env.DEV) {
          const cloudKeyCount = Object.keys(loaded).length;
          const local = getLocalDictionary(language);
          const localKeyCount = Object.keys(local).length;
          // Count how many of our TranslationKey names are still missing after
          // both cloud and local-file lookups so it is obvious in DevTools
          // whether the active language has full coverage or only English
          // fallback applies.
          const missing = Object.keys(defaultDictionary).filter(
            (k) => loaded[k] === undefined && local[k] === undefined
          ).length;
          // eslint-disable-next-line no-console
          console.info(
            `[i18n] "${language}": cloud=${cloudKeyCount}, local=${localKeyCount}, missing→en=${missing}`
          );
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setCloudDictionary({});
        setCloudStatus("error");
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(`[i18n] load("${language}") failed:`, error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const value = useMemo<LocalizationValue>(() => {
    // Compute the local-file dictionary for the active language once per
    // language change so resolveKey stays O(1) on every `t()` call.
    const localDictionary = getLocalDictionary(language);

    // Translate a key. Accepts the legacy `t(key, fallback)` signature as well as
    // the new `t(key, { values, count, fallback })` form so all existing call
    // sites continue to work without changes.
    function translate(
      key: TranslationKey | string,
      optionsOrFallback?: TOptions | string
    ): string {
      const options: TOptions =
        typeof optionsOrFallback === "string"
          ? { fallback: optionsOrFallback }
          : (optionsOrFallback ?? {});

      let source: string | null = null;
      if (options.count !== undefined) {
        source = pickPluralSource(key, options.count, language, cloudDictionary, localDictionary, options.fallback);
      } else {
        source = resolveKey(key, cloudDictionary, localDictionary, options.fallback);
      }

      if (source === null) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(`[i18n] missing translation: ${key}`);
        }
        return key;
      }

      const interpolated = interpolate(source, options.values);

      // `%d` is the legacy placeholder convention for the counted plural
      // number -- some translators use it in lieu of `{count}`.
      if (options.count !== undefined) {
        return interpolated.replace(/%d/g, String(options.count));
      }
      return interpolated;
    }

    return {
      language,
      setLanguage: setLanguageState,
      t: translate,
      cloudStatus
    };
  }, [cloudDictionary, language, cloudStatus]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useT() {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error("useT must be used within LocalizationProvider");
  return context;
}