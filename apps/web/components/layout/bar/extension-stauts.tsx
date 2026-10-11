"use client";

import { useEffect, useState } from "react";
import { type ExtensionStatus, isExtensionInstalled } from "@/lib/extension";

export function ExtensionStatusIndicator() {
  const [status, setStatus] = useState<ExtensionStatus | "checking">(
    "checking",
  );

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const result = await isExtensionInstalled();
      if (!cancelled) setStatus(result);
    };

    check();
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", check);
    };
  }, []);

  if (status === "checking") {
    return <span className="text-gray-500 text-sm">Checking extension…</span>;
  }

  return status.installed ? (
    <span className="flex items-center gap-2 text-green-600 text-sm">
      <span className="size-2 rounded-full bg-green-500" />
      Connected (v{status.version})
    </span>
  ) : (
    <span className="flex items-center gap-2 text-red-600 text-sm">
      <span className="size-2 rounded-full bg-red-500" />
      Not installed
    </span>
  );
}
