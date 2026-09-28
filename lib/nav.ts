export interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** 一句话说明这个板块是干什么的（给新访客看，也做导航悬停提示） */
  desc: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "首页", href: "/", icon: "home", desc: "回到最上面，看看最近在写什么" },
  { label: "文章", href: "/posts", icon: "file-text", desc: "技术笔记、随笔与其他长文" },
  { label: "文件", href: "/files", icon: "folder-open", desc: "自制谱面与实用 mod，点名字去下载" },
  { label: "说说", href: "/moments", icon: "message-circle", desc: "碎片化的日常，一句话也算" },
  { label: "归档", href: "/timeline", icon: "calendar-days", desc: "按时间线翻全部文章" },
  { label: "项目", href: "/projects", icon: "folder-git-2", desc: "做过的东西与开源项目" },
  { label: "相册", href: "/photowall", icon: "images", desc: "生活切片，照片墙" },
  { label: "友链", href: "/friends", icon: "link", desc: "我的朋友们，也可以在这里交换友链" },
  { label: "关于", href: "/about", icon: "user", desc: "关于我的一切（介绍、联系方式）都在这" },
];
