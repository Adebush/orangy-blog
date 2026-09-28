import { redirect } from "next/navigation";

/** 「谱面」已升级为「文件」下的一个分类，这里保留旧链接兼容 */
export default function ChartsRedirect() {
  redirect("/files?tab=charts");
}
