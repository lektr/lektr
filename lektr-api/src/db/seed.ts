import { db } from "./index";
import { users } from "./schema";
import bcrypt from "bcrypt";

/**
 * Seed the database with initial data for development.
 * Creates a default admin user if one doesn't exist.
 */
export async function seedDatabase() {
  console.log("🌱 Seeding database...");

  // Read credentials from environment (with defaults for safety)
  const adminEmail = process.env.ADMIN_EMAIL || "admin@lektr.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  try {
    // Check if admin user exists
    const existingUsers = await db.select().from(users).limit(1);

    if (existingUsers.length === 0) {
      // Hash password at runtime to ensure it works
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      
      // Create admin user with admin role
      await db.insert(users).values({
        id: "00000000-0000-0000-0000-000000000001",
        email: adminEmail,
        passwordHash,
        role: "admin",
      });
      console.log(`✅ Created admin user: ${adminEmail}`);
    } else {
      console.log("✅ Users already exist, skipping seed");
    }
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    // Don't throw - seeding is not critical for startup
  }
}
