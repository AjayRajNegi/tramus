export default async function EndpointPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;
  return (
    <div>
      <div>The current Endpoint: {scenarioId}</div>
      <div>Details regarding the endpoint.</div>
    </div>
  );
}
