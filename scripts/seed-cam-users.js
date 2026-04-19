/**
 * One-off script: create user accounts for CAMs that don't already have one.
 * Assigns role-cam, sets a temp password, forcePasswordChange: true.
 * Run from the aria-onboarding directory:
 *   node scripts/seed-cam-users.js
 */

const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const USERS_FILE = path.join(__dirname, "../data/users.json");
const CAMS_FILE = path.join(__dirname, "../data/cams.json");
const CAM_ROLE_ID = "role-cam";
const TEMP_PASSWORD = "ChangeMe2026!";

const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
const cams = JSON.parse(fs.readFileSync(CAMS_FILE, "utf8"));

const existingEmails = new Set(users.map((u) => u.email.toLowerCase()));

const toAdd = [];

for (const cam of cams) {
  if (existingEmails.has(cam.email.toLowerCase())) {
    console.log(`SKIP  ${cam.name} ${cam.surname} <${cam.email}> — user already exists`);
    continue;
  }

  const passwordHash = bcrypt.hashSync(TEMP_PASSWORD, 10);
  const newUser = {
    id: `user-${crypto.randomUUID()}`,
    name: cam.name,
    surname: cam.surname,
    email: cam.email,
    cell: cam.cell || "",
    roleId: CAM_ROLE_ID,
    passwordHash,
    active: true,
    forcePasswordChange: true,
    firstLoginAt: null,
    createdAt: new Date().toISOString(),
  };

  toAdd.push(newUser);
  console.log(`ADD   ${cam.name} ${cam.surname} <${cam.email}>`);
}

if (toAdd.length === 0) {
  console.log("\nNothing to do — all CAMs already have user accounts.");
  process.exit(0);
}

const updated = [...users, ...toAdd];
fs.writeFileSync(USERS_FILE, JSON.stringify(updated, null, 2));

console.log(`\nDone. Added ${toAdd.length} user(s). Temp password: "${TEMP_PASSWORD}"`);
console.log("They will be forced to change it on first login.");
