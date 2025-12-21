"use client";

import { ArrowRight, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  const t = useTranslations("home.cta");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-100 py-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.1),transparent_50%)]"></div>
        <div className="absolute right-0 bottom-0 h-full w-full bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.05),transparent_50%)]"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Content */}
        <div className="mb-16 text-center">
          <h2 className="mb-6 font-bold text-4xl text-gray-900 lg:text-6xl">
            {t("headline.main")}{" "}
            <span className="text-emerald-600">{t("headline.highlight")}</span>
          </h2>
          <p className="mx-auto mb-12 max-w-3xl text-gray-600 text-xl">
            {t("subheadline")}
          </p>

          {/* CTAs */}
          <div className="mb-12 flex flex-col items-center justify-center gap-6 sm:flex-row">
            {/* Primary CTA */}
            <Button
              size="lg"
              className="group relative h-auto min-w-[280px] rounded-xl bg-emerald-600 px-8 py-6 font-semibold text-lg text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-emerald-700 hover:shadow-xl"
            >
              <div className="flex items-center">
                <span>{t("primaryCta.text")}</span>
                <ArrowRight
                  className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                  strokeWidth={2}
                />
              </div>
            </Button>

            {/* Secondary CTA */}
            <Button
              variant="outline"
              size="lg"
              className="group relative h-auto min-w-[280px] rounded-xl border-2 border-emerald-600 px-8 py-6 font-semibold text-emerald-700 text-lg shadow-md transition-all duration-300 hover:scale-105 hover:bg-emerald-600 hover:text-white hover:shadow-lg"
            >
              {t("secondaryCta.text")}
            </Button>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-gray-600">
            {Object.values(t.raw("trustSignals")).map((signal: string, index: number) => (
              <div key={index} className="flex items-center text-sm">
                <Shield className="mr-2 h-4 w-4 text-emerald-600" />
                <span>{signal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
