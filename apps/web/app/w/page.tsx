"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaces } from "@/lib/actions/dal";

export default function Dashboard() {
  const { data, isPending, isError } = useQuery({
    queryFn: getWorkspaces,
    queryKey: ["workspaces"],
  });

  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen min-w-full items-center justify-center bg-foreground text-background">
      <Card>
        <CardHeader />
        <CardContent>
          <CardTitle>Page to list all the workspaces</CardTitle>
          <div className="mt-5">
            {data.map((workspaces) => (
              <div className="flex gap-4" key={workspaces.id}>
                <Link href={`/w/${workspaces.id}`}>- {workspaces.name}</Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
