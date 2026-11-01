import { Sidebar, SidebarContent } from "@/components/ui/sidebar";

export function EndpointRightbar() {
  return (
    <Sidebar
      className="h-[calc(100svh-40px)]"
      collapsible="offcanvas"
      side="right"
    >
      <SidebarContent>{/* ... */}</SidebarContent>
    </Sidebar>
  );
}
