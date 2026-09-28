import {
  defaultShouldDehydrateQuery,
  isServer,
  QueryClient,
} from "@tanstack/react-query";
import { cache } from "react";

const makeQueryClient = cache(() => {
  return new QueryClient({
    defaultOptions: {
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        shouldRedactErrors: () => false,
      },
      queries: {
        gcTime: 60 * 60 * 1000,
        staleTime: 5 * 60 * 1000,
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
