export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* <SidebarProvider>
        <EndpointLeftbar /> */}
      {/* <main className="h-svh w-full border-accent/40 border-l-1"> */}
      {children}
      {/* </main> */}
      {/* <Footer />
      </SidebarProvider> */}
    </div>
  );
}
