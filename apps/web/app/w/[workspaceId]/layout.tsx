import { Sidebar } from "@/components/layout/sidebar/sidebar";
import { TobBar } from "@/components/layout/topbar/topbar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-4">
      <TobBar />
      <div className="mt-[60px] flex gap-2">
        <Sidebar />
        <div className="flex w-[80%] items-center justify-center rounded-xl bg-foreground text-background">
          {children}
        </div>
      </div>
    </div>
  );
}
