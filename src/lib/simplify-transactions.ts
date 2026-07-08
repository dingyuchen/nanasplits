export type SettlementBalance<UserId extends string = string> = {
	balance: number;
	memberId: UserId;
	memberName: string;
};

export type SimplifiableCurrencyBalances<UserId extends string = string> =
	Record<
		string,
		{
			memberBalances: Record<string, SettlementBalance<UserId>>;
		}
	>;

export type SimplifiedTransaction<UserId extends string = string> = {
	amount: number;
	currency: string;
	payerId: UserId;
	payerName: string;
	receiverId: UserId;
	receiverName: string;
};

type SettlementAccount<UserId extends string> = {
	balanceInCents: number;
	memberId: UserId;
	memberName: string;
};

const CENTS_PER_UNIT = 100;
const EXACT_SETTLEMENT_MEMBER_LIMIT = 12;

function toCents(amount: number) {
	return Math.round(amount * CENTS_PER_UNIT);
}

function fromCents(amount: number) {
	return amount / CENTS_PER_UNIT;
}

function byLargestAbsoluteBalance<UserId extends string>(
	left: SettlementAccount<UserId>,
	right: SettlementAccount<UserId>,
) {
	const balanceDifference =
		Math.abs(right.balanceInCents) - Math.abs(left.balanceInCents);
	if (balanceDifference !== 0) return balanceDifference;

	return left.memberName.localeCompare(right.memberName);
}

function createTransaction<UserId extends string>(
	accounts: Array<SettlementAccount<UserId>>,
	balances: number[],
	currency: string,
	firstIndex: number,
	secondIndex: number,
	amountInCents: number,
): SimplifiedTransaction<UserId> {
	const payer =
		balances[firstIndex] < 0 ? accounts[firstIndex] : accounts[secondIndex];
	const receiver =
		balances[firstIndex] > 0 ? accounts[firstIndex] : accounts[secondIndex];

	return {
		amount: fromCents(amountInCents),
		currency,
		payerId: payer.memberId,
		payerName: payer.memberName,
		receiverId: receiver.memberId,
		receiverName: receiver.memberName,
	};
}

function exactSimplifyTransactions<UserId extends string>(
	accounts: Array<SettlementAccount<UserId>>,
	currency: string,
): Array<SimplifiedTransaction<UserId>> {
	const search = (
		balances: number[],
		startIndex: number,
	): Array<SimplifiedTransaction<UserId>> => {
		let firstUnsettledIndex = startIndex;
		while (
			firstUnsettledIndex < balances.length &&
			balances[firstUnsettledIndex] === 0
		) {
			firstUnsettledIndex += 1;
		}

		if (firstUnsettledIndex === balances.length) return [];

		let bestTransactions: Array<SimplifiedTransaction<UserId>> | null = null;
		const triedCounterpartyBalances = new Set<number>();

		for (
			let counterpartyIndex = firstUnsettledIndex + 1;
			counterpartyIndex < balances.length;
			counterpartyIndex += 1
		) {
			const firstBalance = balances[firstUnsettledIndex];
			const counterpartyBalance = balances[counterpartyIndex];

			if (firstBalance * counterpartyBalance >= 0) continue;
			if (triedCounterpartyBalances.has(counterpartyBalance)) continue;

			triedCounterpartyBalances.add(counterpartyBalance);

			const amountInCents = Math.min(
				Math.abs(firstBalance),
				Math.abs(counterpartyBalance),
			);
			const nextBalances = [...balances];

			if (Math.abs(firstBalance) <= Math.abs(counterpartyBalance)) {
				nextBalances[counterpartyIndex] += firstBalance;
				nextBalances[firstUnsettledIndex] = 0;
			} else {
				nextBalances[firstUnsettledIndex] += counterpartyBalance;
				nextBalances[counterpartyIndex] = 0;
			}

			const transaction = createTransaction(
				accounts,
				balances,
				currency,
				firstUnsettledIndex,
				counterpartyIndex,
				amountInCents,
			);
			const candidateTransactions = [
				transaction,
				...search(nextBalances, firstUnsettledIndex),
			];

			if (
				bestTransactions === null ||
				candidateTransactions.length < bestTransactions.length
			) {
				bestTransactions = candidateTransactions;
			}

			if (counterpartyBalance + firstBalance === 0) break;
		}

		return bestTransactions ?? [];
	};

	return search(
		accounts.map((account) => account.balanceInCents),
		0,
	);
}

function greedySimplifyTransactions<UserId extends string>(
	accounts: Array<SettlementAccount<UserId>>,
	currency: string,
): Array<SimplifiedTransaction<UserId>> {
	const receivers = accounts
		.filter((account) => account.balanceInCents > 0)
		.sort(byLargestAbsoluteBalance);
	const payers = accounts
		.filter((account) => account.balanceInCents < 0)
		.sort(byLargestAbsoluteBalance);
	const transactions: Array<SimplifiedTransaction<UserId>> = [];
	let payerIndex = 0;
	let receiverIndex = 0;

	while (payerIndex < payers.length && receiverIndex < receivers.length) {
		const payer = payers[payerIndex];
		const receiver = receivers[receiverIndex];
		const amountInCents = Math.min(
			Math.abs(payer.balanceInCents),
			receiver.balanceInCents,
		);

		if (amountInCents > 0) {
			transactions.push({
				amount: fromCents(amountInCents),
				currency,
				payerId: payer.memberId,
				payerName: payer.memberName,
				receiverId: receiver.memberId,
				receiverName: receiver.memberName,
			});
		}

		payer.balanceInCents += amountInCents;
		receiver.balanceInCents -= amountInCents;

		if (payer.balanceInCents === 0) payerIndex += 1;
		if (receiver.balanceInCents === 0) receiverIndex += 1;
	}

	return transactions;
}

export function simplifyTransactionsForCurrency<UserId extends string>({
	balances,
	currency,
}: {
	balances: Array<SettlementBalance<UserId>>;
	currency: string;
}): Array<SimplifiedTransaction<UserId>> {
	const accounts = balances
		.map((balance) => ({
			balanceInCents: toCents(balance.balance),
			memberId: balance.memberId,
			memberName: balance.memberName,
		}))
		.filter((balance) => balance.balanceInCents !== 0)
		.sort(byLargestAbsoluteBalance);

	if (accounts.length <= 1) return [];

	const totalBalanceInCents = accounts.reduce(
		(total, account) => total + account.balanceInCents,
		0,
	);
	if (totalBalanceInCents !== 0) {
		const largestAccount = accounts[0];
		largestAccount.balanceInCents -= totalBalanceInCents;
	}

	return accounts.length <= EXACT_SETTLEMENT_MEMBER_LIMIT
		? exactSimplifyTransactions(accounts, currency)
		: greedySimplifyTransactions(
				accounts.map((account) => ({ ...account })),
				currency,
			);
}

export function simplifyTransactionsByCurrency<UserId extends string>(
	currencyBalances: SimplifiableCurrencyBalances<UserId>,
): Array<SimplifiedTransaction<UserId>> {
	return Object.entries(currencyBalances).flatMap(([currency, currencyData]) =>
		simplifyTransactionsForCurrency({
			balances: Object.values(currencyData.memberBalances),
			currency,
		}),
	);
}
