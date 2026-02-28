import { useEffect, useMemo, useState } from "react";
import {
  Save,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Key,
  Copy,
  Shield,
  Server,
  Route,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  { id: "routes", label: "Routes" },
  { id: "security", label: "Security" },
  { id: "alerts", label: "Alerts" },
];

function SaveToast({ status }) {
  if (!status) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-4",
        status === "saving" && "bg-blue-500 text-white",
        status === "success" && "bg-green-500 text-white",
        status === "error" && "bg-red-500 text-white",
      )}
    >
      {status === "success" ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      <span>
        {status === "saving" && "Saving..."}
        {status === "success" && "Saved"}
        {status === "error" && "Failed to save"}
      </span>
    </div>
  );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [saveStatus, setSaveStatus] = useState(null);

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

  const {
    data: routesData,
    loading: routesLoading,
    error: routesError,
    refetch: refetchRoutes,
  } = useApi(() => api.getRoutes());

  const withSaveStatus = async (action) => {
    try {
      setSaveStatus("saving");
      await action();
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), 2000);
      refetchSettings();
      refetchBackends();
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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

      {/* Tab navigation using Tabs component */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-white/10 rounded-xl p-2 shadow-2xl shadow-black/40 backdrop-blur-sm overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <TabsList className="bg-transparent border-0 p-0 gap-1 flex-nowrap w-full justify-start">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-9 px-5 text-sm font-medium whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <SaveToast status={saveStatus} />

      <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-white/10 rounded-xl p-6 shadow-2xl shadow-black/40 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        {settingsLoading ? (
          <LoadingSkeleton variant="card" count={3} />
        ) : settingsError ? (
          <ErrorMessage error={settingsError} onRetry={refetchSettings} />
        ) : (
          <>
            {activeTab === "general" && (
              <GeneralTab
                settings={settingsData}
                onSave={(payload) =>
                  withSaveStatus(() => api.updateGeneralSettings(payload))
                }
              />
            )}

            {activeTab === "ratelimiting" && (
              <RateLimitingTab
                settings={settingsData}
                onSave={(payload) =>
                  withSaveStatus(() => api.updateRateLimitingSettings(payload))
                }
              />
            )}

            {activeTab === "circuitbreakers" && (
              <CircuitBreakersTab
                settings={settingsData}
                backends={backendsData?.backends || []}
                onSave={(payload) =>
                  withSaveStatus(() =>
                    api.updateCircuitBreakerSettings(payload),
                  )
                }
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

            {activeTab === "routes" &&
              (routesLoading ? (
                <LoadingSkeleton variant="card" count={3} />
              ) : routesError ? (
                <ErrorMessage error={routesError} onRetry={refetchRoutes} />
              ) : (
                <RoutesTab
                  routes={routesData?.routes || []}
                  backends={backendsData?.backends || []}
                  refetch={refetchRoutes}
                />
              ))}

            {activeTab === "security" && (
              <SecurityTab
                settings={settingsData}
                onSave={(payload) =>
                  withSaveStatus(() => api.updateSecuritySettings(payload))
                }
              />
            )}

            {activeTab === "alerts" && (
              <AlertsTab
                settings={settingsData}
                onSave={(payload) =>
                  withSaveStatus(() => api.updateAlertSettings(payload))
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GeneralTab({ settings, onSave }) {
  const [form, setForm] = useState({
    gatewayName: "",
    loggingLevel: "info",
    logRetentionDays: 30,
    adaptiveRateLimiting: true,
    circuitBreaking: true,
    realtimeAnalytics: true,
    ddosThresholdRpm: 500,
  });

  useEffect(() => {
    if (!settings) return;
    setForm((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">General Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label className="text-gray-300">Gateway Name</Label>
          <Input
            value={form.gatewayName}
            onChange={(e) =>
              setForm((f) => ({ ...f, gatewayName: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">Logging Level</Label>
          <Select
            value={form.loggingLevel}
            onValueChange={(value) =>
              setForm((f) => ({ ...f, loggingLevel: value }))
            }
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-amber-500/50 focus:ring-offset-0">
              <SelectValue placeholder="Select logging level" />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-white/10 text-white">
              <SelectItem value="error">error</SelectItem>
              <SelectItem value="warn">warn</SelectItem>
              <SelectItem value="info">info</SelectItem>
              <SelectItem value="debug">debug</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">Log Retention (days)</Label>
          <Input
            type="number"
            value={form.logRetentionDays}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                logRetentionDays: Number(e.target.value),
              }))
            }
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <ToggleCard
          label="Adaptive Rate Limiting"
          checked={form.adaptiveRateLimiting}
          onChange={(v) => setForm((f) => ({ ...f, adaptiveRateLimiting: v }))}
        />
        <ToggleCard
          label="Circuit Breaking"
          checked={form.circuitBreaking}
          onChange={(v) => setForm((f) => ({ ...f, circuitBreaking: v }))}
        />
        <ToggleCard
          label="Realtime Analytics"
          checked={form.realtimeAnalytics}
          onChange={(v) => setForm((f) => ({ ...f, realtimeAnalytics: v }))}
        />
      </div>

      <div className="border-t border-white/10 pt-4 space-y-2">
        <Label htmlFor="ddosThresholdRpm" className="text-gray-300">
          DDoS Threshold (req/min)
        </Label>
        <Input
          id="ddosThresholdRpm"
          type="number"
          min={10}
          max={100000}
          value={form.ddosThresholdRpm}
          onChange={(e) =>
            setForm((f) => ({ ...f, ddosThresholdRpm: Number(e.target.value) }))
          }
          className="bg-white/5 border-white/10 text-white"
        />
        <p className="text-xs text-gray-500">
          Requests per minute per route that triggers automatic route disable.
          Default: 500.
        </p>
      </div>

      <Button
        onClick={() => onSave(form)}
        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
      >
        <Save className="w-4 h-4" />
        Save General Settings
      </Button>
    </div>
  );
}

function RateLimitingTab({ settings, onSave }) {
  const [global, setGlobal] = useState({
    requestsPerMinute: 100,
    burstMultiplier: 1.5,
    manualOverrideEnabled: false,
    manualOverrideRpm: 0,
  });

  useEffect(() => {
    const incoming = settings?.rateLimiting?.global;
    if (!incoming) return;
    setGlobal((prev) => ({ ...prev, ...incoming }));
  }, [settings]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Rate Limiting</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Requests Per Minute</Label>
          <Input
            type="number"
            value={global.requestsPerMinute}
            onChange={(e) =>
              setGlobal((g) => ({
                ...g,
                requestsPerMinute: Number(e.target.value),
              }))
            }
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-300">Burst Multiplier</Label>
          <Input
            type="number"
            step="0.1"
            value={global.burstMultiplier}
            onChange={(e) =>
              setGlobal((g) => ({
                ...g,
                burstMultiplier: Number(e.target.value),
              }))
            }
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ToggleCard
          label="Manual Override"
          checked={global.manualOverrideEnabled}
          onChange={(v) =>
            setGlobal((g) => ({ ...g, manualOverrideEnabled: v }))
          }
        />
        <div className="space-y-2">
          <Label className="text-gray-300">Manual Override RPM</Label>
          <Input
            type="number"
            value={global.manualOverrideRpm}
            onChange={(e) =>
              setGlobal((g) => ({
                ...g,
                manualOverrideRpm: Number(e.target.value),
              }))
            }
            className="bg-white/5 border-white/10 text-white"
            disabled={!global.manualOverrideEnabled}
          />
        </div>
      </div>

      <Button
        onClick={() => onSave({ global })}
        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
      >
        <Save className="w-4 h-4" />
        Save Rate Limiting
      </Button>
    </div>
  );
}

function CircuitBreakersTab({ settings, backends, onSave }) {
  const [form, setForm] = useState({
    failureThreshold: 5,
    recoveryTimeoutMs: 30000,
    halfOpenMaxCalls: 3,
  });

  useEffect(() => {
    const incoming = settings?.circuitBreaker;
    if (!incoming) return;
    setForm((prev) => ({ ...prev, ...incoming }));
  }, [settings]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Circuit Breakers</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field
          label="Failure Threshold"
          value={form.failureThreshold}
          onChange={(v) =>
            setForm((f) => ({ ...f, failureThreshold: Number(v) }))
          }
        />
        <Field
          label="Recovery Timeout (ms)"
          value={form.recoveryTimeoutMs}
          onChange={(v) =>
            setForm((f) => ({ ...f, recoveryTimeoutMs: Number(v) }))
          }
        />
        <Field
          label="Half-Open Max Calls"
          value={form.halfOpenMaxCalls}
          onChange={(v) =>
            setForm((f) => ({ ...f, halfOpenMaxCalls: Number(v) }))
          }
        />
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            Backend Runtime State
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backends.length ? (
            <div className="space-y-2">
              {backends.map((b) => (
                <div
                  key={b._id}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-lg"
                >
                  <div>
                    <div className="text-white font-medium">{b.name}</div>
                    <div className="text-xs text-gray-400">
                      Health: {b.healthScore ?? "N/A"}
                    </div>
                  </div>
                  <Badge
                    variant={
                      b.circuitState === "CLOSED"
                        ? "success"
                        : b.circuitState === "OPEN"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {b.circuitState === "CLOSED"
                      ? "Normal"
                      : b.circuitState === "OPEN"
                        ? "Tripped"
                        : b.circuitState === "HALF_OPEN"
                          ? "Testing"
                          : "Normal"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No backend services" icon="server" />
          )}
        </CardContent>
      </Card>

      <Button
        onClick={() => onSave(form)}
        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
      >
        <Save className="w-4 h-4" />
        Save Circuit Breaker Settings
      </Button>
    </div>
  );
}

function BackendsTab({ backends, refetch }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const handleDelete = async (backend) => {
    if (!window.confirm(`Delete backend ${backend.name}?`)) return;
    await api.deleteBackend(backend._id || backend.name);
    refetch();
  };

  const handleSubmit = async (payload) => {
    if (editing) {
      await api.updateBackend(editing._id || editing.name, payload);
    } else {
      await api.createBackend(payload);
    }
    setEditing(null);
    setShowModal(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Backend Services</h2>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Backend
        </Button>
      </div>

      {backends.length === 0 ? (
        <EmptyState
          message="No backend services configured"
          description="Add your first backend service"
          icon="server"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {backends.map((backend) => (
            <Card
              key={backend._id}
              className="bg-white/5 border-white/10 hover:border-amber-500/20 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg text-white truncate">
                      {backend.name}
                    </CardTitle>
                    <div className="text-sm text-gray-400 font-mono truncate">
                      {backend.url || backend.base_url}
                    </div>
                  </div>
                  <Badge
                    variant={
                      backend.isActive !== false ? "success" : "destructive"
                    }
                    className="shrink-0"
                  >
                    {backend.isActive !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Health Path</span>
                  <span className="text-white">
                    {backend.healthPath || backend.health_endpoint}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Weight</span>
                  <span className="text-white">{backend.weight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Timeout</span>
                  <span className="text-white">{backend.timeout}ms</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => {
                      setEditing(backend);
                      setShowModal(true);
                    }}
                    variant="outline"
                    className="flex-1 bg-white/5 hover:bg-white/10 border-white/10 text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(backend)}
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

      {showModal && (
        <BackendModal
          initial={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function BackendModal({ initial, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    base_url: initial?.url || initial?.base_url || "",
    health_endpoint:
      initial?.healthPath || initial?.health_endpoint || "/health",
    weight: initial?.weight || 1,
    timeout: initial?.timeout || 5000,
    healthyAbove: initial?.healthyAbove ?? 80,
    degradedAbove: initial?.degradedAbove ?? 50,
  });

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#111111] border-white/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Backend" : "Add Backend"}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure backend routing parameters and health behavior.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="space-y-4"
        >
          <Field
            label="Name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            disabled={!!initial}
          />
          <Field
            label="Base URL"
            value={form.base_url}
            onChange={(v) => setForm((f) => ({ ...f, base_url: v }))}
          />
          <Field
            label="Health Endpoint"
            value={form.health_endpoint}
            onChange={(v) => setForm((f) => ({ ...f, health_endpoint: v }))}
          />
          <Field
            label="Weight"
            value={form.weight}
            onChange={(v) => setForm((f) => ({ ...f, weight: Number(v) }))}
          />
          <Field
            label="Timeout (ms)"
            value={form.timeout}
            onChange={(v) => setForm((f) => ({ ...f, timeout: Number(v) }))}
          />

          <div className="space-y-3 pt-2 border-t border-white/10">
            <p className="text-sm text-gray-400">Health Status Thresholds</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">
                  Healthy above (0–100)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.healthyAbove}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      healthyAbove: Number(e.target.value),
                    }))
                  }
                  className="bg-white/5 border-white/10 text-white h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">
                  Degraded above (0–100)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.degradedAbove}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      degradedAbove: Number(e.target.value),
                    }))
                  }
                  className="bg-white/5 border-white/10 text-white h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-emerald-400">
                ● ≥{form.healthyAbove} healthy
              </span>
              <span className="text-amber-400">
                ● ≥{form.degradedAbove} degraded
              </span>
              <span className="text-red-400">
                ● &lt;{form.degradedAbove} unhealthy
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {initial ? "Update" : "Create"}
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
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDisableDialog({ route, onConfirm, onCancel }) {
  if (!route) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-[#111111] border-white/20 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Disable Route?</DialogTitle>
          <DialogDescription className="text-gray-400 space-y-1 pt-1">
            <span className="block">
              <span className="font-mono text-amber-400">
                {route.method} {route.path}
              </span>
            </span>
            <span className="block text-sm">
              → {route.backendId?.name ?? route.backendId}
            </span>
            <span className="block text-sm text-red-400 pt-1">
              All traffic to this backend will stop immediately.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onConfirm}
            className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400"
          >
            Disable Route
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 bg-white/5 hover:bg-white/10 border-white/10 text-white"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoutesTab({ routes, backends, refetch }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDisable, setConfirmDisable] = useState(null);

  const handleDelete = async (route) => {
    if (!window.confirm(`Delete route ${route.method} ${route.path}?`)) return;
    await api.deleteRoute(route._id);
    refetch();
  };

  const handleUpdateRoute = async (id, payload) => {
    await api.updateRoute(id, payload);
    refetch();
  };

  function handleToggleActive(route) {
    if (route.isActive) {
      setConfirmDisable(route);
    } else {
      handleUpdateRoute(route._id, { isActive: true });
    }
  }

  async function handleKill(route) {
    await handleUpdateRoute(route._id, { isActive: false });
  }

  async function handleConfirmDisable() {
    if (confirmDisable) {
      await handleUpdateRoute(confirmDisable._id, { isActive: false });
      setConfirmDisable(null);
    }
  }

  const handleSubmit = async (payload) => {
    if (editing) {
      await api.updateRoute(editing._id, payload);
    } else {
      await api.createRoute(payload);
    }
    setEditing(null);
    setShowModal(false);
    refetch();
  };

  const METHOD_COLORS = {
    GET: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    POST: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    PUT: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    PATCH: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    DELETE: "text-red-400 bg-red-400/10 border-red-400/20",
    "*": "text-gray-300 bg-white/5 border-white/10",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Route className="w-5 h-5 text-amber-400" />
          <h2 className="text-2xl font-bold text-white">Route Configuration</h2>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Route
        </Button>
      </div>

      <p className="text-sm text-gray-400">
        Define which paths the gateway proxies and to which backend. Routes are
        matched in priority order.
      </p>

      {routes.length === 0 ? (
        <EmptyState
          message="No routes configured"
          description="Add your first route to start proxying traffic"
          icon="server"
        />
      ) : (
        <div className="space-y-3">
          {routes
            .slice()
            .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
            .map((route) => (
              <div
                key={route._id}
                className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-amber-500/20 transition-colors"
              >
                <span
                  className={`text-xs font-bold px-2 py-1 rounded border font-mono shrink-0 ${METHOD_COLORS[route.method] ?? METHOD_COLORS["*"]}`}
                >
                  {route.method}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="text-white font-mono text-sm truncate">
                    {route.path}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    → {route.backendId?.name ?? route.backendId}
                    {route.stripPrefix && (
                      <span className="ml-2 text-gray-600">
                        strip: {route.stripPrefix}
                      </span>
                    )}
                    {route.addPrefix && (
                      <span className="ml-2 text-gray-600">
                        add: {route.addPrefix}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {route.requiresAuth && (
                    <Badge
                      variant="outline"
                      className="text-xs border-amber-500/30 text-amber-400"
                    >
                      Auth
                    </Badge>
                  )}
                  <button
                    onClick={() => handleToggleActive(route)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      route.isActive
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400"
                        : "bg-red-500/20 text-red-400 hover:bg-emerald-500/20 hover:text-emerald-400"
                    }`}
                  >
                    {route.isActive ? "Active" : "Inactive"}
                  </button>
                  <span className="text-xs text-gray-600">
                    p:{route.priority ?? 0}
                  </span>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleKill(route)}
                    disabled={!route.isActive}
                    title="Kill route immediately (no confirmation)"
                    className={`p-1.5 rounded transition-all ${
                      route.isActive
                        ? "text-red-400 hover:text-red-300 hover:bg-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                        : "text-gray-600 cursor-not-allowed opacity-40"
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(route);
                      setShowModal(true);
                    }}
                    className="bg-white/5 hover:bg-white/10 border-white/10 text-white h-8 w-8 p-0"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(route)}
                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}

      {showModal && (
        <RouteModal
          initial={editing}
          backends={backends}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDisableDialog
        route={confirmDisable}
        onConfirm={handleConfirmDisable}
        onCancel={() => setConfirmDisable(null)}
      />
    </div>
  );
}

function RouteModal({ initial, backends, onClose, onSubmit }) {
  const [form, setForm] = useState({
    path: initial?.path || "",
    method: initial?.method || "GET",
    backendId: initial?.backendId?._id || initial?.backendId || "",
    stripPrefix: initial?.stripPrefix || "",
    addPrefix: initial?.addPrefix || "",
    isActive: initial?.isActive !== false,
    requiresAuth: initial?.requiresAuth || false,
    rateLimit: initial?.rateLimit || "",
    priority: initial?.priority ?? 0,
  });

  const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "*"];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#111111] border-white/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Route" : "Add Route"}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure the path, method and target backend for this route.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="space-y-4"
        >
          <Field
            label="Path (e.g. /api/v1/*)"
            value={form.path}
            onChange={(v) => setForm((f) => ({ ...f, path: v }))}
          />

          <div className="space-y-2">
            <Label className="text-gray-300">Method</Label>
            <Select
              value={form.method}
              onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111111] border-white/10 text-white">
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Backend</Label>
            <Select
              value={form.backendId}
              onValueChange={(v) => setForm((f) => ({ ...f, backendId: v }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select backend" />
              </SelectTrigger>
              <SelectContent className="bg-[#111111] border-white/10 text-white">
                {backends.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Strip Prefix"
              value={form.stripPrefix}
              onChange={(v) => setForm((f) => ({ ...f, stripPrefix: v }))}
            />
            <Field
              label="Add Prefix"
              value={form.addPrefix}
              onChange={(v) => setForm((f) => ({ ...f, addPrefix: v }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Rate Limit (rpm)"
              value={form.rateLimit}
              onChange={(v) => setForm((f) => ({ ...f, rateLimit: v }))}
            />
            <Field
              label="Priority"
              value={form.priority}
              onChange={(v) => setForm((f) => ({ ...f, priority: Number(v) }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ToggleCard
              label="Active"
              checked={form.isActive}
              onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
            <ToggleCard
              label="Requires Auth"
              checked={form.requiresAuth}
              onChange={(v) => setForm((f) => ({ ...f, requiresAuth: v }))}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {initial ? "Update" : "Create"}
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
      </DialogContent>
    </Dialog>
  );
}

function SecurityTab({ settings, onSave }) {
  const [form, setForm] = useState({
    jwtExpiry: 3600,
    apiKeyHeader: "x-api-key",
  });
  const [copied, setCopied] = useState(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKey, setNewKey] = useState({
    name: "",
    clientId: "",
    scopes: "",
    rateLimit: "",
  });
  const [createdKey, setCreatedKey] = useState(null);

  const {
    data: keys,
    loading: keysLoading,
    error: keysError,
    refetch: refetchKeys,
  } = useApi(() => api.listApiKeys());

  useEffect(() => {
    const incoming = settings?.security;
    if (!incoming) return;
    setForm((prev) => ({ ...prev, ...incoming }));
  }, [settings]);

  const safeKeys = useMemo(() => (Array.isArray(keys) ? keys : []), [keys]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-amber-400" />
        <h2 className="text-2xl font-bold text-white">Security</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="JWT Expiry (seconds)"
          value={form.jwtExpiry}
          onChange={(v) => setForm((f) => ({ ...f, jwtExpiry: Number(v) }))}
        />
        <Field
          label="API Key Header"
          value={form.apiKeyHeader}
          onChange={(v) => setForm((f) => ({ ...f, apiKeyHeader: v }))}
        />
      </div>

      <Button
        onClick={() => onSave(form)}
        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
      >
        <Save className="w-4 h-4" />
        Save Security Settings
      </Button>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            API Keys
          </CardTitle>
          <Button
            onClick={() => setShowCreateKey(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            <Plus className="w-4 h-4" />
            Create Key
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {keysLoading ? (
            <LoadingSkeleton variant="table" count={3} />
          ) : keysError ? (
            <ErrorMessage error={keysError} onRetry={refetchKeys} />
          ) : safeKeys.length === 0 ? (
            <EmptyState message="No API keys" icon="key" />
          ) : (
            safeKeys.map((k) => (
              <div
                key={k._id || k.id}
                className="p-4 bg-black/20 border border-white/10 rounded-lg"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-white font-medium">{k.name}</div>
                    <div className="text-xs text-gray-400 font-mono">
                      {k.keyPrefix || k.prefix}
                    </div>
                    <div className="text-xs text-gray-500">
                      Client: {k.clientId}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/10 text-white"
                      onClick={async () => {
                        await api.revokeApiKey(k._id || k.id);
                        refetchKeys();
                      }}
                    >
                      Revoke
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-500/10 border-red-500/30 text-red-400"
                      onClick={async () => {
                        await api.deleteApiKey(k._id || k.id);
                        refetchKeys();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {createdKey && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-amber-400">New Key Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="text-white font-mono text-sm break-all">
                {createdKey.rawKey}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-white/10"
                onClick={() => {
                  navigator.clipboard.writeText(createdKey.rawKey);
                  setCopied(createdKey.rawKey);
                  setTimeout(() => setCopied(null), 1500);
                }}
              >
                <Copy className="w-4 h-4 text-gray-300" />
              </Button>
              {copied === createdKey.rawKey && (
                <span className="text-xs text-green-400">Copied</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Store this key now. It will not be shown again.
            </p>
          </CardContent>
        </Card>
      )}

      {showCreateKey && (
        <SimpleModal
          title="Create API Key"
          onClose={() => setShowCreateKey(false)}
        >
          <div className="space-y-3">
            <Field
              label="Name"
              value={newKey.name}
              onChange={(v) => setNewKey((k) => ({ ...k, name: v }))}
            />
            <Field
              label="Client ID"
              value={newKey.clientId}
              onChange={(v) => setNewKey((k) => ({ ...k, clientId: v }))}
            />
            <Field
              label="Scopes (comma-separated)"
              value={newKey.scopes}
              onChange={(v) => setNewKey((k) => ({ ...k, scopes: v }))}
            />
            <Field
              label="Rate Limit (optional)"
              value={newKey.rateLimit}
              onChange={(v) => setNewKey((k) => ({ ...k, rateLimit: v }))}
            />

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                onClick={async () => {
                  const payload = {
                    name: newKey.name,
                    clientId: newKey.clientId,
                    scopes: newKey.scopes
                      ? newKey.scopes
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : [],
                    rateLimit: newKey.rateLimit
                      ? Number(newKey.rateLimit)
                      : undefined,
                  };
                  const created = await api.createApiKey(payload);
                  setCreatedKey(created);
                  setShowCreateKey(false);
                  setNewKey({
                    name: "",
                    clientId: "",
                    scopes: "",
                    rateLimit: "",
                  });
                  refetchKeys();
                }}
              >
                Create
              </Button>
              <Button
                variant="outline"
                className="flex-1 bg-white/5 hover:bg-white/10 border-white/10 text-white"
                onClick={() => setShowCreateKey(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SimpleModal>
      )}
    </div>
  );
}

function AlertsTab({ settings, onSave }) {
  const [email, setEmail] = useState("");
  const [webhook, setWebhook] = useState("");
  const [rules, setRules] = useState([]);

  useEffect(() => {
    const incoming = settings?.alerts;
    if (!incoming) return;
    setEmail(incoming.email || "");
    setWebhook(incoming.webhook || "");
    setRules(Array.isArray(incoming.rules) ? incoming.rules : []);
  }, [settings]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Alert Rules</h2>
      <p className="text-sm text-gray-400">
        Configure alert rules and delivery channels.
      </p>

      <div className="space-y-3">
        {rules.map((rule, i) => (
          <div
            key={rule.name}
            className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
          >
            <span className="text-white">{rule.name}</span>
            <Switch
              checked={rule.enabled}
              onCheckedChange={(v) =>
                setRules((prev) =>
                  prev.map((r, idx) => (idx === i ? { ...r, enabled: v } : r)),
                )
              }
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Alert Email" value={email} onChange={setEmail} />
        <Field label="Webhook URL" value={webhook} onChange={setWebhook} />
      </div>

      <Button
        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        onClick={() => onSave({ email, webhook, rules })}
      >
        <Save className="w-4 h-4" />
        Save Alert Settings
      </Button>
    </div>
  );
}

function ToggleCard({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl">
      <Label className="text-white font-medium">{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-amber-500"
      />
    </div>
  );
}

function Field({ label, value, onChange, disabled = false }) {
  return (
    <div className="space-y-2">
      <Label className="text-gray-300">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="bg-white/5 border-white/10 text-white"
      />
    </div>
  );
}

function SimpleModal({ title, children, onClose }) {
  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#111111] border-white/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
