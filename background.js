const FILE_EXTENSIONS = [".pdf", ".epub", ".mobi", ".djvu", ".azw3", ".fb2"];

function hasBookExtension(url) {
  const lower = url.toLowerCase().split("?")[0];
  return FILE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function extractFilename(url) {
  try {
    const decoded = decodeURIComponent(url);
    return decoded.split("/").pop().split("?")[0] || "welib-book";
  } catch { return "welib-book"; }
}

// Use storage-backed dedup so service worker restarts don't cause re-downloads
let downloadedUrls = new Set();

// Load persisted set on startup
chrome.storage.local.get({ downloadedUrls: [] }, ({ downloadedUrls: stored }) => {
  downloadedUrls = new Set(stored);
});

function persistDownloadedUrls() {
  // Keep only the last 500 entries to avoid unbounded storage growth
  const arr = [...downloadedUrls];
  const trimmed = arr.length > 500 ? arr.slice(arr.length - 500) : arr;
  chrome.storage.local.set({ downloadedUrls: trimmed });
}

function doDownload(url) {
  if (downloadedUrls.has(url) || !hasBookExtension(url)) return;

  chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
    if (!enabled) return;

    downloadedUrls.add(url);
    persistDownloadedUrls();
    chrome.downloads.download({ url, filename: extractFilename(url), saveAs: false }, (downloadId) => {
      if (chrome.runtime.lastError) {
        downloadedUrls.delete(url);
        persistDownloadedUrls();
      }
    });
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "WELIB_DOWNLOAD" && msg.url) doDownload(msg.url);
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => doDownload(details.url),
  {
    urls: [
      "*://*.welib-premium.org/*",
      "*://*.welib-public.org/*",
      "*://welib-premium.org/*",
      "*://welib-public.org/*"
    ]
  }
);
