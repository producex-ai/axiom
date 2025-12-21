const SUPPORTED_LOCALES = ["en", "es"] as const;
const DEFAULT_LOCALE = "en";

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function parseLocalePath(pathname: string): {
  locale: SupportedLocale;
  pathWithoutLocale: string;
  hasLocalePrefix: boolean;
} {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return {
      locale: DEFAULT_LOCALE,
      pathWithoutLocale: "/",
      hasLocalePrefix: false,
    };
  }

  const firstSegment = segments[0];
  const isLocale = SUPPORTED_LOCALES.includes(firstSegment as SupportedLocale);

  if (isLocale) {
    return {
      locale: firstSegment as SupportedLocale,
      pathWithoutLocale: `/${segments.slice(1).join("/")}` || "/",
      hasLocalePrefix: true,
    };
  }

  return {
    locale: DEFAULT_LOCALE,
    pathWithoutLocale: pathname,
    hasLocalePrefix: false,
  };
}

export function createLocalizedUrl(
  path: string,
  locale: SupportedLocale,
  baseUrl: string,
): URL {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const localizedPath = `/${locale}${
    normalizedPath === "/" ? "" : normalizedPath
  }`;
  return new URL(localizedPath, baseUrl);
}

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}
