import { mainButton } from "@tma.js/sdk";
import { useEffect, useState } from "react";

interface TelegramMainButtonProps {
	text: string;
	ready?: boolean;
	show?: boolean;
	once?: boolean;
	onClick: () => void | Promise<void>;
}

export function TelegramMainButton(props: TelegramMainButtonProps) {
	const [isPending, setIsPending] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!mainButton.isMounted()) {
			mainButton.mount();
		}

		const off = mainButton.onClick(async () => {
			if (isPending) return;
			setIsPending(true);
			try {
				await props.onClick();
			} finally {
				setIsPending(false);
			}
		}, props.once);

		return off;
	}, [isPending, props]);

	useEffect(() => {
		if (typeof window === "undefined" || !mainButton.isMounted()) return;
		const show = props.show ?? true;
		const ready = props.ready ?? true;

		mainButton.setParams({
			text: props.text,
			isVisible: show,
			isEnabled: show && ready && !isPending,
			isLoaderVisible: isPending,
			hasShineEffect: ready && !isPending,
		});
	}, [isPending, props.ready, props.show, props.text]);

	useEffect(
		() => () => {
			if (typeof window === "undefined" || !mainButton.isMounted()) return;
			mainButton.setParams({
				isVisible: false,
				isEnabled: false,
				isLoaderVisible: false,
				hasShineEffect: false,
			});
			mainButton.unmount();
		},
		[],
	);

	return null;
}
