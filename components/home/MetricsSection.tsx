"use client";

import {
  BarChart3,
  FileCheck,
  Clock,
  Shield,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function MetricsSection() {
  const t = useTranslations("home.metrics");

  const getIcon = (iconName: string) => {
    const iconMap = {
      FileCheck,
      Clock,
      Shield,
      TrendingUp,
      BarChart3,
    };
    return iconMap[iconName as keyof typeof iconMap] || FileCheck;
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-200",
      },
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-200",
      },
      orange: {
        bg: "bg-orange-50",
        text: "text-orange-600",
        border: "border-orange-200",
      },
      purple: {
        bg: "bg-purple-50",
        text: "text-purple-600",
        border: "border-purple-200",
      },
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.emerald;
  };

  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-6 font-bold text-3xl text-gray-900 lg:text-5xl">
            {t("headline.main")}{" "}
            <span className="text-emerald-600">{t("headline.highlight")}</span>
          </h2>
          <p className="mx-auto max-w-3xl text-gray-600 text-xl">
            {t("subheadline")}
          </p>
        </div>

        {/* Primary Metrics Grid */}
        <div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Object.keys(t.raw("primaryMetrics")).map((metricKey: string, index: number) => {
            const stat = t.raw(`primaryMetrics.${metricKey}`);
            const colors = ["emerald", "blue", "purple", "orange"];
            const colorClasses = getColorClasses(colors[index]);
            const icons = ["FileCheck", "Clock", "Shield", "TrendingUp"];
            const Icon = getIcon(icons[index]);

            return (
              <div
                key={metricKey}
                className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg transition-shadow duration-300 hover:shadow-xl"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <Icon className="h-6 w-6 text-emerald-600" />
                </div>
                <div className={`mb-2 font-bold text-3xl ${colorClasses.text}`}>
                  {stat.value}
                </div>
                <h3 className="mb-1 font-semibold text-gray-900 text-lg">
                  {stat.label}
                </h3>
                <p className="text-gray-600 text-sm">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-blue-50 p-8 lg:p-12">
          <div className="grid gap-8 md:grid-cols-3">
            {Object.keys(t.raw("benefits")).map((benefitKey: string, index: number) => {
              const benefit = t.raw(`benefits.${benefitKey}`);
              const icons = ["BarChart3", "Clock", "TrendingUp"];
              const Icon = getIcon(icons[index]);

              return (
                <div key={benefitKey} className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg">
                    <Icon className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="mb-2 font-bold text-3xl text-emerald-600">
                    {benefit.value}
                  </div>
                  <h4 className="mb-2 font-semibold text-gray-900 text-lg">
                    {benefit.label}
                  </h4>
                  <p className="text-gray-600">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
