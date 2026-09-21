export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;
  return (
    <div>
      <div>The current Scenario: {scenarioId}</div>
      <div>List of all Scenarios</div>
    </div>
  );
}
