import { initialTags } from "./config";
import { CrossmarkType, SupportedContexts } from "./types";

function parseUrlTags(url: string) {
  const urlObj = new URL(url);
  return urlObj.hostname
    .split(".")
    .filter((x) => x !== "www")
    .reverse()
    .slice(1);
}

function normalizeUrl(linkUrl: string) {
  const url = new URL(linkUrl);
  if (url.host.match(/(www\.)?google\.com/) && url.pathname === "/url") {
    const realUrl = url.searchParams.get("url") as string;
    return realUrl;
  }

  return linkUrl;
}

function generateKey(
  item: CrossmarkType,
  context: SupportedContexts = SupportedContexts.link
) {
  if (context === "selection") {
    return item.content?.toLowerCase()?.replace(/\s+/g, "-");
  }
  const key = item.content.replace(/https?:\/\//i, "").replace(/\/$/, "");
  return key;
}

async function getPageProperties(url: string, origin?: string) {
  const fullUrl = new URL(url, (origin = origin));
  const response = await fetch(fullUrl);
  console.log(response);
  if (response.headers.get("content-type")?.includes("text/html")) {
    const content = await response.text();
    const titleMatch = content
      ?.replace(/(\&.+?;|[^\w\s\d\&\.\|\<\>\[\]\/\-]+)/g, "")
      ?.replace(/\s+/g, " ")
      ?.match(/<title ?.*?>(.*?)<\/title>/);
    const faviconMatch = content.match(
      /<link .*?rel="(?:shortcut )?icon".*?href="(.*?)".*?\/?>/
    );
    const realUrl = new URL(response.url);
    const title = titleMatch ? titleMatch[1] : undefined;
    let favicon = faviconMatch ? faviconMatch[1] : undefined;
    if (favicon === undefined) {
      favicon = "/favicon.ico";
      const response = await fetch(new URL(favicon, (origin = realUrl.origin)));
      favicon = response.ok ? favicon : undefined;
    }
    return {
      realUrl: realUrl.toString(),
      favicon: favicon
        ? new URL(favicon, (origin = realUrl.origin)).toString()
        : undefined,
      title,
    };
  }

  return {};
}

function getLinkTitle(item: chrome.contextMenus.OnClickData) {
  const url = new URL(item.linkUrl || "");
  const linkTag = document.querySelector<HTMLLinkElement>(
    `a[href*="${url.pathname + url.search + url.hash}"]`
  );
  return linkTag?.ariaLabel || linkTag?.innerText || undefined;
}

function getMediaTitle(item: chrome.contextMenus.OnClickData) {
  const url = new URL(item.srcUrl || "");
  const tag = document.querySelector<HTMLImageElement>(
    `[src*="${url.pathname}"]`
  );
  const title = tag?.title || tag?.alt;
  if (title) {
    return title;
  }

  if (item.srcUrl) {
    const url = new URL(item.srcUrl);
    const lastPathParam = url.pathname.split("/").slice(-1)[0];
    return lastPathParam.includes(".") && lastPathParam.length < 100
      ? lastPathParam
      : undefined;
  }
}

function getSelectionTitle(item: chrome.contextMenus.OnClickData) {
  if (item.selectionText) {
    return `${document.title} - ${item.selectionText}`;
  }
}

// Setup context menu items on installed.
chrome.runtime.onInstalled.addListener(async () => {
  for (const { key, label } of initialTags) {
    chrome.contextMenus.create({
      id: key,
      title: label,
      type: "normal",
      contexts: ["link", "audio", "image", "video", "selection"],
    });
  }
});

chrome.contextMenus.onClicked.addListener(async (item, tab) => {
  const { crossmarks } = (await chrome.storage.local.get({
    crossmarks: {},
  })) as { crossmarks: Record<string, CrossmarkType> };
  const pageUrl = new URL(item.pageUrl);

  const commonCrossMarkProps: CrossmarkType = {
    title: "No Title",
    sourcePage: item.frameUrl || item.pageUrl,
    tags: [item.menuItemId.toString()],
    content: "",
    createDate: new Date().toUTCString(),
  };

  let crossMark: CrossmarkType | undefined = undefined;

  if (item.selectionText) {
    const tags = [
      "quote",
      "selection",
      ...parseUrlTags(commonCrossMarkProps.sourcePage),
    ];
    const { favicon } = await getPageProperties(item.pageUrl);
    const [{ result: title }] = await chrome.scripting.executeScript({
      target: { tabId: tab?.id || 0 },
      func: getSelectionTitle,
      args: [item],
    });
    crossMark = {
      ...commonCrossMarkProps,
      title,
      tags: [...tags, ...commonCrossMarkProps.tags],
      favicon,
      context: SupportedContexts.selection,
      content: item.selectionText,
    };
    const key = generateKey(crossMark, SupportedContexts.selection);
    crossmarks[key] = crossMark;
    console.log(crossMark);
  } else if (item.srcUrl) {
    const tags = parseUrlTags(item.srcUrl);
    if (item.mediaType) tags.push(item.mediaType);
    const [{ result: title }] = await chrome.scripting.executeScript({
      target: { tabId: tab?.id || 0 },
      func: getMediaTitle,
      args: [item],
    });
    const contentUrl = new URL(item.srcUrl);
    const { favicon } = await getPageProperties(
      contentUrl.origin,
      pageUrl.origin
    );
    console.log(contentUrl, favicon);
    crossMark = {
      ...commonCrossMarkProps,
      title,
      tags: [...tags, ...commonCrossMarkProps.tags, "media"],
      favicon,
      context: (item.mediaType as SupportedContexts) || "image",
      content: contentUrl.toString(),
    };
    const key = generateKey(crossMark);
    crossmarks[key] = crossMark;
  }
  console.log(crossMark);

  if (item.linkUrl) {
    const contentUrl = new URL(normalizeUrl(item.linkUrl));

    const tags = parseUrlTags(contentUrl.toString());
    const [{ result: title }] = await chrome.scripting.executeScript({
      target: { tabId: tab?.id || 0 },
      func: getLinkTitle,
      args: [item],
    });
    const {
      title: parsedTitle,
      favicon,
      realUrl,
    } = await getPageProperties(contentUrl.toString(), pageUrl.origin);
    console.log(realUrl, contentUrl, favicon);

    crossMark = {
      ...commonCrossMarkProps,
      title,
      tags: [...tags, ...commonCrossMarkProps.tags],
      context: SupportedContexts.link,
      content: realUrl || contentUrl.toString(),
    };

    crossMark.title = parsedTitle || crossMark.title;
    crossMark.favicon = favicon;
    const key = generateKey(crossMark);
    crossmarks[key] = crossMark;
  }
  console.log("Crossmark Link", crossMark);

  await chrome.storage.local.set({ crossmarks });
});
