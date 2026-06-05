import { cn } from "@/lib/utils";

type NotFoundProps = {
	className?: string;
	fullScreen?: boolean;
	text: string;
	title?: string;
};

export default function NotFound({
	className,
	fullScreen = true,
	text,
	title = "Not found",
}: NotFoundProps) {
	const content = (
		<div className="rounded-sm border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
			<h1 className="mb-2 font-semibold text-gray-900 text-lg dark:text-white">
				{title}
			</h1>
			<p className="text-gray-600 text-sm dark:text-gray-400">{text}</p>
		</div>
	);

	if (!fullScreen) {
		return <div className={className}>{content}</div>;
	}

	return (
		<div
			className={cn(
				"flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-gray-950",
				className,
			)}
		>
			{content}
		</div>
	);
}
