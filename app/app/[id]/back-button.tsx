"use client";

import { backButton } from "@tma.js/sdk-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BackButton() {
  const router = useRouter();
  if (backButton.isSupported()) {
    backButton.onClick(() => router.back());
  }
  backButton.show();

  useEffect(() => {
    return () => {
      backButton.hide();
    };
  }, []);
  return null;
}
