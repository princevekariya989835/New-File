import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicWebsiteConfig } from "@/lib/website-config.functions";
import { DEFAULT_WEBSITE_CONFIG, type WebsiteConfig } from "@/lib/website-config.types";

export const publishedWebsiteConfigQuery = {
  queryKey: ["website-config", "published"],
  queryFn: () => getPublicWebsiteConfig(),
};

export function usePublishedWebsiteConfig() {
  const getPubFn = useServerFn(getPublicWebsiteConfig);

  const query = useQuery({
    queryKey: ["website-config", "published"],
    queryFn: async (): Promise<{
      config: WebsiteConfig;
      versionNumber: number;
      publishedAt: string | null;
    }> => {
      try {
        const res = await getPubFn();
        return res;
      } catch (err) {
        return {
          config: DEFAULT_WEBSITE_CONFIG,
          versionNumber: 1,
          publishedAt: new Date().toISOString(),
        };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  return {
    config: query.data?.config ?? DEFAULT_WEBSITE_CONFIG,
    versionNumber: query.data?.versionNumber ?? 1,
    publishedAt: query.data?.publishedAt ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
