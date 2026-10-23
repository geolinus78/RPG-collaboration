import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";

// One server process owns this private file on its dedicated Railway volume.
export function roomPersistence(directory) {
  if (!directory) return {};
  mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, "rooms.json");
  let savedRooms = [];
  try { savedRooms = JSON.parse(readFileSync(filename, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (!Array.isArray(savedRooms)) throw new Error("Invalid saved room data");
  return { savedRooms, persist(rooms) {
    writeFileSync(`${filename}.tmp`, JSON.stringify(rooms), { mode: 0o600 });
    renameSync(`${filename}.tmp`, filename);
  } };
}
