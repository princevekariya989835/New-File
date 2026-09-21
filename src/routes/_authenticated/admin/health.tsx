import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminGetSystemHealth, type SystemHealthReport } from "@/lib/admin-health.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  ShieldCheck,
  Server,
  Activity,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/health")({
  head: () => ({
    meta: [
      { title: "System Health & Diagnostic Audit | RIOTOUS Admin" },
      { name: "description", content: "Production database, APIs, and service health diagnostics." },
    ],
  }),
  component: HealthPage,
});

function HealthPage() {
  const checkFn = useServerFn(adminGetSystemHealth);
  const q = useQuery<SystemHealthReport>({
    queryKey: ["admin", "system-health"],
    queryFn: () => checkFn(),
    refetchInterval: 30000,
  });

  const report = q.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-brand-red" /> System Health
          </h1>
          <p className="text-sm text-muted-foreground">
            Production database connectivity, API subagent status, and live storefront synchronization.
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2 shrink-0 self-start sm:self-auto"
          disabled={q.isFetching}
          onClick={() => q.refetch()}
        >
          <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
          {q.isFetching ? "Diagnosing…" : "Run Diagnostic Check"}
        </Button>
      </div>

      {q.isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="rounded-2xl border bg-card p-6 space-y-3">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-4 w-72 rounded" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : q.isError ? (
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-center space-y-3">
          <XCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="font-semibold text-destructive">Health Check Failed</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {(q.error as Error)?.message || "Could not complete system health diagnostics."}
          </p>
          <Button variant="outline" onClick={() => q.refetch()}>
            Retry Diagnostic
          </Button>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                  report.overallStatus === "healthy"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : report.overallStatus === "warning"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                }`}
              >
                {report.overallStatus === "healthy" ? (
                  <CheckCircle2 className="h-7 w-7" />
                ) : report.overallStatus === "warning" ? (
                  <AlertTriangle className="h-7 w-7" />
                ) : (
                  <XCircle className="h-7 w-7" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {report.overallStatus === "healthy"
                    ? "All Systems Operational"
                    : report.overallStatus === "warning"
                      ? "System Operational with Warnings"
                      : "System Degradation Detected"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Single Source of Truth: <strong>{report.databaseEngine}</strong> · Last checked:{" "}
                  {new Date(report.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-3 py-1 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Production Live Sync
              </span>
            </div>
          </div>

          {/* Checklist Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.components.map((comp) => {
              const isHealthy = comp.status === "healthy";
              const isWarning = comp.status === "warning";

              return (
                <div
                  key={comp.key}
                  className="rounded-xl border bg-card p-4 space-y-2.5 shadow-xs transition-colors hover:border-border/80"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      {comp.key === "database" && <Database className="h-4 w-4 text-brand-red" />}
                      {comp.key === "auth" && <ShieldCheck className="h-4 w-4 text-indigo-500" />}
                      {comp.key === "cms" && <Layers className="h-4 w-4 text-amber-500" />}
                      {comp.key !== "database" && comp.key !== "auth" && comp.key !== "cms" && (
                        <Server className="h-4 w-4 text-muted-foreground" />
                      )}
                      {comp.name}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isHealthy
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : isWarning
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {isHealthy ? "✓" : isWarning ? "!" : "✕"}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {comp.message}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                    <span>Latency</span>
                    <span className="font-mono">{comp.latencyMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Architecture Verification Note */}
          <div className="rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Production Verification Architecture</p>
            <p>
              Admin mutations directly commit to the primary Neon PostgreSQL cluster. Relevant cache keys in TanStack Query, browser storage, and Cloudflare edge are immediately purged upon mutation confirmation.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
