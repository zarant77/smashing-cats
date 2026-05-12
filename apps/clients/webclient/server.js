import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT ?? 4173);
const root = join(fileURLToPath(new URL(".", import.meta.url)), "dist");

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = normalize(join(root, pathname));
  const filePath = requestedPath.startsWith(root) && existsSync(requestedPath) && statSync(requestedPath).isFile()
    ? requestedPath
    : join(root, "index.html");

  response.setHeader("Content-Type", mimeTypes.get(extname(filePath)) ?? "application/octet-stream");
  createReadStream(filePath).pipe(response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Smashing Cats webclient listening on http://0.0.0.0:${port}`);
});
