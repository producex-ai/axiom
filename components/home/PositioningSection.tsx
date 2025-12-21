"use client";

import {
  ArrowRight,
  CheckCircle,
  BookOpen,
  Shield,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function PositioningSection() {
  const t = useTranslations("home.positioning");

  const getIcon = (iconName: string) => {
    const iconMap = {
      BookOpen,
      Shield,
      Zap,
    };
    return iconMap[iconName as keyof typeof iconMap] || BookOpen;
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-200",
        accent: "bg-emerald-500",
      },
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-200",
        accent: "bg-blue-500",
      },
      purple: {
        bg: "bg-purple-50",
        text: "text-purple-600",
        border: "border-purple-200",
        accent: "bg-purple-500",
      },
      orange: {
        bg: "bg-orange-50",
        text: "text-orange-600",
        border: "border-orange-200",
        accent: "bg-orange-500",
      },
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.emerald;
  };

  return (
    <section id="features" className="bg-gray-50 py-20">
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

        {/* Frameworks Grid */}
        <div className="mb-20 grid gap-6 md:grid-cols-3 lg:grid-cols-3">
          {Object.keys(t.raw("frameworks.list")).map((frameworkKey: string, index: number) => {
            const framework = t.raw(`frameworks.list.${frameworkKey}`);
            const colors = ["emerald", "blue", "purple", "orange", "emerald"];
            const colorClasses = getColorClasses(colors[index % colors.length]);

            return (
              <div
                key={frameworkKey}
                className="hover:-translate-y-1 rounded-xl border border-gray-100 bg-white p-6 text-center shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <div className={`mb-4 font-bold text-2xl ${colorClasses.text}`}>
                  {framework.name}
                </div>
                <div className="text-gray-600 text-sm">
                  {framework.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Key Differentiators */}
        <div className="mb-20 grid gap-8 lg:grid-cols-3">
          {[
            { key: "aiFirst", icon: "Zap", color: "emerald" },
            { key: "multiFramework", icon: "BookOpen", color: "blue" },
            { key: "enterprise", icon: "Shield", color: "purple" },
          ].map((diff) => {
            const Icon = getIcon(diff.icon);
            const colors = getColorClasses(diff.color);

            return (
              <div
                key={diff.key}
                className="hover:-translate-y-1 rounded-xl border border-gray-100 bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <div
                  className={`${colors.bg} mb-6 flex h-16 w-16 items-center justify-center rounded-xl border ${colors.border}`}
                >
                  <Icon className={`h-8 w-8 ${colors.text}`} />
                </div>
                <h3 className="mb-4 font-semibold text-gray-900 text-xl">
                  {t(`differentiators.${diff.key}.title`)}
                </h3>
                <p className="mb-6 text-gray-600 leading-relaxed">
                  {t(`differentiators.${diff.key}.description`)}
                </p>
                <div className="space-y-3">
                  {(Object.values(t.raw(`differentiators.${diff.key}.details`)) as string[]).map(
                    (point: string, index: number) => (
                      <div key={index} className="flex items-center">
                        <CheckCircle
                          className={`h-4 w-4 ${colors.text} mr-3 flex-shrink-0`}
                        />
                        <span className="text-gray-700 text-sm">
                          {point}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Competitive Advantages */}
        <div className="mb-20">
          <div className="mb-12 text-center">
            <h3 className="mb-4 font-bold text-2xl text-gray-900">
              Why Choose Axiom
            </h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Object.keys(t.raw("competitiveAdvantages")).map((advKey: string, index: number) => {
              const advantage = t.raw(`competitiveAdvantages.${advKey}`);
              const colors = ["emerald", "blue", "purple", "orange"];
              const colorClasses = getColorClasses(colors[index]);

              return (
                <div
                  key={advKey}
                  className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className={`mb-4 font-bold text-3xl ${colorClasses.text}`}>
                    {advantage.metric}
                  </div>
                  <h4 className="mb-2 font-semibold text-gray-900 text-lg">
                    {advantage.title}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {advantage.description}
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
