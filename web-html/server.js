const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");
const { URL } = require("url");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8080);
const WEB_ROOT = __dirname;
const REMOTE_HOST = "www.xiaoxuestudy.com";
const DATA_ROOT = path.resolve(process.env.DATA_DIR || process.env.RENDER_DISK_PATH || WEB_ROOT);
const DB_PATH = path.join(DATA_ROOT, "data.sqlite");
const SESSION_COOKIE = "kousuan_session";
const DEFAULT_USERNAME = String(process.env.DEFAULT_USERNAME || process.env.ADMIN_USERNAME || "").trim().toLowerCase();
const DEFAULT_PASSWORD = String(process.env.DEFAULT_PASSWORD || process.env.ADMIN_PASSWORD || "");

fs.mkdirSync(DATA_ROOT, { recursive: true });

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon",
};

const db = new DatabaseSync(DB_PATH);
initDatabase();

http
  .createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (requestUrl.pathname === "/api/auth/register" && req.method === "POST") {
      handleRegister(req, res);
      return;
    }
    if (requestUrl.pathname === "/api/auth/login" && req.method === "POST") {
      handleLogin(req, res);
      return;
    }
    if (requestUrl.pathname === "/api/auth/me" && req.method === "GET") {
      handleMe(req, res);
      return;
    }
    if (requestUrl.pathname === "/api/auth/logout" && req.method === "POST") {
      handleLogout(req, res);
      return;
    }
    if (requestUrl.pathname === "/api/twentyfour-pdf" && req.method === "POST") {
      handleTwentyfourPdf(req, res);
      return;
    }

    if (requestUrl.pathname.startsWith("/api/")) {
      proxyRequest(req, res, requestUrl);
      return;
    }

    serveStatic(requestUrl.pathname, res);
  })
  .listen(PORT, HOST, () => {
    console.log(`Web app: http://${HOST}:${PORT}`);
  });

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function serveStatic(requestPath, res) {
  const normalizedPath = path.posix.normalize(decodeURIComponent(requestPath || "/"));
  const pathname = normalizedPath === "/" ? "/index.html" : normalizedPath;
  const resolvedPath = path.resolve(WEB_ROOT, `.${pathname}`);
  const webRootPath = path.resolve(WEB_ROOT);

  if (resolvedPath !== webRootPath && !resolvedPath.startsWith(`${webRootPath}${path.sep}`)) {
    sendJson(res, 403, { error: "forbidden" });
    return;
  }

  fs.stat(resolvedPath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendJson(res, 404, { error: "not_found" });
      return;
    }

    const extension = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[extension] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=3600",
    });

    const stream = fs.createReadStream(resolvedPath);
    stream.on("error", (error) => {
      sendJson(res, 500, { error: error.message || "static_read_failed" });
    });
    stream.pipe(res);
  });
}

function proxyRequest(req, res, requestUrl) {
  if (requestUrl.pathname === "/api/root") {
    sendJson(res, 200, { origin: `https://${REMOTE_HOST}`, host: REMOTE_HOST });
    return;
  }

  const upstreamPath = getUpstreamPath(requestUrl);
  const headers = {
    ...req.headers,
    host: REMOTE_HOST,
    origin: `https://${REMOTE_HOST}`,
    referer: `https://${REMOTE_HOST}/`,
  };

  delete headers.connection;

  const proxyReq = https.request(
    {
      protocol: "https:",
      hostname: REMOTE_HOST,
      method: req.method,
      path: upstreamPath,
      headers,
    },
    (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      if (typeof responseHeaders.location === "string") {
        responseHeaders.location = rewriteProxyLocation(responseHeaders.location);
      }
      res.writeHead(proxyRes.statusCode || 502, responseHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    sendJson(res, 502, { error: "proxy_failed", message: error.message });
  });

  req.pipe(proxyReq);
}

function rewriteProxyLocation(location) {
  const origin = `https://${REMOTE_HOST}`;
  const localPath = location.startsWith(origin) ? location.slice(origin.length) : location;

  if (localPath.startsWith("/kousuan_v2/bridge.php")) {
    return `/api/bridge.php${localPath.slice("/kousuan_v2/bridge.php".length)}`;
  }
  if (localPath.startsWith("/kousuan_") || localPath.startsWith("/suan24dian/")) {
    return `/api/static${localPath}`;
  }
  if (localPath.startsWith("/")) {
    return `/api${localPath}`;
  }
  return location;
}

function getUpstreamPath(requestUrl) {
  if (requestUrl.pathname === "/api/bridge.php") {
    return `/kousuan_v2/bridge.php${requestUrl.search}`;
  }
  if (requestUrl.pathname.startsWith("/api/static/")) {
    return `${requestUrl.pathname.slice("/api/static".length)}${requestUrl.search}`;
  }
  return requestUrl.pathname.replace(/^\/api/, "") + requestUrl.search;
}

function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  ensureUsersTableSchema();
}

function ensureUsersTableSchema() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const targetColumns = ["id", "username", "password", "created_time"];
  const alreadyMatches =
    columns.length === targetColumns.length &&
    targetColumns.every((name, index) => columns[index] && columns[index].name === name);

  if (alreadyMatches) {
    return;
  }

  const hasPassword = columns.some((column) => column.name === "password");
  const hasPasswordHash = columns.some((column) => column.name === "password_hash");
  const hasCreatedTime = columns.some((column) => column.name === "created_time");
  const hasCreatedAt = columns.some((column) => column.name === "created_at");
  const passwordExpr =
    hasPassword && hasPasswordHash
      ? "COALESCE(NULLIF(password, ''), password_hash, '')"
      : hasPassword
        ? "COALESCE(password, '')"
        : hasPasswordHash
          ? "COALESCE(password_hash, '')"
          : "''";
  const createdTimeExpr = hasCreatedTime
    ? "CASE WHEN created_time IS NOT NULL AND TRIM(created_time) != '' THEN created_time ELSE CURRENT_TIMESTAMP END"
    : hasCreatedAt
      ? "CASE WHEN created_at IS NOT NULL AND LENGTH(TRIM(created_at)) >= 10 THEN created_at ELSE CURRENT_TIMESTAMP END"
      : "CURRENT_TIMESTAMP";

  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec("BEGIN;");
  try {
    db.exec(`
      DROP TABLE IF EXISTS users__new;
      CREATE TABLE users__new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.prepare(`
      INSERT INTO users__new (id, username, password, created_time)
      SELECT id, username, COALESCE(${passwordExpr}, ''), ${createdTimeExpr}
      FROM users
    `).run();
    db.exec(`
      DROP TABLE users;
      ALTER TABLE users__new RENAME TO users;
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  } catch (error) {
    db.exec("ROLLBACK;");
    db.exec("PRAGMA foreign_keys = ON;");
    throw error;
  }
}

function handleRegister(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      validateCredentials(normalized, password);

      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(normalized);
      if (existing) {
        throw httpError(409, "账号已存在");
      }

      const result = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(normalized, String(password));

      const session = createSession(result.lastInsertRowid);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(result.lastInsertRowid), username: normalized },
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleLogin(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      validateCredentials(normalized, password);

      const user = db
        .prepare("SELECT id, username, password_hash, salt FROM users WHERE username = ?")
        .get(normalized);
      if (!user) {
        throw httpError(401, "账号或密码错误");
      }

      const passwordHash = hashPassword(password, user.salt);
      if (passwordHash !== user.password_hash) {
        throw httpError(401, "账号或密码错误");
      }

      const session = createSession(user.id);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(user.id), username: user.username },
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleMe(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { user: null });
    return;
  }
  sendJson(res, 200, {
    user: { id: Number(user.id), username: user.username },
  });
}

function handleLogin(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = String(password);
      validateCredentials(normalized, normalizedPassword);

      const user = db
        .prepare("SELECT id, username, password_hash, salt FROM users WHERE username = ?")
        .get(normalized);
      if (!user) {
        throw httpError(401, "账号或密码错误");
      }

      if (isLegacyPlaintextPasswordRecord(user)) {
        if (normalizedPassword !== String(user.password_hash)) {
          throw httpError(401, "账号或密码错误");
        }
        migrateLegacyPasswordIfNeeded(user, normalizedPassword);
      } else {
        const passwordHash = hashPassword(normalizedPassword, user.salt);
        if (passwordHash !== user.password_hash) {
          throw httpError(401, "账号或密码错误");
        }
      }

      const session = createSession(user.id);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(user.id), username: user.username },
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleLogout(req, res) {
  const token = getSessionToken(req);
  if (token) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}

function handleLogin(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = String(password);
      validateCredentials(normalized, normalizedPassword);

      const user = db.prepare("SELECT id, username, password FROM users WHERE username = ?").get(normalized);
      if (!user) {
        throw httpError(401, "账号或密码错误");
      }

      if (!verifyPassword(normalizedPassword, user)) {
        throw httpError(401, "账号或密码错误");
      }

      syncStoredPassword(user.id, normalizedPassword);

      const session = createSession(user.id);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(user.id), username: user.username },
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function validateCredentials(username, password) {
  if (!username || username.length < 3 || username.length > 32) {
    throw httpError(400, "账号长度需在 3 到 32 位之间");
  }
  if (!/^[a-z0-9_]+$/i.test(username)) {
    throw httpError(400, "账号只能包含字母、数字、下划线");
  }
  if (!password || String(password).length < 6 || String(password).length > 64) {
    throw httpError(400, "密码长度需在 6 到 64 位之间");
  }
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

function verifyPassword(password, user) {
  const storedPassword = String(user && user.password ? user.password : "");
  if (storedPassword) {
    return password === storedPassword;
  }

  if (isLegacyPlaintextPasswordRecord(user)) {
    return password === String(user.password_hash);
  }

  const passwordHash = hashPassword(password, user.salt);
  return passwordHash === user.password_hash;
}

function syncStoredPassword(userId, password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  db.prepare("UPDATE users SET password = ?, password_hash = ?, salt = ? WHERE id = ?").run(password, passwordHash, salt, userId);
}

function isLegacyPlaintextPasswordRecord(user) {
  const hash = String(user && user.password_hash ? user.password_hash : "");
  const salt = String(user && user.salt ? user.salt : "");
  return !/^[a-f0-9]{128}$/i.test(hash) || salt.length < 16;
}

function migrateLegacyPasswordIfNeeded(user, password) {
  if (!isLegacyPlaintextPasswordRecord(user)) {
    return;
  }

  syncStoredPassword(user.id, password);
}

function handleLogin(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = String(password);
      validateCredentials(normalized, normalizedPassword);

      const user = db.prepare("SELECT id, username, password FROM users WHERE username = ?").get(normalized);
      if (!user) {
        throw httpError(401, "账号或密码错误");
      }
      if (normalizedPassword !== String(user.password || "")) {
        throw httpError(401, "账号或密码错误");
      }

      const session = createSession(user.id);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(user.id), username: user.username },
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleRegister(req, res) {
  sendJson(res, 403, { error: "暂不开放注册" });
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
  return { token, expiresAt };
}

function getSessionToken(req) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
  return cookies[SESSION_COOKIE] || "";
}

function getUserFromRequest(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT users.id, users.username, sessions.expires_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`
    )
    .get(token);

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return row;
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sendKnownError(res, error) {
  if (error && error.statusCode) {
    sendJson(res, error.statusCode, { error: error.message });
    return;
  }
  sendJson(res, 500, { error: error.message || "服务器错误" });
}

function handleTwentyfourPdf(req, res) {
  readJsonBody(req)
    .then((payload) => createTwentyfourPdf(payload))
    .then(({ pdfPath, filename }) => {
      fs.readFile(pdfPath, (error, content) => {
        cleanupTempFiles([pdfPath]);
        if (error) {
          sendJson(res, 500, {
            code: 500,
            error: "pdf_read_failed",
            message: error.message,
          });
          return;
        }
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeAsciiFilename(filename)}"`,
          "Access-Control-Allow-Origin": "*",
        });
        res.end(content);
      });
    })
    .catch((error) => {
      sendJson(res, 500, {
        code: 500,
        error: "pdf_create_failed",
        message: error.message,
      });
    });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function createTwentyfourPdf(payload) {
  const title = "24 Points";
  const items = Array.isArray(payload && payload.items) ? payload.items : [];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twentyfour-pdf-"));
  const pdfPath = path.join(tmpDir, "24-Points.pdf");
  const pdfBuffer = buildTwentyfourPdfBuffer(title, items);
  fs.writeFileSync(pdfPath, pdfBuffer);
  return Promise.resolve({ pdfPath, filename: path.basename(pdfPath) });
}

function buildTwentyfourPdfBuffer(title, items) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 28.35;
  const gap = 18;
  const headerHeight = 80;
  const cardHeight = 120;
  const rowGap = 18;
  const usableWidth = pageWidth - margin * 2;
  const colWidth = (usableWidth - gap) / 2;
  const rowsPerPage = 4;
  const cardsPerPage = rowsPerPage * 2;
  const pages = [];

  for (let start = 0; start < items.length; start += cardsPerPage) {
    const slice = items.slice(start, start + cardsPerPage);
    const commands = [];
    drawText(commands, title, margin, pageHeight - margin - 10, 24);
    drawText(commands, "Name: ________    Score: ________", margin, pageHeight - margin - 34, 12);
    drawText(commands, "Use + - x / to make 24", pageWidth - margin - 170, pageHeight - margin - 34, 12);

    slice.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = margin + col * (colWidth + gap);
      const topY = pageHeight - margin - headerHeight - row * (cardHeight + rowGap);
      const rectY = topY - cardHeight;
      const nums = Array.isArray(item && item.nums) ? item.nums : [];
      const line1 = `${start + idx + 1}. ${nums.join("   ")}`;

      drawRect(commands, x, rectY, colWidth, cardHeight);
      drawText(commands, line1, x + 12, topY - 24, 22);
      drawLine(commands, x + 12, topY - 52, x + colWidth - 12, topY - 52);
      drawLine(commands, x + 12, topY - 78, x + colWidth - 12, topY - 78);
      drawLine(commands, x + 12, topY - 104, x + colWidth - 12, topY - 104);
    });

    pages.push(commands.join("\n"));
  }

  return buildPdfDocument(pages, pageWidth, pageHeight);
}

function drawText(commands, text, x, y, fontSize) {
  commands.push(`BT /F1 ${fontSize} Tf 1 0 0 1 ${num(x)} ${num(y)} Tm (${escapePdfText(text)}) Tj ET`);
}

function drawRect(commands, x, y, w, h) {
  commands.push(`${num(x)} ${num(y)} ${num(w)} ${num(h)} re S`);
}

function drawLine(commands, x1, y1, x2, y2) {
  commands.push(`${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`);
}

function buildPdfDocument(pageStreams, pageWidth, pageHeight) {
  const objects = [];
  const pageObjectIds = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  for (let i = 0; i < pageStreams.length; i += 1) {
    const contentId = objects.length + 1;
    const content = Buffer.from(pageStreams[i], "utf8");
    objects.push(`<< /Length ${content.length} >>\nstream\n${pageStreams[i]}\nendstream`);

    const pageId = objects.length + 1;
    pageObjectIds.push(pageId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(pageWidth)} ${num(pageHeight)}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`
    );
  }

  objects[1] = `<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((objectBody, index) => {
    offsets.push(Buffer.byteLength(chunks.join(""), "utf8"));
    chunks.push(`${index + 1} 0 obj\n${objectBody}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  for (let i = 1; i < offsets.length; i += 1) {
    chunks.push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(chunks.join(""), "utf8");
}

function num(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

function escapePdfText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function sanitizeFilename(name) {
  return String(name).replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
}

function encodeAsciiFilename(name) {
  return sanitizeFilename(name).replace(/[^\x20-\x7E]/g, "_");
}

function cleanupTempFiles(paths) {
  for (const filePath of paths) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {}
  }
}

function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  ensureUsersTableSchema();
  ensureDefaultUser();
}

function ensureUsersTableSchema() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const targetColumns = ["id", "username", "password", "created_time"];
  const alreadyMatches =
    columns.length === targetColumns.length &&
    targetColumns.every((name, index) => columns[index] && columns[index].name === name);

  if (alreadyMatches) {
    return;
  }

  const hasPassword = columns.some((column) => column.name === "password");
  const hasPasswordHash = columns.some((column) => column.name === "password_hash");
  const hasCreatedTime = columns.some((column) => column.name === "created_time");
  const hasCreatedAt = columns.some((column) => column.name === "created_at");
  const passwordExpr =
    hasPassword && hasPasswordHash
      ? "COALESCE(NULLIF(password, ''), password_hash, '')"
      : hasPassword
        ? "COALESCE(password, '')"
        : hasPasswordHash
          ? "COALESCE(password_hash, '')"
          : "''";
  const createdTimeExpr = hasCreatedTime
    ? "CASE WHEN created_time IS NOT NULL AND TRIM(created_time) != '' THEN created_time ELSE CURRENT_TIMESTAMP END"
    : hasCreatedAt
      ? "CASE WHEN created_at IS NOT NULL AND LENGTH(TRIM(created_at)) >= 10 THEN created_at ELSE CURRENT_TIMESTAMP END"
      : "CURRENT_TIMESTAMP";

  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec("BEGIN;");
  try {
    db.exec(`
      DROP TABLE IF EXISTS users__new;
      CREATE TABLE users__new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.prepare(`
      INSERT INTO users__new (id, username, password, created_time)
      SELECT id, username, ${passwordExpr}, ${createdTimeExpr}
      FROM users
    `).run();
    db.exec(`
      DROP TABLE users;
      ALTER TABLE users__new RENAME TO users;
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  } catch (error) {
    db.exec("ROLLBACK;");
    db.exec("PRAGMA foreign_keys = ON;");
    throw error;
  }
}

function ensureDefaultUser() {
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;

  if (!DEFAULT_USERNAME || !DEFAULT_PASSWORD) {
    if (userCount === 0) {
      console.warn("No users found. Set DEFAULT_USERNAME and DEFAULT_PASSWORD in Render env vars.");
    }
    return;
  }

  validateCredentials(DEFAULT_USERNAME, DEFAULT_PASSWORD);
  db.prepare(
    `INSERT INTO users (username, password)
     VALUES (?, ?)
     ON CONFLICT(username) DO UPDATE SET password = excluded.password`
  ).run(DEFAULT_USERNAME, DEFAULT_PASSWORD);
}

function validateCredentials(username, password) {
  if (!username || username.length < 3 || username.length > 32) {
    throw httpError(400, "账号长度需在 3 到 32 位之间");
  }
  if (!/^[a-z0-9_]+$/i.test(username)) {
    throw httpError(400, "账号只能包含字母、数字、下划线");
  }
  if (!password || String(password).length < 6 || String(password).length > 64) {
    throw httpError(400, "密码长度需在 6 到 64 位之间");
  }
}

function handleLogin(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = String(password);
      validateCredentials(normalized, normalizedPassword);

      const user = db.prepare("SELECT id, username, password FROM users WHERE username = ?").get(normalized);
      if (!user || normalizedPassword !== String(user.password || "")) {
        throw httpError(401, "账号或密码错误");
      }

      const session = createSession(user.id);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(user.id), username: user.username },
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleRegister(req, res) {
  sendJson(res, 403, { error: "暂不开放注册" });
}
