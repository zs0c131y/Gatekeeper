import { useState, useEffect, useCallback } from "react";
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
import { downloadJSON } from "../../utils/export";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
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

const TIME_RANGES = [
  { label: "1H", hours: 1 },
  { label: "24H", hours: 24 },
  { label: "7D", hours: 168 },
  { label: "30D", hours: 720 },
];

/* ─────────────────────────────────────────────────────── helpers ── */

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

function getScoreColor(score) {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function getLatencyColor(ms) {
  if (ms > 500) return "text-red-400";
  if (ms > 200) return "text-amber-400";
  return "text-green-400";
}

function getSuccessColor(pct) {
  if (pct >= 95) return "text-green-400";
  if (pct >= 80) return "text-amber-400";
  return "text-red-400";
}

/* ──────────────────────────────────────────── PredictionsSection ── */

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
  const TrendIcon = trend === "degrading" ? TrendingUp : trend === "improving" ? TrendingDown : ZapIcon;

  return (
    <Card className={cn("bg-[#111111] border", healthColor.border)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className={cn("w-5 h-5", healthColor.text)} />
            <CardTitle className="text-lg">System Health Predictions</CardTitle>
          </div>
          <Badge
            variant={
              overallHealth === "healthy"
                ? "outline"
                : overallHealth === "critical"
                ? "destructive"
                : "warning"
            }
          >
            {(overallHealth ?? 'unknown').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={cn("p-4 rounded-lg border", healthColor.bg, healthColor.border)}>
            <p className="text-xs text-gray-400 mb-1">System Status</p>
            <p className={cn("text-2xl font-bold capitalize", healthColor.text)}>{overallHealth}</p>
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
            <p className="text-sm text-green-400">No issues predicted. System operating normally.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────── KpiCard ── */

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

/* ──────────────────────────────────────────────── TrafficChart ── */

function TrafficChart({ data }) {
  if (!data?.length) {
    return (
      <Card className="bg-[#111111] border-white/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Traffic Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState message="No traffic data for this range" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#111111] border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          Traffic Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradReq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradErr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="hour"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }} />
            <Area
              type="monotone"
              dataKey="requests"
              name="Requests"
              stroke="#f59e0b"
              fill="url(#gradReq)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="errors"
              name="Errors"
              stroke="#ef4444"
              fill="url(#gradErr)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────── LatencyDistributionChart ── */

function LatencyDistributionChart({ data }) {
  if (!data?.length) return null;

  const COLORS = ["#10b981", "#10b981", "#f59e0b", "#f59e0b", "#ef4444", "#ef4444"];

  return (
    <Card className="bg-[#111111] border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          Latency Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="range"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar dataKey="count" name="Requests" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i] ?? "#6b7280"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Fast (&lt;100ms)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Moderate (100–500ms)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Slow (&gt;500ms)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────── ErrorBreakdown ── */

function ErrorBreakdown({ errorsData, loading }) {
  if (loading) return <ChartLoading />;

  if (!errorsData?.byType?.length) {
    return (
      <Card className="bg-[#111111] border-white/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Error Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState message="No errors in this range" />
        </CardContent>
      </Card>
    );
  }

  const total = errorsData.byType.reduce((s, e) => s + e.value, 0);

  return (
    <Card className="bg-[#111111] border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Error Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={errorsData.byType}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
            >
              {errorsData.byType.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }} />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-center text-xs text-gray-500 -mt-2">
          {total.toLocaleString()} total errors
        </p>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────── EndpointTable ── */

function EndpointTable({ data }) {
  if (!data?.length) return null;

  return (
    <Card className="bg-[#111111] border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Endpoint Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="text-left py-2.5 px-3 font-medium">Endpoint</th>
                <th className="text-right py-2.5 px-3 font-medium">Requests</th>
                <th className="text-right py-2.5 px-3 font-medium">Avg</th>
                <th className="text-right py-2.5 px-3 font-medium">p95</th>
                <th className="text-right py-2.5 px-3 font-medium">p99</th>
                <th className="text-right py-2.5 px-3 font-medium">Success</th>
                <th className="text-right py-2.5 px-3 font-medium">Errors</th>
              </tr>
            </thead>
            <tbody>
              {data.map((ep, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono text-xs text-white max-w-[260px] truncate">
                    {ep.endpoint}
                  </td>
                  <td className="text-right py-2.5 px-3 font-mono text-gray-300">
                    {ep.requests.toLocaleString()}
                  </td>
                  <td className={cn("text-right py-2.5 px-3 font-mono", getLatencyColor(ep.avgLatency))}>
                    {ep.avgLatency}ms
                  </td>
                  <td className="text-right py-2.5 px-3 font-mono text-gray-400">
                    {ep.p95}ms
                  </td>
                  <td className="text-right py-2.5 px-3 font-mono text-gray-400">
                    {ep.p99}ms
                  </td>
                  <td className={cn("text-right py-2.5 px-3 font-mono", getSuccessColor(ep.successRate))}>
                    {ep.successRate}%
                  </td>
                  <td className={cn("text-right py-2.5 px-3 font-mono", ep.errors > 0 ? "text-red-400" : "text-gray-500")}>
                    {ep.errors}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────── ClientActivityTable ── */

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
                        <span className="font-mono text-white text-xs">{client.clientId}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {client.clientType}
                        </Badge>
                      </div>
                    </td>
                    <td className="text-right py-3 px-3">
                      <span className={cn("font-bold font-mono", getScoreColor(client.behaviorScore))}>
                        {client.behaviorScore}
                      </span>
                    </td>
                    <td className="text-right py-3 px-3 font-mono text-white">
                      {client.totalRequests.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-3">
                      <span className={cn("font-mono", client.rateLimitViolations > 0 ? "text-red-400" : "text-gray-500")}>
                        {client.rateLimitViolations}
                      </span>
                    </td>
                    <td className="text-right py-3 px-3 font-mono text-gray-400">
                      {client.blockedRequests}
                    </td>
                    <td className="text-right py-3 px-3 font-mono text-gray-400">
                      {client.avgLatency ? `${client.avgLatency}ms` : "—"}
                    </td>
                    <td className="text-center py-3 px-3">
                      {client.isWhitelisted ? (
                        <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px]">
                          Whitelisted
                        </Badge>
                      ) : client.isBlocked ? (
                        <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Active</Badge>
                      )}
                    </td>
                    <td className="text-right py-3 px-3 text-gray-500 text-xs">
                      {client.lastSeen ? new Date(client.lastSeen).toLocaleString() : "—"}
                    </td>
                    <td className="text-center py-3 px-3">
                      <div className="flex items-center justify-center gap-1">
                        {client.isBlocked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            onClick={() => handleBlock(client.clientId, false)}
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
                            onClick={() => handleBlock(client.clientId, true)}
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
                            onClick={() => handleWhitelist(client.clientId, false)}
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
                            onClick={() => handleWhitelist(client.clientId, true)}
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

/* ─────────────────────────────────────────── Main Component ── */

export function Analytics() {
  const [hours, setHours] = useState(24);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const filterParams = { hours };

  const { data, loading, error, refetch } = useApi(
    () => api.getAnalysis(filterParams),
    [hours],
  );

  const {
    data: predictionsData,
    loading: predictionsLoading,
    refetch: refetchPredictions,
  } = useApi(() => api.getPredictions({ hours }), [hours]);

  const {
    data: errorsData,
    loading: errorsLoading,
    refetch: refetchErrors,
  } = useApi(() => api.getErrors(filterParams), [hours]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      refetch();
      refetchPredictions();
      refetchErrors();
    }, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, refetch, refetchPredictions, refetchErrors]);

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

  const { kpi, hourlyTraffic, latencyDistribution, endpointPerformance } = data;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Analysis Dashboard</h1>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Time Range */}
          <div className="flex border border-white/10 rounded-lg overflow-hidden">
            {TIME_RANGES.map(({ label, hours: h }) => (
              <button
                key={label}
                onClick={() => setHours(h)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  hours === h
                    ? "bg-amber-500 text-black"
                    : "bg-[#0a0a0a] text-gray-400 hover:text-white hover:bg-white/5",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Live" : "Paused"}
          </Button>

          <Button
            onClick={() =>
              downloadJSON(
                { kpi, exportedAt: new Date().toISOString() },
                `analytics_${hours}h.json`,
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

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Requests"
          value={kpi.totalRequests.toLocaleString()}
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

      {/* ── Predictions ── */}
      {!predictionsLoading && predictionsData && (
        <PredictionsSection predictions={predictionsData} />
      )}

      {/* ── Traffic + Error Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrafficChart data={hourlyTraffic} />
        </div>
        <ErrorBreakdown errorsData={errorsData} loading={errorsLoading} />
      </div>

      {/* ── Latency Distribution ── */}
      <LatencyDistributionChart data={latencyDistribution} />

      {/* ── Endpoint Performance ── */}
      <EndpointTable data={endpointPerformance} />

      {/* ── Client Activity ── */}
      <ClientActivityTable />
    </div>
  );
}
