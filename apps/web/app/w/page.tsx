"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createWorkspace, getWorkspaces } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export default function Dashboard() {
  const router = useRouter();

  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [workspaceTitle, setWorkspaceTitle] = useState("");

  const queryClient = useQueryClient();

  const { data, isPending, isError } = useQuery({
    queryFn: getWorkspaces,
    queryKey: queryKeys.workspaces.lists(),
    staleTime: 2 * 60 * 1000,
  });

  const newWorkspace = useMutation({
    mutationFn: createWorkspace,
    onError: () => {},
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.lists(),
      });

      setWorkspaceTitle("");
      setCreatingWorkspace(false);
      router.push(`/w/${data.id}`);
    },
  });

  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Loading...</div>;

  const handleUpdate = () => {
    if (creatingWorkspace) {
      newWorkspace.mutate({
        name: workspaceTitle,
      });
    }
  };

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
        <CardFooter className="p-3">
          <Button
            className="ml-auto"
            onClick={() => setCreatingWorkspace(true)}
          >
            + New Workspace
          </Button>
        </CardFooter>
        <Dialog
          onOpenChange={(open) => !open && setCreatingWorkspace(false)}
          open={creatingWorkspace}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create new workspace</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-3">
              <Input
                id="title"
                onChange={(e) => setWorkspaceTitle(e.target.value)}
                // value={draftTitle}
              />
            </div>

            <DialogFooter className="p-2">
              <Button
                // disabled={updatePost.isPending}
                onClick={() => setCreatingWorkspace(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={newWorkspace.isPending} onClick={handleUpdate}>
                {newWorkspace.isPending ? "..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}
