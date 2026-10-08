export async function GET(req: Request) {
  const res = await fetch("http://localhost:8000/api/v1/health");
  const data = await res.json();

  return Response.json({ data });
}
