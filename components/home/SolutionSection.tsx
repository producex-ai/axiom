"use client";

import {
  Bot,
  Brain,
  FileCheck,
  FolderTree,
  Sparkles,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function SolutionSection() {
  const t = useTranslations("home.solution");

  const getIcon = (iconName: string) => {
    const iconMap = {
      Brain,
      FolderTree,
      FileCheck,
      Bot,
      Upload,
      Sparkles,
    };
    return iconMap[iconName as keyof typeof iconMap] || Brain;
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      emerald: {
        bg: "bg-emerald-50",
        icon: "text-emerald-600",
        accent: "border-emerald-200",
      },
      blue: {
        bg: "bg-blue-50",
        icon: "text-blue-600",
        accent: "border-blue-200",
      },
      purple: {
        bg: "bg-purple-50",
        icon: "text-purple-600",
        accent: "border-purple-200",
      },
      orange: {
        bg: "bg-orange-50",
        icon: "text-orange-600",
        accent: "border-orange-200",
      },
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.emerald;
  };

  return (
    <section id="solutions" className="bg-white py-20">
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

        {/* Features Grid */}
        <div className="mb-20 grid gap-8 md:grid-cols-2">
          {[
            { id: "aiGeneration", icon: "Brain", color: "emerald" },
            { id: "richEditor", icon: "Bot", color: "blue" },
            { id: "lifecycle", icon: "FileCheck", color: "purple" },
            { id: "framework", icon: "FolderTree", color: "orange" },
          ].map((feature) => {
            const Icon = getIcon(feature.icon);
            const colors = getColorClasses(feature.color);

            return (
              <div
                key={feature.id}
                className="hover:-translate-y-1 rounded-xl border border-gray-100 bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <div className="mb-6 flex items-start">
                  <div
                    className={`${colors.bg} mr-6 rounded-xl p-4 ${colors.accent} border`}
                  >
                    <Icon className={`h-8 w-8 ${colors.icon}`} />
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold text-gray-900 text-xl">
                      {t(`features.${feature.id}.title`)}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {t(`features.${feature.id}.description`)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {(
                    Object.values(
                      t.raw(`features.${feature.id}.details`),
                    ) as string[]
                  ).map((detail: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center text-gray-700 text-sm"
                    >
                      <div
                        className={`h-2 w-2 ${colors.bg} mr-3 rounded-full border ${colors.accent}`}
                      ></div>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Workflow Section */}
        <div className="mb-20">
          <div className="mb-12 text-center">
            <h3 className="mb-4 font-bold text-2xl text-gray-900">
              {t("workflow.title")}
            </h3>
          </div>
          <div className="relative">
            <div className="grid gap-6 md:grid-cols-4">
              {Object.keys(t.raw("workflow.steps")).map(
                (stepKey: string, index: number) => {
                  const step = t.raw(`workflow.steps.${stepKey}`);
                  const icons = ["Upload", "Brain", "FileCheck", "Sparkles"];
                  const Icon = getIcon(icons[index]);

                  return (
                    <div key={stepKey} className="relative z-10">
                      <div className="text-center">
                        <div className="relative z-10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-emerald-200 bg-emerald-100">
                          <Icon className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div className="mb-2 font-bold text-emerald-600 text-sm">
                          {step.number}
                        </div>
                        <h4 className="mb-2 font-semibold text-gray-900 text-lg">
                          {step.title}
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
            {/* Connecting Line */}
            <div className="absolute inset-x-0 top-8 z-0 hidden md:block">
              <div className="flex items-center justify-center">
                <div
                  className="flex items-center"
                  style={{ width: "calc(75% - 3rem)" }}
                >
                  <div className="h-0.5 flex-1 bg-emerald-200"></div>
                  <div className="h-0.5 flex-1 bg-emerald-200"></div>
                  <div className="h-0.5 flex-1 bg-emerald-200"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
