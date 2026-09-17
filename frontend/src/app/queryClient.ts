import { QueryClient } from "@tanstack/react-query";

/**
 * Process-wide TanStack Query client (constitution VI: server state is owned by
 * TanStack Query, not ad hoc component state). Session/profile data (see
 * useSessionQuery) is cached here.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default queryClient;
