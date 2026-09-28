import { guardApi } from "@/lib/auth";
import { getAccount, logout } from "@/lib/netease";

/** 后台：查看网易云登录状态（只返回昵称/头像等，不含 Cookie） */
export async function GET() {
  const denied = await guardApi();
  if (denied) return denied;
  return Response.json({ ok: true, account: await getAccount() });
}

/** 后台：退出网易云登录（删除本地保存的 Cookie） */
export async function DELETE() {
  const denied = await guardApi();
  if (denied) return denied;
  await logout();
  return Response.json({ ok: true, account: await getAccount() });
}
