import { EndpointLeftbar } from "@/components/layout/editor-shell/sidebar/endpoint-leftbar";
import { Footer } from "@/components/layout/footer";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SidebarProvider>
        <EndpointLeftbar />
        <main className="h-svh w-full border-border border-l-1">
          {children}
        </main>
        <Footer />
      </SidebarProvider>
    </div>
  );
}
