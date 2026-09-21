"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { getAllPosts } from "@/lib/actions/dal";

export default function ScenarioPage() {
  const pathname = usePathname();

  const { data, isPending, isError } = useQuery({
    queryFn: getAllPosts,
    queryKey: ["posts"],
  });

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error...</p>;

  return (
    <div>
      <div>The current Scenario: {pathname}</div>
      <div>List of all Scenarios</div>
      <div>
        {data?.map((post) => (
          <div key={post.id}>
            <h4>{post.title}</h4>
            <p>{post.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
