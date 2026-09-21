import { isServer, QueryClient } from "@tanstack/react-query";
import { cache } from "react";

const makeQueryClient = cache(() => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
});

let browerQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browerQueryClient) browerQueryClient = makeQueryClient();
  return browerQueryClient;
}
