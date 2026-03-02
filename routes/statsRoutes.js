import express from "express";
import db from "../config/firebase.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
import { Timestamp } from "firebase-admin/firestore";

// 🔹 Helper: Get today range
function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start, end];
}

// 🔹 Helper: Get month range
function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return [start, end];
}

// ✅ GET /api/stats/today/:station
router.get("/today/:station", authenticateToken, async (req, res) => {
  const { station } = req.params;
  const [start, end] = getTodayRange();

  try {
    const snapshot = await db
      .collection("station_stats")
      .where("stationCode", "==", station)
      .where("timestamp", ">=", start.toISOString())
      .where("timestamp", "<", end.toISOString())
      .get();

    const stats = snapshot.docs.map((doc) => doc.data());
    res.json({ count: stats.length, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /api/stats/month/:station
router.get("/month/:station", authenticateToken, async (req, res) => {
  const { station } = req.params;
  const [start, end] = getMonthRange();

  try {
    const snapshot = await db
      .collection("station_stats")
      .where("stationCode", "==", station)
      .where("timestamp", ">=", start.toISOString())
      .where("timestamp", "<", end.toISOString())
      .get();

    const stats = snapshot.docs.map((doc) => doc.data());
    res.json({ count: stats.length, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /api/stats/summary
router.get("/summary", authenticateToken, async (req, res) => {
  const [start, end] = getTodayRange();
  try {
    const snapshot = await db
      .collection("station_stats")
      .where("timestamp", ">=", start.toISOString())
      .where("timestamp", "<", end.toISOString())
      .get();

    const grouped = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!grouped[data.stationCode]) {
        grouped[data.stationCode] = { available: 0, rented: 0 };
      }
      grouped[data.stationCode].available += data.availableCount;
      grouped[data.stationCode].rented += data.rentedCount;
    });

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
