import { useQuery } from "@tanstack/react-query";
import { getPublicWebsiteConfig } from "@/lib/website-config.functions";
import { DEFAULT_WEBSITE_CONFIG, type WebsiteConfig } from "@/lib/website-config.types";

export const publishedWebsiteConfigQuery = {
  queryKey: ["website-config", "published"],
  queryFn: async (): Promise<{
    config: WebsiteConfig;
    versionNumber: number;
    publishedAt: string | null;
  }> => {
    try {
      const res = await getPublicWebsiteConfig();
      return res;
    } catch {
      return {
        config: DEFAULT_WEBSITE_CONFIG,
        versionNumber: 1,
        publishedAt: null,
      };
    }
  },
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 30,
};

export function usePublishedWebsiteConfig() {
  const query = useQuery(publishedWebsiteConfigQuery);

  return {
    config: query.data?.config ?? DEFAULT_WEBSITE_CONFIG,
    versionNumber: query.data?.versionNumber ?? 1,
    publishedAt: query.data?.publishedAt ?? null,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
    isError: query.isError,
    refetch: query.refetch,
  };
}
