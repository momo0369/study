const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");
const { URL } = require("url");

let PgPool = null;

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8080);
const WEB_ROOT = __dirname;
const REMOTE_HOST = "www.xiaoxuestudy.com";
const DATA_ROOT = path.resolve(process.env.DATA_DIR || WEB_ROOT);
const DB_PATH = path.join(DATA_ROOT, "data.sqlite");
const SESSION_COOKIE = "kousuan_session";
const DEFAULT_USERNAME = String(process.env.DEFAULT_USERNAME || process.env.ADMIN_USERNAME || "").trim().toLowerCase();
const DEFAULT_PASSWORD = String(process.env.DEFAULT_PASSWORD || process.env.ADMIN_PASSWORD || "");
const FALLBACK_USERNAME = "dongdong";
const FALLBACK_PASSWORD = "123456";
const USE_POSTGRES_AUTH = Boolean(process.env.DATABASE_URL);

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
let activeMemberAccessPool = null;

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

async function startServer() {
  await initActiveMemberAccessStorage();

  http.createServer(async (req, res) => {
    try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (requestUrl.pathname === "/api/auth/register" && req.method === "POST") {
      await handleActiveMemberAccessRegister(req, res);
      return;
    }
    if (requestUrl.pathname === "/api/auth/login" && req.method === "POST") {
      await handleActiveMemberAccessLogin(req, res);
      return;
    }
    if (requestUrl.pathname === "/api/auth/me" && req.method === "GET") {
      await handleActiveMemberAccessMe(req, res);
      return;
    }
    if (requestUrl.pathname === "/api/auth/logout" && req.method === "POST") {
      await handleActiveMemberAccessLogout(req, res);
      return;
    }
    if (requestUrl.pathname === "/api/auth/print-permission" && req.method === "GET") {
      await handleActiveMemberAccessPrintPermission(req, res);
      return;
    }
    if (requestUrl.pathname === "/api/twentyfour-pdf" && req.method === "POST") {
      if (!(await requireActiveMemberAccessPrintPermission(req, res))) return;
      handleTwentyfourPdf(req, res);
      return;
    }

    if (requestUrl.pathname.startsWith("/api/")) {
      if (isActiveMemberAccessProtectedPrintApiRequest(requestUrl) && !(await requireActiveMemberAccessPrintPermission(req, res))) return;
      proxyRequest(req, res, requestUrl);
      return;
    }

    serveStatic(requestUrl.pathname, res);
    } catch (error) {
      sendKnownError(res, error);
    }
  }).listen(PORT, HOST, () => {
    console.log(`Web app: http://${HOST}:${PORT}`);
  });
}

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
    const disableCache = extension === ".html" || extension === ".js" || extension === ".css";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Cache-Control": disableCache ? "no-cache" : "public, max-age=3600",
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

function getActiveMemberAccessPoolClass() {
  if (!PgPool) {
    ({ Pool: PgPool } = require("pg"));
  }
  return PgPool;
}

async function initActiveMemberAccessStorage() {
  initActiveMemberAccessSqlite();

  if (!USE_POSTGRES_AUTH) {
    return;
  }

  const Pool = getActiveMemberAccessPoolClass();
  activeMemberAccessPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10000,
    ssl: getActiveMemberAccessSslConfig(),
  });

  await activeMemberAccessPool.query("SELECT 1");
  await initActiveMemberAccessPostgres();
}

function getActiveMemberAccessSslConfig() {
  const sslMode = String(process.env.PGSSLMODE || "").toLowerCase();
  if (sslMode === "disable" || process.env.RENDER === "true") {
    return undefined;
  }
  return /sslmode=require/i.test(String(process.env.DATABASE_URL || "")) ? { rejectUnauthorized: false } : undefined;
}

function initActiveMemberAccessSqlite() {
  db.exec(`
    PRAGMA journal_mode = DELETE;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      member_expires_at TEXT DEFAULT NULL,
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
  ensureActiveMemberAccessSqliteUsersTableSchema();
  ensureActiveMemberAccessSqliteDefaultUser();
}

function ensureActiveMemberAccessSqliteUsersTableSchema() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const targetColumns = ["id", "username", "password", "member_expires_at", "created_time"];
  const alreadyMatches =
    columns.length === targetColumns.length &&
    targetColumns.every((name, index) => columns[index] && columns[index].name === name);

  if (alreadyMatches) {
    return;
  }

  const columnNames = new Set(columns.map((column) => column.name));
  const hasPassword = columnNames.has("password");
  const hasPasswordHash = columnNames.has("password_hash");
  const hasMemberExpiresAt = columnNames.has("member_expires_at");
  const hasCanPrint = columnNames.has("can_print");
  const hasCreatedTime = columnNames.has("created_time");
  const hasCreatedAt = columnNames.has("created_at");
  const passwordExpr = hasPassword
    ? "COALESCE(password, '')"
    : hasPasswordHash
      ? "COALESCE(password_hash, '')"
      : "''";
  const memberExpiresExpr = hasMemberExpiresAt
    ? "NULLIF(TRIM(member_expires_at), '')"
    : hasCanPrint
      ? "CASE WHEN can_print IN (1, '1', 'true', 'TRUE') THEN '2099-12-31 23:59:59' ELSE NULL END"
      : "NULL";
  const createdTimeExpr = hasCreatedTime
    ? "CASE WHEN created_time IS NOT NULL AND TRIM(created_time) != '' THEN created_time ELSE CURRENT_TIMESTAMP END"
    : hasCreatedAt
      ? "CASE WHEN created_at IS NOT NULL AND TRIM(created_at) != '' THEN created_at ELSE CURRENT_TIMESTAMP END"
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
        member_expires_at TEXT DEFAULT NULL,
        created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.prepare(`
      INSERT INTO users__new (id, username, password, member_expires_at, created_time)
      SELECT id, username, COALESCE(${passwordExpr}, ''), ${memberExpiresExpr}, ${createdTimeExpr}
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

function ensureActiveMemberAccessSqliteDefaultUser() {
  const row = db.prepare("SELECT COUNT(*) AS count FROM users").get();
  const userCount = Number(row && row.count ? row.count : 0);
  const seedUsername = DEFAULT_USERNAME || FALLBACK_USERNAME;
  const seedPassword = DEFAULT_PASSWORD || FALLBACK_PASSWORD;

  if (!seedUsername || !seedPassword) {
    return;
  }

  validateActiveMemberAccessCredentials(seedUsername, seedPassword);

  if (DEFAULT_USERNAME && DEFAULT_PASSWORD) {
    db.prepare(
      `INSERT INTO users (username, password, member_expires_at)
       VALUES (?, ?, NULL)
       ON CONFLICT(username) DO UPDATE SET password = excluded.password`
    ).run(seedUsername, seedPassword);
    return;
  }

  if (userCount === 0) {
    db.prepare("INSERT INTO users (username, password, member_expires_at) VALUES (?, ?, NULL)").run(seedUsername, seedPassword);
    console.warn(`Seeded fallback user: ${seedUsername}`);
  }
}

async function initActiveMemberAccessPostgres() {
  await activeMemberAccessPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      member_expires_at TIMESTAMPTZ NULL,
      created_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await activeMemberAccessPool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);
  await activeMemberAccessPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS member_expires_at TIMESTAMPTZ NULL");
  await activeMemberAccessPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP");
  await importActiveMemberAccessUsersFromSqliteIfNeeded();
  await ensureActiveMemberAccessPostgresDefaultUser();
}

async function importActiveMemberAccessUsersFromSqliteIfNeeded() {
  const countRow = await activeMemberAccessPool.query("SELECT COUNT(*)::int AS count FROM users");
  const userCount = Number(countRow.rows[0] && countRow.rows[0].count ? countRow.rows[0].count : 0);
  if (userCount > 0) {
    return;
  }

  const sqliteUsers = db
    .prepare("SELECT id, username, password, member_expires_at, created_time FROM users ORDER BY id")
    .all();
  if (!sqliteUsers.length) {
    return;
  }

  const client = await activeMemberAccessPool.connect();
  try {
    await client.query("BEGIN");
    for (const user of sqliteUsers) {
      await client.query(
        `INSERT INTO users (id, username, password, member_expires_at, created_time)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (username) DO NOTHING`,
        [
          Number(user.id),
          user.username,
          String(user.password || ""),
          normalizeActiveMemberAccessImportValue(user.member_expires_at),
          normalizeActiveMemberAccessImportValue(user.created_time) || new Date().toISOString(),
        ]
      );
    }
    await client.query(
      `SELECT setval(
        pg_get_serial_sequence('users', 'id'),
        GREATEST(COALESCE((SELECT MAX(id) FROM users), 1), 1),
        true
      )`
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function normalizeActiveMemberAccessImportValue(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim();
  return text || null;
}

async function ensureActiveMemberAccessPostgresDefaultUser() {
  const seedUsername = DEFAULT_USERNAME || FALLBACK_USERNAME;
  const seedPassword = DEFAULT_PASSWORD || FALLBACK_PASSWORD;

  if (!seedUsername || !seedPassword) {
    return;
  }

  validateActiveMemberAccessCredentials(seedUsername, seedPassword);

  if (DEFAULT_USERNAME && DEFAULT_PASSWORD) {
    await activeMemberAccessPool.query(
      `INSERT INTO users (username, password, member_expires_at)
       VALUES ($1, $2, NULL)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
      [seedUsername, seedPassword]
    );
    return;
  }

  const countRow = await activeMemberAccessPool.query("SELECT COUNT(*)::int AS count FROM users");
  const userCount = Number(countRow.rows[0] && countRow.rows[0].count ? countRow.rows[0].count : 0);
  if (userCount === 0) {
    await activeMemberAccessPool.query(
      "INSERT INTO users (username, password, member_expires_at) VALUES ($1, $2, NULL)",
      [seedUsername, seedPassword]
    );
    console.warn(`Seeded fallback user: ${seedUsername}`);
  }
}

function validateActiveMemberAccessCredentials(username, password) {
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

async function handleActiveMemberAccessRegister(req, res) {
  try {
    const { username, password } = await readJsonBody(req);
    const normalized = normalizeUsername(username);
    const normalizedPassword = password == null ? "" : String(password);
    validateActiveMemberAccessCredentials(normalized, normalizedPassword);

    const existing = await findActiveMemberAccessUserByUsername(normalized);
    if (existing) {
      throw httpError(409, "账号已存在");
    }

    const user = await insertActiveMemberAccessUser(normalized, normalizedPassword);
    const session = await createActiveMemberAccessSession(user.id);
    setSessionCookie(res, session.token);
    sendJson(res, 200, { user: buildActiveMemberAccessAuthUser(user) });
  } catch (error) {
    sendKnownError(res, error);
  }
}

async function handleActiveMemberAccessLogin(req, res) {
  try {
    const { username, password } = await readJsonBody(req);
    const normalized = normalizeUsername(username);
    const normalizedPassword = password == null ? "" : String(password);
    validateActiveMemberAccessCredentials(normalized, normalizedPassword);

    const user = await findActiveMemberAccessUserByUsername(normalized);
    if (!user || normalizedPassword !== String(user.password || "")) {
      throw httpError(401, "账号或密码错误");
    }

    const session = await createActiveMemberAccessSession(user.id);
    setSessionCookie(res, session.token);
    sendJson(res, 200, { user: buildActiveMemberAccessAuthUser(user) });
  } catch (error) {
    sendKnownError(res, error);
  }
}

async function handleActiveMemberAccessMe(req, res) {
  const user = await getActiveMemberAccessUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { user: null });
    return;
  }
  sendJson(res, 200, { user: buildActiveMemberAccessAuthUser(user) });
}

async function handleActiveMemberAccessLogout(req, res) {
  const token = getSessionToken(req);
  if (token) {
    await deleteActiveMemberAccessSession(token);
  }
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}

async function handleActiveMemberAccessPrintPermission(req, res) {
  const user = await getActiveMemberAccessUserFromRequest(req);
  sendJson(res, user ? 200 : 401, buildActiveMemberAccessPromptPayload(user));
}

async function requireActiveMemberAccessPrintPermission(req, res) {
  const user = await getActiveMemberAccessUserFromRequest(req);
  if (user && isActiveMemberAccessMembershipActive(user.member_expires_at)) {
    return true;
  }
  sendJson(res, user ? 403 : 401, {
    error: "membership_required",
    message: "在线打印和保存 PDF 需要会员，请添加微信 refresh_dd 开通。",
    ...buildActiveMemberAccessPromptPayload(user),
  });
  return false;
}

function isActiveMemberAccessProtectedPrintApiRequest(requestUrl) {
  if (requestUrl.pathname === "/api/bridge.php" && requestUrl.searchParams.get("function") === "downloaddoc") {
    return true;
  }
  return requestUrl.pathname.startsWith("/api/static/kousuan_v2/pdf/");
}

async function findActiveMemberAccessUserByUsername(username) {
  if (USE_POSTGRES_AUTH) {
    const result = await activeMemberAccessPool.query(
      "SELECT id, username, password, member_expires_at, created_time FROM users WHERE username = $1",
      [username]
    );
    return result.rows[0] || null;
  }
  return db.prepare("SELECT id, username, password, member_expires_at, created_time FROM users WHERE username = ?").get(username) || null;
}

async function insertActiveMemberAccessUser(username, password) {
  if (USE_POSTGRES_AUTH) {
    const result = await activeMemberAccessPool.query(
      `INSERT INTO users (username, password, member_expires_at)
       VALUES ($1, $2, NULL)
       RETURNING id, username, password, member_expires_at, created_time`,
      [username, password]
    );
    return result.rows[0];
  }

  const result = db.prepare("INSERT INTO users (username, password, member_expires_at) VALUES (?, ?, NULL)").run(username, password);
  return {
    id: Number(result.lastInsertRowid),
    username,
    password,
    member_expires_at: null,
    created_time: new Date().toISOString(),
  };
}

async function createActiveMemberAccessSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

  if (USE_POSTGRES_AUTH) {
    await activeMemberAccessPool.query(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
      [token, Number(userId), expiresAt]
    );
    return { token, expiresAt };
  }

  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
  return { token, expiresAt };
}

async function deleteActiveMemberAccessSession(token) {
  if (USE_POSTGRES_AUTH) {
    await activeMemberAccessPool.query("DELETE FROM sessions WHERE token = $1", [token]);
    return;
  }
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

async function getActiveMemberAccessUserFromRequest(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  if (USE_POSTGRES_AUTH) {
    const result = await activeMemberAccessPool.query(
      `SELECT users.id, users.username, users.member_expires_at, sessions.expires_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = $1`,
      [token]
    );
    const row = result.rows[0] || null;
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await deleteActiveMemberAccessSession(token);
      return null;
    }
    return row;
  }

  const row = db
    .prepare(
      `SELECT users.id, users.username, users.member_expires_at, sessions.expires_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`
    )
    .get(token);

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await deleteActiveMemberAccessSession(token);
    return null;
  }
  return row;
}

function buildActiveMemberAccessAuthUser(user) {
  if (!user) return null;
  const memberExpiresAt = normalizeActiveMemberAccessExpiresAt(user.member_expires_at);
  const isMember = isActiveMemberAccessMembershipActive(memberExpiresAt);
  return {
    id: Number(user.id),
    username: user.username,
    memberExpiresAt,
    isMember,
    canPrint: isMember,
  };
}

function buildActiveMemberAccessPromptPayload(user) {
  const authUser = buildActiveMemberAccessAuthUser(user);
  return {
    canPrint: Boolean(authUser && authUser.canPrint),
    isMember: Boolean(authUser && authUser.isMember),
    memberExpiresAt: authUser ? authUser.memberExpiresAt : null,
    wechat: "refresh_dd",
    image: "/images/image.png",
    plans: [
      { title: "3个月", price: "29.9元" },
      { title: "1年", price: "69.9元" },
    ],
  };
}

function normalizeActiveMemberAccessExpiresAt(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim();
  return text || null;
}

function isActiveMemberAccessMembershipActive(value) {
  const expiresAt = parseActiveMemberAccessExpiresAt(value);
  return Boolean(expiresAt && expiresAt.getTime() >= Date.now());
}

function parseActiveMemberAccessExpiresAt(value) {
  const normalized = normalizeActiveMemberAccessExpiresAt(value);
  if (!normalized) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T23:59:59+08:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(normalized)) {
    return new Date(normalized.replace(" ", "T") + ":00+08:00");
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return new Date(normalized.replace(" ", "T") + "+08:00");
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function initMemberAccessDatabase() {
  db.exec(`
    PRAGMA journal_mode = DELETE;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      member_expires_at TEXT DEFAULT NULL,
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
  ensureMemberAccessUsersTableSchema();
  ensureMemberAccessDefaultUser();
}

function ensureMemberAccessUsersTableSchema() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const targetColumns = ["id", "username", "password", "member_expires_at", "created_time"];
  const alreadyMatches =
    columns.length === targetColumns.length &&
    targetColumns.every((name, index) => columns[index] && columns[index].name === name);

  if (alreadyMatches) {
    return;
  }

  const columnNames = new Set(columns.map((column) => column.name));
  const hasPassword = columnNames.has("password");
  const hasPasswordHash = columnNames.has("password_hash");
  const hasMemberExpiresAt = columnNames.has("member_expires_at");
  const hasCanPrint = columnNames.has("can_print");
  const hasCreatedTime = columnNames.has("created_time");
  const hasCreatedAt = columnNames.has("created_at");
  const passwordExpr = hasPassword
    ? "COALESCE(password, '')"
    : hasPasswordHash
      ? "COALESCE(password_hash, '')"
      : "''";
  const memberExpiresExpr = hasMemberExpiresAt
    ? "NULLIF(TRIM(member_expires_at), '')"
    : hasCanPrint
      ? "CASE WHEN can_print IN (1, '1', 'true', 'TRUE') THEN '2099-12-31 23:59:59' ELSE NULL END"
      : "NULL";
  const createdTimeExpr = hasCreatedTime
    ? "CASE WHEN created_time IS NOT NULL AND TRIM(created_time) != '' THEN created_time ELSE CURRENT_TIMESTAMP END"
    : hasCreatedAt
      ? "CASE WHEN created_at IS NOT NULL AND TRIM(created_at) != '' THEN created_at ELSE CURRENT_TIMESTAMP END"
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
        member_expires_at TEXT DEFAULT NULL,
        created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.prepare(`
      INSERT INTO users__new (id, username, password, member_expires_at, created_time)
      SELECT id, username, COALESCE(${passwordExpr}, ''), ${memberExpiresExpr}, ${createdTimeExpr}
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

function ensureMemberAccessDefaultUser() {
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const seedUsername = DEFAULT_USERNAME || FALLBACK_USERNAME;
  const seedPassword = DEFAULT_PASSWORD || FALLBACK_PASSWORD;

  if (!seedUsername || !seedPassword) {
    return;
  }

  validateMemberAccessCredentials(seedUsername, seedPassword);

  if (DEFAULT_USERNAME && DEFAULT_PASSWORD) {
    db.prepare(
      `INSERT INTO users (username, password, member_expires_at)
       VALUES (?, ?, NULL)
       ON CONFLICT(username) DO UPDATE SET password = excluded.password`
    ).run(seedUsername, seedPassword);
    return;
  }

  if (userCount === 0) {
    db.prepare("INSERT INTO users (username, password, member_expires_at) VALUES (?, ?, NULL)").run(seedUsername, seedPassword);
    console.warn(`Seeded fallback user: ${seedUsername}`);
  }
}

function validateMemberAccessCredentials(username, password) {
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

function handleMemberAccessRegister(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = password == null ? "" : String(password);
      validateMemberAccessCredentials(normalized, normalizedPassword);

      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(normalized);
      if (existing) {
        throw httpError(409, "账号已存在");
      }

      const result = db
        .prepare("INSERT INTO users (username, password, member_expires_at) VALUES (?, ?, NULL)")
        .run(normalized, normalizedPassword);
      const session = createSession(result.lastInsertRowid);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: buildMemberAccessAuthUser({
          id: result.lastInsertRowid,
          username: normalized,
          member_expires_at: null,
        }),
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleMemberAccessLogin(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = password == null ? "" : String(password);
      validateMemberAccessCredentials(normalized, normalizedPassword);

      const user = db
        .prepare("SELECT id, username, password, member_expires_at FROM users WHERE username = ?")
        .get(normalized);
      if (!user || normalizedPassword !== String(user.password || "")) {
        throw httpError(401, "账号或密码错误");
      }

      const session = createSession(user.id);
      setSessionCookie(res, session.token);
      sendJson(res, 200, { user: buildMemberAccessAuthUser(user) });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleMemberAccessMe(req, res) {
  const user = getMemberAccessUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { user: null });
    return;
  }
  sendJson(res, 200, { user: buildMemberAccessAuthUser(user) });
}

function handleMemberAccessPrintPermission(req, res) {
  const user = getMemberAccessUserFromRequest(req);
  sendJson(res, user ? 200 : 401, buildMemberAccessPromptPayload(user));
}

function requireMemberAccessPrintPermission(req, res) {
  const user = getMemberAccessUserFromRequest(req);
  if (user && isMemberAccessActive(user.member_expires_at)) {
    return true;
  }
  sendJson(res, user ? 403 : 401, {
    error: "membership_required",
    message: "在线打印和保存 PDF 需要会员，请添加微信 refresh_dd 开通。",
    ...buildMemberAccessPromptPayload(user),
  });
  return false;
}

function isMemberAccessProtectedPrintApiRequest(requestUrl) {
  if (requestUrl.pathname === "/api/bridge.php" && requestUrl.searchParams.get("function") === "downloaddoc") {
    return true;
  }
  return requestUrl.pathname.startsWith("/api/static/kousuan_v2/pdf/");
}

function getMemberAccessUserFromRequest(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT users.id, users.username, users.member_expires_at, sessions.expires_at
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

function buildMemberAccessAuthUser(user) {
  if (!user) return null;
  const memberExpiresAt = normalizeMemberAccessExpiresAt(user.member_expires_at);
  const isMember = isMemberAccessActive(memberExpiresAt);
  return {
    id: Number(user.id),
    username: user.username,
    memberExpiresAt,
    isMember,
    canPrint: isMember,
  };
}

function buildMemberAccessPromptPayload(user) {
  const authUser = buildMemberAccessAuthUser(user);
  return {
    canPrint: Boolean(authUser && authUser.canPrint),
    isMember: Boolean(authUser && authUser.isMember),
    memberExpiresAt: authUser ? authUser.memberExpiresAt : null,
    wechat: "refresh_dd",
    image: "/images/image.png",
    plans: [
      { title: "3个月", price: "29.9元" },
      { title: "1年", price: "69.9元" },
    ],
  };
}

function normalizeMemberAccessExpiresAt(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function isMemberAccessActive(value) {
  const expiresAt = parseMemberAccessExpiresAt(value);
  return Boolean(expiresAt && expiresAt.getTime() >= Date.now());
}

function parseMemberAccessExpiresAt(value) {
  const text = normalizeMemberAccessExpiresAt(value);
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T23:59:59+08:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(text)) {
    return new Date(text.replace(" ", "T") + ":00+08:00");
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(text)) {
    return new Date(text.replace(" ", "T") + "+08:00");
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = DELETE;
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

// Final auth implementation. This block intentionally appears at the end of the
// file because older duplicated declarations above are kept for migration safety.
function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = DELETE;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      can_print INTEGER NOT NULL DEFAULT 0,
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
  const targetColumns = ["id", "username", "password", "can_print", "created_time"];
  const alreadyMatches =
    columns.length === targetColumns.length &&
    targetColumns.every((name, index) => columns[index] && columns[index].name === name);

  if (alreadyMatches) {
    return;
  }

  const columnNames = new Set(columns.map((column) => column.name));
  const hasPassword = columnNames.has("password");
  const hasPasswordHash = columnNames.has("password_hash");
  const hasCanPrint = columnNames.has("can_print");
  const hasCreatedTime = columnNames.has("created_time");
  const hasCreatedAt = columnNames.has("created_at");
  const passwordExpr = hasPassword
    ? "COALESCE(password, '')"
    : hasPasswordHash
      ? "COALESCE(password_hash, '')"
      : "''";
  const canPrintExpr = hasCanPrint
    ? "CASE WHEN can_print IN (1, '1', 'true', 'TRUE') THEN 1 ELSE 0 END"
    : "0";
  const createdTimeExpr = hasCreatedTime
    ? "CASE WHEN created_time IS NOT NULL AND TRIM(created_time) != '' THEN created_time ELSE CURRENT_TIMESTAMP END"
    : hasCreatedAt
      ? "CASE WHEN created_at IS NOT NULL AND TRIM(created_at) != '' THEN created_at ELSE CURRENT_TIMESTAMP END"
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
        can_print INTEGER NOT NULL DEFAULT 0,
        created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.prepare(`
      INSERT INTO users__new (id, username, password, can_print, created_time)
      SELECT id, username, COALESCE(${passwordExpr}, ''), ${canPrintExpr}, ${createdTimeExpr}
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
  const seedUsername = DEFAULT_USERNAME || FALLBACK_USERNAME;
  const seedPassword = DEFAULT_PASSWORD || FALLBACK_PASSWORD;

  if (!seedUsername || !seedPassword) {
    return;
  }

  validateCredentials(seedUsername, seedPassword);

  if (DEFAULT_USERNAME && DEFAULT_PASSWORD) {
    db.prepare(
      `INSERT INTO users (username, password, can_print)
       VALUES (?, ?, 0)
       ON CONFLICT(username) DO UPDATE SET password = excluded.password`
    ).run(seedUsername, seedPassword);
    return;
  }

  if (userCount === 0) {
    db.prepare("INSERT INTO users (username, password, can_print) VALUES (?, ?, 0)").run(seedUsername, seedPassword);
    console.warn(`Seeded fallback user: ${seedUsername}`);
  }
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

function handleRegister(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = password == null ? "" : String(password);
      validateCredentials(normalized, normalizedPassword);

      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(normalized);
      if (existing) {
        throw httpError(409, "账号已存在");
      }

      const result = db
        .prepare("INSERT INTO users (username, password, can_print) VALUES (?, ?, 0)")
        .run(normalized, normalizedPassword);
      const session = createSession(result.lastInsertRowid);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(result.lastInsertRowid), username: normalized, canPrint: false },
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleLogin(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = password == null ? "" : String(password);
      validateCredentials(normalized, normalizedPassword);

      const user = db.prepare("SELECT id, username, password, can_print FROM users WHERE username = ?").get(normalized);
      if (!user || normalizedPassword !== String(user.password || "")) {
        throw httpError(401, "账号或密码错误");
      }

      const session = createSession(user.id);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(user.id), username: user.username, canPrint: user.can_print === 1 },
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
    user: { id: Number(user.id), username: user.username, canPrint: user.can_print === 1 },
  });
}

function handlePrintPermission(req, res) {
  const user = getUserFromRequest(req);
  sendJson(res, user ? 200 : 401, {
    canPrint: Boolean(user && user.can_print === 1),
    wechat: "xixifresher",
    image: "/images/image.jpg",
  });
}

function requirePrintPermission(req, res) {
  const user = getUserFromRequest(req);
  if (user && user.can_print === 1) {
    return true;
  }
  sendJson(res, user ? 403 : 401, {
    error: "print_permission_required",
    message: "请添加微信 xixifresher 开通打印权限",
    wechat: "xixifresher",
    image: "/images/image.jpg",
  });
  return false;
}

function isPrintApiRequest(requestUrl) {
  if (requestUrl.pathname === "/api/bridge.php" && requestUrl.searchParams.get("function") === "downloaddoc") {
    return true;
  }
  return requestUrl.pathname.startsWith("/api/static/kousuan_v2/pdf/");
}

function getUserFromRequest(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT users.id, users.username, users.can_print, sessions.expires_at
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

// Final membership override at true EOF.
function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = DELETE;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      member_expires_at TEXT DEFAULT NULL,
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
  const targetColumns = ["id", "username", "password", "member_expires_at", "created_time"];
  const alreadyMatches =
    columns.length === targetColumns.length &&
    targetColumns.every((name, index) => columns[index] && columns[index].name === name);

  if (alreadyMatches) {
    return;
  }

  const columnNames = new Set(columns.map((column) => column.name));
  const hasPassword = columnNames.has("password");
  const hasPasswordHash = columnNames.has("password_hash");
  const hasMemberExpiresAt = columnNames.has("member_expires_at");
  const hasCanPrint = columnNames.has("can_print");
  const hasCreatedTime = columnNames.has("created_time");
  const hasCreatedAt = columnNames.has("created_at");
  const passwordExpr = hasPassword
    ? "COALESCE(password, '')"
    : hasPasswordHash
      ? "COALESCE(password_hash, '')"
      : "''";
  const memberExpiresExpr = hasMemberExpiresAt
    ? "NULLIF(TRIM(member_expires_at), '')"
    : hasCanPrint
      ? "CASE WHEN can_print IN (1, '1', 'true', 'TRUE') THEN '2099-12-31 23:59:59' ELSE NULL END"
      : "NULL";
  const createdTimeExpr = hasCreatedTime
    ? "CASE WHEN created_time IS NOT NULL AND TRIM(created_time) != '' THEN created_time ELSE CURRENT_TIMESTAMP END"
    : hasCreatedAt
      ? "CASE WHEN created_at IS NOT NULL AND TRIM(created_at) != '' THEN created_at ELSE CURRENT_TIMESTAMP END"
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
        member_expires_at TEXT DEFAULT NULL,
        created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.prepare(`
      INSERT INTO users__new (id, username, password, member_expires_at, created_time)
      SELECT id, username, COALESCE(${passwordExpr}, ''), ${memberExpiresExpr}, ${createdTimeExpr}
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
  const seedUsername = DEFAULT_USERNAME || FALLBACK_USERNAME;
  const seedPassword = DEFAULT_PASSWORD || FALLBACK_PASSWORD;

  if (!seedUsername || !seedPassword) {
    return;
  }

  validateCredentials(seedUsername, seedPassword);

  if (DEFAULT_USERNAME && DEFAULT_PASSWORD) {
    db.prepare(
      `INSERT INTO users (username, password, member_expires_at)
       VALUES (?, ?, NULL)
       ON CONFLICT(username) DO UPDATE SET password = excluded.password`
    ).run(seedUsername, seedPassword);
    return;
  }

  if (userCount === 0) {
    db.prepare("INSERT INTO users (username, password, member_expires_at) VALUES (?, ?, NULL)").run(seedUsername, seedPassword);
    console.warn(`Seeded fallback user: ${seedUsername}`);
  }
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

function handleRegister(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = password == null ? "" : String(password);
      validateCredentials(normalized, normalizedPassword);

      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(normalized);
      if (existing) {
        throw httpError(409, "账号已存在");
      }

      const result = db
        .prepare("INSERT INTO users (username, password, member_expires_at) VALUES (?, ?, NULL)")
        .run(normalized, normalizedPassword);
      const session = createSession(result.lastInsertRowid);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: buildAuthUserPayload({
          id: result.lastInsertRowid,
          username: normalized,
          member_expires_at: null,
        }),
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleLogin(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = password == null ? "" : String(password);
      validateCredentials(normalized, normalizedPassword);

      const user = db
        .prepare("SELECT id, username, password, member_expires_at FROM users WHERE username = ?")
        .get(normalized);
      if (!user || normalizedPassword !== String(user.password || "")) {
        throw httpError(401, "账号或密码错误");
      }

      const session = createSession(user.id);
      setSessionCookie(res, session.token);
      sendJson(res, 200, { user: buildAuthUserPayload(user) });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleMe(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { user: null });
    return;
  }
  sendJson(res, 200, { user: buildAuthUserPayload(user) });
}

function handlePrintPermission(req, res) {
  const user = getUserFromRequest(req);
  sendJson(res, user ? 200 : 401, buildMembershipPromptPayload(user));
}

function requirePrintPermission(req, res) {
  const user = getUserFromRequest(req);
  if (user && isMembershipActive(user.member_expires_at)) {
    return true;
  }
  sendJson(res, user ? 403 : 401, {
    error: "membership_required",
    message: "在线打印和保存 PDF 需要会员，请添加微信 refresh_dd 开通。",
    ...buildMembershipPromptPayload(user),
  });
  return false;
}

function isPrintApiRequest(requestUrl) {
  if (requestUrl.pathname === "/api/bridge.php" && requestUrl.searchParams.get("function") === "downloaddoc") {
    return true;
  }
  return requestUrl.pathname.startsWith("/api/static/kousuan_v2/pdf/");
}

function getUserFromRequest(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT users.id, users.username, users.member_expires_at, sessions.expires_at
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

// Latest membership-based auth override. Keep this block last so it wins over
// the duplicated legacy declarations above.
function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = DELETE;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      member_expires_at TEXT DEFAULT NULL,
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
  const targetColumns = ["id", "username", "password", "member_expires_at", "created_time"];
  const alreadyMatches =
    columns.length === targetColumns.length &&
    targetColumns.every((name, index) => columns[index] && columns[index].name === name);

  if (alreadyMatches) {
    return;
  }

  const columnNames = new Set(columns.map((column) => column.name));
  const hasPassword = columnNames.has("password");
  const hasPasswordHash = columnNames.has("password_hash");
  const hasMemberExpiresAt = columnNames.has("member_expires_at");
  const hasCanPrint = columnNames.has("can_print");
  const hasCreatedTime = columnNames.has("created_time");
  const hasCreatedAt = columnNames.has("created_at");
  const passwordExpr = hasPassword
    ? "COALESCE(password, '')"
    : hasPasswordHash
      ? "COALESCE(password_hash, '')"
      : "''";
  const memberExpiresExpr = hasMemberExpiresAt
    ? "NULLIF(TRIM(member_expires_at), '')"
    : hasCanPrint
      ? "CASE WHEN can_print IN (1, '1', 'true', 'TRUE') THEN '2099-12-31 23:59:59' ELSE NULL END"
      : "NULL";
  const createdTimeExpr = hasCreatedTime
    ? "CASE WHEN created_time IS NOT NULL AND TRIM(created_time) != '' THEN created_time ELSE CURRENT_TIMESTAMP END"
    : hasCreatedAt
      ? "CASE WHEN created_at IS NOT NULL AND TRIM(created_at) != '' THEN created_at ELSE CURRENT_TIMESTAMP END"
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
        member_expires_at TEXT DEFAULT NULL,
        created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.prepare(`
      INSERT INTO users__new (id, username, password, member_expires_at, created_time)
      SELECT id, username, COALESCE(${passwordExpr}, ''), ${memberExpiresExpr}, ${createdTimeExpr}
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
  const seedUsername = DEFAULT_USERNAME || FALLBACK_USERNAME;
  const seedPassword = DEFAULT_PASSWORD || FALLBACK_PASSWORD;

  if (!seedUsername || !seedPassword) {
    return;
  }

  validateCredentials(seedUsername, seedPassword);

  if (DEFAULT_USERNAME && DEFAULT_PASSWORD) {
    db.prepare(
      `INSERT INTO users (username, password, member_expires_at)
       VALUES (?, ?, NULL)
       ON CONFLICT(username) DO UPDATE SET password = excluded.password`
    ).run(seedUsername, seedPassword);
    return;
  }

  if (userCount === 0) {
    db.prepare("INSERT INTO users (username, password, member_expires_at) VALUES (?, ?, NULL)").run(seedUsername, seedPassword);
    console.warn(`Seeded fallback user: ${seedUsername}`);
  }
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

function handleRegister(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = password == null ? "" : String(password);
      validateCredentials(normalized, normalizedPassword);

      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(normalized);
      if (existing) {
        throw httpError(409, "账号已存在");
      }

      const result = db
        .prepare("INSERT INTO users (username, password, member_expires_at) VALUES (?, ?, NULL)")
        .run(normalized, normalizedPassword);
      const session = createSession(result.lastInsertRowid);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: buildAuthUserPayload({
          id: result.lastInsertRowid,
          username: normalized,
          member_expires_at: null,
        }),
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleLogin(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = password == null ? "" : String(password);
      validateCredentials(normalized, normalizedPassword);

      const user = db
        .prepare("SELECT id, username, password, member_expires_at FROM users WHERE username = ?")
        .get(normalized);
      if (!user || normalizedPassword !== String(user.password || "")) {
        throw httpError(401, "账号或密码错误");
      }

      const session = createSession(user.id);
      setSessionCookie(res, session.token);
      sendJson(res, 200, { user: buildAuthUserPayload(user) });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleMe(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { user: null });
    return;
  }
  sendJson(res, 200, { user: buildAuthUserPayload(user) });
}

function handlePrintPermission(req, res) {
  const user = getUserFromRequest(req);
  const payload = buildMembershipPromptPayload(user);
  sendJson(res, user ? 200 : 401, payload);
}

function requirePrintPermission(req, res) {
  const user = getUserFromRequest(req);
  if (user && isMembershipActive(user.member_expires_at)) {
    return true;
  }
  sendJson(res, user ? 403 : 401, {
    error: "membership_required",
    message: "在线打印和保存 PDF 需要会员，请添加微信 refresh_dd 开通。",
    ...buildMembershipPromptPayload(user),
  });
  return false;
}

function isPrintApiRequest(requestUrl) {
  if (requestUrl.pathname === "/api/bridge.php" && requestUrl.searchParams.get("function") === "downloaddoc") {
    return true;
  }
  return requestUrl.pathname.startsWith("/api/static/kousuan_v2/pdf/");
}

function getUserFromRequest(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT users.id, users.username, users.member_expires_at, sessions.expires_at
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

function buildAuthUserPayload(user) {
  if (!user) return null;
  const memberExpiresAt = normalizeMemberExpiresAt(user.member_expires_at);
  const isMember = isMembershipActive(memberExpiresAt);
  return {
    id: Number(user.id),
    username: user.username,
    memberExpiresAt,
    isMember,
    canPrint: isMember,
  };
}

function buildMembershipPromptPayload(user) {
  const authUser = buildAuthUserPayload(user);
  return {
    canPrint: Boolean(authUser && authUser.canPrint),
    isMember: Boolean(authUser && authUser.isMember),
    memberExpiresAt: authUser ? authUser.memberExpiresAt : null,
    wechat: "refresh_dd",
    image: "/images/image.png",
    plans: [
      { title: "3个月", price: "29.9元" },
      { title: "1年", price: "69.9元" },
    ],
  };
}

function normalizeMemberExpiresAt(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function isMembershipActive(value) {
  const expiresAt = parseMembershipTime(value);
  return Boolean(expiresAt && expiresAt.getTime() >= Date.now());
}

function parseMembershipTime(value) {
  const text = normalizeMemberExpiresAt(value);
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T23:59:59+08:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(text)) {
    return new Date(text.replace(" ", "T") + ":00+08:00");
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(text)) {
    return new Date(text.replace(" ", "T") + "+08:00");
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = DELETE;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      can_print INTEGER NOT NULL DEFAULT 0,
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
  const targetColumns = ["id", "username", "password", "can_print", "created_time"];
  const alreadyMatches =
    columns.length === targetColumns.length &&
    targetColumns.every((name, index) => columns[index] && columns[index].name === name);

  if (alreadyMatches) {
    return;
  }

  const hasPassword = columns.some((column) => column.name === "password");
  const hasPasswordHash = columns.some((column) => column.name === "password_hash");
  const hasCanPrint = columns.some((column) => column.name === "can_print");
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
  const canPrintExpr = hasCanPrint ? "CASE WHEN can_print = 1 THEN 1 ELSE 0 END" : "0";
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
        can_print INTEGER NOT NULL DEFAULT 0,
        created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.prepare(`
      INSERT INTO users__new (id, username, password, can_print, created_time)
      SELECT id, username, ${passwordExpr}, ${canPrintExpr}, ${createdTimeExpr}
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
      const normalizedPassword = String(password);
      validateCredentials(normalized, normalizedPassword);

      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(normalized);
      if (existing) {
        throw httpError(409, "账号已存在");
      }

      const result = db
        .prepare("INSERT INTO users (username, password, can_print) VALUES (?, ?, 0)")
        .run(normalized, normalizedPassword);
      const session = createSession(result.lastInsertRowid);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(result.lastInsertRowid), username: normalized, canPrint: false },
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleLogin(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = String(password);
      validateCredentials(normalized, normalizedPassword);

      const user = db.prepare("SELECT id, username, password, can_print FROM users WHERE username = ?").get(normalized);
      if (!user || normalizedPassword !== String(user.password || "")) {
        throw httpError(401, "账号或密码错误");
      }

      const session = createSession(user.id);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(user.id), username: user.username, canPrint: user.can_print === 1 },
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
    user: { id: Number(user.id), username: user.username, canPrint: user.can_print === 1 },
  });
}

function handlePrintPermission(req, res) {
  const user = getUserFromRequest(req);
  sendJson(res, user ? 200 : 401, {
    canPrint: Boolean(user && user.can_print === 1),
    wechat: "xixifresher",
    image: "/images/image.jpg",
  });
}

function requirePrintPermission(req, res) {
  const user = getUserFromRequest(req);
  if (user && user.can_print === 1) {
    return true;
  }
  sendJson(res, user ? 403 : 401, {
    error: "print_permission_required",
    message: "请添加微信 xixifresher 开通打印权限",
    wechat: "xixifresher",
    image: "/images/image.jpg",
  });
  return false;
}

function isPrintApiRequest(requestUrl) {
  if (requestUrl.pathname === "/api/bridge.php" && requestUrl.searchParams.get("function") === "downloaddoc") {
    return true;
  }
  return requestUrl.pathname.startsWith("/api/static/kousuan_v2/pdf/");
}

function getUserFromRequest(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT users.id, users.username, users.can_print, sessions.expires_at
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
    PRAGMA journal_mode = DELETE;
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
  const seedUsername = DEFAULT_USERNAME || FALLBACK_USERNAME;
  const seedPassword = DEFAULT_PASSWORD || FALLBACK_PASSWORD;

  if (!seedUsername || !seedPassword) {
    return;
  }

  validateCredentials(seedUsername, seedPassword);

  if (DEFAULT_USERNAME && DEFAULT_PASSWORD) {
    db.prepare(
      `INSERT INTO users (username, password)
       VALUES (?, ?)
       ON CONFLICT(username) DO UPDATE SET password = excluded.password`
    ).run(seedUsername, seedPassword);
    return;
  }

  if (userCount === 0) {
    db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(seedUsername, seedPassword);
    console.warn(`Seeded fallback user: ${seedUsername}`);
  }
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

// Runtime auth override: keep this as the last auth block so duplicated legacy
// declarations above cannot disable registration or drop print permissions.
function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = DELETE;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      can_print INTEGER NOT NULL DEFAULT 0,
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
  const targetColumns = ["id", "username", "password", "can_print", "created_time"];
  const alreadyMatches =
    columns.length === targetColumns.length &&
    targetColumns.every((name, index) => columns[index] && columns[index].name === name);

  if (alreadyMatches) {
    return;
  }

  const columnNames = new Set(columns.map((column) => column.name));
  const hasPassword = columnNames.has("password");
  const hasPasswordHash = columnNames.has("password_hash");
  const hasCanPrint = columnNames.has("can_print");
  const hasCreatedTime = columnNames.has("created_time");
  const hasCreatedAt = columnNames.has("created_at");
  const passwordExpr = hasPassword
    ? "COALESCE(password, '')"
    : hasPasswordHash
      ? "COALESCE(password_hash, '')"
      : "''";
  const canPrintExpr = hasCanPrint
    ? "CASE WHEN can_print IN (1, '1', 'true', 'TRUE') THEN 1 ELSE 0 END"
    : "0";
  const createdTimeExpr = hasCreatedTime
    ? "CASE WHEN created_time IS NOT NULL AND TRIM(created_time) != '' THEN created_time ELSE CURRENT_TIMESTAMP END"
    : hasCreatedAt
      ? "CASE WHEN created_at IS NOT NULL AND TRIM(created_at) != '' THEN created_at ELSE CURRENT_TIMESTAMP END"
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
        can_print INTEGER NOT NULL DEFAULT 0,
        created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.prepare(`
      INSERT INTO users__new (id, username, password, can_print, created_time)
      SELECT id, username, COALESCE(${passwordExpr}, ''), ${canPrintExpr}, ${createdTimeExpr}
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
  const seedUsername = DEFAULT_USERNAME || FALLBACK_USERNAME;
  const seedPassword = DEFAULT_PASSWORD || FALLBACK_PASSWORD;

  if (!seedUsername || !seedPassword) {
    return;
  }

  validateCredentials(seedUsername, seedPassword);

  if (DEFAULT_USERNAME && DEFAULT_PASSWORD) {
    db.prepare(
      `INSERT INTO users (username, password, can_print)
       VALUES (?, ?, 0)
       ON CONFLICT(username) DO UPDATE SET password = excluded.password`
    ).run(seedUsername, seedPassword);
    return;
  }

  if (userCount === 0) {
    db.prepare("INSERT INTO users (username, password, can_print) VALUES (?, ?, 0)").run(seedUsername, seedPassword);
    console.warn(`Seeded fallback user: ${seedUsername}`);
  }
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

function handleRegister(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = password == null ? "" : String(password);
      validateCredentials(normalized, normalizedPassword);

      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(normalized);
      if (existing) {
        throw httpError(409, "账号已存在");
      }

      const result = db
        .prepare("INSERT INTO users (username, password, can_print) VALUES (?, ?, 0)")
        .run(normalized, normalizedPassword);
      const session = createSession(result.lastInsertRowid);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(result.lastInsertRowid), username: normalized, canPrint: false },
      });
    })
    .catch((error) => sendKnownError(res, error));
}

function handleLogin(req, res) {
  readJsonBody(req)
    .then(({ username, password }) => {
      const normalized = normalizeUsername(username);
      const normalizedPassword = password == null ? "" : String(password);
      validateCredentials(normalized, normalizedPassword);

      const user = db.prepare("SELECT id, username, password, can_print FROM users WHERE username = ?").get(normalized);
      if (!user || normalizedPassword !== String(user.password || "")) {
        throw httpError(401, "账号或密码错误");
      }

      const session = createSession(user.id);
      setSessionCookie(res, session.token);
      sendJson(res, 200, {
        user: { id: Number(user.id), username: user.username, canPrint: user.can_print === 1 },
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
    user: { id: Number(user.id), username: user.username, canPrint: user.can_print === 1 },
  });
}

function handlePrintPermission(req, res) {
  const user = getUserFromRequest(req);
  sendJson(res, user ? 200 : 401, {
    canPrint: Boolean(user && user.can_print === 1),
    wechat: "xixifresher",
    image: "/images/image.jpg",
  });
}

function requirePrintPermission(req, res) {
  const user = getUserFromRequest(req);
  if (user && user.can_print === 1) {
    return true;
  }
  sendJson(res, user ? 403 : 401, {
    error: "print_permission_required",
    message: "请添加微信 xixifresher 开通打印权限",
    wechat: "xixifresher",
    image: "/images/image.jpg",
  });
  return false;
}

function isPrintApiRequest(requestUrl) {
  if (requestUrl.pathname === "/api/bridge.php" && requestUrl.searchParams.get("function") === "downloaddoc") {
    return true;
  }
  return requestUrl.pathname.startsWith("/api/static/kousuan_v2/pdf/");
}

function getUserFromRequest(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT users.id, users.username, users.can_print, sessions.expires_at
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
