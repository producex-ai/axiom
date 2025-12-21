"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { useAuth } from "@/hooks/useAuth";

export default function Navigation() {
  const t = useTranslations("navigation");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;
  const { isAuthenticated, isLoading, logout } = useAuth();

  // Check if we're on the home page to show section navigation
  const isHomePage = pathname === `/${locale}` || pathname === `/${locale}/`;

  const handleNavClick = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    setIsMobileMenuOpen(false);
  };

  const handleCTAClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await logout();
  };

  // Helper function to render authentication button
  const renderAuthButton = (isMobile = false) => {
    if (isLoading) {
      return (
        <Button disabled className={isMobile ? "mt-4 w-full" : ""}>
          XXXX
        </Button>
      );
    }

    if (isAuthenticated) {
      return (
        <Button
          variant="outline"
          onClick={handleLogout}
          className={isMobile ? "mt-4 w-full" : ""}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("logout")}
        </Button>
      );
    }

    return (
      <Button asChild className={isMobile ? "mt-4 w-full" : ""}>
        <Link
          href={`/${locale}/login`}
          onClick={isMobile ? handleCTAClick : undefined}
        >
          {t("cta")}
        </Link>
      </Button>
    );
  };

  return (
    <nav
      className="sticky top-0 z-50 border-border/50 border-b backdrop-blur-md"
      style={{
        backgroundColor: "var(--nav-background)",
        color: "var(--nav-foreground)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link
                href={`/${locale}`}
                className="flex items-center transition-opacity hover:opacity-80"
              >
                <span className="font-bold text-2xl text-primary">
                  {t("brand.name")}
                </span>
                <span className="ml-2 text-muted-foreground text-sm">
                  {t("brand.tagline")}
                </span>
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {isHomePage ? (
                // Show section navigation on home page
                <>
                  {[
                    { href: "#solutions", label: t("links.solutions") },
                    { href: "#features", label: t("links.frameworks") },
                  ].map((link) => (
                    <Button
                      key={link.href}
                      variant="ghost"
                      onClick={() => handleNavClick(link.href)}
                    >
                      {link.label}
                    </Button>
                  ))}

                  {/* Locale Switcher */}
                  <LocaleToggle />

                  {renderAuthButton()}
                </>
              ) : (
                // Show different navigation for other pages
                <>
                  <Button variant="ghost" asChild>
                    <Link href={`/${locale}`}>{t("links.home")}</Link>
                  </Button>

                  {/* Locale Switcher */}
                  <LocaleToggle />

                  {renderAuthButton()}
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 border-border/50 border-t bg-background/90 px-2 pt-2 pb-3 backdrop-blur-md sm:px-3">
              {isHomePage ? (
                // Show section navigation on home page
                <>
                  {[
                    { href: "#solutions", label: t("links.solutions") },
                    { href: "#features", label: t("links.frameworks") },
                  ].map((link) => (
                    <Button
                      key={link.href}
                      variant="ghost"
                      onClick={() => handleNavClick(link.href)}
                      className="w-full justify-start"
                    >
                      {link.label}
                    </Button>
                  ))}

                  {/* Mobile Locale Switcher */}
                  <div className="pt-2">
                    <LocaleToggle variant="compact" />
                  </div>

                  {renderAuthButton(true)}
                </>
              ) : (
                // Show different navigation for other pages
                <>
                  <Button
                    variant="ghost"
                    asChild
                    className="w-full justify-start"
                  >
                    <Link
                      href={`/${locale}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t("links.home")}
                    </Link>
                  </Button>

                  {/* Mobile Locale Switcher */}
                  <div className="pt-2">
                    <LocaleToggle variant="compact" />
                  </div>

                  {renderAuthButton(true)}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
