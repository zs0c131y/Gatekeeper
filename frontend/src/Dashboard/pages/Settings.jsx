import { useMemo, useState } from "react";
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
  Settings2,
  Gauge,
  GitBranch,
  Bell,
  Activity,
  AlertTriangle,
  ChevronRight,
  Globe,
  Check,
  ExternalLink,
  Lock,
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
import { Badge } from "@/components/ui/badge";
import { useApi } from "../../hooks/useApi";
import { api, API_BASE_URL } from "../../utils/api";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { EmptyState } from "../../components/common/EmptyState";

const tabs = [
  {
    id: "services",
    label: "Services",
    icon: Globe,
    description: "Unified microservice management with gateway pathing",
  },
  {
    id: "general",
    label: "General",
    icon: Settings2,
    description: "Gateway name, logging, core feature flags",
  },
  {
    id: "ratelimiting",
    label: "Rate Limiting",
    icon: Gauge,
    description: "Request throttling and burst control",
  },
  {
    id: "circuitbreakers",
    label: "Circuit Breakers",
    icon: GitBranch,
    description: "Failure thresholds and recovery policies",
  },
  {
    id: "backends",
    label: "Backends",
    icon: Server,
    description: "Upstream service configuration",
  },
  {
    id: "routes",
    label: "Routes",
    icon: Route,
    description: "Proxy path rules and method mapping",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "Auth, JWT, and API key management",
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: Bell,
    description: "Notification rules and delivery channels",
  },
];

function SaveToast({ status }) {
  if (!status) return null;
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in slide-in-from-bottom-4 duration-300",
        status === "saving" && "bg-[#1a1a2e] border-blue-500/40 text-blue-300",
        status === "success" &&
          "bg-[#0d1f0d] border-emerald-500/40 text-emerald-300",
        status === "error" && "bg-[#1f0d0d] border-red-500/40 text-red-300",
      )}
    >
      {status === "success" ? (
        <CheckCircle className="w-4 h-4" />
      ) : status === "error" ? (
        <XCircle className="w-4 h-4" />
      ) : (
        <Activity className="w-4 h-4 animate-pulse" />
      )}
      {status === "saving" && "Saving changes\u2026"}
      {status === "success" && "Changes saved"}
      {status === "error" && "Failed to save"}
    </div>
  );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState("services");
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

  const {
    data: servicesData,
    loading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useApi(() => api.getServices());

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

  const activeTabMeta = tabs.find((t) => t.id === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Configuration
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your gateway settings, backends, routes, and security.
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Vertical sidebar nav */}
        <aside className="w-52 shrink-0 sticky top-6">
          <nav className="space-y-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left group",
                    active
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent",
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all",
                      active
                        ? "bg-amber-500/20"
                        : "bg-white/5 group-hover:bg-white/10",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5",
                        active
                          ? "text-amber-400"
                          : "text-gray-500 group-hover:text-gray-300",
                      )}
                    />
                  </div>
                  <span className="truncate">{tab.label}</span>
                  {active && (
                    <ChevronRight className="w-3 h-3 ml-auto text-amber-400/60 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {activeTabMeta && (
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-amber-500/15">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <activeTabMeta.icon className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  {activeTabMeta.label}
                </h2>
                <p className="text-xs text-gray-500">
                  {activeTabMeta.description}
                </p>
              </div>
            </div>
          )}

          {settingsLoading ? (
            <LoadingSkeleton variant="card" count={3} />
          ) : settingsError ? (
            <ErrorMessage error={settingsError} onRetry={refetchSettings} />
          ) : (
            <>
              {activeTab === "services" &&
                (servicesLoading ? (
                  <LoadingSkeleton variant="card" count={3} />
                ) : servicesError ? (
                  <ErrorMessage
                    error={servicesError}
                    onRetry={refetchServices}
                  />
                ) : (
                  <ServicesTab
                    services={servicesData?.services || []}
                    refetch={() => {
                      refetchServices();
                      refetchBackends();
                      refetchRoutes();
                    }}
                  />
                ))}
              {activeTab === "general" && (
                <GeneralTab
                  settings={settingsData}
                  onSave={(p) =>
                    withSaveStatus(() => api.updateGeneralSettings(p))
                  }
                />
              )}
              {activeTab === "ratelimiting" && (
                <RateLimitingTab
                  settings={settingsData}
                  onSave={(p) =>
                    withSaveStatus(() => api.updateRateLimitingSettings(p))
                  }
                />
              )}
              {activeTab === "circuitbreakers" && (
                <CircuitBreakersTab
                  settings={settingsData}
                  backends={backendsData?.backends || []}
                  onSave={(p) =>
                    withSaveStatus(() => api.updateCircuitBreakerSettings(p))
                  }
                />
              )}
              {activeTab === "backends" &&
                (backendsLoading ? (
                  <LoadingSkeleton variant="card" count={3} />
                ) : backendsError ? (
                  <ErrorMessage
                    error={backendsError}
                    onRetry={refetchBackends}
                  />
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
                  onSave={(p) =>
                    withSaveStatus(() => api.updateSecuritySettings(p))
                  }
                />
              )}
              {activeTab === "alerts" && (
                <AlertsTab
                  settings={settingsData}
                  onSave={(p) =>
                    withSaveStatus(() => api.updateAlertSettings(p))
                  }
                />
              )}
            </>
          )}
        </div>
      </div>

      <SaveToast status={saveStatus} />
    </div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function SectionCard({ children, className }) {
  return (
    <div
      className={cn(
        "bg-[#111111] border border-amber-500/15 rounded-xl p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium text-gray-300">{label}</Label>
      {children}
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

function FieldInput({
  label,
  hint,
  value,
  onChange,
  disabled = false,
  type = "text",
  min,
  max,
  step,
  placeholder,
}) {
  return (
    <FieldRow label={label} hint={hint}>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="bg-[#0a0a0a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-amber-500/40 focus-visible:ring-offset-0 focus-visible:border-amber-500/40 h-9"
      />
    </FieldRow>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-amber-500/10 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="shrink-0 data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-white/15"
      />
    </div>
  );
}

function SaveBtn({ onClick, label = "Save Changes" }) {
  return (
    <div className="pt-2 border-t border-amber-500/15">
      <Button
        onClick={onClick}
        className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-9 px-5 text-sm gap-2"
      >
        <Save className="w-3.5 h-3.5" />
        {label}
      </Button>
    </div>
  );
}

// ─── Services ─────────────────────────────────────────────────────────────────

function AddServiceModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    url: "",
    prefix: "",
  });

  const derivedPrefix = form.prefix || (form.name ? `/gateway/${form.name}` : "/gateway/...");

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#0f0f0f] border-white/15 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Add Service</DialogTitle>
          <DialogDescription className="text-gray-500">
            Register a microservice. A backend and gateway route will be created
            automatically.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: form.name,
              url: form.url,
              prefix: form.prefix || undefined,
            });
          }}
          className="space-y-3 pt-1"
        >
          <FieldInput
            label="Service Name"
            placeholder="e.g. dev"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          />
          <FieldInput
            label="Service URL"
            placeholder="e.g. http://dev:3000"
            value={form.url}
            onChange={(v) => setForm((f) => ({ ...f, url: v }))}
          />
          <FieldInput
            label="Gateway Prefix (optional)"
            placeholder={derivedPrefix}
            hint={`Requests to ${derivedPrefix}/* will be proxied to this service.`}
            value={form.prefix}
            onChange={(v) => setForm((f) => ({ ...f, prefix: v }))}
          />

          <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3 text-xs text-gray-400 space-y-1">
            <p className="font-medium text-amber-400">What will be created:</p>
            <p>Backend: <span className="text-white font-mono">{form.name || "..."}</span> → <span className="text-white font-mono">{form.url || "..."}</span></p>
            <p>Route: <span className="text-white font-mono">{derivedPrefix}/*</span> → strips prefix, forwards to backend</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={!form.name || !form.url}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold disabled:opacity-50"
            >
              Create Service
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

function ServicesTab({ services, refetch }) {
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async (service) => {
    if (!window.confirm(`Delete service "${service.name}" and all its routes?`))
      return;
    await api.deleteService(service._id || service.name);
    refetch();
  };

  const handleSubmit = async (payload) => {
    await api.createService(payload);
    setShowModal(false);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {services.length} service{services.length !== 1 ? "s" : ""} &bull;
          unified backend + route management
        </p>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-8 px-4 text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState
          message="No services configured"
          description="Add a microservice to start routing traffic through the gateway"
          icon="server"
        />
      ) : (
        <div className="space-y-2">
          {services.map((svc) => (
            <div
              key={svc._id || svc.name}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                svc.isActive
                  ? "bg-[#111111] border-amber-500/15 hover:border-amber-500/25"
                  : "bg-[#0a0a0a] border-amber-500/8 opacity-60",
              )}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  svc.isActive && svc.routeActive !== false
                    ? "bg-emerald-400"
                    : "bg-gray-600",
                )}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {svc.name}
                  </span>
                  {svc.prefix && (
                    <span className="text-[10px] px-1.5 py-0 rounded border border-amber-500/30 text-amber-400 bg-amber-400/5 font-mono font-medium shrink-0">
                      {svc.prefix}
                    </span>
                  )}
                  {svc.routes > 0 && (
                    <span className="text-[10px] px-1.5 py-0 rounded border border-blue-500/30 text-blue-400 bg-blue-400/5 font-medium shrink-0">
                      {svc.routes} route{svc.routes !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-0.5 truncate">
                  {svc.url}
                  {svc.gatewayPath && (
                    <span className="ml-2 font-mono text-gray-500">
                      {svc.gatewayPath}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={cn(
                    "px-2 py-1 rounded text-[11px] font-semibold border",
                    svc.isActive && svc.routeActive !== false
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20",
                  )}
                >
                  {svc.isActive && svc.routeActive !== false
                    ? "Active"
                    : "Inactive"}
                </span>
                {(svc.prefix || svc.url) && (
                  <a
                    href={svc.prefix ? `${API_BASE_URL}${svc.prefix}` : svc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    title="Open service URL"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(svc)}
                  className="bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 h-7 w-7 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddServiceModal
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// ─── General ──────────────────────────────────────────────────────────────────

function GeneralTab({ settings, onSave }) {
  const [form, setForm] = useState(() => ({
    gatewayName: "",
    loggingLevel: "info",
    logRetentionDays: 30,
    adaptiveRateLimiting: true,
    circuitBreaking: true,
    realtimeAnalytics: true,
    ddosThresholdRpm: 500,
    ...(settings || {}),
  }));

  return (
    <div className="space-y-4">
      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">
          Identity
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FieldInput
              label="Gateway Name"
              hint="Displayed in the dashboard header and logs."
              value={form.gatewayName}
              onChange={(v) => setForm((f) => ({ ...f, gatewayName: v }))}
            />
          </div>
          <FieldRow
            label="Logging Level"
            hint="Verbosity of structured backend logs."
          >
            <Select
              value={form.loggingLevel}
              onValueChange={(v) => setForm((f) => ({ ...f, loggingLevel: v }))}
            >
              <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white h-9 focus:ring-amber-500/40 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111111] border-white/15 text-white">
                {["error", "warn", "info", "debug"].map((l) => (
                  <SelectItem
                    key={l}
                    value={l}
                    className="focus:bg-amber-500/10 focus:text-amber-300"
                  >
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldInput
            label="Log Retention (days)"
            hint="Logs older than this are automatically purged."
            type="number"
            value={form.logRetentionDays}
            onChange={(v) =>
              setForm((f) => ({ ...f, logRetentionDays: Number(v) }))
            }
          />
        </div>
      </SectionCard>

      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-1">
          Feature Flags
        </p>
        <ToggleRow
          label="Adaptive Rate Limiting"
          description="Automatically tighten rate limits under load spikes."
          checked={form.adaptiveRateLimiting}
          onChange={(v) => setForm((f) => ({ ...f, adaptiveRateLimiting: v }))}
        />
        <ToggleRow
          label="Circuit Breaking"
          description="Open circuits to unhealthy backends after repeated failures."
          checked={form.circuitBreaking}
          onChange={(v) => setForm((f) => ({ ...f, circuitBreaking: v }))}
        />
        <ToggleRow
          label="Realtime Analytics"
          description="Stream live traffic data to the overview dashboard."
          checked={form.realtimeAnalytics}
          onChange={(v) => setForm((f) => ({ ...f, realtimeAnalytics: v }))}
        />
      </SectionCard>

      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">
          DDoS Protection
        </p>
        <FieldInput
          label="Threshold (req/min per route)"
          hint="Routes exceeding this RPM are automatically disabled."
          type="number"
          min={10}
          max={100000}
          value={form.ddosThresholdRpm}
          onChange={(v) =>
            setForm((f) => ({ ...f, ddosThresholdRpm: Number(v) }))
          }
        />
      </SectionCard>

      <SaveBtn onClick={() => onSave(form)} />
    </div>
  );
}

// ─── Rate Limiting ─────────────────────────────────────────────────────────────

function RateLimitingTab({ settings, onSave }) {
  const [global, setGlobal] = useState(() => ({
    requestsPerMinute: 100,
    burstMultiplier: 1.5,
    manualOverrideEnabled: false,
    manualOverrideRpm: 0,
    ...(settings?.rateLimiting?.global || {}),
  }));

  return (
    <div className="space-y-4">
      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">
          Global Limits
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldInput
            label="Requests Per Minute"
            hint="Default cap applied to all routes unless overridden."
            type="number"
            value={global.requestsPerMinute}
            onChange={(v) =>
              setGlobal((g) => ({ ...g, requestsPerMinute: Number(v) }))
            }
          />
          <FieldInput
            label="Burst Multiplier"
            hint="Allows short bursts above the base limit (e.g. 1.5\u00d7 = 50% burst)."
            type="number"
            step="0.1"
            value={global.burstMultiplier}
            onChange={(v) =>
              setGlobal((g) => ({ ...g, burstMultiplier: Number(v) }))
            }
          />
        </div>
      </SectionCard>

      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-1">
          Manual Override
        </p>
        <ToggleRow
          label="Enable Manual Override"
          description="Temporarily override the computed rate limit with a fixed value."
          checked={global.manualOverrideEnabled}
          onChange={(v) =>
            setGlobal((g) => ({ ...g, manualOverrideEnabled: v }))
          }
        />
        {global.manualOverrideEnabled && (
          <div className="pt-3">
            <FieldInput
              label="Override RPM"
              hint="This value hard-overrides the computed limit while active."
              type="number"
              value={global.manualOverrideRpm}
              onChange={(v) =>
                setGlobal((g) => ({ ...g, manualOverrideRpm: Number(v) }))
              }
            />
          </div>
        )}
      </SectionCard>

      <SaveBtn onClick={() => onSave({ global })} />
    </div>
  );
}

// ─── Circuit Breakers ──────────────────────────────────────────────────────────

function CircuitBreakersTab({ settings, backends, onSave }) {
  const [form, setForm] = useState(() => ({
    failureThreshold: 5,
    recoveryTimeoutMs: 30000,
    halfOpenMaxCalls: 3,
    ...(settings?.circuitBreaker || {}),
  }));

  const stateColor = (s) =>
    s === "OPEN"
      ? "text-red-400 bg-red-400/10 border-red-400/20"
      : s === "HALF_OPEN"
        ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
        : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";

  const stateLabel = (s) =>
    s === "OPEN" ? "Tripped" : s === "HALF_OPEN" ? "Testing" : "Normal";

  return (
    <div className="space-y-4">
      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">
          Thresholds
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FieldInput
            label="Failure Threshold"
            hint="Failures before tripping open."
            type="number"
            value={form.failureThreshold}
            onChange={(v) =>
              setForm((f) => ({ ...f, failureThreshold: Number(v) }))
            }
          />
          <FieldInput
            label="Recovery Timeout (ms)"
            hint="How long the circuit stays open before testing."
            type="number"
            value={form.recoveryTimeoutMs}
            onChange={(v) =>
              setForm((f) => ({ ...f, recoveryTimeoutMs: Number(v) }))
            }
          />
          <FieldInput
            label="Half-Open Max Calls"
            hint="Probe requests allowed before deciding to close or reopen."
            type="number"
            value={form.halfOpenMaxCalls}
            onChange={(v) =>
              setForm((f) => ({ ...f, halfOpenMaxCalls: Number(v) }))
            }
          />
        </div>
      </SectionCard>

      {backends.length > 0 && (
        <SectionCard>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">
            Live Backend State
          </p>
          <div className="space-y-2">
            {backends.map((b) => {
              const scoreNum =
                typeof b.healthScore === "number" ? b.healthScore : null;
              return (
                <div
                  key={b._id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/8"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        scoreNum === null
                          ? "#6b7280"
                          : scoreNum >= 80
                            ? "#10b981"
                            : scoreNum >= 50
                              ? "#f59e0b"
                              : "#ef4444",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {b.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Health: {scoreNum !== null ? `${scoreNum}%` : "N/A"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded border",
                      stateColor(b.circuitState),
                    )}
                  >
                    {stateLabel(b.circuitState || "CLOSED")}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <SaveBtn onClick={() => onSave(form)} />
    </div>
  );
}

// ─── Backends ─────────────────────────────────────────────────────────────────

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
      <DialogContent className="bg-[#0f0f0f] border-white/15 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {initial ? "Edit Backend" : "Add Backend"}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Configure backend routing parameters and health behavior.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="space-y-3 pt-1"
        >
          <FieldInput
            label="Name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            disabled={!!initial}
          />
          <FieldInput
            label="Base URL"
            value={form.base_url}
            onChange={(v) => setForm((f) => ({ ...f, base_url: v }))}
          />
          <FieldInput
            label="Health Endpoint"
            value={form.health_endpoint}
            onChange={(v) => setForm((f) => ({ ...f, health_endpoint: v }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Weight"
              type="number"
              value={form.weight}
              onChange={(v) => setForm((f) => ({ ...f, weight: Number(v) }))}
            />
            <FieldInput
              label="Timeout (ms)"
              type="number"
              value={form.timeout}
              onChange={(v) => setForm((f) => ({ ...f, timeout: Number(v) }))}
            />
          </div>

          <div className="pt-2 border-t border-white/8 space-y-2">
            <p className="text-xs text-gray-500">Health Score Thresholds</p>
            <div className="grid grid-cols-2 gap-3">
              <FieldInput
                label="Healthy above"
                type="number"
                min={0}
                max={100}
                value={form.healthyAbove}
                onChange={(v) =>
                  setForm((f) => ({ ...f, healthyAbove: Number(v) }))
                }
              />
              <FieldInput
                label="Degraded above"
                type="number"
                min={0}
                max={100}
                value={form.degradedAbove}
                onChange={(v) =>
                  setForm((f) => ({ ...f, degradedAbove: Number(v) }))
                }
              />
            </div>
            <div className="flex gap-3 text-xs pt-1">
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
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
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
      <DialogContent className="bg-[#0f0f0f] border-white/15 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Disable Route?
          </DialogTitle>
          <DialogDescription className="text-gray-400 space-y-1 pt-1">
            <span className="block font-mono text-amber-400">
              {route.method} {route.path}
            </span>
            <span className="block text-sm">
              → {route.backendId?.name ?? route.backendId}
            </span>
            <span className="block text-sm text-red-400 pt-1">
              All traffic to this route will stop immediately.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-1">
          <Button
            onClick={onConfirm}
            className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400"
          >
            Disable
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

// ─── Routes ────────────────────────────────────────────────────────────────────

// ─── Backends ──────────────────────────────────────────────────────────────────

function BackendsTab({ backends, refetch }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const handleDelete = async (b) => {
    if (!window.confirm(`Delete backend "${b.name}"?`)) return;
    await api.deleteBackend(b._id || b.name);
    refetch();
  };

  const handleToggle = async (b) => {
    await api.updateBackend(b._id || b.name, { ...b, isActive: !b.isActive });
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {backends.length} backend{backends.length !== 1 ? "s" : ""} &bull;
          upstream services
        </p>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-8 px-4 text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Backend
        </Button>
      </div>

      {backends.length === 0 ? (
        <EmptyState
          message="No backends configured"
          description="Add an upstream service to start routing traffic"
          icon="server"
        />
      ) : (
        <div className="space-y-2">
          {backends.map((b) => (
            <div
              key={b._id || b.name}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                b.isActive
                  ? "bg-[#111111] border-amber-500/15 hover:border-amber-500/25"
                  : "bg-[#0a0a0a] border-amber-500/8 opacity-60",
              )}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  b.isActive ? "bg-emerald-400" : "bg-gray-600",
                )}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {b.name}
                  </span>
                  {b.weight && b.weight !== 1 && (
                    <span className="text-[10px] px-1.5 py-0 rounded border border-blue-500/30 text-blue-400 bg-blue-400/5 font-medium shrink-0">
                      w:{b.weight}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-0.5 truncate">
                  {b.baseUrl}
                  {b.healthCheckPath && (
                    <span className="ml-2 font-mono">{b.healthCheckPath}</span>
                  )}
                  {b.timeout && (
                    <span className="ml-2 text-gray-700">{b.timeout}ms</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggle(b)}
                  className={cn(
                    "px-2 py-1 rounded text-[11px] font-semibold transition-colors border",
                    b.isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20",
                  )}
                >
                  {b.isActive ? "Active" : "Inactive"}
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(b);
                    setShowModal(true);
                  }}
                  className="bg-white/5 hover:bg-white/10 border-amber-500/15 text-gray-400 hover:text-white h-7 w-7 p-0"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(b)}
                  className="bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 h-7 w-7 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
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

// ─── Routes ────────────────────────────────────────────────────────────────────

const METHOD_COLORS = {
  GET: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  POST: "text-amber-400  bg-amber-400/10  border-amber-400/25",
  PUT: "text-blue-400   bg-blue-400/10   border-blue-400/25",
  PATCH: "text-purple-400 bg-purple-400/10 border-purple-400/25",
  DELETE: "text-red-400    bg-red-400/10    border-red-400/25",
  "*": "text-gray-300   bg-white/5       border-white/10",
};

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

  const sorted = [...routes].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {routes.length} route{routes.length !== 1 ? "s" : ""} &bull; matched
          in priority order
        </p>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-8 px-4 text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Route
        </Button>
      </div>

      {routes.length === 0 ? (
        <EmptyState
          message="No routes configured"
          description="Add your first route to start proxying traffic"
          icon="server"
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((route) => (
            <div
              key={route._id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                route.isActive
                  ? "bg-[#111111] border-amber-500/15 hover:border-amber-500/25"
                  : "bg-[#0a0a0a] border-amber-500/8 opacity-60",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono shrink-0 leading-5",
                  METHOD_COLORS[route.method] ?? METHOD_COLORS["*"],
                )}
              >
                {route.method}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-white truncate">
                    {route.path}
                  </span>
                  {route.requiresAuth && (
                    <span className="text-[10px] px-1.5 py-0 rounded border border-amber-500/30 text-amber-400 bg-amber-400/5 font-medium shrink-0">
                      Auth
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  \u2192 {route.backendId?.name ?? route.backendId}
                  {route.stripPrefix && (
                    <span className="ml-2">
                      strip:{" "}
                      <span className="font-mono">{route.stripPrefix}</span>
                    </span>
                  )}
                  {route.addPrefix && (
                    <span className="ml-2">
                      add: <span className="font-mono">{route.addPrefix}</span>
                    </span>
                  )}
                  <span className="ml-2 text-gray-700">
                    p:{route.priority ?? 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggleActive(route)}
                  className={cn(
                    "px-2 py-1 rounded text-[11px] font-semibold transition-colors border",
                    route.isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20",
                  )}
                >
                  {route.isActive ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => handleKill(route)}
                  disabled={!route.isActive}
                  title="Kill route immediately"
                  className={cn(
                    "p-1.5 rounded transition-all",
                    route.isActive
                      ? "text-red-400 hover:text-red-300 hover:bg-red-500/15 shadow-[0_0_6px_rgba(239,68,68,0.3)]"
                      : "text-gray-700 cursor-not-allowed",
                  )}
                >
                  <Zap className="h-3.5 w-3.5" />
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(route);
                    setShowModal(true);
                  }}
                  className="bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-white h-7 w-7 p-0"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(route)}
                  className="bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 h-7 w-7 p-0"
                >
                  <Trash2 className="w-3 h-3" />
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
      <DialogContent className="bg-[#0f0f0f] border-white/15 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {initial ? "Edit Route" : "Add Route"}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Configure the path, method and target backend.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="space-y-3 pt-1"
        >
          <FieldInput
            label="Path (e.g. /api/v1/*)"
            value={form.path}
            onChange={(v) => setForm((f) => ({ ...f, path: v }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Method">
              <Select
                value={form.method}
                onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}
              >
                <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white h-9 focus:ring-amber-500/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/15 text-white">
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Backend">
              <Select
                value={form.backendId}
                onValueChange={(v) => setForm((f) => ({ ...f, backendId: v }))}
              >
                <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white h-9 focus:ring-amber-500/40">
                  <SelectValue placeholder="Select backend" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/15 text-white">
                  {backends.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Strip Prefix"
              value={form.stripPrefix}
              onChange={(v) => setForm((f) => ({ ...f, stripPrefix: v }))}
            />
            <FieldInput
              label="Add Prefix"
              value={form.addPrefix}
              onChange={(v) => setForm((f) => ({ ...f, addPrefix: v }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Rate Limit (rpm)"
              value={form.rateLimit}
              onChange={(v) => setForm((f) => ({ ...f, rateLimit: v }))}
            />
            <FieldInput
              label="Priority"
              type="number"
              value={form.priority}
              onChange={(v) => setForm((f) => ({ ...f, priority: Number(v) }))}
            />
          </div>

          <div className="flex gap-4 pt-1 border-t border-amber-500/15">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                className="data-[state=checked]:bg-amber-500"
              />
              <span className="text-sm text-gray-300">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={form.requiresAuth}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, requiresAuth: v }))
                }
                className="data-[state=checked]:bg-amber-500"
              />
              <span className="text-sm text-gray-300">Requires Auth</span>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
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

// ─── Security ──────────────────────────────────────────────────────────────────

function SecurityTab({ settings, onSave }) {
  const [form, setForm] = useState(() => ({
    jwtExpiry: 3600,
    apiKeyHeader: "x-api-key",
    ...(settings?.security || {}),
  }));
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

  const safeKeys = useMemo(() => (Array.isArray(keys) ? keys : []), [keys]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-4">
      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">
          Authentication
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldInput
            label="JWT Expiry (seconds)"
            hint="How long issued JWT tokens remain valid."
            type="number"
            value={form.jwtExpiry}
            onChange={(v) => setForm((f) => ({ ...f, jwtExpiry: Number(v) }))}
          />
          <FieldInput
            label="API Key Header"
            hint="The request header name used to pass API keys."
            value={form.apiKeyHeader}
            onChange={(v) => setForm((f) => ({ ...f, apiKeyHeader: v }))}
          />
        </div>
      </SectionCard>

      <SaveBtn onClick={() => onSave(form)} />

      <SectionCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-semibold text-white">API Keys</p>
            <span className="text-xs text-gray-600">
              {safeKeys.length} key{safeKeys.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button
            onClick={() => setShowCreateKey(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-8 px-3 text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Key
          </Button>
        </div>

        {keysLoading ? (
          <LoadingSkeleton variant="table" count={3} />
        ) : keysError ? (
          <ErrorMessage
            error={
              keysError.response?.status === 403
                ? { message: "Admin role required to manage API keys." }
                : keysError
            }
            onRetry={refetchKeys}
          />
        ) : safeKeys.length === 0 ? (
          <EmptyState message="No API keys" icon="key" />
        ) : (
          <div className="space-y-2">
            {safeKeys.map((k) => (
              <div
                key={k._id || k.id}
                className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-white/8 rounded-lg"
              >
                <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{k.name}</p>
                  <p className="text-xs text-gray-600 font-mono">
                    {k.keyPrefix || k.prefix}\u2026 \u00b7 {k.clientId}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/10 text-gray-400 hover:text-white h-7 px-2.5 text-xs"
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
                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 h-7 w-7 p-0"
                    onClick={async () => {
                      await api.deleteApiKey(k._id || k.id);
                      refetchKeys();
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {createdKey && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/25">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-semibold text-amber-400">
              New key created \u2014 copy it now
            </p>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-[#0a0a0a] rounded-lg border border-white/10">
            <code className="text-sm text-white font-mono flex-1 break-all">
              {createdKey.rawKey}
            </code>
            <button
              onClick={() => handleCopy(createdKey.rawKey)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors shrink-0"
            >
              {copied === createdKey.rawKey ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            This key will not be shown again.
          </p>
        </div>
      )}

      {showCreateKey && (
        <Dialog open onOpenChange={(o) => !o && setShowCreateKey(false)}>
          <DialogContent className="bg-[#0f0f0f] border-white/15 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Create API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <FieldInput
                label="Name"
                value={newKey.name}
                onChange={(v) => setNewKey((k) => ({ ...k, name: v }))}
              />
              <FieldInput
                label="Client ID"
                value={newKey.clientId}
                onChange={(v) => setNewKey((k) => ({ ...k, clientId: v }))}
              />
              <FieldInput
                label="Scopes (comma-separated)"
                value={newKey.scopes}
                onChange={(v) => setNewKey((k) => ({ ...k, scopes: v }))}
              />
              <FieldInput
                label="Rate Limit (optional)"
                value={newKey.rateLimit}
                onChange={(v) => setNewKey((k) => ({ ...k, rateLimit: v }))}
              />
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
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
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Alerts ────────────────────────────────────────────────────────────────────

function AlertsTab({ settings, onSave }) {
  const [email, setEmail] = useState(() => settings?.alerts?.email || "");
  const [webhook, setWebhook] = useState(() => settings?.alerts?.webhook || "");
  const [rules, setRules] = useState(() =>
    Array.isArray(settings?.alerts?.rules) ? settings.alerts.rules : [],
  );

  return (
    <div className="space-y-4">
      {rules.length > 0 && (
        <SectionCard>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-1">
            Alert Rules
          </p>
          {rules.map((rule, i) => (
            <ToggleRow
              key={rule.name}
              label={rule.name}
              checked={rule.enabled}
              onChange={(v) =>
                setRules((prev) =>
                  prev.map((r, idx) => (idx === i ? { ...r, enabled: v } : r)),
                )
              }
            />
          ))}
        </SectionCard>
      )}

      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">
          Delivery Channels
        </p>
        <div className="space-y-4">
          <FieldRow
            label="Alert Email"
            hint="Incidents and degradation events will be sent here."
          >
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@company.com"
                className="pl-9 bg-[#0a0a0a] border-white/10 text-white placeholder:text-gray-700 h-9 focus-visible:ring-amber-500/40 focus-visible:ring-offset-0"
              />
            </div>
          </FieldRow>
          <FieldRow
            label="Webhook URL"
            hint="POST requests with alert payloads will be sent here."
          >
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
              <Input
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder="https://hooks.example.com/\u2026"
                className="pl-9 bg-[#0a0a0a] border-white/10 text-white placeholder:text-gray-700 h-9 focus-visible:ring-amber-500/40 focus-visible:ring-offset-0"
              />
            </div>
          </FieldRow>
        </div>
      </SectionCard>

      <SaveBtn onClick={() => onSave({ email, webhook, rules })} />
    </div>
  );
}
