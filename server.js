import { createServer } from "http";
import { createReadStream, existsSync, readdirSync } from "fs";
import { join, extname } from "path";
import handler from "/app/dist/server/index.js";

const port = process.env.PORT || 3000;
const clientDir = "/app/dist/client";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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

    // Rota para validar se os arquivos do build existem dentro do container
    if (urlPath === "/__debug_assets") {
      const assetsDir = join(clientDir, "assets");

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify(
          {
            cwd: process.cwd(),
            clientDir,
            clientExists: existsSync(clientDir),
            assetsDir,
            assetsExists: existsSync(assetsDir),
            files: existsSync(assetsDir) ? readdirSync(assetsDir).slice(0, 80) : []
          },
          null,
          2
        )
      );
      return;
    }

    // Servir arquivos estáticos gerados pelo Vite/TanStack
    if (urlPath.startsWith("/assets/")) {
      const filePath = join(clientDir, urlPath.replace(/^\/+/, ""));

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
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Asset not found");
      return;
    }

    // Favicon
    if (urlPath === "/favicon.ico") {
      const faviconPath = join(clientDir, "favicon.ico");

      if (existsSync(faviconPath)) {
        res.writeHead(200, { "Content-Type": "image/x-icon" });
        createReadStream(faviconPath).pipe(res);
        return;
      }
    }

    // Encaminha demais rotas para o TanStack SSR
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host || `localhost:${port}`;
    const fullUrl = `${protocol}://${host}${req.url || "/"}`;

    const requestOptions = {
      method: req.method,
      headers: req.headers
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      requestOptions.body = req;
      requestOptions.duplex = "half";
    }

    const request = new Request(fullUrl, requestOptions);
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
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Erro interno no servidor");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server rodando em http://0.0.0.0:${port}`);
});
