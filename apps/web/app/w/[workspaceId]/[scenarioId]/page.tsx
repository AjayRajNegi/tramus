"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { AlertCircle, ChevronRight, Route } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ForkScenarioButton } from "@/components/layout/bar/forkscenariobutton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
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

export default function ScenarioPage() {
  const params = useParams<{
    workspaceId: string;
    scenarioId: string;
  }>();

  const { data, isPending, isError } = useQuery({
    enabled: !!params.scenarioId,
    queryFn: () => getScenarios(params.workspaceId),
    queryKey: queryKeys.workspaces.detail(params.scenarioId),
  });

  const scenario = data?.find((s) => s.id === params.scenarioId);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      {isPending && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            We couldn&apos;t load this scenario. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {data && !scenario && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Scenario not found</AlertTitle>
          <AlertDescription>
            This scenario doesn&apos;t exist or was removed from the workspace.
          </AlertDescription>
        </Alert>
      )}

      {scenario && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h1 className="truncate font-semibold text-2xl uppercase tracking-tight">
                {scenario.name}
              </h1>
              <p className="-mt-1 text-muted-foreground text-sm">
                {scenario._count.endpoints}{" "}
                {scenario._count.endpoints === 1 ? "endpoint" : "endpoints"}
              </p>
            </div>

            <ForkScenarioButton
              scenarioId={scenario.id}
              scenarioName={scenario.name}
              workspaceId={params.workspaceId}
            />
          </div>

          <Card className="min-w-fit gap-0 py-0 xl:min-w-sm">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base">Endpoints</CardTitle>
              <CardDescription className="text-xs">
                Select an endpoint to open it in the workspace.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              {scenario.endpoints.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <Route className="size-8 text-muted-foreground" />
                  <p className="font-medium">No endpoints yet</p>
                  <p className="text-muted-foreground text-xs">
                    Add an endpoint to start building this scenario.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {scenario.endpoints.map((endpoint) => (
                    <li key={endpoint.id}>
                      <Link
                        className="group flex items-center gap-3 px-6 py-3 transition-colors hover:bg-accent/40"
                        href={`/w/${params.workspaceId}/${scenario.id}/${endpoint.id}`}
                      >
                        <Badge
                          className={cn(
                            "w-12 justify-center rounded-xs py-2.5 font-mono text-[10px]",
                            METHOD_STYLES[endpoint.method],
                          )}
                          variant="secondary"
                        >
                          {endpoint.method}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate font-mono text-sm">
                          {endpoint.path}
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
