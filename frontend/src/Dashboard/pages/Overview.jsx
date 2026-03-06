import { useState, useEffect, useRef, useMemo } from "react";
import { useGatewayFilter } from "../../context/GatewayFilterContext";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  Server,
  Gauge,
  Wifi,
  PlayCircle,
  PauseCircle,
  Filter,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "../../lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "../../hooks/useApi";
import { api } from "../../utils/api";
import {
  MetricCardsLoading,
  ChartLoading,
  TableLoading,
} from "../../components/common/LoadingSkeleton";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { EmptyState } from "../../components/common/EmptyState";

// eslint-disable-next-line no-unused-vars
function MetricCard({ title, value, change, trend, icon: Icon, color }) {
  const isPositive = change && parseFloat(change) > 0;

  return (
    <Card className="bg-[#111111] border-white/10 hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">{title}</p>
            <h3
              className={cn(
                "text-3xl font-bold",
                color === "green" && "text-green-400",
                color === "amber" && "text-amber-400",
                color === "red" && "text-red-400",
                !color && "text-white",
              )}
            >
              {value}
            </h3>
          </div>
          <div
            className={cn(
              "p-2 rounded-lg",
              color === "green" && "bg-green-500/10",
              color === "amber" && "bg-amber-500/10",
              color === "red" && "bg-red-500/10",
              !color && "bg-white/5",
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5",
                color === "green" && "text-green-400",
                color === "amber" && "text-amber-400",
                color === "red" && "text-red-400",
                !color && "text-white",
              )}
            />
          </div>
        </div>

        {change && (
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                isPositive ? "text-green-400" : "text-red-400",
              )}
            >
              {change}
            </span>
            <span className="text-gray-500 text-xs">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Overview() {
  const { routesOnly, setRoutesOnly } = useGatewayFilter();
  const {
    data: overviewData,
    loading,
    error,
    refetch,
  } = useApi(
    () => api.getOverview(routesOnly ? { routesOnly: "true" } : {}),
    [routesOnly],
  );
  const { data: alertsData, refetch: refetchAlerts } = useApi(() =>
    api.getOverviewAlerts(),
  );
  const [isPaused, setIsPaused] = useState(false);
  const [trafficWindow, setTrafficWindow] = useState(30);

  const trafficData = useMemo(() => {
    const points = Array.isArray(overviewData?.trafficData)
      ? overviewData.trafficData
      : [];

    return points.map((point) => ({
      ...point,
      requests: Number(point.requests || 0),
      timeLabel: new Date(point.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  }, [overviewData?.trafficData]);

  // Live delta from SSE: how many requests arrived since the last REST fetch.
  const [sseReqDelta, setSseReqDelta] = useState(0);
  const sseReqDeltaRef = useRef(0);

  // Reset delta whenever REST data refreshes (it already includes those reqs).
  useEffect(() => {
    sseReqDeltaRef.current = 0;
    setSseReqDelta(0);
  }, [overviewData?.totalRequests]);

  // Inject the live SSE delta into the most-recent traffic bucket so the chart
  // reacts to real requests within seconds, not waiting for the 30 s poll.
  const liveTrafficData = useMemo(() => {
    if (!trafficData.length) return trafficData;
    const updated = [...trafficData];
    const last = updated[updated.length - 1];
    updated[updated.length - 1] = {
      ...last,
      requests: last.requests + sseReqDelta,
    };
    return updated;
  }, [trafficData, sseReqDelta]);

  const trafficSlice = useMemo(
    () => liveTrafficData.slice(-trafficWindow),
    [liveTrafficData, trafficWindow],
  );

  const trafficStats = useMemo(() => {
    if (trafficSlice.length === 0) {
      return {
        average: 0,
        latest: 0,
        peak: 0,
        min: 0,
        trendPercent: 0,
        stability: 0,
      };
    }

    const values = trafficSlice.map((point) => point.requests);
    const total = values.reduce((sum, value) => sum + value, 0);
    const average = total / values.length;
    const latest = values[values.length - 1];
    const previous = values[values.length - 2] ?? latest;
    const peak = Math.max(...values);
    const min = Math.min(...values);
    const trendPercent =
      previous === 0
        ? latest > 0
          ? 100
          : 0
        : ((latest - previous) / previous) * 100;
    const stability = Math.max(
      0,
      100 - ((peak - min) / Math.max(peak, 1)) * 100,
    );

    return {
      average,
      latest,
      peak,
      min,
      trendPercent,
      stability,
    };
  }, [trafficSlice]);

  const burstData = useMemo(() => trafficSlice.slice(-16), [trafficSlice]);

  // Keep stable refs to the latest refetch functions so the interval
  // doesn't get reset on every render (which would prevent it from firing).
  const refetchRef = useRef(refetch);
  const refetchAlertsRef = useRef(refetchAlerts);
  useEffect(() => {
    refetchRef.current = refetch;
    refetchAlertsRef.current = refetchAlerts;
  });

  // SSE stream — sends { time, requests } every second where `requests` = the
  // number of logs written in the past second. Drives live chart + total count.
  useEffect(() => {
    if (isPaused) return;
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const qs = routesOnly ? "?routesOnly=true" : "";
    const es = new EventSource(`${baseUrl}/api/overview/traffic/stream${qs}`);
    es.onmessage = (event) => {
      try {
        const { requests } = JSON.parse(event.data);
        if (requests > 0) {
          sseReqDeltaRef.current += requests;
          setSseReqDelta(sseReqDeltaRef.current);
        }
      } catch {
        /* ignore malformed frame */
      }
    };
    return () => es.close();
  }, [isPaused, routesOnly]);

  // Auto-refresh every 30 seconds — stable interval that never resets
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      refetchRef.current();
      refetchAlertsRef.current();
    }, 30000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Live total requests = REST snapshot + SSE delta since last fetch.
  const liveTotalRequests = (overviewData?.totalRequests ?? 0) + sseReqDelta;

  const getLatencyColor = (latency) => {
    if (latency < 50) return "text-green-400";
    if (latency < 100) return "text-amber-400";
    return "text-red-400";
  };

  const getErrorRateColor = (rate) => {
    if (rate < 1) return "text-green-400";
    if (rate < 2) return "text-amber-400";
    return "text-red-400";
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <MetricCardsLoading />
        <ChartLoading />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <TableLoading rows={10} />
          <div className="lg:col-span-2 space-y-6">
            <ChartLoading />
            <ChartLoading />
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return <ErrorMessage error={error} onRetry={refetch} />;
  }

  // Show empty state if no data
  if (!overviewData) {
    return <EmptyState message="No overview data available" />;
  }

  return (
    <div className="space-y-6">
      {/* Data Source Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
            Overview
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gateway traffic and health at a glance
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
          <Filter className="w-4 h-4 text-gray-400" />
          <Label
            htmlFor="routes-only-toggle"
            className="text-sm text-gray-300 cursor-pointer select-none"
          >
            Gateway routes only
          </Label>
          <Switch
            id="routes-only-toggle"
            checked={routesOnly}
            onCheckedChange={setRoutesOnly}
            className="data-[state=checked]:bg-amber-500"
          />
          <span
            className={`text-xs font-medium ${routesOnly ? "text-amber-400" : "text-gray-500"}`}
          >
            {routesOnly ? "Filtered" : "All traffic"}
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value={liveTotalRequests.toLocaleString()}
          change={overviewData.requestsChange}
          trend="vs last hour"
          icon={Activity}
        />
        <MetricCard
          title="Avg Latency"
          value={`${overviewData.avgLatency || 0}ms`}
          change={overviewData.latencyChange}
          trend="vs last hour"
          icon={Clock}
          color="green"
        />
        <MetricCard
          title="Error Rate"
          value={`${overviewData.errorRate || 0}%`}
          change={overviewData.errorRateChange}
          trend="vs last hour"
          icon={AlertTriangle}
          color={
            overviewData.errorRate < 1
              ? "green"
              : overviewData.errorRate < 2
                ? "amber"
                : "red"
          }
        />
        <MetricCard
          title="Active Backends"
          value={`${overviewData.activeBackends || 0}/${overviewData.backends?.length || 0}`}
          change={overviewData.backendsChange}
          trend={
            overviewData.activeBackends === 0
              ? "all unreachable"
              : overviewData.activeBackends === overviewData.backends?.length
                ? "all responding"
                : "some unreachable"
          }
          icon={Server}
          color={
            overviewData.activeBackends === 0
              ? "red"
              : overviewData.activeBackends === overviewData.backends?.length
                ? "green"
                : "amber"
          }
        />
      </div>

      {/* Live Traffic Command Panel */}
      <Card className="relative overflow-hidden bg-[#0f0f0f] border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.22),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.15),transparent_40%)]" />
        <CardHeader className="relative pb-3">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-white text-xl">
                  Traffic Overview
                </CardTitle>
                <Badge
                  variant={isPaused ? "secondary" : "success"}
                  className="gap-1"
                >
                  <Wifi className="w-3 h-3" />
                  {isPaused ? "Paused" : "Live"}
                </Badge>
              </div>
              <CardDescription className="text-gray-400 mt-1">
                Real-time ingress pressure with throughput, trend, and burst
                telemetry.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[10, 20, 30].map((windowSize) => (
                <Button
                  key={windowSize}
                  onClick={() => setTrafficWindow(windowSize)}
                  size="sm"
                  variant={trafficWindow === windowSize ? "default" : "outline"}
                  className={cn(
                    "h-8 px-3 text-xs font-semibold border transition-colors",
                    trafficWindow === windowSize
                      ? "bg-amber-500 text-black border-amber-400 hover:bg-amber-400"
                      : "bg-white/5 border-white/15 text-gray-300 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {windowSize} points
                </Button>
              ))}
              <Button
                onClick={() => setIsPaused(!isPaused)}
                size="sm"
                className="bg-white/5 hover:bg-white/10 border border-white/15 text-white"
              >
                {isPaused ? (
                  <>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            <div className="xl:col-span-3 rounded-xl border border-white/10 bg-black/30 p-3 md:p-4">
              {trafficSlice.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={trafficSlice}>
                    <defs>
                      <linearGradient
                        id="trafficFillMain"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#f59e0b"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#f59e0b"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff12"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="timeLabel"
                      stroke="#7f7f7f"
                      tick={{ fill: "#8f8f8f", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#7f7f7f"
                      tick={{ fill: "#8f8f8f", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={35}
                    />
                    <Tooltip content={<TrafficTooltip />} />
                    <ReferenceLine
                      y={trafficStats.average}
                      stroke="#fbbf24"
                      strokeDasharray="4 4"
                      strokeOpacity={0.65}
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#trafficFillMain)"
                    />
                    <Line
                      type="monotone"
                      dataKey="requests"
                      stroke="#fcd34d"
                      strokeWidth={1}
                      dot={false}
                      strokeOpacity={0.75}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No traffic data available" icon="inbox" />
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase text-gray-500 mb-1">
                  Current Throughput
                </p>
                <p className="text-2xl font-bold text-amber-300">
                  {trafficStats.latest.toLocaleString()}
                </p>
                <p
                  className={cn(
                    "text-xs mt-1",
                    trafficStats.trendPercent >= 0
                      ? "text-green-300"
                      : "text-red-300",
                  )}
                >
                  {trafficStats.trendPercent >= 0 ? "+" : ""}
                  {trafficStats.trendPercent.toFixed(1)}% vs previous point
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase text-gray-500 mb-1">
                  Average Window Load
                </p>
                <p className="text-2xl font-bold text-white">
                  {trafficStats.average.toFixed(1)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Peak {trafficStats.peak.toLocaleString()} / Min{" "}
                  {trafficStats.min.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase text-gray-500 mb-1">
                  Signal Stability
                </p>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-2xl font-bold text-emerald-300">
                    {trafficStats.stability.toFixed(0)}%
                  </p>
                  <Activity className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500"
                    style={{ width: `${trafficStats.stability}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-300" />
                Burst Distribution
              </p>
              <span className="text-xs text-gray-500">
                Last {burstData.length} intervals
              </span>
            </div>
            {burstData.length > 0 ? (
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={burstData}>
                  <XAxis dataKey="timeLabel" hide />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    content={<TrafficTooltip />}
                  />
                  <Bar
                    dataKey="requests"
                    radius={[4, 4, 0, 0]}
                    fill="#f59e0b"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No burst data available" icon="inbox" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Top Endpoints Table */}
        <Card className="lg:col-span-3 bg-[#111111] border-white/10">
          <CardHeader>
            <CardTitle>Top Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewData.topEndpoints &&
            overviewData.topEndpoints.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">
                        Endpoint
                      </th>
                      <th className="text-right text-sm font-medium text-gray-400 pb-3">
                        Requests
                      </th>
                      <th className="text-right text-sm font-medium text-gray-400 pb-3">
                        Avg Latency
                      </th>
                      <th className="text-right text-sm font-medium text-gray-400 pb-3">
                        Error Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.topEndpoints.map((endpoint, index) => (
                      <tr
                        key={index}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="py-3 text-sm text-white font-mono">
                          {endpoint.endpoint}
                        </td>
                        <td className="py-3 text-sm text-gray-300 text-right">
                          {endpoint.requests?.toLocaleString()}
                        </td>
                        <td
                          className={cn(
                            "py-3 text-sm text-right font-medium",
                            getLatencyColor(endpoint.avgLatency),
                          )}
                        >
                          {endpoint.avgLatency}ms
                        </td>
                        <td
                          className={cn(
                            "py-3 text-sm text-right font-medium",
                            getErrorRateColor(endpoint.errorRate),
                          )}
                        >
                          {endpoint.errorRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No endpoint data available" icon="search" />
            )}
          </CardContent>
        </Card>

        {/* Right Column - Circuit Breaker Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Circuit Breaker Status */}
          <Card className="bg-[#111111] border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">Backend Services</CardTitle>
            </CardHeader>
            <CardContent>
              {overviewData.backends && overviewData.backends.length > 0 ? (
                <div className="space-y-3">
                  {overviewData.backends.map((backend, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-white truncate">
                            {backend.name}
                          </span>
                          <Badge
                            variant={
                              backend.circuitState === "CLOSED"
                                ? "success"
                                : backend.circuitState === "OPEN"
                                  ? "destructive"
                                  : "warning"
                            }
                          >
                            {backend.circuitState === "CLOSED"
                              ? "Normal"
                              : backend.circuitState === "OPEN"
                                ? "Tripped"
                                : backend.circuitState === "HALF_OPEN"
                                  ? "Testing"
                                  : "Normal"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-gray-400">
                            Health: {backend.healthScore}%
                          </span>
                          <Badge
                            variant={
                              backend.status === "healthy"
                                ? "success"
                                : backend.status === "degraded"
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {backend.status}
                          </Badge>
                          {backend.gatewayPath && (
                            <span className="text-[10px] font-mono text-amber-400/70 bg-amber-500/5 border border-amber-500/15 rounded px-1.5 py-0">
                              {backend.gatewayPath}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No backend services" icon="server" />
              )}
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card className="bg-[#111111] border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">Recent Alerts</CardTitle>
              <CardDescription className="text-gray-400">
                Latest circuit, health, and traffic events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(alertsData) && alertsData.length > 0 ? (
                <div className="space-y-3">
                  {alertsData.slice(0, 6).map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant={
                            alert.type === "error"
                              ? "destructive"
                              : alert.type === "warning"
                                ? "warning"
                                : "info"
                          }
                        >
                          {alert.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {alert.time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 mt-1">
                        {alert.message}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No recent alerts" icon="inbox" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TrafficTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const requests = payload[0]?.value ?? 0;

  return (
    <div className="rounded-lg border border-white/15 bg-[#0e0e0e]/95 px-3 py-2 shadow-xl shadow-black/50">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-amber-300">
        {Number(requests).toLocaleString()} req
      </p>
    </div>
  );
}
