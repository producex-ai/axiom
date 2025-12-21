"use client";

import { AlertTriangle, Clock, FileX, Shield } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ProblemSection() {
  const t = useTranslations("home.problem");

  const getIcon = (iconName: string) => {
    const iconMap = {
      FileX,
      Clock,
      Shield,
    };
    return iconMap[iconName as keyof typeof iconMap] || FileX;
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      red: {
        bg: "bg-red-100",
        text: "text-red-600",
        icon: "text-red-600",
      },
      orange: {
        bg: "bg-orange-100",
        text: "text-orange-600",
        icon: "text-orange-600",
      },
      purple: {
        bg: "bg-purple-100",
        text: "text-purple-600",
        icon: "text-purple-600",
      },
      gray: {
        bg: "bg-gray-100",
        text: "text-gray-700",
        icon: "text-gray-700",
      },
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-6 font-bold text-3xl text-gray-900 lg:text-5xl">
            {t("headline.main")}{" "}
            <span className="text-red-600">{t("headline.highlight")}</span>
          </h2>
          <p className="mx-auto max-w-3xl text-gray-600 text-xl">
            {t("subheadline")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {[
            { id: "manual", icon: "FileX", color: "red" },
            { id: "costly", icon: "Shield", color: "orange" },
            { id: "risk", icon: "Clock", color: "purple" },
          ].map((painPoint) => {
            const Icon = getIcon(painPoint.icon);
            const colors = getColorClasses(painPoint.color);

            return (
              <div
                key={painPoint.id}
                className="rounded-xl border border-gray-100 bg-white p-8 shadow-lg transition-shadow duration-300 hover:shadow-xl"
              >
                <div className="mb-6 flex items-center">
                  <div className={`${colors.bg} mr-4 rounded-lg p-3`}>
                    <Icon className={`h-8 w-8 ${colors.text}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-xl">
                    {t(`painPoints.${painPoint.id}.title`)}
                  </h3>
                </div>
                <p className="mb-4 text-gray-600 leading-relaxed">
                  {t(`painPoints.${painPoint.id}.description`)}
                </p>
                <div className="space-y-2">
                  {(Object.values(t.raw(`painPoints.${painPoint.id}.issues`)) as string[]).map(
                    (issue: string, index: number) => (
                      <div
                        key={index}
                        className={`flex items-center text-sm ${colors.text}`}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        <span>{issue}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Impact Statistics */}
        <div className="mt-16 rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50 p-8">
          <div className="mb-8 text-center">
            <h3 className="mb-2 font-bold text-2xl text-gray-900">
              {t("impact.title")}
            </h3>
            <p className="text-gray-600">{t("impact.subtitle")}</p>
          </div>
          <div className="grid gap-6 text-center md:grid-cols-4">
            {Object.keys(t.raw("impact.statistics")).map((statKey: string, index: number) => {
              const stat = t.raw(`impact.statistics.${statKey}`);
              const colors = ["red", "orange", "purple", "gray"];
              const colorClasses = getColorClasses(colors[index]);
              return (
                <div
                  key={statKey}
                  className="rounded-lg bg-white p-6 shadow-sm"
                >
                  <div className={`font-bold text-3xl ${colorClasses.text} mb-2`}>
                    {stat.value}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
