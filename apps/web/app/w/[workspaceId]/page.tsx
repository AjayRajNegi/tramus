"use client";

import { useQuery } from "@tanstack/react-query";
import { getWorkspaces } from "@/lib/actions/dal";

export default function Workspace() {
  const { data, isPending, isError } = useQuery({
    queryFn: getWorkspaces,
    queryKey: ["workspaces"],
  });

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error...</p>;

  return (
    <div>
      <div>This is workspace:</div>

      {/* {data?.map((user) => (
        <div key={user.id}>
          <h4>{user.name}</h4>
          <p>{user.email}</p>

          {user.posts.map((post) => (
            <div key={post.id}>
              <h4>{post.title}</h4>
              <p>{post.content}</p>
            </div>
          ))}
        </div>
      ))} */}
    </div>
  );
}
