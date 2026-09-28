import type { IconType } from "@/components/site/BrandIcons";
import {
  Box,
  FileArchive,
  FlaskConical,
  Folder,
  FolderOpen,
  Gamepad2,
  LayoutGrid,
  Music4,
  Package,
  Puzzle,
  Wrench,
} from "lucide-react";

/**
 * 「文件」页分类图标映射。
 * 配置里写 icon 名称即可，认不出来的会退回文件夹图标。
 */
export const CATEGORY_ICONS: Record<string, IconType> = {
  "gamepad-2": Gamepad2,
  package: Package,
  "flask-conical": FlaskConical,
  "folder-open": FolderOpen,
  folder: Folder,
  archive: FileArchive,
  boxes: Box,
  puzzle: Puzzle,
  wrench: Wrench,
  music: Music4,
  grid: LayoutGrid,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function categoryIcon(name: string): IconType {
  return CATEGORY_ICONS[name] ?? FolderOpen;
}
