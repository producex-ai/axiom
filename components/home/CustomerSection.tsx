"use client";

import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CustomerSection() {
  const t = useTranslations("home.customer");

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-200",
        accent: "bg-blue-500",
      },
      emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-200",
        accent: "bg-emerald-500",
      },
      purple: {
        bg: "bg-purple-50",
        text: "text-purple-600",
        border: "border-purple-200",
        accent: "bg-purple-500",
      },
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.emerald;
  };

  return (
    <section className="bg-white py-20">
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

        {/* Roles Grid */}
        <div className="mb-20 grid gap-8 lg:grid-cols-3">
          {[
            { key: "qaDirector", color: "emerald" },
            { key: "complianceManager", color: "blue" },
            { key: "auditor", color: "purple" },
          ].map((role) => {
            const colors = getColorClasses(role.color);

            return (
              <div
                key={role.key}
                className="hover:-translate-y-1 rounded-xl border border-gray-100 bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <div className="mb-6 text-center">
                  <div className="mb-4 text-4xl">
                    {t(`roles.${role.key}.avatar`)}
                  </div>
                  <h3 className="mb-2 font-semibold text-gray-900 text-xl">
                    {t(`roles.${role.key}.role`)}
                  </h3>
                </div>

                <p className="mb-6 text-center text-gray-600 text-sm">
                  {t(`roles.${role.key}.valueDelivered`)}
                </p>

                <div className="mb-6 space-y-3">
                  {(Object.values(t.raw(`roles.${role.key}.benefits`)) as string[]).map(
                    (benefit: string, index: number) => (
                      <div key={index} className="flex items-start">
                        <CheckCircle
                          className={`h-5 w-5 ${colors.text} mt-0.5 mr-3 flex-shrink-0`}
                        />
                        <span className="text-gray-700 text-sm">
                          {benefit}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Testimonials */}
        <div className="mb-20">
          <div className="grid gap-8 md:grid-cols-3">
            {Object.keys(t.raw("testimonials")).map(
              (testimonialKey: string, index: number) => {
                const testimonial = t.raw(`testimonials.${testimonialKey}`);
                return (
                <div
                  key={testimonialKey}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-6"
                >
                  <div className="mb-4 flex items-center">
                    <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 font-semibold text-white">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {testimonial.author}
                      </div>
                      <div className="text-gray-600 text-sm">
                        {testimonial.title}
                      </div>
                      <div className="text-emerald-600 text-sm">
                        {testimonial.company}
                      </div>
                    </div>
                  </div>
                  <blockquote className="text-gray-700 italic">
                    "{testimonial.quote}"
                  </blockquote>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
