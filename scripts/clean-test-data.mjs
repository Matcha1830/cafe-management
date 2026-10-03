import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function clean() {
  console.log("🧹 Cleaning test operational data from PostgreSQL...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Foreign-key-safe order
    const tables = [
      "detail_pekerjaan_penggajian",
      "penggajian",
      "kehadiran",
      "jadwal",
      "pekerjaan_harian",
      "karyawan",
      "jabatan",
      "pengaturan_kafe",
      "profil_manager",
    ];

    for (const t of tables) {
      try {
        await client.query(`DELETE FROM "${t}"`);
        console.log(`✓ Cleared table "${t}"`);
      } catch (err) {
        console.log(`ℹ Table "${t}" notice: ${err.message}`);
      }
    }

    await client.query("COMMIT");
    console.log("✅ All test data successfully cleaned.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Cleanup failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

clean();
