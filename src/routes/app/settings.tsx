import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import {
	ArrowLeft,
	Check,
	CreditCard,
	Globe,
	Plus,
	Trash2,
} from "lucide-react";
import { useState } from "react";

import { TelegramMainButton } from "#/components/telegram-main-button";
import Loading from "#/components/ui/loading";
import { useQuery } from "#/convex-react";
import { currencySigns } from "#/currencies";
import { api } from "@/convex/_generated/api";
import { PaymentType } from "@/convex/schema";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({
	loader: ({ context }) => {
		void context.queryClient.prefetchQuery(
			convexQuery(api.groups.getAccountSettings, {}),
		);
	},
	component: AccountSettingsRoute,
});

type SettingsData = FunctionReturnType<typeof api.groups.getAccountSettings>;
type SavedPaymentMethod = SettingsData["paymentMethods"][number];
type DraftPaymentMethod = SavedPaymentMethod & { localId: string };

function AccountSettingsRoute() {
	const { data, isPending } = useQuery(api.groups.getAccountSettings, {});

	if (isPending || !data) {
		return <Loading message="Getting your settings..." />;
	}

	return <AccountSettings settings={data} />;
}

function AccountSettings(props: { settings: SettingsData }) {
	const { mutateAsync: updateAccountSettings } = useMutation({
		mutationFn: useConvexMutation(api.groups.updateAccountSettings),
	});
	const [savedSettings, setSavedSettings] = useState(props.settings);
	const [selectedCurrency, setSelectedCurrency] = useState(
		props.settings.defaultCurrency,
	);
	const [paymentMethods, setPaymentMethods] = useState<DraftPaymentMethod[]>(
		() => withLocalIds(props.settings.paymentMethods),
	);
	const [isSaving, setIsSaving] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);

	const paymentMethodPayload = paymentMethods.map(toSavedPaymentMethod);
	const hasChanges =
		selectedCurrency !== savedSettings.defaultCurrency ||
		JSON.stringify(paymentMethodPayload) !==
			JSON.stringify(savedSettings.paymentMethods);
	const isFormValid = paymentMethodPayload.every(isPaymentMethodComplete);
	const canSave = hasChanges && isFormValid && !isSaving;

	const addPaymentMethod = () => {
		setPaymentMethods((current) => [
			...current,
			{
				localId: createLocalId(current.length),
				name: "",
				token: "",
				type: PaymentType.Zelle,
			},
		]);
	};

	const updatePaymentMethod = (updatedMethod: DraftPaymentMethod) => {
		setPaymentMethods((current) =>
			current.map((method) =>
				method.localId === updatedMethod.localId ? updatedMethod : method,
			),
		);
	};

	const removePaymentMethod = (localId: string) => {
		setPaymentMethods((current) =>
			current.filter((method) => method.localId !== localId),
		);
	};

	const handleSave = async () => {
		if (!canSave) return;

		setIsSaving(true);
		try {
			const updatedSettings = await updateAccountSettings({
				defaultCurrency: selectedCurrency,
				paymentMethods: paymentMethodPayload,
			});
			setSavedSettings(updatedSettings);
			setSelectedCurrency(updatedSettings.defaultCurrency);
			setPaymentMethods(withLocalIds(updatedSettings.paymentMethods));
			setShowSuccess(true);
			window.setTimeout(() => setShowSuccess(false), 2000);
		} catch (error) {
			console.error("Failed to save account settings:", error);
			alert("Failed to save settings. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-stone-50 pb-20 text-stone-900">
			<div className="mx-auto my-8 max-w-[430px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm max-[480px]:my-0 max-[480px]:min-h-screen max-[480px]:rounded-none max-[480px]:border-0">
				<header className="border-stone-100 border-b px-5 py-4">
					<div className="flex items-center gap-3">
						<Link
							aria-label="Back to dashboard"
							className="flex h-8 w-8 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100"
							to="/app"
						>
							<ArrowLeft className="h-5 w-5" />
						</Link>
						<h1 className="font-serif font-medium tracking-tight text-stone-900 text-2xl">
							Settings
						</h1>
					</div>
				</header>

				<div className="space-y-6 p-5">
					<section className="border-stone-100 border-b pb-6">
						<div className="mb-4 flex items-center gap-3">
							<div className="rounded-lg bg-sky-50 p-2 text-sky-500">
								<Globe className="h-5 w-5" />
							</div>
							<div>
								<h2 className="font-serif font-medium tracking-tight text-stone-900 text-xl">
									Default currency
								</h2>
								<p className="text-stone-500 text-sm">Dashboard estimates</p>
							</div>
						</div>

						<div className="relative">
							<select
								className="w-full cursor-pointer appearance-none rounded-xl border border-stone-200 bg-white px-3 py-3 text-stone-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
								value={selectedCurrency}
								onChange={(event) =>
									setSelectedCurrency(event.currentTarget.value)
								}
							>
								{Object.entries(currencySigns).map(([code, sign]) => (
									<option key={code} value={code}>
										{code} ({sign})
									</option>
								))}
							</select>
							<div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
								<span className="text-2xl text-stone-400">
									{currencySigns[selectedCurrency] || "$"}
								</span>
							</div>
						</div>
					</section>

					<section>
						<div className="mb-4 flex items-center justify-between gap-3">
							<div className="flex min-w-0 items-center gap-3">
								<div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
									<CreditCard className="h-5 w-5" />
								</div>
								<div className="min-w-0">
									<h2 className="font-serif font-medium tracking-tight text-stone-900 text-xl">
										Payment methods
									</h2>
									<p className="text-stone-500 text-sm">
										{paymentMethods.length} saved
									</p>
								</div>
							</div>
							<button
								aria-label="Add payment method"
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white transition hover:bg-stone-700"
								type="button"
								onClick={addPaymentMethod}
							>
								<Plus className="h-4 w-4" />
							</button>
						</div>

						{paymentMethods.length === 0 ? (
							<div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 py-8 text-center">
								<p className="text-stone-500 text-sm">No payment methods</p>
							</div>
						) : (
							<div className="space-y-3">
								{paymentMethods.map((method) => (
									<PaymentMethodEditor
										key={method.localId}
										method={method}
										onChange={updatePaymentMethod}
										onRemove={() => removePaymentMethod(method.localId)}
									/>
								))}
							</div>
						)}

						{hasChanges && !isFormValid ? (
							<p className="mt-3 text-red-600 text-sm">
								Complete all payment method fields before saving.
							</p>
						) : null}
					</section>
				</div>
			</div>

			{hasChanges ? (
				<TelegramMainButton
					ready={canSave}
					show={!showSuccess}
					text={isSaving ? "Saving..." : "Save Settings"}
					onClick={handleSave}
				/>
			) : null}

			{showSuccess ? (
				<div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-lg">
					<Check className="h-4 w-4" />
					<span className="text-sm font-medium">Settings saved!</span>
				</div>
			) : null}
		</div>
	);
}

function PaymentMethodEditor(props: {
	method: DraftPaymentMethod;
	onChange: (method: DraftPaymentMethod) => void;
	onRemove: () => void;
}) {
	return (
		<div className="rounded-xl border border-stone-200 bg-white p-3">
			<div className="mb-3 flex items-center gap-2">
				<div
					aria-label="Payment method type"
					className="grid flex-1 grid-cols-2 rounded-full bg-stone-100 p-1"
					role="tablist"
				>
					<PaymentTypeButton
						isActive={props.method.type === PaymentType.Zelle}
						label="Zelle"
						onClick={() =>
							props.onChange({
								localId: props.method.localId,
								name:
									props.method.type === PaymentType.Zelle
										? props.method.name
										: "",
								token:
									props.method.type === PaymentType.Zelle
										? props.method.token
										: "",
								type: PaymentType.Zelle,
							})
						}
					/>
					<PaymentTypeButton
						isActive={props.method.type === PaymentType.PayNow}
						label="PayNow"
						onClick={() =>
							props.onChange({
								localId: props.method.localId,
								phoneNumber:
									props.method.type === PaymentType.PayNow
										? props.method.phoneNumber
										: "",
								type: PaymentType.PayNow,
							})
						}
					/>
				</div>
				<button
					aria-label="Remove payment method"
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600"
					type="button"
					onClick={props.onRemove}
				>
					<Trash2 className="h-4 w-4" />
				</button>
			</div>

			{props.method.type === PaymentType.Zelle ? (
				<div className="grid gap-3">
					<label className="grid gap-1.5">
						<span className="font-medium text-stone-500 text-sm">
							Account name
						</span>
						<input
							className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-stone-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
							type="text"
							value={props.method.name}
							onChange={(event) => {
								if (props.method.type !== PaymentType.Zelle) return;
								props.onChange({
									localId: props.method.localId,
									name: event.currentTarget.value,
									token: props.method.token,
									type: PaymentType.Zelle,
								});
							}}
						/>
					</label>
					<label className="grid gap-1.5">
						<span className="font-medium text-stone-500 text-sm">
							Zelle handle
						</span>
						<input
							className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-stone-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
							type="text"
							value={props.method.token}
							onChange={(event) => {
								if (props.method.type !== PaymentType.Zelle) return;
								props.onChange({
									localId: props.method.localId,
									name: props.method.name,
									token: event.currentTarget.value,
									type: PaymentType.Zelle,
								});
							}}
						/>
					</label>
				</div>
			) : (
				<label className="grid gap-1.5">
					<span className="font-medium text-stone-500 text-sm">
						PayNow phone
					</span>
					<input
						className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-stone-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
						inputMode="tel"
						type="tel"
						value={props.method.phoneNumber}
						onChange={(event) => {
							if (props.method.type !== PaymentType.PayNow) return;
							props.onChange({
								localId: props.method.localId,
								phoneNumber: event.currentTarget.value,
								type: PaymentType.PayNow,
							});
						}}
					/>
				</label>
			)}
		</div>
	);
}

function PaymentTypeButton(props: {
	isActive: boolean;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			aria-selected={props.isActive}
			className={cn(
				"min-h-9 rounded-full px-3 font-semibold text-sm transition",
				props.isActive
					? "bg-cyan-400 text-stone-950 shadow-sm ring-2 ring-white"
					: "text-stone-400 hover:text-stone-600",
			)}
			role="tab"
			type="button"
			onClick={props.onClick}
		>
			{props.label}
		</button>
	);
}

function withLocalIds(paymentMethods: SavedPaymentMethod[]) {
	return paymentMethods.map((method, index) => ({
		...method,
		localId: createLocalId(index),
	}));
}

function createLocalId(index: number) {
	return `payment-method-${index}-${Date.now()}`;
}

function toSavedPaymentMethod(method: DraftPaymentMethod): SavedPaymentMethod {
	if (method.type === PaymentType.PayNow) {
		return {
			phoneNumber: method.phoneNumber.trim(),
			type: PaymentType.PayNow,
		};
	}

	return {
		name: method.name.trim(),
		token: method.token.trim(),
		type: PaymentType.Zelle,
	};
}

function isPaymentMethodComplete(method: SavedPaymentMethod) {
	if (method.type === PaymentType.PayNow) {
		return method.phoneNumber.length > 0;
	}

	return method.name.length > 0 && method.token.length > 0;
}
