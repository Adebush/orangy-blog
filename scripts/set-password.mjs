#!/usr/bin/env node
/**
 * 初始化 / 重置后台登录密码。
 *
 *   node scripts/set-password.mjs                  # 随机生成密码
 *   node scripts/set-password.mjs admin 我的密码    # 指定用户名与密码
 *
 * 会在 content/.auth.json 写入 scrypt 哈希（不保存明文）。
 */
import { randomBytes, scryptSync } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const contentDir = process.env.ORANGY_CONTENT_DIR ?? path.join(projectRoot, "content");
const authFile = path.join(contentDir, ".auth.json");

const username = (process.argv[2] ?? "admin").trim() || "admin";
const provided = process.argv[3];
const password = provided?.trim() || randomBytes(9).toString("base64url");

if (password.length < 6) {
  console.error("✗ 密码至少需要 6 位");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const payload = {
  username,
  salt,
  passwordHash: scryptSync(password, salt, 64).toString("hex"),
  secret: randomBytes(32).toString("hex"),
  createdAt: new Date().toISOString(),
};

await fs.mkdir(contentDir, { recursive: true });
await fs.writeFile(authFile, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });

console.log("");
console.log("  ✓ 后台凭据已写入 " + authFile);
console.log("  ────────────────────────────────────────────");
console.log("    用户名 : " + username);
console.log("    密  码 : " + password);
console.log("  ────────────────────────────────────────────");
console.log("  请立即保存好上面的密码，登录后可在「站点设置 → 安全设置」中修改。");
console.log("");
