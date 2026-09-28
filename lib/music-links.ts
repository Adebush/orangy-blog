/**
 * 网易云的几个纯链接工具。
 *
 * 单独放一个文件是因为 lib/netease.ts 里用了 node:fs / node:path，
 * 客户端组件（播放器）不能引它。这些只是拼 URL，谁都能用。
 */

/** 歌曲详情页：点开去网易云听（会员曲目在那里登录后就能放） */
export function neteaseSongPageUrl(id: string): string {
  return `https://music.163.com/#/song?id=${encodeURIComponent(id)}`;
}

/** 歌单详情页 */
export function neteasePlaylistPageUrl(id: string): string {
  return `https://music.163.com/#/playlist?id=${encodeURIComponent(id)}`;
}

/**
 * 官方外链播放器（可 iframe 嵌入）。
 * 实测该地址没有 X-Frame-Options，能嵌；type=2 是单曲。
 * auto=0 表示不自动播放 —— 浏览器的自动播放策略本来也会拦，交给用户点。
 */
export function neteaseOutchainUrl(id: string, height = 66): string {
  return `https://music.163.com/outchain/player?type=2&id=${encodeURIComponent(id)}&auto=0&height=${height}`;
}

/** 整张歌单的官方外链播放器 */
export function neteaseOutchainPlaylistUrl(id: string, height = 430): string {
  return `https://music.163.com/outchain/player?type=0&id=${encodeURIComponent(id)}&auto=0&height=${height}`;
}
