import { useState, useEffect } from "react";
import {
  Copy,
  Eye,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { downloadCSV } from "../../utils/export";
import { Badge } from "@/components/ui/badge";
import { cn } from "../../lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "../../hooks/useApi";
import { useGatewayFilter } from "../../context/GatewayFilterContext";
import { api } from "../../utils/api";
import { TableLoading } from "../../components/common/LoadingSkeleton";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { EmptyState } from "../../components/common/EmptyState";

const quickFilters = [
  { label: "Errors only", value: "errors" },
  { label: "Slow requests >1s", value: "slow" },
  { label: "Last hour", value: "hour" },
];

function LogDetailModal({ log, onClose }) {
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (log?.trace_id) {
      setLoading(true);
      api
        .getLogByTraceId(log.trace_id)
        .then((data) => setDetailData(data))
        .catch((err) => console.error("Failed to fetch log details:", err))
        .finally(() => setLoading(false));
    }
  }, [log]);

  const open = !!log;
  if (!open) return null;

  const displayLog = detailData || log;
  const statusCode = displayLog.status_code || displayLog.status;
  const latencyMs = displayLog.latency_ms || displayLog.latency;
  const clientIp = displayLog.client_ip || displayLog.clientIp;
  const traceId = displayLog.trace_id || displayLog.traceId;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#111111] border-white/20 text-white max-w-4xl w-full max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Request Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-2">
            <TableLoading rows={3} />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Request Details
              </h3>
              <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Method:</span>
                  <Badge
                    className={cn(
                      displayLog.method === "GET" &&
                        "bg-blue-500/20 text-blue-400 border-blue-500/30",
                      displayLog.method === "POST" &&
                        "bg-green-500/20 text-green-400 border-green-500/30",
                      displayLog.method === "PUT" &&
                        "bg-amber-500/20 text-amber-400 border-amber-500/30",
                      displayLog.method === "DELETE" &&
                        "bg-red-500/20 text-red-400 border-red-500/30",
                    )}
                  >
                    {displayLog.method}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Endpoint:</span>
                  <span className="text-white font-mono">
                    {displayLog.endpoint}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Client IP:</span>
                  <span className="text-white font-mono">{clientIp}</span>
                </div>
                {displayLog.user_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">User ID:</span>
                    <span className="text-white font-mono">
                      {displayLog.user_id}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Timestamp:</span>
                  <span className="text-white">
                    {new Date(displayLog.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Response Details
              </h3>
              <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status Code:</span>
                  <Badge
                    className={cn(
                      statusCode >= 200 &&
                        statusCode < 300 &&
                        "bg-green-500/20 text-green-400 border-green-500/30",
                      statusCode >= 300 &&
                        statusCode < 400 &&
                        "bg-blue-500/20 text-blue-400 border-blue-500/30",
                      statusCode >= 400 &&
                        statusCode < 500 &&
                        "bg-amber-500/20 text-amber-400 border-amber-500/30",
                      statusCode >= 500 &&
                        "bg-red-500/20 text-red-400 border-red-500/30",
                    )}
                  >
                    {statusCode}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Latency:</span>
                  <span
                    className={cn(
                      "font-semibold",
                      latencyMs < 100
                        ? "text-green-400"
                        : latencyMs < 300
                          ? "text-amber-400"
                          : "text-red-400",
                    )}
                  >
                    {latencyMs}ms
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Trace Information
              </h3>
              <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Trace ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">{traceId}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => navigator.clipboard.writeText(traceId)}
                      className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {statusCode >= 400 && displayLog.error_message && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Error Details
                </h3>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2 text-sm">
                  <div className="text-red-400 font-semibold">
                    {statusCode >= 500
                      ? "Internal Server Error"
                      : "Client Error"}
                  </div>
                  <div className="text-gray-300">
                    {displayLog.error_message}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function Logs() {
  const { routesOnly } = useGatewayFilter();
  const [selectedLog, setSelectedLog] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [streamLogs, setStreamLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [activeQuick, setActiveQuick] = useState("");
  const [filters, setFilters] = useState({
    trace_id: "",
    method: "",
    status: "",
    endpoint: "",
    from: "",
    to: "",
  });

  // Build query params
  const queryParams = {
    page,
    limit,
    ...(routesOnly && { routesOnly: "true" }),
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== ""),
    ),
  };

  // Fetch logs with filters
  const {
    data: logsData,
    loading,
    error,
    refetch,
  } = useApi(
    () => api.getLogs(queryParams),
    [page, limit, routesOnly, JSON.stringify(filters)],
  );

  useEffect(() => {
    setStreamLogs(logsData?.logs || []);
  }, [logsData?.logs]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const canStream = !hasActiveFilters && page === 1;

  // Real-time streaming (SSE) for the default unfiltered view.
  useEffect(() => {
    if (!liveUpdates || isPaused) return;
    if (!canStream) return;

    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const streamUrl = `${baseUrl}/api/logs/stream/live${routesOnly ? "?routesOnly=true" : ""}`;
    const es = new EventSource(streamUrl);

    es.onmessage = (event) => {
      try {
        const incoming = JSON.parse(event.data);
        setStreamLogs((prev) => {
          const trace = incoming.trace_id || incoming.traceId;
          if (prev.some((l) => (l.trace_id || l.traceId) === trace))
            return prev;
          return [incoming, ...prev].slice(0, limit);
        });
      } catch {
        // Ignore malformed streaming payloads.
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [liveUpdates, isPaused, canStream, limit, routesOnly]);

  // Polling fallback when live mode is enabled but filtered/paginated.
  useEffect(() => {
    if (!liveUpdates || isPaused || canStream) return;

    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [liveUpdates, isPaused, canStream, refetch]);

  const getMethodColor = (method) => {
    const colors = {
      GET: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      POST: "bg-green-500/20 text-green-400 border-green-500/30",
      PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
      PATCH: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    };
    return colors[method] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300)
      return "bg-green-500/20 text-green-400 border-green-500/30";
    if (status >= 300 && status < 400)
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (status >= 400 && status < 500)
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const getLatencyColor = (latency) => {
    if (latency < 100) return "text-green-400";
    if (latency < 300) return "text-amber-400";
    return "text-red-400";
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      trace_id: "",
      method: "",
      status: "",
      endpoint: "",
      from: "",
      to: "",
    });
    setPage(1);
  };

  const logs = liveUpdates && canStream ? streamLogs : logsData?.logs || [];
  const pagination = logsData?.pagination || {
    total: 0,
    totalPages: 0,
    page: 1,
    limit: 25,
  };

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Input
            type="text"
            placeholder="Search by Trace ID..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/50 focus-visible:ring-offset-0"
            value={filters.trace_id}
            onChange={(e) => handleFilterChange("trace_id", e.target.value)}
          />

          <Select
            value={filters.method || "__ALL__"}
            onValueChange={(v) =>
              handleFilterChange("method", v === "__ALL__" ? "" : v)
            }
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-amber-500/50 focus:ring-offset-0">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-white/10 text-white">
              <SelectItem value="__ALL__">All Methods</SelectItem>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status || "__ALL__"}
            onValueChange={(v) =>
              handleFilterChange("status", v === "__ALL__" ? "" : v)
            }
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-amber-500/50 focus:ring-offset-0">
              <SelectValue placeholder="All Status Codes" />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-white/10 text-white">
              <SelectItem value="__ALL__">All Status Codes</SelectItem>
              <SelectItem value="200">200 OK</SelectItem>
              <SelectItem value="400">400 Bad Request</SelectItem>
              <SelectItem value="401">401 Unauthorized</SelectItem>
              <SelectItem value="404">404 Not Found</SelectItem>
              <SelectItem value="500">500 Server Error</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="Filter by endpoint..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/50 focus-visible:ring-offset-0"
            value={filters.endpoint}
            onChange={(e) => handleFilterChange("endpoint", e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {quickFilters.map((filter) => (
              <Button
                key={filter.value}
                variant="outline"
                size="sm"
                className={cn(
                  "text-sm",
                  activeQuick === filter.value
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300",
                )}
                onClick={() => {
                  if (activeQuick === filter.value) {
                    setActiveQuick("");
                    handleClearFilters();
                  } else {
                    setActiveQuick(filter.value);
                    const now = new Date();
                    if (filter.value === "errors") {
                      setFilters((prev) => ({
                        ...prev,
                        status: "500",
                        from: "",
                        to: "",
                      }));
                    } else if (filter.value === "slow") {
                      setFilters((prev) => ({
                        ...prev,
                        status: "",
                        from: "",
                        to: "",
                      }));
                    } else if (filter.value === "hour") {
                      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                      setFilters((prev) => ({
                        ...prev,
                        status: "",
                        from: hourAgo.toISOString(),
                        to: "",
                      }));
                    }
                    setPage(1);
                  }
                }}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const rows = logs.map((l) => ({
                  timestamp: l.timestamp,
                  method: l.method,
                  endpoint: l.endpoint,
                  status: l.status_code || l.status,
                  latency_ms: l.latency_ms || l.latency,
                  client_ip: l.client_ip || l.clientIp,
                  trace_id: l.trace_id || l.traceId,
                }));
                downloadCSV(rows, "logs_export.csv");
              }}
              variant="outline"
              size="sm"
              className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
              disabled={logs.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden">
        {/* Table Header with Streaming Toggle */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Request Logs</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Live Updates:</span>
              <Switch
                checked={liveUpdates}
                onCheckedChange={setLiveUpdates}
                className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-white/20 border border-white/20"
                aria-label="Toggle live updates"
              />
            </div>
            {liveUpdates && (
              <Button
                onClick={() => setIsPaused(!isPaused)}
                variant="outline"
                size="sm"
                className="bg-white/5 hover:bg-white/10 border-white/10 text-sm text-white"
              >
                {isPaused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
                {isPaused ? "Resume" : "Pause"}
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6">
              <TableLoading rows={limit} />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorMessage error={error} onRetry={refetch} />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6">
              <EmptyState
                message="No logs found"
                description="Try adjusting your filters or time range"
                icon="search"
              />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/5 sticky top-0">
                <tr>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">
                    Timestamp
                  </th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">
                    Method
                  </th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">
                    Endpoint
                  </th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">
                    Latency
                  </th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">
                    Client IP
                  </th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">
                    Trace ID
                  </th>
                  <th className="text-center text-gray-400 font-medium px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr
                    key={log.trace_id || idx}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getMethodColor(log.method)}>
                        {log.method}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-white font-mono text-xs">
                      {log.endpoint}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={getStatusColor(
                          log.status_code || log.status,
                        )}
                      >
                        {log.status_code || log.status}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-medium",
                        getLatencyColor(log.latency_ms || log.latency),
                      )}
                    >
                      {log.latency_ms || log.latency}ms
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                      {log.client_ip || log.clientIp}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-mono text-xs">
                          {log.trace_id}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(log.trace_id);
                          }}
                          className="h-6 w-6 hover:bg-white/10 text-gray-500 hover:text-white"
                        >
                          <Copy className="w-3 h-3 text-gray-500" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="h-7 w-7 hover:bg-white/10 text-gray-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4 text-gray-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && logs.length > 0 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Show:</span>
              <Select
                value={String(limit)}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[80px] bg-white/5 border-white/10 text-white text-sm focus:ring-amber-500/50 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/10 text-white">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-400">
                Showing {(page - 1) * limit + 1}-
                {Math.min(page * limit, pagination.total)} of {pagination.total}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="h-8 w-8 bg-white/5 hover:bg-white/10 border-white/10 text-white disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </Button>

              {Array.from(
                { length: Math.min(5, pagination.totalPages) },
                (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      type="button"
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      size="sm"
                      variant={page === pageNum ? "default" : "outline"}
                      className={cn(
                        "h-8 px-3 text-sm font-medium transition-colors",
                        page === pageNum
                          ? "bg-amber-500 text-black hover:bg-amber-400 border-amber-500"
                          : "bg-white/5 text-white hover:bg-white/10 border-white/10",
                      )}
                    >
                      {pageNum}
                    </Button>
                  );
                },
              )}

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setPage(Math.min(pagination.totalPages, page + 1))
                }
                disabled={page === pagination.totalPages}
                className="h-8 w-8 bg-white/5 hover:bg-white/10 border-white/10 text-white disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
