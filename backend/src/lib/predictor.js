/**
 * Prediction Engine
 * 
 * Analyzes error rates, latency trends, and endpoint health to predict
 * upcoming backend service issues. Uses simple statistical methods:
 * - Linear regression for trend detection
 * - Threshold-based alerting
 * - Moving averages for smoothing
 */

const Log = require("../models/Log");
const Analytics = require("../models/Analytics");

/**
 * Calculate linear regression slope for trend detection
 * Returns: slope (negative = improving, positive = degrading)
 */
function calculateSlope(values) {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const xMean = xValues.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (values[i] - yMean);
    denominator += (xValues[i] - xMean) * (xValues[i] - xMean);
  }
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Bucket logs by time period (hourly)
 */
function bucketByHour(logs) {
  const map = {};
  logs.forEach((l) => {
    const hour = new Date(l.timestamp);
    hour.setMinutes(0, 0, 0);
    const key = hour.toISOString();
    
    if (!map[key]) {
      map[key] = { 
        timestamp: hour, 
        totalRequests: 0, 
        errors: 0, 
        latencies: [],
        errorRate: 0,
        avgLatency: 0
      };
    }
    
    map[key].totalRequests += 1;
    if (l.status >= 400) map[key].errors += 1;
    map[key].latencies.push(l.latency || 0);
  });
  
  // Calculate metrics for each bucket
  Object.values(map).forEach(bucket => {
    bucket.errorRate = bucket.totalRequests > 0 
      ? (bucket.errors / bucket.totalRequests) * 100 
      : 0;
    bucket.avgLatency = bucket.latencies.length > 0
      ? bucket.latencies.reduce((a, b) => a + b, 0) / bucket.latencies.length
      : 0;
  });
  
  return Object.values(map).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Analyze per-endpoint health
 */
function analyzeEndpoints(logs) {
  const map = {};
  
  logs.forEach((l) => {
    const ep = l.endpoint;
    if (!map[ep]) {
      map[ep] = {
        endpoint: ep,
        requests: 0,
        errors: 0,
        latencies: [],
        errorRate: 0,
        avgLatency: 0
      };
    }
    
    map[ep].requests += 1;
    if (l.status >= 400) map[ep].errors += 1;
    map[ep].latencies.push(l.latency || 0);
  });
  
  // Calculate metrics
  Object.values(map).forEach(ep => {
    ep.errorRate = ep.requests > 0 ? (ep.errors / ep.requests) * 100 : 0;
    ep.avgLatency = ep.latencies.length > 0
      ? ep.latencies.reduce((a, b) => a + b, 0) / ep.latencies.length
      : 0;
  });
  
  return Object.values(map);
}

/**
 * Generate health status based on metrics
 */
function getHealthStatus(errorRate, latency, isIncreasing) {
  if (errorRate > 30 || latency > 5000) return "critical";
  if (errorRate > 15 || latency > 2000 || isIncreasing) return "warning";
  return "healthy";
}

/**
 * Main prediction function
 * Analyzes recent logs and generates predictions
 */
async function generatePredictions(hoursBack = 24) {
  try {
    // Get logs from the past N hours
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const logs = await Log.find({
      timestamp: { $gte: since }
    })
      .sort({ timestamp: 1 })
      .lean()
      .limit(50000);
    
    if (logs.length === 0) {
      return {
        predictions: {
          overallHealth: "unknown",
          trend: "stable",
          confidence: 0,
          predictedIssues: [],
          message: "Insufficient data for predictions"
        }
      };
    }
    
    // Split data into time windows for trend analysis
    const buckets = bucketByHour(logs);
    const recentBuckets = buckets.slice(-4); // Last 4 hours
    const olderBuckets = buckets.slice(-12, -4); // 4-12 hours ago
    
    // Calculate current metrics
    const currentBucket = buckets[buckets.length - 1];
    const currentErrorRate = currentBucket?.errorRate || 0;
    const currentLatency = currentBucket?.avgLatency || 0;
    
    // Analyze trends
    const errorRates = buckets.map(b => b.errorRate);
    const latencies = buckets.map(b => b.avgLatency);
    
    const errorSlope = calculateSlope(errorRates);
    const latencySlope = calculateSlope(latencies);
    
    // Calculate moving averages
    const recentErrorRate = recentBuckets.length > 0
      ? recentBuckets.reduce((sum, b) => sum + b.errorRate, 0) / recentBuckets.length
      : 0;
    const olderErrorRate = olderBuckets.length > 0
      ? olderBuckets.reduce((sum, b) => sum + b.errorRate, 0) / olderBuckets.length
      : 0;
    
    const recentLatency = recentBuckets.length > 0
      ? recentBuckets.reduce((sum, b) => sum + b.avgLatency, 0) / recentBuckets.length
      : 0;
    const olderLatency = olderBuckets.length > 0
      ? olderBuckets.reduce((sum, b) => sum + b.avgLatency, 0) / olderBuckets.length
      : 0;
    
    // Detect if metrics are increasing
    const errorRateIncreasing = errorSlope > 0.1;
    const latencyIncreasing = latencySlope > 10;
    
    // Analyze endpoints
    const endpoints = analyzeEndpoints(logs);
    const problemEndpoints = endpoints
      .filter(ep => ep.errorRate > 10 || ep.avgLatency > 1000)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);
    
    // Build predicted issues
    const predictedIssues = [];
    
    // Issue: High error rate
    if (currentErrorRate > 10) {
      predictedIssues.push({
        type: "high_error_rate",
        severity: currentErrorRate > 30 ? "high" : currentErrorRate > 20 ? "medium" : "low",
        affectedEndpoint: "overall",
        currentValue: currentErrorRate.toFixed(2),
        threshold: 10,
        recentTrend: errorRateIncreasing ? "increasing" : "stable",
        confidence: Math.min(100, 60 + (currentErrorRate * 2)),
        recommendation: "Check backend service health and error logs"
      });
    }
    
    // Issue: Increasing error rate trend
    if (errorRateIncreasing && olderErrorRate < recentErrorRate) {
      const increase = ((recentErrorRate - olderErrorRate) / Math.max(1, olderErrorRate)) * 100;
      predictedIssues.push({
        type: "error_rate_degradation",
        severity: increase > 50 ? "high" : "medium",
        affectedEndpoint: "overall",
        currentValue: recentErrorRate.toFixed(2),
        threshold: olderErrorRate.toFixed(2),
        recentTrend: "increasing",
        confidence: Math.min(100, 70 + increase),
        recommendation: "Error rate is increasing. Monitor backend services and recent deployments"
      });
    }
    
    // Issue: High latency
    if (currentLatency > 500) {
      predictedIssues.push({
        type: "latency_spike",
        severity: currentLatency > 2000 ? "high" : currentLatency > 1000 ? "medium" : "low",
        affectedEndpoint: "overall",
        currentValue: currentLatency.toFixed(2),
        threshold: 500,
        recentTrend: latencyIncreasing ? "increasing" : "stable",
        confidence: Math.min(100, 60 + (currentLatency / 50)),
        recommendation: "Check backend response times and database performance"
      });
    }
    
    // Issue: Increasing latency trend
    if (latencyIncreasing && olderLatency > 0 && recentLatency > olderLatency) {
      const increase = ((recentLatency - olderLatency) / olderLatency) * 100;
      predictedIssues.push({
        type: "latency_degradation",
        severity: increase > 50 ? "high" : "medium",
        affectedEndpoint: "overall",
        currentValue: recentLatency.toFixed(2),
        threshold: olderLatency.toFixed(2),
        recentTrend: "increasing",
        confidence: Math.min(100, 70 + Math.min(increase, 30)),
        recommendation: "Latency is increasing. Check database, external APIs, and resource usage"
      });
    }
    
    // Issue: Problem endpoints
    problemEndpoints.forEach(ep => {
      if (predictedIssues.length < 10) {
        predictedIssues.push({
          type: "endpoint_failure",
          severity: ep.errorRate > 30 ? "high" : "medium",
          affectedEndpoint: ep.endpoint,
          currentValue: ep.errorRate.toFixed(2),
          threshold: 10,
          recentTrend: "unstable",
          confidence: Math.min(100, 60 + ep.errorRate),
          recommendation: `Endpoint ${ep.endpoint} has high error rate. Check service implementation`
        });
      }
    });
    
    // Determine overall health
    const isIncreasing = errorRateIncreasing || latencyIncreasing;
    const overallHealth = getHealthStatus(currentErrorRate, currentLatency, isIncreasing);
    
    // Determine trend
    let trend = "stable";
    if (errorRateIncreasing || latencyIncreasing) trend = "degrading";
    if (errorSlope < -0.1 || latencySlope < -10) trend = "improving";
    
    // Calculate overall confidence
    const confidence = Math.max(
      ...predictedIssues.map(i => i.confidence || 0),
      (buckets.length / 24) * 100
    );
    
    return {
      predictions: {
        overallHealth,
        trend,
        confidence: Math.min(100, Math.round(confidence)),
        predictedIssues: predictedIssues.sort((a, b) => {
          const severityMap = { high: 3, medium: 2, low: 1 };
          return severityMap[b.severity] - severityMap[a.severity];
        }),
        metadata: {
          lookbackHours: hoursBack,
          logsAnalyzed: logs.length,
          timeWindow: {
            from: since.toISOString(),
            to: new Date().toISOString()
          },
          currentMetrics: {
            errorRate: currentErrorRate.toFixed(2),
            avgLatency: currentLatency.toFixed(2),
            errorTrend: errorSlope.toFixed(4),
            latencyTrend: latencySlope.toFixed(2)
          }
        }
      }
    };
  } catch (err) {
    console.error("Error generating predictions:", err);
    return {
      predictions: {
        overallHealth: "unknown",
        trend: "stable",
        confidence: 0,
        predictedIssues: [],
        error: err.message
      }
    };
  }
}

module.exports = {
  generatePredictions,
  calculateSlope,
  bucketByHour,
  analyzeEndpoints,
  getHealthStatus
};
