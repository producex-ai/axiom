"use client";

import {
  CheckCircle,
  Clock,
  FileCheck,
  PlayIcon,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  const t = useTranslations("home.hero");

  const getColorClasses = (color: string) => {
    const colorMap = {
      emerald: "bg-emerald-50 text-emerald-600",
      blue: "bg-blue-50 text-blue-600",
      orange: "bg-orange-50 text-orange-600",
      purple: "bg-purple-50 text-purple-600",
    };
    return (
      colorMap[color as keyof typeof colorMap] || "bg-gray-50 text-gray-600"
    );
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="font-bold text-4xl text-gray-900 leading-tight lg:text-6xl">
                {t("headline.main")}
                <span className="block text-emerald-600">
                  {t("headline.highlight")}
                </span>
              </h1>
              <p className="max-w-2xl text-gray-600 text-xl leading-relaxed">
                {t("subheadline")}
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="transform px-6 py-3 font-semibold text-base shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl">
                {t("cta.primary")}
              </Button>
              <Button
                variant="outline"
                className="border-2 border-emerald-600 px-6 py-3 font-semibold text-base text-emerald-600 transition-all duration-200 hover:bg-emerald-50"
              >
                <PlayIcon className="mr-2 h-4 w-4" strokeWidth={2.5} />
                {t("cta.secondary")}
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 pt-8">
              {[
                { icon: Shield, label: t("trustIndicators.frameworks") },
                { icon: Clock, label: t("trustIndicators.aiPowered") },
                { icon: FileCheck, label: t("trustIndicators.secure") },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <Icon className="h-4 w-4 text-emerald-500" />
                    <span className="text-gray-600 text-sm">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="relative rounded-2xl border border-gray-100 bg-white p-8 shadow-2xl">
              {/* Mock Dashboard */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    Compliance Dashboard
                  </h3>
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-500"></div>
                    <span className="font-medium text-emerald-600 text-sm">
                      Active
                    </span>
                  </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Documents", value: "247", color: "emerald" },
                    { label: "Compliance Rate", value: "98%", color: "blue" },
                    { label: "Time Saved", value: "87%", color: "purple" },
                    { label: "Audits Passed", value: "100%", color: "orange" },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className={`rounded-lg p-4 ${getColorClasses(metric.color)}`}
                    >
                      <div className="font-bold text-2xl">
                        {metric.value}
                      </div>
                      <div className="text-gray-600 text-sm">
                        {metric.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress Bars */}
                <div className="space-y-3">
                  {[
                    { label: "Framework Coverage", value: "15/15", percentage: 100 },
                    { label: "Document Generation", value: "Active", percentage: 85 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex justify-between text-gray-600 text-sm">
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="-top-4 -right-4 absolute rounded-full bg-emerald-500 p-3 text-white shadow-lg">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="-bottom-4 -left-4 absolute rounded-full bg-blue-500 p-3 text-white shadow-lg">
              <Zap className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Background Decorations */}
      <div className="pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden">
        <div className="absolute top-20 left-10 h-20 w-20 rounded-full bg-emerald-100 opacity-50"></div>
        <div className="absolute top-40 right-20 h-32 w-32 rounded-full bg-emerald-200 opacity-30"></div>
        <div className="absolute bottom-20 left-1/4 h-16 w-16 rounded-full bg-emerald-300 opacity-40"></div>
      </div>
    </section>
  );
}
