import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "contacts.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Create Contact table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS Contact (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    phoneNumber TEXT,
    email       TEXT,
    linkedId    INTEGER,
    linkPrecedence TEXT NOT NULL CHECK(linkPrecedence IN ('primary','secondary')),
    createdAt   DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updatedAt   DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    deletedAt   DATETIME
  );
`);

export default db;
