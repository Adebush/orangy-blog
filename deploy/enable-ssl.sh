#!/usr/bin/env bash
# ==========================================================================
#  毛玻璃博客 —— 申请 Let's Encrypt 证书并切换为 HTTPS
#
#    bash deploy/enable-ssl.sh
#    ORANGY_EMAIL=you@example.com bash deploy/enable-ssl.sh   # 带上邮箱
#
#  前置条件：
#    1. 已执行 bash deploy/install.sh
#    2. 域名 A 记录已解析到本机
# ==========================================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="${ORANGY_DOMAIN:-}"
PORT="${ORANGY_PORT:-3100}"
WEBROOT="/www/wwwroot/${DOMAIN}"
NGINX_CONF="/www/server/panel/vhost/nginx/${DOMAIN}.conf"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
BT_CERT_DIR="/www/server/panel/vhost/cert/${DOMAIN}"

say() { printf '\n\033[1;38;5;208m==> %s\033[0m\n' "$*"; }
ok()  { printf '    \033[32m✓\033[0m %s\n' "$*"; }
warn(){ printf '    \033[33m!\033[0m %s\n' "$*"; }
die() { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# 没显式指定域名时，尝试从已安装的 systemd 服务里读回（更新场景）
if [ -z "$DOMAIN" ] && [ -f "/etc/systemd/system/orangy-blog.service" ]; then
  DOMAIN="$(sed -n 's/.*ORANGY_SITE_URL=https\?:\/\/\([^ ]*\).*/\1/p' /etc/systemd/system/orangy-blog.service | head -1)"
fi
if [ -z "$DOMAIN" ]; then
  echo "请指定域名：ORANGY_DOMAIN=你的域名 bash $0" >&2
  exit 1
fi

[ "$(id -u)" -eq 0 ] || die "请用 root 运行"
command -v certbot >/dev/null || die "未安装 certbot"

NGINX_BIN="/www/server/nginx/sbin/nginx"
[ -x "$NGINX_BIN" ] || NGINX_BIN="$(command -v nginx)"
[ -n "$NGINX_BIN" ] || die "找不到 nginx"

# ---------------------------------------------------------------- DNS 检查
say "检查 DNS 解析"
if ! getent hosts "$DOMAIN" >/dev/null 2>&1; then
  die "${DOMAIN} 目前无法解析。请先在 Cloudflare / DNS 服务商处添加 A 记录指向本机公网 IP，等待生效后重试。"
fi
ok "${DOMAIN} 已解析：$(getent hosts "$DOMAIN" | awk '{print $1}' | tr '\n' ' ')"
warn "如果域名走了 Cloudflare 代理（小黄云），请确认 /.well-known/acme-challenge/ 能回源到本机"

# ---------------------------------------------------------------- 校验目录
say "准备 ACME 校验目录"
mkdir -p "${WEBROOT}/.well-known/acme-challenge"
SELFTEST="${WEBROOT}/.well-known/acme-challenge/__orangy_selftest"
echo "orangy-ok" > "$SELFTEST"
GOT="$(curl -s --max-time 15 -H "Host: ${DOMAIN}" "http://127.0.0.1/.well-known/acme-challenge/__orangy_selftest" || true)"
rm -f "$SELFTEST"
if [ "$GOT" = "orangy-ok" ]; then
  ok "本机 Nginx 能正确返回校验文件"
else
  warn "本机自检未通过（返回：${GOT:-空}）。若 deploy/install.sh 还没跑过，请先执行它。"
fi

# ---------------------------------------------------------------- 签发
say "向 Let's Encrypt 申请证书"
EMAIL_ARGS=(--register-unsafely-without-email)
if [ -n "${ORANGY_EMAIL:-}" ]; then
  EMAIL_ARGS=(-m "${ORANGY_EMAIL}")
fi

certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
  --non-interactive --agree-tos --keep-until-expiring \
  "${EMAIL_ARGS[@]}" 2>&1 | sed 's/^/    /'

[ -f "${CERT_DIR}/fullchain.pem" ] || die "证书未生成，请检查上面的输出"
ok "证书已签发：${CERT_DIR}"

# 先同步到宝塔证书目录，后面的 nginx 配置会引用该路径
mkdir -p "$BT_CERT_DIR"
cp "${CERT_DIR}/fullchain.pem" "${BT_CERT_DIR}/fullchain.pem"
cp "${CERT_DIR}/privkey.pem"   "${BT_CERT_DIR}/privkey.pem"
chmod 644 "${BT_CERT_DIR}/fullchain.pem"
chmod 600 "${BT_CERT_DIR}/privkey.pem"
ok "证书已同步到 ${BT_CERT_DIR}"

# ---------------------------------------------------------------- 切换 HTTPS
say "切换 Nginx 到 HTTPS 配置"
python3 - "${PROJECT_DIR}/deploy/nginx-https.conf" "$NGINX_CONF" "$DOMAIN" "$PORT" "$WEBROOT" "$BT_CERT_DIR" <<'PY'
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
  ok "Nginx 已热加载 HTTPS 配置"
else
  sed 's/^/    /' "$NGINX_TEST_LOG"
  rm -f "$NGINX_TEST_LOG"
  die "Nginx 配置校验失败，未加载。请检查上面输出。"
fi
rm -f "$NGINX_TEST_LOG"

# ---------------------------------------------------------------- 自动续期钩子
say "配置自动续期钩子"
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > "/etc/letsencrypt/renewal-hooks/deploy/${DOMAIN}-sync.sh" <<EOF
#!/bin/sh
# certbot 续期后：同步证书到宝塔目录并热加载 nginx
SRC=${CERT_DIR}
DST=${BT_CERT_DIR}
NGINX_BIN=/www/server/nginx/sbin/nginx
[ -x "\$NGINX_BIN" ] || NGINX_BIN=\$(command -v nginx)
mkdir -p "\$DST"
cp "\$SRC/fullchain.pem" "\$DST/fullchain.pem"
cp "\$SRC/privkey.pem"   "\$DST/privkey.pem"
chmod 644 "\$DST/fullchain.pem"
chmod 600 "\$DST/privkey.pem"
"\$NGINX_BIN" -t && "\$NGINX_BIN" -s reload
EOF
chmod +x "/etc/letsencrypt/renewal-hooks/deploy/${DOMAIN}-sync.sh"
# 之前版本写入的通用 reload 钩子已由上面的同步钩子覆盖，避免重复 reload
rm -f /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
ok "续期钩子已写入（续期后自动同步证书 + reload nginx）"

# ---------------------------------------------------------------- 自检
say "自检"
sleep 2  # 等 nginx reload 完成，否则刚 reload 的一瞬间请求可能失败
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/" || true)"
if [ "$code" = "200" ]; then
  ok "https://${DOMAIN}/ → 200"
else
  warn "https://${DOMAIN}/ 本机自检返回 ${code}"
fi

cert_info="$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -subject -enddate 2>/dev/null | tr '\n' ' ')"
ok "证书信息：${cert_info}"

say "完成"
cat <<EOF
    HTTPS 已启用：https://${DOMAIN}

    自动续期检查：
      systemctl list-timers | grep certbot
      certbot renew --dry-run

    强制续期：
      certbot renew --force-renewal && ${NGINX_BIN} -s reload
EOF
