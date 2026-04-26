import { createServer } from "http";
import { createReadStream, existsSync, readdirSync } from "fs";
import { join, extname } from "path";
import handler from "/app/dist/server/index.js";

const port = process.env.PORT || 3000;
const clientDir = "/app/dist/client";

const mimeTypes = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

    if (urlPath === "/__debug_assets") {
      const assetsDir = join(clientDir, "assets");

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          {
            cwd: process.cwd(),
            clientDir,
            clientExists: existsSync(clientDir),
            assetsDir,
            assetsExists: existsSync(assetsDir),
            files: existsSync(assetsDir)
              ? readdirSync(assetsDir).slice(0, 50)
              : []
          },
          null,
          2
        )
      );
      return;
    }

    if (urlPath.startsWith("/assets/")) {
      const relativePath = urlPath.replace(/^\/+/, "");
      const filePath = join(clientDir, relativePath);

      console.log("Buscando asset:", filePath);

      if (existsSync(filePath)) {
        const ext = extname(filePath);

        res.writeHead(200, {
          "Content-Type": mimeTypes[ext] || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable"
        });

        createReadStream(filePath).pipe(res);
        return;
      }

      console.error("Asset não encontrado:", filePath);
      res.writeHead(404);
      res.end("Asset not found");
      return;
    }

    if (urlPath === "/favicon.ico") {
      const faviconPath = join(clientDir, "favicon.ico");

      if (existsSync(faviconPath)) {
        res.writeHead(200, { "Content-Type": "image/x-icon" });
        createReadStream(faviconPath).pipe(res);
        return;
      }
    }

    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host || `localhost:${port}`;
    const fullUrl = `${protocol}://${host}${req.url}`;

    const request = new Request(fullUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
      duplex: "half"
    });

    const response = await handler.fetch(request);

    res.writeHead(response.status, Object.fromEntries(response.headers));

    if (response.body) {
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        res.write(Buffer.from(value));
      }
    }

    res.end();
  } catch (error) {
    console.error("Erro no servidor:", error);

    res.statusCode = 500;
    res.end("Erro interno no servidor");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server rodando em http://0.0.0.0:${port}`);
});
