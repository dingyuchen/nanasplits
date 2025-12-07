"use client";

import { mainButton, themeParams } from "@tma.js/sdk-react";
import { useEffect, useRef, useTransition } from "react";

export default function MainButton({
  text,
  onClick,
}: {
  text: string;
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
    return () => {
      console.log("removing listener");
      off();
    };
  }, [onClick, button]);

  useEffect(() => {
    if (!button.isMounted()) {
      button.mount();
    }

    button.setParams({
      text,
    });
    button.enable();
    button.enableShineEffect();
    if (isPending) {
      button.showLoader();
    }
    button.show();
    return () => {
      button.disable();
      button.hide();
      button.hideLoader();
      console.log("unmounting button");
      button.unmount();
    };
  }, [button, isPending, text]);
  return null;
}
