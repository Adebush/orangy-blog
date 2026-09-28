#!/usr/bin/env bash
# ==========================================================================
#  毛玻璃博客 —— 一键部署（systemd 服务 + Nginx 反向代理）
#
#    bash deploy/install.sh              # 缺什么补什么（推荐）
#    bash deploy/install.sh --build      # 强制重新构建
#    bash deploy/install.sh --no-build   # 跳过构建
#
#  需要 root 权限。
# ==========================================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="${ORANGY_DOMAIN:-}"
PORT="${ORANGY_PORT:-3100}"
SERVICE="orangy-blog"
WEBROOT="/www/wwwroot/${DOMAIN}"
NGINX_DIR="/www/server/panel/vhost/nginx"
NGINX_CONF="${NGINX_DIR}/${DOMAIN}.conf"
WWWLOGS="/www/wwwlogs"

FORCE_BUILD=0
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --build) FORCE_BUILD=1 ;;
    --no-build) SKIP_BUILD=1 ;;
    *) echo "未知参数: $arg" >&2; exit 1 ;;
  esac
done

say() { printf '\n\033[1;38;5;208m==> %s\033[0m\n' "$*"; }
ok()  { printf '    \033[32m✓\033[0m %s\n' "$*"; }
warn(){ printf '    \033[33m!\033[0m %s\n' "$*"; }

# 没显式指定域名时，尝试从已安装的 systemd 服务里读回（更新场景）
if [ -z "$DOMAIN" ] && [ -f "/etc/systemd/system/orangy-blog.service" ]; then
  DOMAIN="$(sed -n 's/.*ORANGY_SITE_URL=https\?:\/\/\([^ ]*\).*/\1/p' /etc/systemd/system/orangy-blog.service | head -1)"
fi
if [ -z "$DOMAIN" ]; then
  echo "请指定域名：ORANGY_DOMAIN=你的域名 bash $0" >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 运行（sudo bash deploy/install.sh）" >&2
  exit 1
fi

# ---------------------------------------------------------------- Node 检测
detect_node() {
  local c major
  for c in /root/.nvm/versions/node/*/bin/node /usr/local/bin/node /root/nodejs/bin/node /usr/bin/node; do
    [ -x "$c" ] || continue
    major="$("$c" -v 2>/dev/null | sed -n 's/^v\([0-9][0-9]*\).*/\1/p')"
    [ -n "$major" ] || continue
    if [ "$major" -ge 20 ] && [ "$major" -lt 30 ]; then
      echo "$c"
      return 0
    fi
  done
  return 1
}

say "检测 Node.js（Next.js 16 需要 >= 20.9）"
NODE_BIN="$(detect_node)" || {
  echo "找不到可用的 Node.js（>= 20.9），请先安装。" >&2
  exit 1
}
NODE_DIR="$(dirname "$NODE_BIN")"
export PATH="${NODE_DIR}:${PATH}"
ok "使用 $NODE_BIN（$("$NODE_BIN" -v)）"

# ---------------------------------------------------------------- 依赖 & 构建
say "准备依赖与构建产物"
cd "$PROJECT_DIR"

if [ ! -d node_modules ]; then
  ok "安装依赖（首次会比较慢）"
  npm install --no-audit --no-fund
else
  ok "node_modules 已存在，跳过安装"
fi

if [ "$SKIP_BUILD" -eq 0 ]; then
  if [ "$FORCE_BUILD" -eq 1 ] || [ ! -f .next/BUILD_ID ]; then
    ok "执行生产构建…"
    NODE_OPTIONS=--max-old-space-size=2048 NEXT_TELEMETRY_DISABLED=1 npm run build
  else
    ok "已存在构建产物，跳过（要重建请加 --build）"
  fi
fi

# ---------------------------------------------------------------- 后台凭据
say "检查后台登录凭据"
if [ ! -f content/.auth.json ]; then
  "$NODE_BIN" scripts/set-password.mjs
else
  ok "content/.auth.json 已存在；如需重置密码：node scripts/set-password.mjs admin 新密码"
fi

# ---------------------------------------------------------------- systemd
say "写入 systemd 服务"
cat > "/etc/systemd/system/${SERVICE}.service" <<EOF
[Unit]
Description=Glass Blog (Next.js)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${PROJECT_DIR}
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
Environment=ORANGY_SITE_URL=https://${DOMAIN}
Environment=PORT=${PORT}
ExecStart=${NODE_BIN} ${PROJECT_DIR}/node_modules/next/dist/bin/next start -p ${PORT} -H 127.0.0.1
Restart=always
RestartSec=5
KillSignal=SIGINT
SyslogIdentifier=${SERVICE}

[Install]
WantedBy=multi-user.target
EOF
ok "/etc/systemd/system/${SERVICE}.service"

systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null 2>&1 || true
systemctl restart "$SERVICE"
sleep 4
if systemctl is-active --quiet "$SERVICE"; then
  ok "服务已启动并设为开机自启"
else
  warn "服务未处于 active 状态，请查看：journalctl -u ${SERVICE} -n 50"
fi

# ---------------------------------------------------------------- Nginx
say "配置 Nginx 反向代理"
NGINX_BIN="/www/server/nginx/sbin/nginx"
[ -x "$NGINX_BIN" ] || NGINX_BIN="$(command -v nginx || true)"
[ -n "$NGINX_BIN" ] || { echo "找不到 nginx 可执行文件" >&2; exit 1; }
ok "使用 $NGINX_BIN"

mkdir -p "${WEBROOT}/.well-known/acme-challenge" "$NGINX_DIR" "$WWWLOGS"
ok "校验目录 ${WEBROOT}/.well-known/acme-challenge"

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  TEMPLATE="nginx-https.conf"
  ok "检测到已有证书，使用 HTTPS 模板"
else
  TEMPLATE="nginx-http.conf"
  warn "还没有证书，先使用 HTTP 模板（跑完 deploy/enable-ssl.sh 会自动切到 HTTPS）"
fi

python3 - "${PROJECT_DIR}/deploy/${TEMPLATE}" "$NGINX_CONF" "$DOMAIN" "$PORT" "$WEBROOT" "/www/server/panel/vhost/cert/${DOMAIN}" <<'PY'
import sys
tpl, out, domain, port, webroot, certdir = sys.argv[1:7]
s = open(tpl, encoding="utf-8").read()
s = (s.replace("__DOMAIN__", domain).replace("__PORT__", port)
      .replace("__WEBROOT__", webroot).replace("__CERTDIR__", certdir))
open(out, "w", encoding="utf-8").write(s)
PY
ok "$NGINX_CONF"

NGINX_TEST_LOG="$(mktemp)"
if "$NGINX_BIN" -t >"$NGINX_TEST_LOG" 2>&1; then
  sed 's/^/    /' "$NGINX_TEST_LOG"
  "$NGINX_BIN" -s reload
  ok "Nginx 配置校验通过并已热加载（其它站点未受影响）"
else
  sed 's/^/    /' "$NGINX_TEST_LOG"
  rm -f "$NGINX_TEST_LOG"
  warn "Nginx 配置校验失败，已保留文件但未加载，请检查上面输出"
  exit 1
fi
rm -f "$NGINX_TEST_LOG"

# ---------------------------------------------------------------- 自检
say "自检"
code_app="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "http://127.0.0.1:${PORT}/" || echo 000)"
if [ "$code_app" = "200" ]; then
  ok "Next.js 应用直连 http://127.0.0.1:${PORT} → 200"
else
  warn "Next.js 应用直连返回 ${code_app}，请查看 journalctl -u ${SERVICE} -n 50"
fi

code_ngx="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -H "Host: ${DOMAIN}" "http://127.0.0.1/" || echo 000)"
if [ "$code_ngx" = "200" ] || [ "$code_ngx" = "301" ]; then
  ok "Nginx 反代（Host: ${DOMAIN}）→ ${code_ngx}"
else
  warn "Nginx 反代返回 ${code_ngx}"
fi

say "完成"
cat <<EOF
    应用目录 : ${PROJECT_DIR}
    服务名   : ${SERVICE}
    监听端口 : 127.0.0.1:${PORT}（仅本机，外部统一走 Nginx）
    域名     : http://${DOMAIN}

    常用命令：
      systemctl status ${SERVICE}
      systemctl restart ${SERVICE}
      journalctl -u ${SERVICE} -f

    下一步（HTTPS）：
      bash deploy/enable-ssl.sh
EOF
