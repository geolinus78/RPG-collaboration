import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === "/") pathname = "/game/";
    if (pathname.endsWith("/")) pathname += "index.html";

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
    const status = error.code === "ENOENT" ? 404 : 403;
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(status === 404 ? "File not found" : "Request blocked");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Shared Quest is running at http://127.0.0.1:${port}/game/`);
  console.log("Keep this window open. Press Ctrl+C to stop the server.");
});
