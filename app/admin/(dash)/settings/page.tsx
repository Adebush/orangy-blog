import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getFilesConfig } from "@/lib/files";
import { getMusicConfig } from "@/lib/music";
import { getAccount } from "@/lib/netease";
import { getAbout, getSite } from "@/lib/site";

export const metadata: Metadata = { title: "站点设置" };

export default async function SettingsPage() {
  const [site, about, music, files, neteaseAccount] = await Promise.all([
    getSite(),
    getAbout(),
    getMusicConfig(),
    getFilesConfig(),
    getAccount(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">站点设置</h1>
        <p className="text-muted mt-1 text-sm">
          修改站点信息、文件分类、音乐播放器、关于页面与后台密码，保存后前台立即生效
        </p>
      </div>
      <SettingsForm
        initialSite={site}
        initialAbout={about.markdown}
        initialMusic={music}
        initialAccount={neteaseAccount}
        initialFiles={files}
      />
    </div>
  );
}
