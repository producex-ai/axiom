"use client";

import { Globe } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LocaleToggleProps {
  variant?: "default" | "compact";
  className?: string;
}

export function LocaleToggle({
  variant = "default",
  className,
}: LocaleToggleProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = params.locale as string;

  // Available locales
  const locales = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇲🇽" },
  ];

  const handleLocaleChange = (newLocale: string) => {
    const currentPath = pathname.replace(`/${locale}`, "");
    router.push(`/${newLocale}${currentPath}`);
  };

  const triggerClassName =
    variant === "compact" ? "h-8 w-full text-xs" : "h-9 w-[140px]";

  return (
    <Select value={locale} onValueChange={handleLocaleChange}>
      <SelectTrigger className={`${triggerClassName} ${className || ""}`}>
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc.code} value={loc.code}>
            <div className="flex items-center space-x-2">
              <span>{loc.flag}</span>
              <span>{loc.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
