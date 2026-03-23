"use client";

import { useState, useEffect } from "react";

export interface Attribution {
  source: string | null;
  variant: string | null;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function useAttribution(): Attribution {
  const [attribution, setAttribution] = useState<Attribution>({
    source: null,
    variant: null,
  });

  useEffect(() => {
    setAttribution({
      source: getCookie("icmb_source"),
      variant: getCookie("icmb_variant"),
    });
  }, []);

  return attribution;
}
