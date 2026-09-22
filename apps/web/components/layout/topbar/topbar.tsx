"use client";

import Link from "next/link";

export function TobBar() {
  return (
    <nav className="fixed top-0 left-1/2 mt-4 flex h-[50px] w-[80%] -translate-x-1/2 items-center justify-end rounded-xl bg-foreground text-background">
      <Link className="mr-5 underline underline-offset-2" href="/w">
        Tobbar
      </Link>
      <div>
        <Link className="mr-5 underline underline-offset-2" href="/w">
          checkout-flow
        </Link>
        <Link className="mr-5 underline underline-offset-2" href="/w">
          main
        </Link>
        <Link className="mr-5 underline underline-offset-2" href="/w">
          user-service
        </Link>
      </div>
      <div>
        <Link className="mr-5 underline underline-offset-2" href="/w">
          Fork Scenario
        </Link>
        <Link className="mr-5 underline underline-offset-2" href="/w">
          Share
        </Link>
        <Link className="mr-5 underline underline-offset-2" href="/w">
          New endpoint
        </Link>
      </div>
    </nav>
  );
}
