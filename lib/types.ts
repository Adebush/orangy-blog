export interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  updated?: string;
  tags: string[];
  category: string;
  cover?: string;
  excerpt: string;
  draft: boolean;
  pinned: boolean;
  words: number;
  readingTime: number;
}

export interface Post extends PostMeta {
  /** 原始 Markdown 正文 */
  content: string;
  /** 渲染后的 HTML */
  html: string;
  toc: TocItem[];
}

export interface SiteConfig {
  title: string;
  subtitle: string;
  description: string;
  author: string;
  avatar: string;
  bio: string;
  location: string;
  email: string;
  startYear: number;
  icp: string;
  announcement: string;
  footerText: string;
  /** 友链页「本站信息」里显示的描述；留空则回退到 description */
  friendsDesc: string;
  heroTags: string[];
  socials: SocialLink[];
}

export interface SocialLink {
  label: string;
  href: string;
  icon: string;
}

export interface Moment {
  id: string;
  date: string;
  content: string;
  images?: string[];
  mood?: string;
  location?: string;
}

export interface Friend {
  name: string;
  url: string;
  avatar: string;
  desc: string;
  tag?: string;
}

export interface Project {
  name: string;
  desc: string;
  url?: string;
  repo?: string;
  tags: string[];
  status?: string;
  cover?: string;
}

export interface Photo {
  id: string;
  src: string;
  title?: string;
  date?: string;
  tag?: string;
}

export interface TimelineItem {
  date: string;
  title: string;
  desc?: string;
  type?: string;
  href?: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  album?: string;
  cover?: string;
  /** 时长，毫秒 */
  duration?: number;
}

/** 网易云账号登录态（对外只暴露这些，Cookie 绝不外泄） */
export interface NeteaseAccount {
  loggedIn: boolean;
  userId: string;
  nickname: string;
  avatarUrl: string;
  /** 0=普通 11=黑胶VIP 等 */
  vipType: number;
  loggedInAt: string;
}

/** 搜索到的一首歌 */
export interface NeteaseSong {
  id: string;
  name: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  /** 1 = VIP 曲目 */
  fee: number;
  /** 当前身份下是否可播放（privilege.pl > 0） */
  playable: boolean;
  vip: boolean;
}

export interface MusicConfig {
  enabled: boolean;
  /** 打开页面是否自动播放（浏览器会拦截，被拦后改为首次交互时开始） */
  autoplay: boolean;
  /** 播放来源：歌单 或 手动挑选的曲目 */
  mode: "playlist" | "custom";
  /** 手动挑选的曲目（mode=custom 时使用） */
  customTracks: MusicTrack[];
  /** 自定义列表名 */
  customName: string;
  playlistId: string;
  playlistName: string;
  cover: string;
  /** 只保留实测可播放的歌曲 */
  tracks: MusicTrack[];
  /** 歌单里扫描过的歌曲总数（含不可播放的） */
  scanned: number;
  /** 歌单本身包含的歌曲总数 */
  totalInPlaylist: number;
  updatedAt: string;
}

/** 文件分类下的一个文件（谱面 / mod / 其它），本体托管在 OpenList 上 */
export interface FileItem {
  /** 完整文件名，含扩展名 */
  name: string;
  /** 展示用标题（去掉扩展名） */
  title: string;
  /** 扩展名，如 zip / 7z */
  ext: string;
  /** 字节数 */
  size: number;
  /** OpenList 上的下载页地址 */
  url: string;
}

/** 「文件」页里的一个分类选项卡，对应 OpenList 上的一个目录 */
export interface FileCategory {
  /** 唯一标识，用于 URL 上的 ?tab=xxx */
  key: string;
  /** 显示名，如「谱面」「实用mod」 */
  label: string;
  /** OpenList 上的目录路径 */
  path: string;
  /** 图标名，见 components/file/categoryIcons.ts */
  icon: string;
  /** 补充说明，显示在分类标题下 */
  desc: string;
  enabled: boolean;
}

export interface FilesConfig {
  enabled: boolean;
  /** OpenList 站点根地址，例如 http://1.2.3.4:5244 */
  baseUrl: string;
  categories: FileCategory[];
  /** 各分类已同步的文件清单：key -> 文件列表 */
  items: Record<string, FileItem[]>;
  updatedAt: string;
  lastAttempt: string;
  lastError: string;
}

/** 一条评论（含主页留言） */
export interface Comment {
  id: string;
  /** 唯一目标标识，如 post:hello-world / files / home */
  target: string;
  /** 目标类型，便于后台分组 */
  targetType: string;
  /** 后台展示用的标题 */
  targetTitle: string;
  /** 后台可点击跳转的地址 */
  targetUrl: string;
  author: string;
  /** 仅后台可见，不对外输出 */
  email: string;
  website: string;
  content: string;
  createdAt: string;
  /** 是否通过审核（审核通过才在前台显示） */
  approved: boolean;
  /** 是否被人工选中，在主页以弹幕形式展示 */
  featured: boolean;
  /** 仅用于限流，不对外输出 */
  ip: string;
}

export interface CommentSettings {
  /** 评论总开关 */
  enabled: boolean;
  /** 新评论是否需要审核后才显示 */
  requireApproval: boolean;
  /** 每个页面默认显示条数 */
  perPage: number;
}

export interface CommentsStore {
  settings: CommentSettings;
  items: Comment[];
}
