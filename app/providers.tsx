"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Create client only if URL is available
// This allows the app to build even without the env variable set
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  // If no Convex URL is configured, render children without provider
  // This allows the app to build and run, but Convex features won't work
  if (!convex) {
    if (typeof window !== "undefined") {
      console.warn(
        "Convex is not configured. Please set NEXT_PUBLIC_CONVEX_URL in your .env.local file."
      );
    }
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

