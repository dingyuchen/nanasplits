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
		<div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
			<h1 className="font-serif font-medium tracking-tight mb-2 text-stone-900 text-2xl">
				{title}
			</h1>
			<p className="text-stone-500 text-sm">{text}</p>
		</div>
	);

	if (!fullScreen) {
		return <div className={className}>{content}</div>;
	}

	return (
		<div
			className={cn(
				"flex min-h-screen items-center justify-center bg-stone-50 p-6",
				className,
			)}
		>
			{content}
		</div>
	);
}
