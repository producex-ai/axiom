"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Show loader when navigation starts
    setIsNavigating(true);

    // Hide loader after a short delay (allows page to render)
    const timeout = setTimeout(() => {
      setIsNavigating(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  if (!isNavigating) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-primary"
      style={{
        animation: "progress 300ms ease-out",
      }}
    >
      <style jsx>{`
        @keyframes progress {
          0% {
            width: 0%;
            opacity: 1;
          }
          50% {
            width: 50%;
            opacity: 1;
          }
          100% {
            width: 100%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
