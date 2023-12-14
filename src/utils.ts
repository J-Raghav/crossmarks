import { CrossmarkType } from "./types";

export async function loadCrossmarks() {
  const { crossmarks } = (await chrome.storage.local.get({
    crossmarks: {},
  })) as { crossmarks: Record<string, CrossmarkType> };

  return crossmarks;
}

export function updateLocalStorage<T>(key: string, value: T) {
  return chrome.storage.local.set({ [key]: value });
}

export function ellipsify(content: string, maxLength = 50) {
  if (content.length < maxLength) return content;

  return content.substring(0, maxLength - 3).trimEnd() + "...";
}

export function getTagList(
  crossmarksList: Record<string, CrossmarkType>
): string[] {
  return [
    ...new Set(Object.values(crossmarksList).flatMap((item) => item.tags)),
  ];
}
