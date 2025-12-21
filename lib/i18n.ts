import { useTranslations } from "next-intl";

export function useHeroTranslations() {
  return useTranslations("hero");
}

export function useNavigationTranslations() {
  return useTranslations("navigation");
}

export function useProblemTranslations() {
  return useTranslations("problem");
}

export function useSolutionTranslations() {
  return useTranslations("solution");
}

export function useMetricsTranslations() {
  return useTranslations("metrics");
}

export function useCustomerTranslations() {
  return useTranslations("customer");
}

export function usePositioningTranslations() {
  return useTranslations("positioning");
}

export function useCtaTranslations() {
  return useTranslations("cta");
}

export function useFooterTranslations() {
  return useTranslations("footer");
}
