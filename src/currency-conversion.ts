import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const conversionInput = z.object({
	amount: z.number().positive(),
	fromCurrency: z.string().length(3),
	toCurrency: z.string().length(3),
});

type FrankfurterRateResponse = {
	date?: unknown;
	message?: unknown;
	rate?: unknown;
};

function normalizeCurrencyCode(currency: string) {
	return currency.trim().toUpperCase();
}

function roundMoney(amount: number) {
	return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export const getCurrencyConversion = createServerFn({ method: "GET" })
	.inputValidator(conversionInput)
	.handler(async ({ data }) => {
		const fromCurrency = normalizeCurrencyCode(data.fromCurrency);
		const toCurrency = normalizeCurrencyCode(data.toCurrency);

		if (fromCurrency === toCurrency) {
			throw new Error("Choose a different currency to convert to");
		}

		const response = await fetch(
			`https://api.frankfurter.dev/v2/rate/${encodeURIComponent(
				fromCurrency,
			)}/${encodeURIComponent(toCurrency)}`,
		);

		if (!response.ok) {
			let message = "Failed to fetch exchange rate";
			try {
				const body = (await response.json()) as FrankfurterRateResponse;
				if (typeof body.message === "string") {
					message = body.message;
				}
			} catch {
				// Keep the generic error when Frankfurter doesn't return JSON.
			}
			throw new Error(message);
		}

		const rateData = (await response.json()) as FrankfurterRateResponse;
		if (
			typeof rateData.rate !== "number" ||
			!Number.isFinite(rateData.rate) ||
			rateData.rate <= 0
		) {
			throw new Error("Frankfurter returned an invalid exchange rate");
		}

		return {
			amount: roundMoney(data.amount),
			convertedAmount: roundMoney(data.amount * rateData.rate),
			fromCurrency,
			rate: rateData.rate,
			rateDate: typeof rateData.date === "string" ? rateData.date : null,
			toCurrency,
		};
	});
