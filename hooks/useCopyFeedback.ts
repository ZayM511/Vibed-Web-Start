"use client";

import { useState, useCallback } from "react";

export function useCopyFeedback() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const copyImage = useCallback(async (key: string, url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey("error");
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }, []);

  return { copiedKey, copyText, copyImage };
}
