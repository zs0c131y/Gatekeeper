import { useState, useEffect } from "react";
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

function KpiCard({ title, value, subtitle, icon: Icon, color }) {
  const palette = {
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "hover:border-amber-500/30",
      shadow: "hover:shadow-amber-500/10",
    },
    green: {
      bg: "bg-green-500/10",
      text: "text-green-400",
      border: "hover:border-green-500/30",
      shadow: "hover:shadow-green-500/10",
    },
    red: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "hover:border-red-500/30",
      shadow: "hover:shadow-red-500/10",
    },
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "hover:border-blue-500/30",
      shadow: "hover:shadow-blue-500/10",
    },
  };
  const p = palette[color] || palette.amber;

  return (
    <Card
      className={cn(
        "bg-[#111111] border-white/10 transition-all duration-300 hover:shadow-lg",
        p.border,
        p.shadow,
      )}
    >
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

export function Analytics() {
  const [hours, setHours] = useState(24);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { routesOnly } = useGatewayFilter();

  const { data, loading, error, refetch } = useApi(
    () => api.getAnalysis({ hours, ...(routesOnly && { routesOnly: "true" }) }),
    [hours, routesOnly],
  );

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refetch, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, refetch]);

  if (loading) {
    return (
      <div className="space-y-6">
        <MetricCardsLoading />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartLoading />
          <ChartLoading />
        </div>
        <TableLoading rows={5} />
      </div>
    );
  }

  if (error) return <ErrorMessage error={error} onRetry={refetch} />;
  if (!data) return <EmptyState message="No analysis data available" />;

  const {
    kpi,
    latencyDistribution,
    methodBreakdown,
    clients,
    hourlyTraffic,
    topErrorEndpoints,
    endpointPerformance,
  } = data;

  const methodTotal = methodBreakdown.reduce((s, m) => s + m.count, 0);
  const maxErrorCount =
    topErrorEndpoints.length > 0 ? topErrorEndpoints[0].errorCount : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analysis Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Deep-dive into gateway performance, traffic patterns, and threat
            signals
            {routesOnly && (
              <span className="ml-2 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Gateway routes only
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={String(hours)}
            onValueChange={(value) => setHours(Number(value))}
          >
            <SelectTrigger className="w-[150px] bg-white/5 border-white/10 text-white focus:ring-amber-500/50 focus:ring-offset-0">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-white/10 text-white">
              <SelectItem value="6">Last 6 hours</SelectItem>
              <SelectItem value="24">Last 24 hours</SelectItem>
              <SelectItem value="72">Last 3 days</SelectItem>
              <SelectItem value="168">Last 7 days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            size="sm"
            className={cn(
              "border-white/10 text-white",
              autoRefresh
                ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                : "bg-white/5 hover:bg-white/10",
            )}
          >
            <RefreshCw
              className={cn("w-4 h-4 mr-2", autoRefresh && "animate-spin")}
            />
            {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
          </Button>

          <Button
            onClick={() => {
              const exportData = {
                kpi,
                latencyDistribution,
                methodBreakdown,
                endpointPerformance,
                hourlyTraffic,
                topErrorEndpoints,
                clients,
                exportedAt: new Date().toISOString(),
                range: `${hours}h`,
              };
              downloadJSON(exportData, `analytics_${hours}h.json`);
            }}
            variant="outline"
            size="sm"
            className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          subtitle="4xx + 5xx combined"
          icon={AlertTriangle}
          color={kpi.errorRate < 10 ? "amber" : "red"}
        />
        <KpiCard
          title="Throughput"
          value={`${kpi.throughput} req/s`}
          subtitle="average in selected range"
          icon={Zap}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#111111] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Latency Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={latencyDistribution} barCategoryGap="20%">
                <defs>
                  <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="range"
                  stroke="#666"
                  tick={{ fill: "#888", fontSize: 11 }}
                />
                <YAxis stroke="#666" tick={{ fill: "#888", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={chartTooltipStyle}
                />
                <Bar
                  dataKey="count"
                  fill="url(#latGrad)"
                  radius={[4, 4, 0, 0]}
                  name="Requests"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#111111] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">HTTP Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={260}>
                <PieChart>
                  <Pie
                    data={methodBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="method"
                    label={false}
                  >
                    {methodBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex-1 space-y-3">
                {methodBreakdown.map((m) => (
                  <div
                    key={m.method}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="text-sm font-mono text-gray-300">
                        {m.method}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-white">
                        {m.count}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        (
                        {((m.count / Math.max(1, methodTotal)) * 100).toFixed(
                          0,
                        )}
                        %)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#111111] border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Endpoint Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {endpointPerformance?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-gray-400 font-medium pb-3">
                      Endpoint
                    </th>
                    <th className="text-right text-gray-400 font-medium pb-3">
                      Requests
                    </th>
                    <th className="text-right text-gray-400 font-medium pb-3">
                      P50
                    </th>
                    <th className="text-right text-gray-400 font-medium pb-3">
                      P95
                    </th>
                    <th className="text-right text-gray-400 font-medium pb-3">
                      P99
                    </th>
                    <th className="text-right text-gray-400 font-medium pb-3">
                      Success
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {endpointPerformance.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="py-3 text-white font-mono">
                        {row.endpoint}
                      </td>
                      <td className="py-3 text-right text-gray-300">
                        {row.requests.toLocaleString()}
                      </td>
                      <td className="py-3 text-right text-gray-300">
                        {row.p50}ms
                      </td>
                      <td className="py-3 text-right text-amber-400">
                        {row.p95}ms
                      </td>
                      <td className="py-3 text-right text-red-400">
                        {row.p99}ms
                      </td>
                      <td className="py-3 text-right text-green-400">
                        {row.successRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No endpoint performance data" />
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#111111] border-white/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-lg">
              Client Activity & Threat Detection
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-gray-400 font-medium pb-3">
                    Client IP
                  </th>
                  <th className="text-right text-gray-400 font-medium pb-3">
                    Requests
                  </th>
                  <th className="text-right text-gray-400 font-medium pb-3">
                    Error Rate
                  </th>
                  <th className="text-right text-gray-400 font-medium pb-3">
                    Violations
                  </th>
                  <th className="text-right text-gray-400 font-medium pb-3">
                    Last Seen
                  </th>
                  <th className="text-center text-gray-400 font-medium pb-3">
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 text-white font-mono">{c.client}</td>
                    <td className="py-3 text-gray-300 text-right">
                      {c.requests.toLocaleString()}
                    </td>
                    <td
                      className={cn(
                        "py-3 text-right font-medium",
                        c.errorRate > 10
                          ? "text-red-400"
                          : c.errorRate > 5
                            ? "text-amber-400"
                            : "text-green-400",
                      )}
                    >
                      {c.errorRate}%
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={cn(
                          "font-medium",
                          c.violations > 20
                            ? "text-red-400"
                            : c.violations > 5
                              ? "text-amber-400"
                              : "text-gray-400",
                        )}
                      >
                        {c.violations}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 text-right">
                      {c.lastSeen}
                    </td>
                    <td className="py-3 text-center">
                      <Badge
                        variant={
                          c.suspicious
                            ? "destructive"
                            : c.violations > 10
                              ? "warning"
                              : "success"
                        }
                      >
                        {c.suspicious
                          ? "High"
                          : c.violations > 10
                            ? "Medium"
                            : "Low"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[#111111] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Hourly Traffic Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourlyTraffic} barGap={2}>
                <defs>
                  <linearGradient id="hourReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop
                      offset="100%"
                      stopColor="#10b981"
                      stopOpacity={0.25}
                    />
                  </linearGradient>
                  <linearGradient id="hourErr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop
                      offset="100%"
                      stopColor="#ef4444"
                      stopOpacity={0.25}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="hour"
                  stroke="#666"
                  tick={{ fill: "#888", fontSize: 10 }}
                  interval={2}
                />
                <YAxis stroke="#666" tick={{ fill: "#888", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={chartTooltipStyle}
                />
                <Legend wrapperStyle={{ color: "#888", fontSize: 12 }} />
                <Bar
                  dataKey="requests"
                  fill="url(#hourReq)"
                  radius={[3, 3, 0, 0]}
                  name="Requests"
                />
                <Bar
                  dataKey="errors"
                  fill="url(#hourErr)"
                  radius={[3, 3, 0, 0]}
                  name="Errors"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#111111] border-white/10">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Eye className="w-5 h-5 text-red-400" />
            <CardTitle className="text-lg">Top Error Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topErrorEndpoints.map((ep, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-sm text-white font-mono truncate max-w-[180px]"
                      title={ep.endpoint}
                    >
                      {ep.endpoint}
                    </span>
                    <span className="text-xs text-red-400 font-semibold">
                      {ep.errorCount} errors
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                      style={{
                        width: `${(ep.errorCount / maxErrorCount) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {ep.totalRequests.toLocaleString()} total
                    </span>
                    <span className="text-xs text-gray-500">
                      {ep.errorRate}% error rate
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
