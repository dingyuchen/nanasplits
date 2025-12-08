"use client";

import { mainButton, themeParams } from "@tma.js/sdk-react";
import { useEffect, useRef, useTransition } from "react";

export default function MainButton({
  text,
  ready = true,
  onClick,
}: {
  text: string;
  ready?: boolean;
  onClick: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const button = mainButton;

  useEffect(() => {
    if (!button.isMounted()) {
      button.mount();
    }
    const off = button.onClick(() => {
      startTransition(onClick);
    }, true);
    return off;
  }, [onClick, button]);

  useEffect(() => {
    if (!button.isMounted()) {
      button.mount();
    }
    if (ready) {
      button.enable();
      button.enableShineEffect();
    } else {
      button.disable();
      button.disableShineEffect();
    }
  }, [button, ready]);

  useEffect(() => {
    if (isPending) {
      button.showLoader();
    } else {
      button.hideLoader();
    }
  }, [button, isPending]);

  useEffect(() => {
    if (!button.isMounted()) {
      button.mount();
    }

    button.setParams({
      text,
    });
    button.show();
    return () => {
      button.disable();
      button.hide();
      button.hideLoader();
      button.unmount();
    };
  }, [button, text]);
  return null;
}
