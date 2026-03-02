import express from "express";
import db from "../config/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import {
  authenticateToken,
  requireAdmin,
  requireModerator,
  requireUser,
} from "../middleware/auth.js";

const router = express.Router();

// Helper: extract last 9 digits from any phone format
function normalizePhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.slice(-9);
}

// 🚫 GET all blacklisted users (All authenticated users can view)
router.get("/", authenticateToken, requireUser, async (req, res) => {
  try {
    const snapshot = await db.collection("blacklist").get();
    const blacklist = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(blacklist);
  } catch (err) {
    console.error("❌ Error fetching blacklist:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🚫 ADD user to blacklist (All authenticated users can add)
router.post("/", authenticateToken, requireUser, async (req, res) => {
  const { phoneNumber, reason, customerName } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  try {
    const normalizedPhone = normalizePhone(phoneNumber);

    // Check if already blacklisted (by normalized phone)
    const existing = await db
      .collection("blacklist")
      .where("normalizedPhone", "==", normalizedPhone)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res
        .status(400)
        .json({ error: "Phone number already blacklisted" });
    }

    const docRef = await db.collection("blacklist").add({
      phoneNumber,
      normalizedPhone,
      reason: reason || "Did not return battery",
      customerName: customerName || "",
      createdAt: Timestamp.now(),
    });

    res.json({
      success: true,
      message: "User added to blacklist",
      id: docRef.id,
    });
  } catch (err) {
    console.error("❌ Error adding to blacklist:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🚫 CHECK if phone number is blacklisted (uses normalizedPhone for fast query)
router.get("/check/:phoneNumber", authenticateToken, async (req, res) => {
  const { phoneNumber } = req.params;
  const normalized = normalizePhone(phoneNumber);

  if (normalized.length < 8) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  console.log(
    `🔍 Checking blacklist for: ${phoneNumber}, normalized: ${normalized}`,
  );

  try {
    const snapshot = await db
      .collection("blacklist")
      .where("normalizedPhone", "==", normalized)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      console.log(`🚫 Blacklisted found! ${phoneNumber}`);
      return res.json({ phoneNumber, isBlacklisted: true });
    }

    console.log(`✅ Not blacklisted: ${phoneNumber}`);
    res.json({ phoneNumber, isBlacklisted: false });
  } catch (err) {
    console.error("❌ Error checking blacklist:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🚫 DELETE user from blacklist (All authenticated users can delete, with tracking)
router.delete("/:id", authenticateToken, requireUser, async (req, res) => {
  const { id } = req.params;

  try {
    // Get the blacklist entry before deleting to log details
    const doc = await db.collection("blacklist").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Blacklist entry not found" });
    }

    const blacklistData = doc.data();
    const deletedBy = req.user.username || req.user.id;

    // Log who deleted the entry
    console.log(
      `🗑️ Blacklist entry deleted by: ${deletedBy} (${req.user.role})`,
    );
    console.log(
      `   Phone: ${blacklistData.phoneNumber}, Reason: ${blacklistData.reason}`,
    );

    // Delete the entry
    await db.collection("blacklist").doc(id).delete();

    res.json({
      success: true,
      message: "User removed from blacklist",
      deletedBy: deletedBy,
    });
  } catch (err) {
    console.error("❌ Error removing from blacklist:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔧 Helper function to check blacklist (exported for use in other routes)
export async function isPhoneBlacklisted(phoneNumber) {
  const normalized = normalizePhone(phoneNumber);
  if (normalized.length < 8) return false;

  const snapshot = await db
    .collection("blacklist")
    .where("normalizedPhone", "==", normalized)
    .limit(1)
    .get();
  return !snapshot.empty;
}

export default router;
