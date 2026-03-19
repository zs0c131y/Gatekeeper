import { useState, useEffect, useCallback } from "react";
import { useGatewayFilter } from "../../context/GatewayFilterContext";
import {
  Activity,
  Clock,
  AlertTriangle,
  Zap,
  Shield,
  Eye,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  Zap as ZapIcon,
  Search,
  ShieldCheck,
  ShieldX,
  Ban,
  CheckCircle,
  Users,
} from "lucide-react";
import { downloadCSV, downloadJSON } from "../../utils/export";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "../../hooks/useApi";
import { api } from "../../utils/api";
import {
  MetricCardsLoading,
  ChartLoading,
  TableLoading,
} from "../../components/common/LoadingSkeleton";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { EmptyState } from "../../components/common/EmptyState";

const chartTooltipStyle = {
  backgroundColor: "#1a1a1a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: "12px",
};

function getSeverityColor(severity) {
  switch (severity) {
    case "high":
      return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", badge: "destructive" };
    case "medium":
      return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", badge: "warning" };
    case "low":
      return { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", badge: "secondary" };
    default:
      return { bg: "bg-gray-500/10", border: "border-gray-500/30", text: "text-gray-400", badge: "secondary" };
  }
}

function PredictionsSection({ predictions }) {
  if (!predictions) return null;

  const { overallHealth, trend, confidence, predictedIssues } = predictions;

  const healthColors = {
    healthy: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
    warning: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
    critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
    unknown: { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30" },
  };

  const healthColor = healthColors[overallHealth] || healthColors.unknown;
  const trendIcon = trend === "degrading" ? TrendingUp : trend === "improving" ? TrendingDown : ZapIcon;
  const TrendIcon = trendIcon;

  return (
    <Card className={cn("bg-[#111111] border", healthColor.border)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className={cn("w-5 h-5", healthColor.text)} />
            <CardTitle className="text-lg">System Health Predictions</CardTitle>
          </div>
          <Badge variant={overallHealth === "healthy" ? "outline" : overallHealth === "critical" ? "destructive" : "warning"}>
            {overallHealth.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={cn("p-4 rounded-lg border", healthColor.bg, healthColor.border)}>
            <p className="text-xs text-gray-400 mb-1">System Status</p>
            <p className={cn("text-2xl font-bold capitalize", healthColor.text)}>
              {overallHealth}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
            <p className="text-xs text-gray-400 mb-1">Prediction Confidence</p>
            <p className="text-2xl font-bold text-blue-400">{confidence}%</p>
          </div>
        </div>

        {predictedIssues?.length ? (
          <div className="space-y-3">
            {predictedIssues.map((issue, idx) => {
              const c = getSeverityColor(issue.severity);
              return (
                <div key={idx} className={cn("p-3 rounded-lg border", c.bg, c.border)}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white capitalize">
                      {issue.type.replace(/_/g, " ")}
                    </p>
                    <Badge variant={c.badge}>{issue.severity}</Badge>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">{issue.recommendation}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
            <p className="text-sm text-green-400">
              No issues predicted. System operating normally.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiCard({ title, value, subtitle, icon: Icon, color }) {
  const palette = {
    amber: { bg: "bg-amber-500/10", text: "text-amber-400" },
    green: { bg: "bg-green-500/10", text: "text-green-400" },
    red: { bg: "bg-red-500/10", text: "text-red-400" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400" },
  };

  const p = palette[color] || palette.amber;

  return (
    <Card className="bg-[#111111] border-white/10">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-gray-400 text-sm mb-1">{title}</p>
            <h3 className={cn("text-3xl font-bold", p.text)}>{value}</h3>
          </div>

          <div className={cn("p-2 rounded-lg", p.bg)}>
            <Icon className={cn("w-5 h-5", p.text)} />
          </div>
        </div>

        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function getScoreColor(score) {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function ClientActivityTable() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("requests");
  const [actionLoading, setActionLoading] = useState(null);

  const params = {
    limit: 50,
    sort,
    order: "desc",
    ...(search && { search }),
    ...(filter === "blocked" && { blocked: "true" }),
    ...(filter === "whitelisted" && { whitelisted: "true" }),
  };

  const { data, loading, error, refetch } = useApi(
    () => api.getClientProfiles(params),
    [search, filter, sort],
  );

  const handleBlock = useCallback(
    async (clientId, blocked) => {
      setActionLoading(clientId);
      try {
        await api.blockClient(clientId, blocked);
        await refetch();
      } catch (err) {
        console.error("Failed to update block status:", err);
      } finally {
        setActionLoading(null);
      }
    },
    [refetch],
  );

  const handleWhitelist = useCallback(
    async (clientId, whitelisted) => {
      setActionLoading(clientId);
      try {
        await api.whitelistClient(clientId, whitelisted);
        await refetch();
      } catch (err) {
        console.error("Failed to update whitelist status:", err);
      } finally {
        setActionLoading(null);
      }
    },
    [refetch],
  );

  if (loading) return <TableLoading rows={8} />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;

  const clients = data?.clients || [];

  return (
    <Card className="bg-[#111111] border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-lg">Client Activity</CardTitle>
            {data?.total != null && (
              <Badge variant="secondary">{data.total} clients</Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search client IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-md bg-[#0a0a0a] border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500/50 w-48"
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[130px] h-9 bg-[#0a0a0a] border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="whitelisted">Whitelisted</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[130px] h-9 bg-[#0a0a0a] border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requests">Requests</SelectItem>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="violations">Violations</SelectItem>
                <SelectItem value="lastSeen">Last Seen</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {clients.length === 0 ? (
          <EmptyState message="No client profiles found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="text-left py-3 px-3 font-medium">Client</th>
                  <th className="text-right py-3 px-3 font-medium">Score</th>
                  <th className="text-right py-3 px-3 font-medium">Requests</th>
                  <th className="text-right py-3 px-3 font-medium">Violations</th>
                  <th className="text-right py-3 px-3 font-medium">Blocked Req</th>
                  <th className="text-right py-3 px-3 font-medium">Avg Latency</th>
                  <th className="text-center py-3 px-3 font-medium">Status</th>
                  <th className="text-right py-3 px-3 font-medium">Last Seen</th>
                  <th className="text-center py-3 px-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.clientId}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white text-xs">
                          {client.clientId}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {client.clientType}
                        </Badge>
                      </div>
                    </td>
                    <td className="text-right py-3 px-3">
                      <span
                        className={cn(
                          "font-bold font-mono",
                          getScoreColor(client.behaviorScore),
                        )}
                      >
                        {client.behaviorScore}
                      </span>
                    </td>
                    <td className="text-right py-3 px-3 font-mono text-white">
                      {client.totalRequests.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-3">
                      <span
                        className={cn(
                          "font-mono",
                          client.rateLimitViolations > 0
                            ? "text-red-400"
                            : "text-gray-500",
                        )}
                      >
                        {client.rateLimitViolations}
                      </span>
                    </td>
                    <td className="text-right py-3 px-3 font-mono text-gray-400">
                      {client.blockedRequests}
                    </td>
                    <td className="text-right py-3 px-3 font-mono text-gray-400">
                      {client.avgLatency ? `${client.avgLatency}ms` : "\u2014"}
                    </td>
                    <td className="text-center py-3 px-3">
                      {client.isWhitelisted ? (
                        <Badge
                          variant="outline"
                          className="border-green-500/30 text-green-400 text-[10px]"
                        >
                          Whitelisted
                        </Badge>
                      ) : client.isBlocked ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Blocked
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="text-right py-3 px-3 text-gray-500 text-xs">
                      {client.lastSeen
                        ? new Date(client.lastSeen).toLocaleString()
                        : "\u2014"}
                    </td>
                    <td className="text-center py-3 px-3">
                      <div className="flex items-center justify-center gap-1">
                        {client.isBlocked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            onClick={() =>
                              handleBlock(client.clientId, false)
                            }
                            disabled={actionLoading === client.clientId}
                            title="Unblock"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() =>
                              handleBlock(client.clientId, true)
                            }
                            disabled={actionLoading === client.clientId}
                            title="Block"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {client.isWhitelisted ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
                            onClick={() =>
                              handleWhitelist(client.clientId, false)
                            }
                            disabled={actionLoading === client.clientId}
                            title="Remove from whitelist"
                          >
                            <ShieldX className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            onClick={() =>
                              handleWhitelist(client.clientId, true)
                            }
                            disabled={actionLoading === client.clientId}
                            title="Whitelist"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Analytics() {
  const [hours, setHours] = useState(24);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { routesOnly } = useGatewayFilter();

  const { data, loading, error, refetch } = useApi(
    () => api.getAnalysis({ hours, ...(routesOnly && { routesOnly: "true" }) }),
    [hours, routesOnly]
  );

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refetch, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, refetch]);

  if (loading) {
    return (
      <div className="space-y-6">
        <MetricCardsLoading />
        <ChartLoading />
        <TableLoading rows={5} />
      </div>
    );
  }

  if (error) return <ErrorMessage error={error} onRetry={refetch} />;
  if (!data) return <EmptyState message="No analysis data available" />;

  const { kpi } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Analysis Dashboard</h1>

        <div className="flex gap-3">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Auto Refresh On" : "Auto Refresh Off"}
          </Button>

          <Button
            onClick={() =>
              downloadJSON(
                { kpi, exportedAt: new Date().toISOString() },
                `analytics_${hours}h.json`
              )
            }
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Requests"
          value={kpi.totalRequests}
          subtitle="within selected range"
          icon={Activity}
          color="amber"
        />
        <KpiCard
          title="Avg Latency"
          value={`${kpi.avgLatency}ms`}
          subtitle="across all endpoints"
          icon={Clock}
          color="green"
        />
        <KpiCard
          title="Error Rate"
          value={`${kpi.errorRate}%`}
          subtitle="4xx + 5xx"
          icon={AlertTriangle}
          color="red"
        />
        <KpiCard
          title="Throughput"
          value={`${kpi.throughput} req/s`}
          subtitle="average"
          icon={Zap}
          color="blue"
        />
      </div>

      {/* Client Activity Table */}
      <ClientActivityTable />
    </div>
  );
}