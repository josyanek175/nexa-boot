import { createServer } from "http";
import handler from "/app/dist/server/index.js";

const port = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  // 🔥 SUA API BACKEND
  if (req.url === "/api/evolution") {
    const apiKey = process.env.EVOLUTION_API_KEY;
    const apiUrl = process.env.EVOLUTION_API_URL;

    try {
      const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
        method: "GET",
        headers: {
          apikey: apiKey
        }
      });

      const data = await response.text();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(data);
      return;
    } catch (error) {
      res.writeHead(500);
      res.end("Erro ao chamar Evolution");
      return;
    }
  }

  // 🔥 resto do SSR (já funcionando)
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host || `localhost:${port}`;
  const fullUrl = `${protocol}://${host}${req.url}`;

  const request = new Request(fullUrl, {
    method: req.method,
    headers: req.headers,
    body: req.method === "GET" ? undefined : req,
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
});

server.listen(port, "0.0.0.0");
