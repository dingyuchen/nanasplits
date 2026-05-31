import { currencies } from "#/currencies";

type MemberBalanceLike<UserId extends string> = {
	balance: number;
	memberId: UserId;
	memberName: string;
};

type CurrencyBalancesLike<UserId extends string> = Record<
	string,
	{
		memberBalances: Record<string, MemberBalanceLike<UserId>>;
		netBalance: number;
	}
>;

export type SettleUpConversionOption<UserId extends string = string> = {
	amount: number;
	counterpartyId: UserId;
	counterpartyName: string;
	currency: string;
	payerId: UserId;
	receiverId: UserId;
	settlementId: string;
};

function roundMoney(amount: number) {
	return Math.round(amount * 100) / 100;
}

export function buildSettleUpConversionOptions<UserId extends string>({
	currencyBalances,
	currentUserId,
}: {
	currencyBalances: CurrencyBalancesLike<UserId>;
	currentUserId: UserId;
}): Array<SettleUpConversionOption<UserId>> {
	return Object.entries(currencyBalances).flatMap(([currency, currencyData]) =>
		Object.entries(currencyData.memberBalances)
			.map(([memberId, member]) => {
				const amount = roundMoney(Math.abs(member.balance));
				if (amount <= 0) return null;

				return {
					amount,
					counterpartyId: member.memberId,
					counterpartyName: member.memberName,
					currency,
					payerId: (member.balance > 0 ? memberId : currentUserId) as UserId,
					receiverId: (member.balance > 0 ? currentUserId : memberId) as UserId,
					settlementId: `${currency}:${memberId}`,
				};
			})
			.filter(
				(option): option is SettleUpConversionOption<UserId> => option !== null,
			),
	);
}

export function filteredCurrencyCodes(sourceCurrency: string) {
	const normalizedSourceCurrency = sourceCurrency.toUpperCase();
	return Object.keys(currencies).filter(
		(currency) => currency !== normalizedSourceCurrency,
	);
}
