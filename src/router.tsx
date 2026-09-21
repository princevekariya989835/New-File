import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 15, // 15s query cache allows instant navigation while catching admin changes quickly
        gcTime: 1000 * 60 * 30, // 30m garbage collection retention
        refetchOnWindowFocus: true, // Auto-revalidates when user refocuses tab so all users see admin updates immediately
        refetchOnMount: true, // Auto-revalidates when mounting if stale
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
