"use client";

import { mainButton } from "@tma.js/sdk-react";
import { useEffect, useRef, useTransition } from "react";

export default function MainButton({
  text,
  ready = true,
  once = false,
  onClick,
}: {
  text: string;
  ready?: boolean;
  once?: boolean;
  onClick: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const button = mainButton;

  useEffect(() => {
    if (!button.isMounted()) {
      button.mount();
    }
    const off = button.onClick(() => {
      if (!isPending) {
        startTransition(onClick);
      }
    }, once);
    return off;
  }, [onClick, button, once, isPending]);

  // shutdown hook
  useEffect(() => {
    if (!button.isMounted()) {
      button.mount();
    }

    button.setParams({
      text,
      isVisible: ready,
      isEnabled: ready && !isPending,
      isLoaderVisible: isPending,
      hasShineEffect: ready && !isPending,
    });
    return () => {
      button.setParams({
        isVisible: false,
        isEnabled: false,
        isLoaderVisible: false,
        hasShineEffect: false,
      });
      button.unmount();
    };
  }, [button, text, ready, isPending]);
  return (
    <button type="submit" formAction={onClick} className="hidden" disabled>
      {text}
    </button>
  );
}
