import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    dehydrate: () =>
      ({
        queryClientState: dehydrate(queryClient),
      }) as any,
    hydrate: (dehydratedState: any) => {
      if (dehydratedState?.queryClientState) {
        hydrate(queryClient, dehydratedState.queryClientState);
      }
    },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
