import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { paths, readJson, writeJson } from "./markdown";

const COOKIE_NAME = "orangy_admin";
const SESSION_DAYS = 30;

interface AuthFile {
  username: string;
  salt: string;
  passwordHash: string;
  secret: string;
  createdAt: string;
}

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export async function ensureAuthFile(username: string, password: string): Promise<AuthFile> {
  const salt = randomBytes(16).toString("hex");
  const file: AuthFile = {
    username,
    salt,
    passwordHash: hashPassword(password, salt),
    secret: randomBytes(32).toString("hex"),
    createdAt: new Date().toISOString(),
  };
  await writeJson(paths.auth, file);
  return file;
}

async function getAuthFile(): Promise<AuthFile | null> {
  const file = await readJson<AuthFile | null>(paths.auth, null);
  if (!file?.passwordHash || !file?.secret || !file?.salt) return null;
  return file;
}

export async function authConfigured(): Promise<boolean> {
  return (await getAuthFile()) !== null;
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<{ ok: boolean; reason?: string }> {
  const file = await getAuthFile();
  if (!file) return { ok: false, reason: "后台尚未初始化，请先运行 scripts/set-password.mjs" };
  if (username && username !== file.username) return { ok: false, reason: "用户名或密码不正确" };
  const expected = Buffer.from(file.passwordHash, "hex");
  const actual = Buffer.from(hashPassword(password, file.salt), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, reason: "用户名或密码不正确" };
  }
  return { ok: true };
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function createSessionToken(): Promise<string | null> {
  const file = await getAuthFile();
  if (!file) return null;
  const body = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_DAYS * 86_400_000 }),
  ).toString("base64url");
  return `${body}.${sign(body, file.secret)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const file = await getAuthFile();
  if (!file) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;
  const expected = sign(body, file.secret);
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return false;
  }
  try {
    const { exp } = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      exp: number;
    };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

/** 后台页面守卫：未登录直接跳转登录页 */
export async function requireAuth(): Promise<void> {
  if (!(await isLoggedIn())) redirect("/admin/login");
}

/** 后台接口守卫 */
export async function guardApi(): Promise<Response | null> {
  if (await isLoggedIn()) return null;
  return Response.json({ ok: false, error: "未登录或登录已过期" }, { status: 401 });
}

/** 修改密码：只更新盐与哈希，保留 secret，因此不会踢掉当前会话 */
export async function changePassword(
  current: string,
  next: string,
): Promise<{ ok: boolean; error?: string }> {
  const file = await getAuthFile();
  if (!file) return { ok: false, error: "后台尚未初始化" };
  if (next.length < 6) return { ok: false, error: "新密码至少 6 位" };
  const check = await verifyCredentials(file.username, current);
  if (!check.ok) return { ok: false, error: "当前密码不正确" };
  const salt = randomBytes(16).toString("hex");
  await writeJson(paths.auth, {
    ...file,
    salt,
    passwordHash: hashPassword(next, salt),
  });
  return { ok: true };
}

export async function setSessionCookie(token: string, secure = true): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // 由调用方按实际协议决定：HTTPS 下加 Secure；HTTP 下不加，否则后台会「登录成功但存不住会话」
    secure,
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export { COOKIE_NAME };

/** 供命令行脚本使用 */
export async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
