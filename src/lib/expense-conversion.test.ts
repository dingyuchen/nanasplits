import { describe, expect, it } from "vitest";

import {
	buildSettleUpConversionOptions,
	filteredCurrencyCodes,
} from "./expense-conversion";

describe("buildSettleUpConversionOptions", () => {
	it("uses unsettled settle-up balances as conversion options", () => {
		const options = buildSettleUpConversionOptions({
			currencyBalances: {
				EUR: {
					memberBalances: {
						u2: { balance: -18, memberId: "u2", memberName: "Nana" },
					},
					netBalance: -18,
				},
				USD: {
					memberBalances: {
						u2: { balance: 35, memberId: "u2", memberName: "Nana" },
						u3: { balance: 0, memberId: "u3", memberName: "Pat" },
					},
					netBalance: 35,
				},
			},
			currentUserId: "u1",
		});

		expect(options).toMatchObject([
			{
				amount: 18,
				counterpartyId: "u2",
				counterpartyName: "Nana",
				currency: "EUR",
				payerId: "u1",
				receiverId: "u2",
				settlementId: "EUR:u2",
			},
			{
				amount: 35,
				counterpartyId: "u2",
				counterpartyName: "Nana",
				currency: "USD",
				payerId: "u2",
				receiverId: "u1",
				settlementId: "USD:u2",
			},
		]);
	});
});

describe("filteredCurrencyCodes", () => {
	it("removes the source currency from the selector choices", () => {
		expect(filteredCurrencyCodes("usd")).not.toContain("USD");
	});
});
