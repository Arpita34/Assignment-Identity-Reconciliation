import db from "./db";

// ---- Types ----

interface Contact {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: "primary" | "secondary";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface IdentifyInput {
  email?: string | null;
  phoneNumber?: string | null;
}

interface IdentifyResponse {
  contact: {
    primaryContatctId: number; // intentional typo matching the spec
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

// ---- Helpers ----

function findByEmailOrPhone(email: string | null, phoneNumber: string | null): Contact[] {
  return db
    .prepare(
      `SELECT * FROM Contact WHERE deletedAt IS NULL AND (
         (email IS NOT NULL AND email = ?)
         OR (phoneNumber IS NOT NULL AND phoneNumber = ?)
       )`
    )
    .all(email, phoneNumber) as Contact[];
}

function getCluster(primaryId: number): Contact[] {
  return db
    .prepare(
      `SELECT * FROM Contact WHERE deletedAt IS NULL AND (id = ? OR linkedId = ?)`
    )
    .all(primaryId, primaryId) as Contact[];
}

function insertContact(
  email: string | null,
  phoneNumber: string | null,
  linkedId: number | null,
  linkPrecedence: "primary" | "secondary"
): number {
  const r = db
    .prepare(
      `INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'))`
    )
    .run(phoneNumber, email, linkedId, linkPrecedence);
  return r.lastInsertRowid as number;
}

function demoteContact(newPrimaryId: number, contactId: number): void {
  db.prepare(
    `UPDATE Contact SET linkPrecedence = 'secondary', linkedId = ?,
     updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
  ).run(newPrimaryId, contactId);
}

function relinkSecondaries(newPrimaryId: number, oldPrimaryId: number): void {
  db.prepare(
    `UPDATE Contact SET linkedId = ?,
     updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE linkedId = ? AND deletedAt IS NULL`
  ).run(newPrimaryId, oldPrimaryId);
}

function getRootPrimaryId(contact: Contact): number {
  return contact.linkPrecedence === "primary" ? contact.id : contact.linkedId!;
}

function buildResponse(primaryId: number): IdentifyResponse {
  const cluster = getCluster(primaryId);
  const primary = cluster.find(
    (c) => c.linkPrecedence === "primary" && c.id === primaryId
  )!;
  const secondaries = cluster.filter((c) => c.linkPrecedence === "secondary");

  const emailSet = new Set<string>();
  if (primary.email) emailSet.add(primary.email);
  for (const s of secondaries) if (s.email) emailSet.add(s.email);

  const phoneSet = new Set<string>();
  if (primary.phoneNumber) phoneSet.add(primary.phoneNumber);
  for (const s of secondaries) if (s.phoneNumber) phoneSet.add(s.phoneNumber);

  return {
    contact: {
      primaryContatctId: primaryId,
      emails: Array.from(emailSet),
      phoneNumbers: Array.from(phoneSet),
      secondaryContactIds: secondaries.map((s) => s.id),
    },
  };
}

// ---- Main identify function ----

export function identify(input: IdentifyInput): IdentifyResponse {
  const email = input.email?.trim() || null;
  const phoneNumber = input.phoneNumber?.toString().trim() || null;

  if (!email && !phoneNumber) {
    throw new Error("At least one of email or phoneNumber must be provided.");
  }

  // 1. Find all contacts matching either field
  const matches = findByEmailOrPhone(email, phoneNumber);

  // ── Case 1: No matches → create new primary ──
  if (matches.length === 0) {
    const newId = insertContact(email, phoneNumber, null, "primary");
    return buildResponse(newId);
  }

  // 2. Gather all distinct root primary IDs
  const rootIds = [...new Set(matches.map(getRootPrimaryId))];

  // ── Case 4: Two separate clusters → merge ──
  if (rootIds.length > 1) {
    // Collect all primaries across clusters and sort by createdAt (oldest first)
    const allPrimaries: Contact[] = [];
    for (const rid of rootIds) {
      const cluster = getCluster(rid);
      const p = cluster.find((c) => c.linkPrecedence === "primary" && c.id === rid);
      if (p) allPrimaries.push(p);
    }
    allPrimaries.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const truePrimary = allPrimaries[0];
    const todemote = allPrimaries.slice(1);

    // Wrap in a transaction
    db.transaction(() => {
      for (const p of todemote) {
        relinkSecondaries(truePrimary.id, p.id);
        demoteContact(truePrimary.id, p.id);
      }
    })();
  }

  // After possible merge, find the surviving primary
  const updatedMatches = findByEmailOrPhone(email, phoneNumber);
  const updatedRootIds = [...new Set(updatedMatches.map(getRootPrimaryId))];
  // There should now be exactly one primary root
  const finalPrimaryId = updatedRootIds[0];

  // Fetch current cluster
  const cluster = getCluster(finalPrimaryId);

  // ── Case 2: All info already present → return as-is ──
  const emailKnown = !email || cluster.some((c) => c.email === email);
  const phoneKnown = !phoneNumber || cluster.some((c) => c.phoneNumber === phoneNumber);

  if (emailKnown && phoneKnown) {
    return buildResponse(finalPrimaryId);
  }

  // ── Case 3: New info → create secondary ──
  insertContact(email, phoneNumber, finalPrimaryId, "secondary");
  return buildResponse(finalPrimaryId);
}
