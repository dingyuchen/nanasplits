import { mainButton } from "@tma.js/sdk";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { isServer } from "solid-js/web";

interface TelegramMainButtonProps {
	text: string;
	ready?: boolean;
	show?: boolean;
	once?: boolean;
	onClick: () => void | Promise<void>;
}

export function TelegramMainButton(props: TelegramMainButtonProps) {
	const [isPending, setIsPending] = createSignal(false);

	onMount(() => {
		if (isServer) return;
		if (!mainButton.isMounted()) {
			mainButton.mount();
		}

		const off = mainButton.onClick(async () => {
			if (isPending()) return;
			setIsPending(true);
			try {
				await props.onClick();
			} finally {
				setIsPending(false);
			}
		}, props.once);

		onCleanup(off);
	});

	createEffect(() => {
		if (isServer || !mainButton.isMounted()) return;
		const show = props.show ?? true;
		const ready = props.ready ?? true;
		const pending = isPending();

		mainButton.setParams({
			text: props.text,
			isVisible: show,
			isEnabled: show && ready && !pending,
			isLoaderVisible: pending,
			hasShineEffect: ready && !pending,
		});
	});

	onCleanup(() => {
		if (isServer || !mainButton.isMounted()) return;
		mainButton.setParams({
			isVisible: false,
			isEnabled: false,
			isLoaderVisible: false,
			hasShineEffect: false,
		});
		mainButton.unmount();
	});

	return null;
}
