/**
 * Alert Notification Service.
 *
 * Creates alerts and optionally dispatches them via:
 *   - Dashboard (always — stored in MongoDB + emitted via WebSocket)
 *   - Email (if SMTP configured and alerts.email is set)
 *   - Webhook (if alerts.webhook URL is set)
 */

const Alert = require("../models/Alert");
const Config = require("../models/Config");
const { emitAlert } = require("./websocket");
const logger = require("../utils/logger");

let _alertConfigCache = null;
let _alertConfigCachedAt = 0;

async function getAlertConfig() {
  const now = Date.now();
  if (_alertConfigCache && now - _alertConfigCachedAt < 30_000) {
    return _alertConfigCache;
  }

  const docs = await Config.find({
    key: { $in: ["alerts.email", "alerts.webhook", "alerts.rules"] },
    isActive: true,
  }).lean();

  const map = {};
  docs.forEach((d) => {
    map[d.key] = d.value;
  });

  _alertConfigCache = {
    email: map["alerts.email"] || "",
    webhook: map["alerts.webhook"] || "",
    rules: Array.isArray(map["alerts.rules"]) ? map["alerts.rules"] : [],
  };
  _alertConfigCachedAt = now;
  return _alertConfigCache;
}

function invalidateAlertConfigCache() {
  _alertConfigCache = null;
  _alertConfigCachedAt = 0;
}

function isRuleEnabled(rules, ruleName) {
  const rule = rules.find((r) => r.name === ruleName);
  return rule ? rule.enabled : false;
}

async function sendWebhook(webhookUrl, payload) {
  try {
    const { default: fetch } = await import("node-fetch").catch(() => {
      return { default: globalThis.fetch };
    });
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    logger.debug("[AlertService] Webhook dispatched", { url: webhookUrl });
  } catch (err) {
    logger.error("[AlertService] Webhook failed", {
      url: webhookUrl,
      error: err.message,
    });
  }
}

async function sendEmail(to, subject, text) {
  try {
    const nodemailer = require("nodemailer");
    const host = process.env.SMTP_HOST;
    if (!host) return;

    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@gateway.local",
      to,
      subject,
      text,
    });
    logger.debug("[AlertService] Email sent", { to, subject });
  } catch (err) {
    logger.error("[AlertService] Email failed", { to, error: err.message });
  }
}

/**
 * Create and dispatch an alert.
 * @param {string} type - "error" | "warning" | "info" | "ddos"
 * @param {string} message - Human-readable message
 * @param {Object} [opts] - Additional options
 * @param {string} [opts.source] - Alert source identifier
 * @param {string} [opts.backendId] - Related backend ID
 * @param {string} [opts.ruleName] - Alert rule name to check if enabled
 * @param {Object} [opts.metadata] - Extra metadata
 */
async function createAlert(type, message, opts = {}) {
  try {
    const config = await getAlertConfig();

    if (opts.ruleName && !isRuleEnabled(config.rules, opts.ruleName)) {
      return null;
    }

    const alert = await Alert.create({
      type,
      message,
      source: opts.source || "system",
      backendId: opts.backendId,
      isRead: false,
      metadata: opts.metadata || {},
    });

    emitAlert({
      _id: alert._id,
      type: alert.type,
      message: alert.message,
      source: alert.source,
      createdAt: alert.createdAt,
    });

    if (config.webhook) {
      sendWebhook(config.webhook, {
        type,
        message,
        source: opts.source,
        timestamp: new Date().toISOString(),
        metadata: opts.metadata,
      }).catch(() => {});
    }

    if (config.email) {
      sendEmail(
        config.email,
        `[Gateway Alert] ${type.toUpperCase()}: ${message}`,
        `Alert Type: ${type}\nMessage: ${message}\nSource: ${opts.source || "system"}\nTimestamp: ${new Date().toISOString()}\n\nMetadata:\n${JSON.stringify(opts.metadata || {}, null, 2)}`,
      ).catch(() => {});
    }

    return alert;
  } catch (err) {
    logger.error("[AlertService] Failed to create alert", {
      error: err.message,
    });
    return null;
  }
}

module.exports = {
  createAlert,
  invalidateAlertConfigCache,
};
