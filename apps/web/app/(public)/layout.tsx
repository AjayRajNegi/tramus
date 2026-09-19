import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen min-w-full bg-foreground text-background">
      <Header />
      <main className="mx-auto mt-[70px] max-w-7xl">{children}</main>
      <Footer />
    </div>
  );
}
