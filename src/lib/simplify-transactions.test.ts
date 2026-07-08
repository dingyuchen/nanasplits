import { describe, expect, it } from "vitest";

import {
	simplifyTransactionsByCurrency,
	simplifyTransactionsForCurrency,
} from "./simplify-transactions";

describe("simplifyTransactionsForCurrency", () => {
	it("creates payer-to-receiver transactions from net member balances", () => {
		const transactions = simplifyTransactionsForCurrency({
			balances: [
				{ balance: 10, memberId: "u1", memberName: "Ada" },
				{ balance: 5, memberId: "u2", memberName: "Ben" },
				{ balance: -7, memberId: "u3", memberName: "Cal" },
				{ balance: -8, memberId: "u4", memberName: "Dee" },
			],
			currency: "USD",
		});

		expect(transactions).toEqual([
			{
				amount: 8,
				currency: "USD",
				payerId: "u4",
				payerName: "Dee",
				receiverId: "u1",
				receiverName: "Ada",
			},
			{
				amount: 2,
				currency: "USD",
				payerId: "u3",
				payerName: "Cal",
				receiverId: "u1",
				receiverName: "Ada",
			},
			{
				amount: 5,
				currency: "USD",
				payerId: "u3",
				payerName: "Cal",
				receiverId: "u2",
				receiverName: "Ben",
			},
		]);
	});

	it("uses exact matching for small groups to avoid unnecessary transactions", () => {
		const transactions = simplifyTransactionsForCurrency({
			balances: [
				{ balance: 8, memberId: "u1", memberName: "Ada" },
				{ balance: 7, memberId: "u2", memberName: "Ben" },
				{ balance: -8, memberId: "u3", memberName: "Cal" },
				{ balance: -7, memberId: "u4", memberName: "Dee" },
			],
			currency: "USD",
		});

		expect(transactions).toHaveLength(2);
		expect(transactions).toEqual([
			{
				amount: 8,
				currency: "USD",
				payerId: "u3",
				payerName: "Cal",
				receiverId: "u1",
				receiverName: "Ada",
			},
			{
				amount: 7,
				currency: "USD",
				payerId: "u4",
				payerName: "Dee",
				receiverId: "u2",
				receiverName: "Ben",
			},
		]);
	});
});

describe("simplifyTransactionsByCurrency", () => {
	it("keeps currencies separate", () => {
		const transactions = simplifyTransactionsByCurrency({
			EUR: {
				memberBalances: {
					u1: { balance: 12, memberId: "u1", memberName: "Ada" },
					u2: { balance: -12, memberId: "u2", memberName: "Ben" },
				},
			},
			USD: {
				memberBalances: {
					u1: { balance: -4, memberId: "u1", memberName: "Ada" },
					u3: { balance: 4, memberId: "u3", memberName: "Cal" },
				},
			},
		});

		expect(transactions).toEqual([
			{
				amount: 12,
				currency: "EUR",
				payerId: "u2",
				payerName: "Ben",
				receiverId: "u1",
				receiverName: "Ada",
			},
			{
				amount: 4,
				currency: "USD",
				payerId: "u1",
				payerName: "Ada",
				receiverId: "u3",
				receiverName: "Cal",
			},
		]);
	});
});
