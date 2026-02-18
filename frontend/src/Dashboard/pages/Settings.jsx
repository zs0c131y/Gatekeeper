import { useState } from "react";
import {
  Save,
  Plus,
  Edit2,
  Trash2,
  Key,
  RefreshCw,
  Copy,
  Shield,
  Lock,
  Globe,
  Server,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "../../hooks/useApi";
import { api } from "../../utils/api";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { EmptyState } from "../../components/common/EmptyState";

const tabs = [
  { id: "general", label: "General" },
  { id: "ratelimiting", label: "Rate Limiting" },
  { id: "circuitbreakers", label: "Circuit Breakers" },
  { id: "backends", label: "Backends" },
  { id: "security", label: "Security" },
  { id: "alerts", label: "Alerts" },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [saveStatus, setSaveStatus] = useState(null);

  // Fetch settings and backends
  const {
    data: settingsData,
    loading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useApi(() => api.getSettings());
  const {
    data: backendsData,
    loading: backendsLoading,
    error: backendsError,
    refetch: refetchBackends,
  } = useApi(() => api.getBackends());

  const handleSaveSettings = async (updatedSettings) => {
    try {
      setSaveStatus("saving");
      await api.updateSettings(updatedSettings);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), 3000);
      refetchSettings();
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
            Configuration
          </h1>
          <p className="text-gray-400 text-sm">
            Manage your gateway settings and preferences
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-white/10 rounded-xl p-2 shadow-2xl shadow-black/40 backdrop-blur-sm">
        <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 relative overflow-hidden group",
                activeTab === tab.id
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/25"
                  : "text-gray-400 hover:bg-white/5 hover:text-white",
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {activeTab === tab.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 animate-pulse opacity-50" />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Save Status Toast */}
      {saveStatus && (
        <div
          className={cn(
            "fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-4",
            saveStatus === "saving" && "bg-blue-500 text-white",
            saveStatus === "success" && "bg-green-500 text-white",
            saveStatus === "error" && "bg-red-500 text-white",
          )}
        >
          {saveStatus === "saving" && (
            <RefreshCw className="w-4 h-4 animate-spin" />
          )}
          {saveStatus === "success" && <CheckCircle className="w-4 h-4" />}
          {saveStatus === "error" && <XCircle className="w-4 h-4" />}
          <span>
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "success" && "Settings saved successfully!"}
            {saveStatus === "error" && "Failed to save settings"}
          </span>
        </div>
      )}

      {/* Tab Content */}
      <div
        key={activeTab}
        className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-white/10 rounded-xl p-6 shadow-2xl shadow-black/40 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        {settingsLoading ? (
          <LoadingSkeleton variant="card" count={3} />
        ) : settingsError ? (
          <ErrorMessage error={settingsError} onRetry={refetchSettings} />
        ) : (
          <>
            {activeTab === "general" && (
              <GeneralTab settings={settingsData} onSave={handleSaveSettings} />
            )}
            {activeTab === "ratelimiting" && (
              <RateLimitingTab
                settings={settingsData}
                onSave={handleSaveSettings}
              />
            )}
            {activeTab === "circuitbreakers" && (
              <CircuitBreakersTab
                settings={settingsData}
                backends={backendsData?.backends || []}
                onSave={handleSaveSettings}
              />
            )}
            {activeTab === "backends" &&
              (backendsLoading ? (
                <LoadingSkeleton variant="card" count={3} />
              ) : backendsError ? (
                <ErrorMessage error={backendsError} onRetry={refetchBackends} />
              ) : (
                <BackendsTab
                  backends={backendsData?.backends || []}
                  refetch={refetchBackends}
                />
              ))}
            {activeTab === "security" && (
              <SecurityTab
                settings={settingsData}
                onSave={handleSaveSettings}
              />
            )}
            {activeTab === "alerts" && (
              <AlertsTab settings={settingsData} onSave={handleSaveSettings} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GeneralTab({ settings, onSave }) {
  const handleSubmit = () => {
    onSave(settings);
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">General Settings</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gateway-name" className="text-gray-300">
            Gateway Name
          </Label>
          <Input
            id="gateway-name"
            value={settings.gatewayName || ""}
            readOnly
            className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logging-level" className="text-gray-300">
            Logging Level
          </Label>
          <Select defaultValue="info">
            <SelectTrigger
              id="logging-level"
              className="bg-white/5 border-white/10 text-white focus:ring-amber-500/50"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-white/20">
              <SelectItem
                value="error"
                className="text-white focus:bg-white/10 focus:text-white"
              >
                ERROR
              </SelectItem>
              <SelectItem
                value="warn"
                className="text-white focus:bg-white/10 focus:text-white"
              >
                WARN
              </SelectItem>
              <SelectItem
                value="info"
                className="text-white focus:bg-white/10 focus:text-white"
              >
                INFO
              </SelectItem>
              <SelectItem
                value="debug"
                className="text-white focus:bg-white/10 focus:text-white"
              >
                DEBUG
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="retention-period" className="text-gray-300">
            Log Retention Period (days)
          </Label>
          <Input
            id="retention-period"
            type="number"
            defaultValue="30"
            className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
          />
        </div>

        <div className="space-y-3 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <Checkbox
              id="adaptive-rate"
              defaultChecked
              className="border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
            />
            <Label
              htmlFor="adaptive-rate"
              className="text-white cursor-pointer"
            >
              Enable Adaptive Rate Limiting
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="circuit-breaking"
              defaultChecked
              className="border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
            />
            <Label
              htmlFor="circuit-breaking"
              className="text-white cursor-pointer"
            >
              Enable Circuit Breaking
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="realtime-analytics"
              defaultChecked
              className="border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
            />
            <Label
              htmlFor="realtime-analytics"
              className="text-white cursor-pointer"
            >
              Enable Real-time Analytics
            </Label>
          </div>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
      >
        <Save className="w-4 h-4" />
        Save Changes
      </Button>
    </div>
  );
}

function RateLimitingTab({ settings, onSave }) {
  const handleSubmit = () => {
    onSave(settings);
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Rate Limiting</h2>

      {/* Global Rate Limits */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Global Rate Limits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rpm" className="text-gray-300">
              Requests per Minute
            </Label>
            <Input
              id="rpm"
              type="number"
              defaultValue="1000"
              className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="burst" className="text-gray-300">
              Burst Allowance
            </Label>
            <Input
              id="burst"
              type="number"
              defaultValue="100"
              className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
            />
          </div>
        </div>
      </div>

      {/* Per-Endpoint Configuration */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Per-Endpoint Configuration
          </h3>
          <Button
            variant="outline"
            className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
          >
            <Plus className="w-4 h-4" />
            Add Endpoint
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-gray-400 font-medium pb-3">
                Endpoint
              </th>
              <th className="text-right text-gray-400 font-medium pb-3">
                Rate Limit
              </th>
              <th className="text-center text-gray-400 font-medium pb-3">
                Adaptive
              </th>
              <th className="text-right text-gray-400 font-medium pb-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-3 text-white font-mono">/api/auth/login</td>
              <td className="py-3 text-gray-300 text-right">10/min</td>
              <td className="py-3 text-center">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                  Enabled
                </span>
              </td>
              <td className="py-3 text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Adaptive Settings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Adaptive Settings
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="adaptive-enabled"
              defaultChecked
              className="data-[state=checked]:bg-amber-500"
            />
            <Label
              htmlFor="adaptive-enabled"
              className="text-white cursor-pointer"
            >
              Enable Adaptive Rate Limiting
            </Label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sensitivity
            </label>
            <div className="flex gap-2">
              {["Low", "Medium", "High"].map((level) => (
                <Button
                  key={level}
                  variant={level === "Medium" ? "default" : "outline"}
                  className={cn(
                    level === "Medium"
                      ? "bg-amber-500 text-black hover:bg-amber-600"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 border-white/10",
                  )}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-limit" className="text-gray-300">
                Min Limit
              </Label>
              <Input
                id="min-limit"
                type="number"
                defaultValue="100"
                className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-limit" className="text-gray-300">
                Max Limit
              </Label>
              <Input
                id="max-limit"
                type="number"
                defaultValue="10000"
                className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
      >
        <Save className="w-4 h-4" />
        Save Changes
      </Button>
    </div>
  );
}

function CircuitBreakersTab({ settings, backends = [], onSave }) {
  const handleSubmit = () => {
    onSave(settings);
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Circuit Breakers</h2>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Global Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="failure-threshold" className="text-gray-300">
              Failure Threshold (%)
            </Label>
            <Input
              id="failure-threshold"
              type="number"
              defaultValue="50"
              className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="request-count" className="text-gray-300">
              Request Count
            </Label>
            <Input
              id="request-count"
              type="number"
              defaultValue="10"
              className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeout" className="text-gray-300">
              Timeout (seconds)
            </Label>
            <Input
              id="timeout"
              type="number"
              defaultValue="60"
              className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="half-open" className="text-gray-300">
              Half-Open Test Requests
            </Label>
            <Input
              id="half-open"
              type="number"
              defaultValue="3"
              className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Per-Backend Configuration
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-gray-400 font-medium pb-3">
                Backend
              </th>
              <th className="text-right text-gray-400 font-medium pb-3">
                Threshold
              </th>
              <th className="text-right text-gray-400 font-medium pb-3">
                Timeout
              </th>
              <th className="text-center text-gray-400 font-medium pb-3">
                State
              </th>
              <th className="text-right text-gray-400 font-medium pb-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {backends.map((backend, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-3 text-white">{backend.name}</td>
                <td className="py-3 text-gray-300 text-right">50%</td>
                <td className="py-3 text-gray-300 text-right">60s</td>
                <td className="py-3 text-center">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                    CLOSED
                  </span>
                </td>
                <td className="py-3 text-right space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 hover:bg-white/10 border-white/10 text-white h-7 text-xs"
                  >
                    Manual Open
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        onClick={handleSubmit}
        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
      >
        <Save className="w-4 h-4" />
        Save Changes
      </Button>
    </div>
  );
}

function BackendsTab({ backends, refetch }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBackend, setEditingBackend] = useState(null);

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this backend?")) {
      try {
        await api.deleteBackend(id);
        refetch();
      } catch (error) {
        console.error("Failed to delete backend:", error);
        alert("Failed to delete backend");
      }
    }
  };

  const handleAdd = async (data) => {
    try {
      await api.createBackend(data);
      setShowAddModal(false);
      refetch();
    } catch (error) {
      console.error("Failed to create backend:", error);
      alert("Failed to create backend");
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await api.updateBackend(id, data);
      setEditingBackend(null);
      refetch();
    } catch (error) {
      console.error("Failed to update backend:", error);
      alert("Failed to update backend");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Backend Services</h2>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add New Backend
        </Button>
      </div>

      {backends.length === 0 ? (
        <EmptyState
          message="No backend services configured"
          description="Add your first backend service to get started"
          icon="server"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {backends.map((backend) => (
            <Card key={backend._id} className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-white">
                      {backend.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-400 font-mono">
                      {backend.base_url}
                    </CardDescription>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-1 text-xs font-semibold rounded",
                      backend.status === "healthy"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-amber-500/20 text-amber-400",
                    )}
                  >
                    {backend.status || "unknown"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Health Endpoint:</span>
                    <span className="text-white font-mono">
                      {backend.health_endpoint}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Health Score:</span>
                    <span className="text-white">{backend.health_score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Load Balance Weight:</span>
                    <span className="text-white">{backend.weight}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Circuit State:</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-semibold rounded",
                        backend.circuit_state === "CLOSED" &&
                          "bg-green-500/20 text-green-400",
                        backend.circuit_state === "OPEN" &&
                          "bg-red-500/20 text-red-400",
                        backend.circuit_state === "HALF_OPEN" &&
                          "bg-amber-500/20 text-amber-400",
                      )}
                    >
                      {backend.circuit_state || "CLOSED"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditingBackend(backend)}
                    variant="outline"
                    className="flex-1 bg-white/5 hover:bg-white/10 border-white/10 text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(backend._id)}
                    variant="destructive"
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Backend Modal */}
      {(showAddModal || editingBackend) && (
        <BackendModal
          backend={editingBackend}
          onClose={() => {
            setShowAddModal(false);
            setEditingBackend(null);
          }}
          onSubmit={
            editingBackend
              ? (data) => handleUpdate(editingBackend._id, data)
              : handleAdd
          }
        />
      )}
    </div>
  );
}

function BackendModal({ backend, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: backend?.name || "",
    base_url: backend?.base_url || "",
    health_endpoint: backend?.health_endpoint || "/health",
    weight: backend?.weight || 1,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111111] border border-white/20 rounded-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {backend ? "Edit Backend" : "Add New Backend"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">
              Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="base_url" className="text-gray-300">
              Base URL
            </Label>
            <Input
              id="base_url"
              value={formData.base_url}
              onChange={(e) =>
                setFormData({ ...formData, base_url: e.target.value })
              }
              placeholder="http://localhost:3001"
              required
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="health_endpoint" className="text-gray-300">
              Health Endpoint
            </Label>
            <Input
              id="health_endpoint"
              value={formData.health_endpoint}
              onChange={(e) =>
                setFormData({ ...formData, health_endpoint: e.target.value })
              }
              placeholder="/health"
              required
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="text-gray-300">
              Load Balance Weight
            </Label>
            <Input
              id="weight"
              type="number"
              min="1"
              value={formData.weight}
              onChange={(e) =>
                setFormData({ ...formData, weight: parseInt(e.target.value) })
              }
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {backend ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-white/5 hover:bg-white/10 border-white/10 text-white"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SecurityTab({ settings }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [jwtExpiration, setJwtExpiration] = useState("1h");
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [bruteForceEnabled, setBruteForceEnabled] = useState(true);
  const [ipControlEnabled, setIpControlEnabled] = useState(true);

  if (!settings) return null;

  // Mock API keys for now (backend doesn't have this endpoint yet)
  const apiKeys = [
    {
      key: "gk_live_abc123...",
      created: "2024-01-15",
      lastUsed: "2 hours ago",
    },
    {
      key: "gk_live_def456...",
      created: "2024-01-10",
      lastUsed: "5 minutes ago",
    },
    { key: "gk_test_xyz789...", created: "2024-01-05", lastUsed: "Never" },
  ];

  const copyToClipboard = (text, keyIndex) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyIndex);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const securityScore = 85; // Mock security score

  return (
    <div className="space-y-6">
      {/* Header with Security Score */}
      <div className="flex items-start justify-between animate-in fade-in duration-500">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Security Center
          </h2>
          <p className="text-gray-400 text-sm">
            Manage authentication, access control, and security policies
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 min-w-[160px] hover:scale-105 transition-transform duration-300 cursor-default">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-green-400 animate-pulse" />
            <span className="text-xs font-medium text-green-400 uppercase tracking-wide">
              Security Score
            </span>
          </div>
          <div className="text-3xl font-bold text-white">
            {securityScore}
            <span className="text-xl text-gray-400">/100</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">Excellent</span>
          </div>
        </div>
      </div>

      {/* Authentication & Access Control */}
      <div
        className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 animate-in slide-in-from-bottom-4"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Authentication & Access Control
            </h3>
            <p className="text-sm text-gray-400">
              Configure authentication methods and session policies
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* JWT Configuration */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                JWT Expiration
              </label>
              <div className="segmented-control w-full">
                {["15m", "30m", "1h", "24h", "7d"].map((option) => (
                  <button
                    key={option}
                    onClick={() => setJwtExpiration(option)}
                    className={`segmented-control-item flex-1 ${jwtExpiration === option ? "active" : ""}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Time until JWT tokens expire and require refresh
              </p>
            </div>

            <div>
              <Label htmlFor="refresh-token" className="text-white mb-3 block">
                Refresh Token Validity
              </Label>
              <Input
                id="refresh-token"
                type="text"
                defaultValue="7 days"
                className="modern-input"
                placeholder="e.g., 7 days, 30 days"
              />
              <p className="text-xs text-gray-500 mt-2">
                How long refresh tokens remain valid
              </p>
            </div>
          </div>

          {/* Session Settings */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Concurrent Sessions
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="20"
                  defaultValue="5"
                  className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-amber-500 [&::-webkit-slider-thumb]:to-orange-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                />
                <span className="text-white font-mono text-sm bg-white/10 px-3 py-1 rounded-lg min-w-[3rem] text-center">
                  5
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Maximum active sessions per user
              </p>
            </div>

            <div>
              <Label htmlFor="idle-timeout" className="text-white mb-3 block">
                Idle Session Timeout
              </Label>
              <Input
                id="idle-timeout"
                type="text"
                defaultValue="30 minutes"
                className="modern-input"
                placeholder="e.g., 15 minutes, 1 hour"
              />
              <p className="text-xs text-gray-500 mt-2">
                Auto-logout after inactivity
              </p>
            </div>
          </div>
        </div>

        {/* Security Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] hover:border-white/10 transition-all group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Label
                  htmlFor="mfa-enabled"
                  className="text-white font-medium text-sm cursor-pointer"
                >
                  Multi-Factor Authentication
                </Label>
                <span className="modern-badge badge-success">Recommended</span>
              </div>
              <span className="text-xs text-gray-500">
                Require 2FA for all users
              </span>
            </div>
            <Switch
              id="mfa-enabled"
              checked={mfaEnabled}
              onCheckedChange={setMfaEnabled}
              className="data-[state=checked]:bg-amber-500 ml-4"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] hover:border-white/10 transition-all group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Label
                  htmlFor="password-rotation"
                  className="text-white font-medium text-sm cursor-pointer"
                >
                  Password Rotation
                </Label>
                <span className="modern-badge badge-warning">Optional</span>
              </div>
              <span className="text-xs text-gray-500">
                Force password change every 90 days
              </span>
            </div>
            <Switch
              id="password-rotation"
              className="data-[state=checked]:bg-amber-500 ml-4"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] hover:border-white/10 transition-all group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Label
                  htmlFor="brute-force"
                  className="text-white font-medium text-sm cursor-pointer"
                >
                  Brute Force Protection
                </Label>
                <span className="modern-badge badge-success">Active</span>
              </div>
              <span className="text-xs text-gray-500">
                Lock account after 5 failed attempts
              </span>
            </div>
            <Switch
              id="brute-force"
              checked={bruteForceEnabled}
              onCheckedChange={setBruteForceEnabled}
              className="data-[state=checked]:bg-amber-500 ml-4"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] hover:border-white/10 transition-all group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Label
                  htmlFor="ip-control"
                  className="text-white font-medium text-sm cursor-pointer"
                >
                  IP-Based Access Control
                </Label>
                <span className="modern-badge badge-success">Active</span>
              </div>
              <span className="text-xs text-gray-500">
                Whitelist/blacklist IP addresses
              </span>
            </div>
            <Switch
              id="ip-control"
              checked={ipControlEnabled}
              onCheckedChange={setIpControlEnabled}
              className="data-[state=checked]:bg-amber-500 ml-4"
            />
          </div>
        </div>

        {/* JWT Secret Rotation */}
        <div className="mt-6 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-400 mb-1">
                JWT Secret Rotation
              </h4>
              <p className="text-xs text-gray-400 mb-3">
                Rotating the JWT secret will invalidate all existing tokens. All
                users will need to re-authenticate.
              </p>
              <Button
                variant="destructive"
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400"
              >
                <RefreshCw className="w-4 h-4" />
                Rotate JWT Secret Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Management */}
      <div
        className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-500 animate-in slide-in-from-bottom-4"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Key className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                API Key Management
              </h3>
              <p className="text-sm text-gray-400">
                Generate and manage API keys for service authentication
              </p>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40">
            <Plus className="w-4 h-4" />
            Generate New Key
          </Button>
        </div>

        <div className="space-y-2">
          {apiKeys.map((key, i) => (
            <div
              key={i}
              className="group p-5 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <code className="text-sm font-mono text-white tracking-tight">
                        {key.key}
                      </code>
                      <button
                        onClick={() => copyToClipboard(key.key, i)}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-all relative"
                      >
                        {copiedKey === i ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
                        )}
                      </button>
                    </div>
                    {key.lastUsed === "Never" ? (
                      <span className="modern-badge badge-warning">Unused</span>
                    ) : (
                      <span className="modern-badge badge-success">Active</span>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <span className="text-gray-500">
                      Created{" "}
                      <span className="text-gray-400 font-medium">
                        {key.created}
                      </span>
                    </span>
                    <span className="text-gray-500">
                      Last used{" "}
                      <span className="text-gray-400 font-medium">
                        {key.lastUsed}
                      </span>
                    </span>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/30 text-red-400 hover:text-red-300 whitespace-nowrap"
                >
                  Revoke
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* API Key Settings */}
        <div className="mt-6 pt-6 border-t border-white/[0.05]">
          <h4 className="text-sm font-semibold text-white mb-4">
            Key Configuration
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Default Expiration
              </label>
              <div className="segmented-control w-full">
                {["30d", "90d", "Never"].map((option) => (
                  <button
                    key={option}
                    className={`segmented-control-item flex-1 ${option === "Never" ? "active" : ""}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Auto-expire API keys after duration
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Rate Limit per Key
              </label>
              <input
                type="text"
                defaultValue="10,000 req/hour"
                className="modern-input"
                placeholder="e.g., 10,000 req/hour"
              />
              <p className="text-xs text-gray-500 mt-2">
                Maximum requests per key per hour
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CORS & Origin Control */}
      <div
        className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 hover:border-white/20 hover:shadow-2xl hover:shadow-cyan-500/5 transition-all duration-500 animate-in slide-in-from-bottom-4"
        style={{ animationDelay: "300ms" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Globe className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              CORS & Origin Control
            </h3>
            <p className="text-sm text-gray-400">
              Configure cross-origin resource sharing and allowed domains
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="allowed-origins" className="text-white mb-3 block">
              Allowed Origins
            </Label>
            <Textarea
              id="allowed-origins"
              rows={7}
              placeholder="https://example.com\nhttps://app.example.com\nhttps://*.yourdomain.com"
              defaultValue="https://example.com\nhttps://app.example.com"
              className="bg-white/5 border-white/10 text-white font-mono text-xs resize-none focus-visible:ring-amber-500/50"
            />
            <p className="text-xs text-gray-500 mt-2">
              One origin per line. Supports wildcards (*).
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                HTTP Methods
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"].map(
                  (method) => (
                    <label key={method} className="relative">
                      <input
                        type="checkbox"
                        defaultChecked={[
                          "GET",
                          "POST",
                          "PUT",
                          "DELETE",
                        ].includes(method)}
                        className="peer sr-only"
                      />
                      <div className="px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-lg cursor-pointer transition-all text-center peer-checked:bg-cyan-500/10 peer-checked:border-cyan-500/30 peer-checked:text-cyan-400 text-gray-400 text-xs font-mono font-semibold hover:bg-white/[0.04]">
                        {method}
                      </div>
                    </label>
                  ),
                )}
              </div>
            </div>

            <div>
              <Label
                htmlFor="allowed-headers"
                className="text-white mb-3 block"
              >
                Allowed Headers
              </Label>
              <Input
                id="allowed-headers"
                type="text"
                placeholder="Authorization, Content-Type, X-API-Key"
                defaultValue="Authorization, Content-Type"
                className="bg-white/5 border-white/10 text-white text-xs focus-visible:ring-amber-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max-age" className="text-white mb-3 block">
                  Max Age
                </Label>
                <Input
                  id="max-age"
                  type="text"
                  defaultValue="86400s"
                  className="bg-white/5 border-white/10 text-white text-center font-mono focus-visible:ring-amber-500/50"
                />
              </div>
              <div>
                <Label htmlFor="credentials" className="text-white mb-3 block">
                  Credentials
                </Label>
                <Switch
                  id="credentials"
                  defaultChecked
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IP Access Control */}
      <div
        className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 hover:border-white/20 hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-500 animate-in slide-in-from-bottom-4"
        style={{ animationDelay: "400ms" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Server className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              IP Access Control
            </h3>
            <p className="text-sm text-gray-400">
              Configure IP whitelist and blacklist rules
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="ip-whitelist" className="text-white mb-3 block">
              Whitelist
            </Label>
            <Textarea
              id="ip-whitelist"
              rows={7}
              placeholder="192.168.1.0/24\n10.0.0.1\n203.0.113.0/24"
              className="bg-white/5 border-white/10 text-white font-mono text-xs resize-none focus-visible:ring-amber-500/50"
            />
            <p className="text-xs text-gray-500 mt-2">
              IP addresses or CIDR ranges • One per line
            </p>
          </div>

          <div>
            <Label htmlFor="ip-blacklist" className="text-white mb-3 block">
              Blacklist
            </Label>
            <Textarea
              id="ip-blacklist"
              rows={7}
              placeholder="192.0.2.100\n198.51.100.0/24"
              defaultValue="192.0.2.100"
              className="bg-white/5 border-white/10 text-white font-mono text-xs resize-none focus-visible:ring-amber-500/50"
            />
            <p className="text-xs text-gray-500 mt-2">
              Blacklist takes precedence over whitelist
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/[0.05] grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-all">
            <Label
              htmlFor="whitelist-mode"
              className="text-white font-medium cursor-pointer"
            >
              Whitelist Mode
            </Label>
            <Switch
              id="whitelist-mode"
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-all">
            <Label
              htmlFor="log-blocked"
              className="text-white font-medium cursor-pointer"
            >
              Log Blocked Attempts
            </Label>
            <Switch
              id="log-blocked"
              defaultChecked
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Security Headers */}
      <div
        className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 hover:border-white/20 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-500 animate-in slide-in-from-bottom-4"
        style={{ animationDelay: "500ms" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Security Headers
            </h3>
            <p className="text-sm text-gray-400">
              Configure HTTP security headers for enhanced protection
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: "X-Frame-Options", desc: "Clickjacking protection" },
            {
              name: "X-Content-Type-Options",
              desc: "MIME sniffing protection",
            },
            { name: "X-XSS-Protection", desc: "XSS filter" },
            { name: "HSTS", desc: "Force HTTPS" },
            { name: "Referrer-Policy", desc: "Referrer control" },
            { name: "CSP", desc: "Content policy" },
          ].map((header) => (
            <div
              key={header.name}
              className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-all"
            >
              <div className="flex-1 mr-3">
                <Label
                  htmlFor={`header-${header.name}`}
                  className="text-white font-medium block text-sm mb-0.5 cursor-pointer"
                >
                  {header.name}
                </Label>
                <span className="text-xs text-gray-500">{header.desc}</span>
              </div>
              <Switch
                id={`header-${header.name}`}
                defaultChecked
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Label htmlFor="csp-directives" className="text-white mb-3 block">
            Content Security Policy
          </Label>
          <Textarea
            id="csp-directives"
            rows={3}
            placeholder="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
            className="bg-white/5 border-white/10 text-white font-mono text-xs resize-none focus-visible:ring-amber-500/50"
          />
          <p className="text-xs text-gray-500 mt-2">
            Custom CSP directives for advanced control
          </p>
        </div>
      </div>

      {/* Audit & Monitoring */}
      <div
        className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 hover:border-white/20 hover:shadow-2xl hover:shadow-pink-500/5 transition-all duration-500 animate-in slide-in-from-bottom-4"
        style={{ animationDelay: "600ms" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-pink-500/20 rounded-lg">
            <Eye className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Audit & Monitoring
            </h3>
            <p className="text-sm text-gray-400">
              Track security events and suspicious activities
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              name: "Authentication Logging",
              desc: "Track all login attempts and sessions",
            },
            {
              name: "API Key Activity",
              desc: "Monitor API key access patterns",
            },
            { name: "Anomaly Detection", desc: "AI-powered threat detection" },
            { name: "Event Notifications", desc: "Real-time security alerts" },
          ].map((audit) => (
            <div
              key={audit.name}
              className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-all"
            >
              <div className="flex-1 mr-3">
                <Label
                  htmlFor={`audit-${audit.name}`}
                  className="text-white font-medium block text-sm mb-0.5 cursor-pointer"
                >
                  {audit.name}
                </Label>
                <span className="text-xs text-gray-500">{audit.desc}</span>
              </div>
              <Switch
                id={`audit-${audit.name}`}
                defaultChecked
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-white/[0.05]">
          <Label htmlFor="audit-retention" className="text-white mb-3 block">
            Audit Log Retention
          </Label>
          <div className="flex items-center gap-4 max-w-md">
            <input
              type="range"
              min="30"
              max="365"
              defaultValue="90"
              className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-amber-500 [&::-webkit-slider-thumb]:to-orange-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
            />
            <span className="text-white font-mono text-sm bg-white/10 px-4 py-2 rounded-lg min-w-[5rem] text-center">
              90 days
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Duration to retain security audit logs
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div
        className="flex items-center justify-between pt-4 animate-in fade-in duration-700"
        style={{ animationDelay: "700ms" }}
      >
        <div className="text-sm text-gray-400">
          <CheckCircle className="w-4 h-4 inline mr-1 text-green-400" />
          All changes are automatically validated
        </div>
        <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 active:scale-95">
          <Save className="w-4 h-4" />
          Save Security Settings
        </Button>
      </div>
    </div>
  );
}

function AlertsTab({ settings }) {
  if (!settings) return null;

  const alertRules = [
    { name: "Circuit Breaker State Changes", enabled: true, threshold: null },
    { name: "High Error Rate", enabled: true, threshold: 5 },
    { name: "High Latency", enabled: true, threshold: 1000 },
    { name: "Rate Limit Violations", enabled: false, threshold: 100 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Alert Rules</h2>

      <div className="space-y-3">
        {alertRules.map((rule, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1">
              <Checkbox
                id={`alert-${i}`}
                defaultChecked={rule.enabled}
                className="border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
              />
              <Label
                htmlFor={`alert-${i}`}
                className="text-white cursor-pointer"
              >
                {rule.name}
              </Label>
            </div>
            {rule.threshold !== null && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Threshold:</span>
                <Input
                  type="number"
                  defaultValue={rule.threshold}
                  className="w-24 px-3 py-1 bg-white/5 border-white/10 text-white text-sm h-8"
                />
                <span className="text-gray-400 text-sm">
                  {rule.name.includes("Error")
                    ? "%"
                    : rule.name.includes("Latency")
                      ? "ms"
                      : "count"}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Notification Delivery
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alert-email" className="text-gray-300">
              Email
            </Label>
            <Input
              id="alert-email"
              type="email"
              placeholder="alerts@example.com"
              className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-url" className="text-gray-300">
              Webhook URL
            </Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://hooks.slack.com/..."
              className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/50"
            />
          </div>
        </div>
      </div>

      <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
        <Save className="w-4 h-4" />
        Save Changes
      </Button>
    </div>
  );
}
