import {
	Users,
	Receipt,
	Zap,
	Shield,
	MessageSquare,
	ArrowRight,
	CheckCircle2,
	Coins,
	TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
	const features = [
		{
			icon: <Users className="w-10 h-10 text-blue-500" />,
			title: "Split with Friends",
			description:
				"Create groups and split expenses instantly. No more awkward conversations about who owes what.",
		},
		{
			icon: <Receipt className="w-10 h-10 text-green-500" />,
			title: "Track Everything",
			description:
				"Keep track of all your expenses, bills, and shared costs in one place. Perfect for roommates, trips, and group events.",
		},
		{
			icon: <Zap className="w-10 h-10 text-yellow-500" />,
			title: "Instant Settlements",
			description:
				"Automatically calculate who owes whom. Settle up with a single tap directly through Telegram.",
		},
		{
			icon: <Shield className="w-10 h-10 text-purple-500" />,
			title: "Secure & Private",
			description:
				"Your financial data stays private. Built with Telegram's security standards and encryption.",
		},
		{
			icon: <MessageSquare className="w-10 h-10 text-cyan-500" />,
			title: "Native Telegram Integration",
			description:
				"Works seamlessly within Telegram. Invite friends, share expenses, and chat—all in one place.",
		},
		{
			icon: <TrendingUp className="w-10 h-10 text-orange-500" />,
			title: "Smart Analytics",
			description:
				"View spending patterns, see who spends the most, and get insights into your group expenses.",
		},
	];

	const howItWorks = [
		{
			step: "1",
			title: "Create a Group",
			description:
				"Start a new group or use an existing Telegram group to track expenses together.",
			icon: <Users className="w-8 h-8" />,
		},
		{
			step: "2",
			title: "Add Expenses",
			description:
				"Add expenses quickly with photos, descriptions, and split them fairly among members.",
			icon: <Receipt className="w-8 h-8" />,
		},
		{
			step: "3",
			title: "Settle Up",
			description:
				"See who owes what and settle debts directly through Telegram. Simple and fast.",
			icon: <CheckCircle2 className="w-8 h-8" />,
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
			{/* Hero Section */}
			<section className="relative py-16 px-6 text-center overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-purple-500/5 dark:from-blue-500/10 dark:via-cyan-500/10 dark:to-purple-500/10"></div>
				<div className="relative max-w-4xl mx-auto">
					<div className="mb-8">
						<div className="inline-flex items-center justify-center mb-6">
							<div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl">
								<Coins className="w-12 h-12 md:w-14 md:h-14 text-white" />
							</div>
						</div>
						<h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-4 [letter-spacing:-0.03em]">
							<span className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
								NanaSplits
							</span>
						</h1>
						<p className="text-2xl md:text-3xl text-gray-700 dark:text-gray-300 mb-6 font-medium">
							Split expenses effortlessly
						</p>
						<p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
							The easiest way to split bills, track expenses, and settle up with
							friends—all native to Telegram. No app downloads, no sign-ups.
							Just open and split.
						</p>
					</div>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Button
							size="lg"
							className="px-8 py-6 text-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-105"
						>
							Get Started
							<ArrowRight className="ml-2 w-5 h-5" />
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="px-8 py-6 text-lg rounded-xl border-2 dark:border-gray-600"
						>
							Learn More
						</Button>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-16 px-6 max-w-7xl mx-auto">
				<div className="text-center mb-12">
					<h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
						Why NanaSplits?
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						Everything you need to split expenses with friends, built right into
						Telegram
					</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{features.map((feature, index) => (
						<div
							key={index}
							className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:-translate-y-1"
						>
							<div className="mb-4">{feature.icon}</div>
							<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
								{feature.title}
							</h3>
							<p className="text-gray-600 dark:text-gray-400 leading-relaxed">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</section>

			{/* How It Works Section */}
			<section className="py-16 px-6 bg-white dark:bg-gray-800/50">
				<div className="max-w-5xl mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
							How It Works
						</h2>
						<p className="text-lg text-gray-600 dark:text-gray-400">
							Three simple steps to start splitting expenses
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{howItWorks.map((item, index) => (
							<div key={index} className="relative text-center">
								<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl font-bold mb-4 shadow-lg">
									{item.step}
								</div>
								<div className="flex justify-center mb-4 text-blue-500 dark:text-blue-400">
									{item.icon}
								</div>
								<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
									{item.title}
								</h3>
								<p className="text-gray-600 dark:text-gray-400 leading-relaxed">
									{item.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600">
				<div className="max-w-4xl mx-auto text-center">
					<h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
						Ready to split expenses?
					</h2>
					<p className="text-xl text-blue-50 mb-8 max-w-2xl mx-auto">
						Start splitting bills with your friends today. No sign-up required,
						no hassle. Just open in Telegram and start tracking expenses.
					</p>
					<Button
						size="lg"
						className="px-10 py-6 text-lg bg-white text-blue-600 hover:bg-gray-100 font-semibold rounded-xl shadow-xl transition-all duration-300 hover:scale-105"
					>
						Open in Telegram
						<ArrowRight className="ml-2 w-5 h-5" />
					</Button>
				</div>
			</section>

			{/* Footer */}
			<footer className="py-8 px-6 border-t border-gray-200 dark:border-gray-700">
				<div className="max-w-7xl mx-auto text-center text-gray-600 dark:text-gray-400">
					<p>Built for Telegram • Made with ❤️</p>
				</div>
			</footer>
		</div>
	);
}
