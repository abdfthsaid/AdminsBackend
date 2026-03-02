import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";

// 🔗 Route imports
import stationRoutes from "./routes/stationRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import updateStationStats from "./jobs/station_stats.js";
import customerRoutes from "./routes/customers.js";
import revenueRoutes from "./routes/revenue.js";
import userRoutes from "./routes/userRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import chartsRoute from "./routes/charts.js";
import chartsAll from "./routes/chartsAll.js";
import blacklistRoutes from "./routes/blacklistRoutes.js";

import db from "./config/firebase.js";

// 🌍 ENV
const { PORT = 4000 } = process.env;

// 🛠️ App setup
const app = express();

// � Trust proxy - required for Render deployment
app.set("trust proxy", 1);

// 🚫 Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many login attempts, please try again later ⏳",
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for dashboard endpoints
const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Reduced from 300 to 100 requests per minute
  message: "Too many requests, please slow down ⏳",
  standardHeaders: true,
  legacyHeaders: false,
});

// 🚫 ULTRA STRICT: Block almost all unauthenticated traffic
const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1, // Only 1 request per minute for unauthenticated (extremely strict)
  message: "Access denied. Too many requests.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting if request has valid auth token
    const authHeader = req.headers.authorization;
    return authHeader && authHeader.startsWith("Bearer ");
  },
});

// 🛡️ Middleware to block all unauthenticated requests except login and health
const blockUnauthenticated = (req, res, next) => {
  // Allow health check and login without auth
  if (req.path === "/health" || req.path === "/api/users/login") {
    return next();
  }

  // Check for valid auth token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(
      `🚫 BLOCKED unauthenticated request: ${req.method} ${req.path} from IP: ${req.ip}`,
    );
    return res.status(401).json({ error: "Authentication required" });
  }

  next();
};

app.use(cors());
app.use(bodyParser.json());

// 🛡️ FIRST: Block all unauthenticated traffic (except login/health)
app.use(blockUnauthenticated);

// 🛡️ SECOND: Apply strict rate limiting to remaining unauthenticated requests
app.use(strictLimiter);

// � Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[ADMIN] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`,
    );
  });
  next();
});

// 🌐 Home route
app.get("/", (req, res) => {
  res.send("🔐 Admin Server is running!");
});

// 🕐 Server timezone info
app.get("/api/timezone", (req, res) => {
  const now = new Date();
  res.json({
    serverTime: now.toISOString(),
    serverTimeLocal: now.toString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: now.getTimezoneOffset(),
    offsetHours: -now.getTimezoneOffset() / 60,
  });
});

// 📦 Admin Routes (protected with JWT via middleware in routes)
app.use("/api/stations", dashboardLimiter, stationRoutes);
app.use("/api/stats", dashboardLimiter, statsRoutes);
app.use("/api/customers", dashboardLimiter, customerRoutes);
app.use("/api/revenue", dashboardLimiter, revenueRoutes);
app.use("/api/users", dashboardLimiter, userRoutes);
app.use("/api/transactions", dashboardLimiter, transactionRoutes);
app.use("/api/charts", dashboardLimiter, chartsRoute);
app.use("/api/chartsAll", dashboardLimiter, chartsAll);
app.use("/api/blacklist", dashboardLimiter, blacklistRoutes);

// ❌ Express error handling
app.use((err, req, res, next) => {
  console.error("❌ Express error:", err.stack);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// ⏱️ Auto update station stats every 30 minutes (reduced frequency to prevent server overload)
setInterval(
  async () => {
    try {
      console.log("⏱️ Updating station stats...");
      await updateStationStats();
    } catch (err) {
      console.error("❌ Station stats update failed:", err.message);
      console.error("Stack trace:", err.stack);
      // Job failed but server continues running - error is logged and isolated
    }
  },
  30 * 60 * 1000, // 30 minutes
);

console.log("✅ Station stats auto-update is ENABLED (every 30 minutes)");

// 🏥 Health check endpoint
app.get("/health", (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    status: "healthy",
    uptime: Math.floor(uptime),
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
    },
    timestamp: new Date().toISOString(),
  });
});

// 🚨 Global error handlers - Improved to prevent crashes
process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
  console.error("Stack:", err.stack);
  console.error(
    "⚠️ Server continuing despite uncaught exception - please investigate!",
  );
  // Don't exit - log and continue (unless it's a critical error)
  if (err.code === "EADDRINUSE" || err.code === "EACCES") {
    console.error("🚨 Critical error - exiting");
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION at:", promise);
  console.error("Reason:", reason);
  console.error(
    "⚠️ Server continuing despite unhandled rejection - please investigate!",
  );
  // Don't crash - log and continue
});

// 🧹 Memory monitoring
setInterval(
  () => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    // Log memory usage every hour
    console.log(`💾 Memory: ${heapUsedMB}MB / ${heapTotalMB}MB`);

    // Alert if memory usage is high (>400MB)
    if (heapUsedMB > 400) {
      console.warn(
        `⚠️ HIGH MEMORY USAGE: ${heapUsedMB}MB - consider investigating`,
      );
    }
  },
  60 * 60 * 1000,
); // Every hour

// 🚀 Server start
const server = app.listen(PORT, () => {
  console.log(`✅ Admin Server running on port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

// 🛑 Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Closing admin server gracefully...`);
  server.close(() => {
    console.log("✅ Admin server closed");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("⚠️ Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
