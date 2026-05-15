import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";
import { ArrowLeft, Loader2, ReceiptText, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";

export const Route = createFileRoute("/app/$id/group/$groupId")({
	component: GroupRoute,
});

function GroupRoute() {
	const { id, groupId } = Route.useParams();
	const telegramChatId = Number(groupId);

	if (Number.isNaN(telegramChatId)) {
		return (
			<PageShell id={id}>
				<Empty text="Invalid Telegram group id." />
			</PageShell>
		);
	}

	return (
		<PageShell id={id}>
			<AuthLoading>
				<Loading />
			</AuthLoading>
			<Unauthenticated>
				<Empty text="Sign in from Telegram to view this group." />
			</Unauthenticated>
			<Authenticated>
				<GroupView telegramChatId={telegramChatId} />
			</Authenticated>
		</PageShell>
	);
}

function GroupView({ telegramChatId }: { telegramChatId: number }) {
	const group = useQuery(api.groups.getListOfExpenses, { telegramChatId });

	if (group === undefined) return <Loading />;
	if (group === null) return <Empty text="Group not found." />;

	return (
		<div className="space-y-6">
			<section className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
				<h1 className="text-2xl font-bold text-gray-950 dark:text-white">
					{group.title}
				</h1>
				<div className="mt-4 grid grid-cols-2 gap-3">
					<Stat
						icon={<Users className="h-4 w-4" />}
						label="Members"
						value={String(group.memberCount)}
					/>
					<Stat
						icon={<ReceiptText className="h-4 w-4" />}
						label="Expenses"
						value={String(group.expenses.length)}
					/>
				</div>
			</section>

			<section className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
				<h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
					Recent Expenses
				</h2>
				{group.expenses.length === 0 ? (
					<Empty text="No expenses yet." />
				) : (
					<div className="space-y-3">
						{group.expenses.map((expense) => (
							<article
								className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
								key={expense._id}
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="font-semibold text-gray-900 dark:text-white">
											Paid by {expense.payerName}
										</p>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											{new Date(expense._creationTime).toLocaleDateString()}
										</p>
									</div>
									<p className="font-bold text-blue-600 dark:text-blue-300">
										{formatCurrencyAmount(
											expense.items.reduce((sum, item) => sum + item.amount, 0),
											expense.currency,
										)}
									</p>
								</div>
								<ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
									{expense.items.map((item) => (
										<li
											className="flex justify-between"
											key={`${expense._id}-${item.name}`}
										>
											<span>{item.name}</span>
											<span>
												{formatCurrencyAmount(item.amount, expense.currency)}
											</span>
										</li>
									))}
								</ul>
							</article>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

function PageShell({
	children,
	id,
}: {
	children: React.ReactNode;
	id: string;
}) {
	return (
		<main className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 dark:from-gray-900 dark:to-gray-800">
			<div className="mx-auto max-w-2xl">
				<Link
					className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-300"
					params={{ id }}
					to="/app/$id"
				>
					<ArrowLeft className="h-4 w-4" /> Back to dashboard
				</Link>
				{children}
			</div>
		</main>
	);
}

function Stat({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
			<div className="mb-1 flex items-center gap-2 text-gray-500 dark:text-gray-400">
				{icon}
				<span className="text-sm">{label}</span>
			</div>
			<p className="text-2xl font-bold text-gray-950 dark:text-white">
				{value}
			</p>
		</div>
	);
}

function Loading() {
	return (
		<div className="flex min-h-[50vh] items-center justify-center">
			<Loader2 className="h-10 w-10 animate-spin text-blue-500" />
		</div>
	);
}

function Empty({ text }: { text: string }) {
	return (
		<p className="rounded-2xl bg-white p-6 text-center text-gray-600 shadow-lg dark:bg-gray-800 dark:text-gray-300">
			{text}
		</p>
	);
}

function formatCurrencyAmount(amount: number, currency: string) {
	return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
		amount,
	);
}
