"use client";

import { Github, Linkedin, Twitter } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  const getSocialIcon = (iconName: string) => {
    const iconMap = {
      Linkedin,
      Twitter,
      Github,
    };
    return iconMap[iconName as keyof typeof iconMap] || Linkedin;
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-6">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h3 className="mb-2 font-bold text-2xl text-emerald-400">
                {t("company.name")}
              </h3>
              <p className="mb-4 font-medium text-emerald-300 text-sm">
                {t("company.tagline")}
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                {t("company.description")}
              </p>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {[
                { key: "linkedin", icon: "Linkedin" },
                { key: "twitter", icon: "Twitter" },
                { key: "github", icon: "Github" },
              ].map((item) => {
                const Icon = getSocialIcon(item.icon);
                return (
                  <a
                    key={item.key}
                    href="#"
                    className="rounded-lg bg-gray-800 p-2 transition-colors duration-300 hover:bg-emerald-600"
                    aria-label={t(`social.${item.key}`)}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="mb-4 font-semibold text-lg">
              {t("products.title")}
            </h4>
            <ul className="space-y-3">
              {[{ key: "visio" }, { key: "nexo" }, { key: "axiom" }].map(
                (item) => (
                  <li key={item.key}>
                    <a
                      href="#"
                      className="block text-gray-400 transition-colors duration-300 hover:text-emerald-400"
                    >
                      <div className="font-medium">
                        {t(`products.${item.key}.name`)}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {t(`products.${item.key}.description`)}
                      </div>
                    </a>
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="mb-4 font-semibold text-lg">
              {t("companyLinks.title")}
            </h4>
            <ul className="space-y-3">
              {[
                { key: "aboutUs" },
                { key: "careers" },
                { key: "press" },
                { key: "contact" },
              ].map((item) => (
                <li key={item.key}>
                  <a
                    href="#"
                    className="text-gray-400 transition-colors duration-300 hover:text-emerald-400"
                  >
                    {t(`companyLinks.${item.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 font-semibold text-lg">
              {t("resources.title")}
            </h4>
            <ul className="space-y-3">
              {[
                { key: "documentation" },
                { key: "apiReference" },
                { key: "caseStudies" },
                { key: "blog" },
              ].map((item) => (
                <li key={item.key}>
                  <a
                    href="#"
                    className="text-gray-400 transition-colors duration-300 hover:text-emerald-400"
                  >
                    {t(`resources.${item.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 font-semibold text-lg">{t("support.title")}</h4>
            <ul className="space-y-3">
              {[
                { key: "helpCenter" },
                { key: "community" },
                { key: "status" },
                { key: "security" },
              ].map((item) => (
                <li key={item.key}>
                  <a
                    href="#"
                    className="text-gray-400 transition-colors duration-300 hover:text-emerald-400"
                  >
                    {t(`support.${item.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-gray-800 border-t pt-8">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <div className="text-gray-400 text-sm">{t("legal.copyright")}</div>
            <div className="flex space-x-6">
              {[
                { key: "privacyPolicy" },
                { key: "termsOfService" },
                { key: "cookiePolicy" },
              ].map((link) => (
                <a
                  key={link.key}
                  href="#"
                  className="text-gray-400 text-sm transition-colors duration-300 hover:text-emerald-400"
                >
                  {t(`legal.${link.key}`)}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
