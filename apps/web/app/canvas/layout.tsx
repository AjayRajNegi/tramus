import { TopBar } from "@/components/layout/bar/topbar";

export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden">
      <TopBar />
      {children}
    </main>
  );
}
