"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { AlertCircle, ArrowRight, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ForkScenarioButton } from "@/components/layout/bar/forkscenariobutton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getScenarios } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

const METHOD_STYLES: Record<string, string> = {
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
  GET: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PATCH: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  POST: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PUT: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

const MAX_PREVIEW = 3;

export default function Workspace() {
  const params = useParams<{
    workspaceId: string;
    scenarioId: string;
    endpointId: string;
  }>();

  const { data, isPending, isError } = useQuery({
    queryFn: () => getScenarios(params.workspaceId),
    queryKey: queryKeys.workspaces.scenarios(params.workspaceId),
    staleTime: 2 * 60 * 1000,
  });

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error...</p>;

  return (
    <div className="mx-auto w-full space-y-6 p-4">
      <div className="space-y-1">
        <h1 className="font-semibold text-xl uppercase tracking-tight">
          Scenarios
        </h1>
        <p className="text-muted-foreground text-xs">
          Pick a scenario to start working with its endpoints.
        </p>
      </div>

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton className="h-40 rounded-xl" key={i} />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            We couldn&apos;t load the scenarios for this workspace. Please try
            again.
          </AlertDescription>
        </Alert>
      )}

      {data && data.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <FolderOpen className="size-8 text-muted-foreground" />
          <p className="font-medium">No scenarios yet</p>
          <p className="text-muted-foreground text-sm">
            Create a scenario to see it here.
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((scenario) => {
            const firstEndpoint = scenario.endpoints[0];
            const href = firstEndpoint
              ? `/w/${params.workspaceId}/${scenario.id}/${firstEndpoint.id}`
              : `/w/${params.workspaceId}/${scenario.id}`;

            const preview = scenario.endpoints.slice(0, MAX_PREVIEW);
            const remaining = scenario._count.endpoints - preview.length;

            return (
              <Card
                className="group relative h-full min-w-fit transition-colors hover:border-primary/50 hover:bg-accent/40 xl:min-w-sm"
                key={scenario.id}
              >
                <CardHeader>
                  <CardTitle className="truncate">{scenario.name}</CardTitle>
                  <CardDescription className="-mt-1">
                    {scenario._count.endpoints}{" "}
                    {scenario._count.endpoints === 1 ? "endpoint" : "endpoints"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2">
                  {preview.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      No endpoints yet
                    </p>
                  )}
                  {preview.map((endpoint) => (
                    <div
                      className="flex items-center gap-2 text-sm"
                      key={endpoint.id}
                    >
                      <Badge
                        className={cn(
                          "w-16 justify-center font-mono text-[10px]",
                          METHOD_STYLES[endpoint.method],
                        )}
                        variant="secondary"
                      >
                        {endpoint.method}
                      </Badge>
                      <span className="truncate font-mono text-muted-foreground">
                        {endpoint.path}
                      </span>
                    </div>
                  ))}
                  {remaining > 0 && (
                    <p className="text-muted-foreground text-xs">
                      +{remaining} more
                    </p>
                  )}
                </CardContent>

                <CardFooter className="justify-between py-3 text-muted-foreground text-sm">
                  <ForkScenarioButton
                    scenarioId={scenario.id}
                    scenarioName={scenario.name}
                    workspaceId={params.workspaceId}
                  />

                  {/* Stretched link: the ::after overlay makes the whole card clickable */}
                  <Link
                    className="flex items-center gap-1 transition-transform after:absolute after:inset-0 group-hover:translate-x-0.5"
                    href={href}
                  >
                    Open <ArrowRight className="size-4" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
