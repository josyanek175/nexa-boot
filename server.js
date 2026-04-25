import { createServer } from "http";
import handler from "./dist/server/index.js";

const port = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host || `localhost:${port}`;
    const url = `${protocol}://${host}${req.url}`;

    const body =
      req.method === "GET" || req.method === "HEAD" ? undefined : req;

    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body,
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
