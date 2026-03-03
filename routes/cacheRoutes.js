import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { syncUsersFromFirebase, getCacheStats } from "../utils/userCache.js";
import db from "../config/firebase.js";

const router = express.Router();

// Sync users from Firebase to cache (ADMIN ONLY)
router.post("/sync", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const count = await syncUsersFromFirebase(db);
    res.json({ 
      message: "Cache synced successfully ✅", 
      usersSynced: count 
    });
  } catch (err) {
    console.error("Cache sync error:", err);
    res.status(500).json({ 
      error: "Failed to sync cache ❌",
      details: err.message 
    });
  }
});

// Get cache statistics (ADMIN ONLY)
router.get("/stats", authenticateToken, requireAdmin, (req, res) => {
  try {
    const stats = getCacheStats();
    res.json(stats);
  } catch (err) {
    console.error("Cache stats error:", err);
    res.status(500).json({ 
      error: "Failed to get cache stats ❌" 
    });
  }
});

export default router;
