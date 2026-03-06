const Log = require("../models/Log");
const logger = require("../utils/logger");

const MAX_QUEUE_SIZE = 5000;
const FLUSH_INTERVAL_MS = 750;
const BATCH_SIZE = 200;

let queue = [];
let flushing = false;
let timer = null;
let currentBatch = [];

function enqueueLog(entry) {
  if (!entry) return;

  if (queue.length >= MAX_QUEUE_SIZE) {
    // Keep newest logs under pressure.
    queue.shift();
  }
  queue.push(entry);
}

async function flushLogs() {
  if (flushing || queue.length === 0) return;
  flushing = true;

  try {
    currentBatch = queue.splice(0, BATCH_SIZE);
    if (currentBatch.length === 0) return;
    await Log.insertMany(currentBatch, { ordered: false });
  } catch (err) {
    // Requeue on transient failure up to max queue size.
    if (currentBatch.length > 0) {
      queue = [...currentBatch, ...queue].slice(0, MAX_QUEUE_SIZE);
    }
    logger.error("[LogQueue] flush failed", { error: err.message });
  } finally {
    currentBatch = [];
    flushing = false;
  }
}

function startLogQueue() {
  if (timer) return;
  timer = setInterval(flushLogs, FLUSH_INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
}

function stopLogQueue() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

module.exports = {
  enqueueLog,
  flushLogs,
  startLogQueue,
  stopLogQueue,
};
