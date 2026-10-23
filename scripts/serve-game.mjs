import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
import { createRoomStore } from "./room-server.mjs";
import { roomPersistence } from "./persistence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8000;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

export function localUrls(port) {
  return [...new Set(Object.values(networkInterfaces()).flat().filter(item => item && item.family === "IPv4" && !item.internal).map(item => `http://${item.address}:${port}/game/`))];
}

const json = (response, status, value) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
};
async function readJson(request) {
  let body = "", bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 384000) throw Object.assign(new Error("Island data is too large."), { status: 413 });
    body += chunk;
  }
  try {
    const value = JSON.parse(body || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw Object.assign(new Error("Invalid JSON object."), { status: 400 }); }
}

export function createGameServer({ store = createRoomStore(roomPersistence(process.env.DATA_DIR)), allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean), publicGameUrl = process.env.PUBLIC_GAME_URL } = {}) {
 const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const origin = request.headers.origin;
    if (origin && origin !== requestUrl.origin && !allowedOrigins.includes(origin)) return json(response, 403, { error: "Use this game's address to connect." });
    if (origin && allowedOrigins.includes(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    if (request.method === "OPTIONS") { response.writeHead(204); return response.end(); }
    if (requestUrl.pathname === "/health" && request.method === "GET") return json(response, 200, { ok: true });
    if (requestUrl.pathname.startsWith("/api/")) {
      if (requestUrl.pathname === "/api/network" && request.method === "GET") return json(response, 200, { urls: publicGameUrl ? [publicGameUrl] : localUrls(server.address().port) });
      if (requestUrl.pathname === "/api/rooms" && request.method === "POST") return json(response, 201, store.create(await readJson(request)));
      const match = requestUrl.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]{6})(?:\/(join|action|events))?$/);
      if (!match) return json(response, 404, { error: "Room endpoint not found." });
      const room = store.getRoom(match[1]);
      if (match[2] === "join" && request.method === "POST") return json(response, 200, store.join(room, await readJson(request)));
      const token = request.headers.authorization?.replace(/^Bearer /, "") || requestUrl.searchParams.get("token");
      const player = store.authenticate(room, token);
      if (match[2] === "events" && request.method === "GET") return store.subscribe(room, player, response);
      if (match[2] === "action" && request.method === "POST") {
        const input = await readJson(request);
        // Recheck the deadline after reading the request body as well.
        store.getRoom(room.code);
        return json(response, 200, store.action(room, player, input));
      }
      if (!match[2] && request.method === "GET") return json(response, 200, { state: store.snapshot(room) });
      return json(response, 405, { error: "Method not allowed." });
    }
    if (!["GET", "HEAD"].includes(request.method)) return json(response, 405, { error: "Method not allowed." });
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === "/") pathname = "/game/";
    if (pathname.endsWith("/")) pathname += "index.html";
    // LAN clients may read game assets, never Git metadata or server files.
    if (!pathname.startsWith("/game/") || pathname.split("/").some(part => part.startsWith("."))) return json(response, 404, { error: "File not found." });

    const filePath = path.resolve(root, `.${pathname}`);
    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      throw Object.assign(new Error("Outside project"), { code: "EACCES" });
    }

    const details = await stat(filePath);
    if (!details.isFile()) throw Object.assign(new Error("Not a file"), { code: "ENOENT" });

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    response.end(body);
  } catch (error) {
    if (request.url.startsWith("/api/")) return json(response, error.status || 500, { error: error.status ? error.message : "The server could not complete that request." });
    const status = error.code === "ENOENT" ? 404 : 403;
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(status === 404 ? "File not found" : "Request blocked");
  }
 });
 const ticker = setInterval(() => store.tick(), 250);
 ticker.unref();
 server.on("close", () => { clearInterval(ticker); store.close(); });
 return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const server = createGameServer();
 server.listen(port, process.env.HOST || "0.0.0.0", () => {
  console.log(`Island Quest is running at http://127.0.0.1:${port}/game/`);
  for (const url of localUrls(port)) console.log(`Join from another device: ${url}`);
  console.log("Keep this window open. Press Ctrl+C to stop the server.");
 });
}
