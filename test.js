import pool from "./db.js";

const result = await pool.query("SELECT NOW() AS time, version() AS pg_version");
console.log(result.rows[0]);
await pool.end();