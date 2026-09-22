import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5m default for mostly-static storefront data (instant admin sync handles invalidations)
        gcTime: 1000 * 60 * 30, // 30m garbage collection retention
        refetchOnWindowFocus: false, // Prevents aggressive refetch storms on tab focus
        refetchOnMount: true, // Revalidates on mount only if staleTime has elapsed
        retry: 1,
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
    defaultPreload: "intent",
    defaultPreloadStaleTime: 1000 * 30, // Instant navigation on link hover
  });

  return router;
};
