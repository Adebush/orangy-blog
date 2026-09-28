import { guardApi } from "@/lib/auth";
import { paths, readJson, writeJson } from "@/lib/markdown";

const COLLECTIONS = {
  moments: paths.moments,
  friends: paths.friends,
  projects: paths.projects,
  photos: paths.photos,
  timeline: paths.timeline,
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;

function resolve(type: unknown): string | null {
  if (typeof type === "string" && type in COLLECTIONS) {
    return COLLECTIONS[type as CollectionKey];
  }
  return null;
}

export async function GET(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;
  const file = resolve(new URL(req.url).searchParams.get("type"));
  if (!file) return Response.json({ ok: false, error: "未知的内容类型" }, { status: 400 });
  const items = await readJson<unknown[]>(file, []);
  return Response.json({ ok: true, items });
}

export async function PUT(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as {
    type?: string;
    items?: unknown;
  } | null;
  const file = resolve(body?.type);
  if (!file || !Array.isArray(body?.items)) {
    return Response.json({ ok: false, error: "参数错误" }, { status: 400 });
  }
  await writeJson(file, body.items);
  return Response.json({ ok: true, items: body.items });
}
