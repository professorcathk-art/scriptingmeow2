"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * When user lands on library after signup with a pending "save style",
 * call the API to save and clear sessionStorage.
 */
export function SaveStyleOnLoad() {
  const router = useRouter();

  useEffect(() => {
    const imageUrl = sessionStorage.getItem("saveStyle_imageUrl");
    if (!imageUrl) return;

    sessionStorage.removeItem("saveStyle_imageUrl");
    sessionStorage.removeItem("saveStyle_redirect");

    fetch("/api/library/save-style", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    })
      .then((res) => {
        if (res.ok) router.refresh();
      })
      .catch(() => {});
  }, [router]);

  return null;
}
