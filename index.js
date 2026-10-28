import express from "express";
import bcrypt from "bcryptjs";
import "dotenv/config";
import pool, { query } from "./db.js";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token required" });
  }
  try {
    req.user = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/register", async (req, res) => {
  try {
    const { name, email, password, city } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password min 8 characters" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, email, password, city)
       VALUES ($1, LOWER($2), $3, $4)
       RETURNING id, name, email, city, created_at`,
      [name, email, hash, city || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password required" });
    }

    const result = await query(
      "SELECT id, name, email, password FROM users WHERE email = LOWER($1)",
      [email]
    );
    const user = result.rows[0];

    const valid = user && (await bcrypt.compare(password, user.password));
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/groups", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description, city, interest_id } = req.body;

    if (!name || !city || !interest_id) {
      return res.status(400).json({ message: "name, city, interest_id required" });
    }

    await client.query("BEGIN");

    const group = await client.query(
      `INSERT INTO groups (name, description, city, interest_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description || null, city, interest_id, req.user.id]
    );

    await client.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [group.rows[0].id, req.user.id]
    );

    await client.query("COMMIT");
    res.status(201).json(group.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23503") {
      return res.status(400).json({ message: "Invalid interest_id" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

app.get("/groups", async (req, res) => {
  try {
    const { city, interest_id } = req.query;
    const values = [];
    let where = "";

    if (city) {
      values.push(city);
      where += ` AND LOWER(g.city) = LOWER($${values.length})`;
    }
    if (interest_id) {
      values.push(interest_id);
      where += ` AND g.interest_id = $${values.length}`;
    }

    const result = await query(
      `SELECT g.id, g.name, g.description, g.city,
              i.name AS interest,
              COUNT(gm.user_id)::int AS members
       FROM groups g
       JOIN interests i ON i.id = g.interest_id
       LEFT JOIN group_members gm ON gm.group_id = g.id
       WHERE TRUE ${where}
       GROUP BY g.id, i.name
       ORDER BY g.created_at DESC`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/groups/:id/join", auth, async (req, res) => {
  try {
    await query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)`,
      [req.params.id, req.user.id]
    );
    res.status(201).json({ message: "Joined" });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Already a member" });
    }
    if (err.code === "23503") {
      return res.status(404).json({ message: "Group not found" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/groups/:id/events", auth, async (req, res) => {
  try {
    const { title, description, location_text, starts_at, capacity } = req.body;

    if (!title || !location_text || !starts_at) {
      return res.status(400).json({ message: "title, location_text, starts_at required" });
    }

    const member = await query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!member.rows[0] || member.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Only group admin can create events" });
    }

    const result = await query(
      `INSERT INTO events (group_id, title, description, location_text, starts_at, capacity, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.params.id, title, description || null, location_text, starts_at, capacity || null, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port", process.env.PORT || 3000);
});