import fs from "fs";
import path from "path";
import pool from "./db.js";

const dir = "./migrations";

await pool.query(`
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const done = (await pool.query("SELECT name FROM migrations")).rows.map((r) => r.name);
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  if (done.includes(file)) continue;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
    await client.query("INSERT INTO migrations (name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log("Ran:", file);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed:", file, err.message);
    process.exitCode = 1;
    break;
  } finally {
    client.release();
  }
}

await pool.end();