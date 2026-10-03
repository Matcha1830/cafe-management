import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  console.log("🔍 Verifying PostgreSQL tables and record counts...");
  const client = await pool.connect();
  try {
    const tables = [
      "user",
      "cafe",
      "cafe_member",
      "jabatan",
      "karyawan",
      "pekerjaan_harian",
      "jadwal",
      "kehadiran",
      "penggajian",
      "detail_pekerjaan_penggajian",
    ];

    for (const t of tables) {
      const res = await client.query(`SELECT count(*)::int as count FROM "${t}"`);
      console.log(`Table "${t}": ${res.rows[0].count} rows (expected: 0)`);
    }

    // Check arvin123 user
    const checkUser = await client.query(`SELECT * FROM "user" WHERE email = 'arvin123@gmail.com'`);
    console.log(`User "arvin123@gmail.com": ${checkUser.rows.length} found (expected: 0)`);

    console.log("✅ Database verification complete.");
  } catch (err) {
    console.error("❌ Verification failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

verify();
