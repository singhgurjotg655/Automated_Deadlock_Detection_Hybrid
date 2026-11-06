// Small Node.js HTTP server: serves the frontend and runs the C++ detection engine.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const FRONTEND = path.join(ROOT, "frontend");
const ENGINE = path.join(ROOT, "engine", "deadlock_engine.exe");
const PORT = 3000;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 100000) {
        reject(new Error("Request is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { reject(new Error("Request body must be valid JSON")); }
    });
    req.on("error", reject);
  });
}

function toEngineInput(data) {
  const processes = Number(data.processCount);
  const resources = Number(data.resourceCount);
  if (!Number.isInteger(processes) || processes < 1 || processes > 20 ||
      !Number.isInteger(resources) || resources < 1 || resources > 20) {
    throw new Error("Use 1–20 processes and 1–20 resource types.");
  }
  if (!Array.isArray(data.total) || data.total.length !== resources ||
      !Array.isArray(data.allocation) || data.allocation.length !== processes ||
      !Array.isArray(data.request) || data.request.length !== processes) {
    throw new Error("The resource totals or matrices have an invalid size.");
  }

  const values = [];
  const addRow = (row, expected) => {
    if (!Array.isArray(row) || row.length !== expected) throw new Error("Matrix dimensions do not match.");
    row.forEach(value => {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0) throw new Error("Enter non-negative whole numbers only.");
      values.push(n);
    });
  };

  const lines = [`${processes} ${resources}`];
  addRow(data.total, resources);
  lines.push(data.total.map(Number).join(" "));
  data.allocation.forEach(row => { addRow(row, resources); lines.push(row.map(Number).join(" ")); });
  data.request.forEach(row => { addRow(row, resources); lines.push(row.map(Number).join(" ")); });
  return lines.join("\n") + "\n";
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/detect") {
    try {
      const data = await readBody(req);
      const input = toEngineInput(data);
      if (!fs.existsSync(ENGINE)) {
        return send(res, 500, { error: "C++ engine not found. Compile engine/main.cpp using the README instructions." });
      }

      const child = spawn(ENGINE, [], { windowsHide: true });
      let output = "";
      let errorOutput = "";
      child.stdout.on("data", chunk => output += chunk.toString());
      child.stderr.on("data", chunk => errorOutput += chunk.toString());
      child.on("error", err => send(res, 500, { error: "Could not start C++ engine: " + err.message }));
      child.on("close", code => {
        if (code !== 0) return send(res, 400, { error: errorOutput || output || "Detection engine returned an error." });
        try { send(res, 200, JSON.parse(output)); }
        catch { send(res, 500, { error: "The C++ engine returned an unreadable response.", details: output }); }
      });
      child.stdin.end(input);
    } catch (err) {
      send(res, 400, { error: err.message });
    }
    return;
  }

  const requested = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.normalize(path.join(FRONTEND, requested));
  if (!filePath.startsWith(FRONTEND)) return send(res, 403, { error: "Forbidden" });
fs.readFile(filePath, (err, content) => {
    if (err) {
        return send(res, 404, "Not found", "text/plain; charset=utf-8");
    }

    res.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });

    res.end(content);
});
});

server.listen(PORT, () => {
  console.log(`Deadlock Guard is running at http://localhost:${PORT}`);
});
