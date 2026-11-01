import { Input } from "@base-ui/react";
import { GitFork } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { Label } from "../../ui/label";

type ForkScenarioButtonProps = {
  scenarioId: string;
  scenarioName: string;
  workspaceId: string;
};

export function ForkScenarioButton({
  scenarioId,
  scenarioName,
  // workspaceId,
}: ForkScenarioButtonProps) {
  // const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`${scenarioName} (fork)`);

  //   const { mutate, isPending } = useMutation({
  //     mutationFn: () =>
  //       forkScenario({ name: name.trim(), scenarioId, workspaceId }),
  //     onError: () => {
  //       toast.error("Couldn't fork the scenario. Please try again.");
  //     },
  //     onSuccess: () => {
  //       queryClient.invalidateQueries({
  //         queryKey: queryKeys.workspaces.scenarios(workspaceId),
  //       });
  //       toast.success(`Forked "${scenarioName}"`);
  //       setOpen(false);
  //     },
  //   });

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setName(`${scenarioName} (fork)`);
      }}
      open={open}
    >
      <DialogTrigger
        render={
          <Button className="relative z-10" size="sm" variant="outline">
            <GitFork className="size-4" />
            Fork
          </Button>
        }
      />

      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // if (name.trim()) mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle className="uppercase tracking-tighter">
              Fork scenario
            </DialogTitle>
            <DialogDescription className="text-sm tracking-tighter">
              Creates an independent copy of{" "}
              <span className="font-medium text-foreground">
                {scenarioName}
              </span>{" "}
              with all its endpoints. Changes to the fork won&apos;t affect the
              original.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-2">
            <Label className="uppercase" htmlFor={`fork-name-${scenarioId}`}>
              Fork name
            </Label>
            <Input
              autoFocus
              className="w-full p-1"
              id={`fork-name-${scenarioId}`}
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </div>

          <DialogFooter className="p-3">
            <Button onClick={() => setOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={!name.trim()} type="submit">
              Fork scenario
            </Button>
            {/* <Button disabled={isPending || !name.trim()} type="submit">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Fork scenario
            </Button> */}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
