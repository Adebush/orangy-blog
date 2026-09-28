import path from "node:path";

/**
 * 内容目录与各数据文件的位置。
 *
 * 单独抽出来是为了不让「路径常量」和 Markdown 渲染管线（unified/remark 那套）
 * 绑在一起 —— 评论、音乐、文件这些模块只需要路径，不需要渲染能力。
 */

const CONTENT_ROOT =
  process.env.ORANGY_CONTENT_DIR ?? path.join(process.cwd(), "content");

export const paths = {
  root: CONTENT_ROOT,
  posts: path.join(CONTENT_ROOT, "posts"),
  // 上传的图片和文章放在一起，整个 content/ 目录就是全部用户数据，方便整体备份迁移
  uploads: path.join(CONTENT_ROOT, "uploads"),
  site: path.join(CONTENT_ROOT, "site.json"),
  moments: path.join(CONTENT_ROOT, "moments.json"),
  friends: path.join(CONTENT_ROOT, "friends.json"),
  projects: path.join(CONTENT_ROOT, "projects.json"),
  photos: path.join(CONTENT_ROOT, "photos.json"),
  timeline: path.join(CONTENT_ROOT, "timeline.json"),
  about: path.join(CONTENT_ROOT, "about.md"),
  music: path.join(CONTENT_ROOT, "music.json"),
  files: path.join(CONTENT_ROOT, "files.json"),
  comments: path.join(CONTENT_ROOT, "comments.json"),
  netease: path.join(CONTENT_ROOT, ".netease.json"),
  auth: path.join(CONTENT_ROOT, ".auth.json"),
};
