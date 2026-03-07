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
  TrendingUp,
  TrendingDown,
  Zap as ZapIcon,
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
    </div>
  );
}