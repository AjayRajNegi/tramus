export default async function Workspace({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return (
    <div>
      <div>This is workspace: {workspaceId}</div>
      <div>List of all the scenarios or redirect.</div>
    </div>
  );
}
