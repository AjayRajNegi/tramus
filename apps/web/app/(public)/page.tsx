export default function Home() {
  return (
    <div className="flex h-[75vh] flex-col items-end justify-center">
      <h1 className="relative text-6xl tracking-tight">
        <div className="absolute top-[60%] h-[20%] w-full -translate-y-1/2 bg-muted" />
        Tramus
      </h1>
      <h4 className="text-muted-foreground tracking-tighter">
        An effort to build something better.
      </h4>
    </div>
  );
}
