import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("itrack.db");

// Initialize Database and Migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT CHECK(role IN ('student', 'faculty', 'employer', 'admin')),
    department TEXT
  );
`);

// Migration: Add missing columns if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
const columns = tableInfo.map(c => c.name);

if (!columns.includes('usn')) {
  db.exec("ALTER TABLE users ADD COLUMN usn TEXT");
}
if (!columns.includes('student_id_val')) {
  db.exec("ALTER TABLE users ADD COLUMN student_id_val TEXT");
}
if (!columns.includes('semester')) {
  db.exec("ALTER TABLE users ADD COLUMN semester INTEGER");
}
if (!columns.includes('course')) {
  db.exec("ALTER TABLE users ADD COLUMN course TEXT");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS internships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    company TEXT,
    description TEXT,
    requirements TEXT,
    location TEXT,
    stipend TEXT,
    duration TEXT,
    deadline TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'closed')),
    posted_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(posted_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    internship_id INTEGER,
    student_id INTEGER,
    status TEXT DEFAULT 'applied' CHECK(status IN ('applied', 'reviewing', 'shortlisted', 'accepted', 'rejected')),
    resume_url TEXT,
    cover_letter TEXT,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(internship_id) REFERENCES internships(id),
    FOREIGN KEY(student_id) REFERENCES users(id)
  );
`);

// Seed some initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (email, password, name, role, department) VALUES (?, ?, ?, ?, ?)")
    .run("admin@rvu.edu.in", "admin123", "System Admin", "admin", "Career Office");
  db.prepare("INSERT INTO users (email, password, name, role, department, usn, student_id_val, semester, course) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("faculty@rvu.edu.in", "faculty123", "Dr. Sharma", "faculty", "Computer Science", null, null, null, null);
  db.prepare("INSERT INTO users (email, password, name, role, department, usn, student_id_val, semester, course) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("student@rvu.edu.in", "student123", "Rahul Kumar", "student", "Computer Science", "RVU21BCE001", "STU1001", 6, "B.Tech CSE");
  db.prepare("INSERT INTO users (email, password, name, role, department) VALUES (?, ?, ?, ?, ?)")
    .run("employer@google.com", "employer123", "Google HR", "employer", "Engineering");
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // AI Email Drafting API
  app.post("/api/ai/draft-email", async (req, res) => {
    const { studentName, internshipTitle, companyName, status, tone } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "AI Service not configured. Please set GEMINI_API_KEY." });
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `Draft a professional email from RV University Career Office to a student named ${studentName}. 
      The student applied for the "${internshipTitle}" position at ${companyName}. 
      The current status of their application is "${status}". 
      The tone should be ${tone || 'professional and encouraging'}. 
      Include placeholders for any specific details like interview dates if applicable.
      Keep it concise and clear.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      res.json({ draft: result.text });
    } catch (err) {
      console.error("AI Error:", err);
      res.status(500).json({ error: "Failed to generate AI draft" });
    }
  });

  // Auth API
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Internships API
  app.get("/api/internships", (req, res) => {
    const { role, userId } = req.query;
    let internships;
    if (role === 'admin' || role === 'faculty') {
      internships = db.prepare("SELECT i.*, u.name as posted_by_name FROM internships i JOIN users u ON i.posted_by = u.id ORDER BY created_at DESC").all();
    } else if (role === 'employer') {
      internships = db.prepare("SELECT i.*, u.name as posted_by_name FROM internships i JOIN users u ON i.posted_by = u.id WHERE i.posted_by = ? ORDER BY created_at DESC").all(userId);
    } else {
      internships = db.prepare("SELECT i.*, u.name as posted_by_name FROM internships i JOIN users u ON i.posted_by = u.id WHERE i.status = 'approved' ORDER BY created_at DESC").all();
    }
    res.json(internships);
  });

  app.post("/api/internships", (req, res) => {
    const { title, company, description, requirements, location, stipend, duration, deadline, posted_by, role } = req.body;
    const status = (role === 'admin' || role === 'faculty') ? 'approved' : 'pending';
    const result = db.prepare(`
      INSERT INTO internships (title, company, description, requirements, location, stipend, duration, deadline, posted_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, company, description, requirements, location, stipend, duration, deadline, posted_by, status);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/internships/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE internships SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  // Applications API
  app.get("/api/applications", (req, res) => {
    const { role, userId, internshipId } = req.query;
    let applications;
    if (internshipId) {
      applications = db.prepare(`
        SELECT a.*, u.name as student_name, u.email as student_email, u.usn, u.student_id_val, u.semester, u.course, i.title as internship_title
        FROM applications a
        JOIN users u ON a.student_id = u.id
        JOIN internships i ON a.internship_id = i.id
        WHERE a.internship_id = ?
      `).all(internshipId);
    } else if (role === 'student') {
      applications = db.prepare(`
        SELECT a.*, i.title as internship_title, i.company as company_name
        FROM applications a
        JOIN internships i ON a.internship_id = i.id
        WHERE a.student_id = ?
      `).all(userId);
    } else {
      applications = db.prepare(`
        SELECT a.*, u.name as student_name, u.email as student_email, u.usn, u.student_id_val, u.semester, u.course, i.title as internship_title, i.company as company_name
        FROM applications a
        JOIN users u ON a.student_id = u.id
        JOIN internships i ON a.internship_id = i.id
      `).all();
    }
    res.json(applications);
  });

  app.post("/api/applications", (req, res) => {
    const { internship_id, student_id, resume_url, cover_letter } = req.body;
    const result = db.prepare(`
      INSERT INTO applications (internship_id, student_id, resume_url, cover_letter)
      VALUES (?, ?, ?, ?)
    `).run(internship_id, student_id, resume_url, cover_letter);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/applications/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  // Export to Excel API
  app.get("/api/export/:type", (req, res) => {
    const { type } = req.params;
    let data;
    if (type === 'internships') {
      data = db.prepare("SELECT * FROM internships").all();
    } else if (type === 'applications') {
      data = db.prepare(`
        SELECT a.id, i.title as Internship, i.company as Company, u.name as Student, a.status as Status, a.applied_at as Date
        FROM applications a
        JOIN internships i ON a.internship_id = i.id
        JOIN users u ON a.student_id = u.id
      `).all();
    } else {
      return res.status(400).json({ error: "Invalid export type" });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=${type}_report.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
