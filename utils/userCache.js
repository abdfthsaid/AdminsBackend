import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, "..", "data", "users_cache.json");

// In-memory cache for fast access
let userCache = new Map();

/**
 * Initialize cache from file on server startup
 */
export function initializeCache() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, "..", "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Load cache from file if it exists
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf8");
      const users = JSON.parse(data);
      
      // Populate in-memory cache
      users.forEach((user) => {
        userCache.set(user.username, user);
      });
      
      console.log(`✅ User cache loaded: ${userCache.size} users`);
    } else {
      console.log("📝 User cache file not found, will create on first sync");
    }
  } catch (err) {
    console.error("❌ Failed to initialize user cache:", err.message);
  }
}

/**
 * Add or update user in cache
 */
export function cacheUser(userData) {
  try {
    userCache.set(userData.username, {
      id: userData.id,
      username: userData.username,
      password: userData.password,
      role: userData.role,
      email: userData.email || null,
      cachedAt: new Date().toISOString(),
    });
    
    // Save to file asynchronously
    saveCacheToFile();
  } catch (err) {
    console.error("❌ Failed to cache user:", err.message);
  }
}

/**
 * Get user from cache
 */
export function getCachedUser(username) {
  return userCache.get(username) || null;
}

/**
 * Save cache to file
 */
function saveCacheToFile() {
  try {
    const users = Array.from(userCache.values());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (err) {
    console.error("❌ Failed to save cache to file:", err.message);
  }
}

/**
 * Sync all users from Firebase to cache
 */
export async function syncUsersFromFirebase(db) {
  try {
    console.log("🔄 Syncing users from Firebase to cache...");
    const snapshot = await db.collection("system_users").get();
    
    let syncCount = 0;
    snapshot.docs.forEach((doc) => {
      const userData = doc.data();
      cacheUser({
        id: doc.id,
        username: userData.username,
        password: userData.password,
        role: userData.role,
        email: userData.email || null,
      });
      syncCount++;
    });
    
    console.log(`✅ Synced ${syncCount} users to cache`);
    return syncCount;
  } catch (err) {
    console.error("❌ Failed to sync users from Firebase:", err.message);
    throw err;
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    totalUsers: userCache.size,
    cacheFile: CACHE_FILE,
    fileExists: fs.existsSync(CACHE_FILE),
  };
}
