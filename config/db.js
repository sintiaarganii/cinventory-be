import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test koneksi database
pool
  .connect()
  .then((client) => {
    console.log("✅ Success Connect Supabase PostgreSQL");
    client.release();
  })
  .catch((err) => {
    console.error("❌ Can't connect database:", err.message);
  });

export default pool;
