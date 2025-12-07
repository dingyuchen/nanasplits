import BackButton from "./back-button";

export default function TelegramAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Show loading state while checking environment

  return <>{children}</>;
}
