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

// Dedup by filename (not full URL) so token/query changes don't cause re-downloads
const pending = new Set();

function doDownload(url) {
  if (!hasBookExtension(url)) return;

  const filename = extractFilename(url);
  if (pending.has(filename)) return;
  pending.add(filename);

  chrome.storage.local.get({ enabled: true, downloadedFiles: [] }, ({ enabled, downloadedFiles }) => {
    if (!enabled || downloadedFiles.includes(filename)) {
      pending.delete(filename);
      return;
    }

    const updated = downloadedFiles.concat(filename);
    const trimmed = updated.length > 500 ? updated.slice(updated.length - 500) : updated;
    chrome.storage.local.set({ downloadedFiles: trimmed }, () => {
      chrome.downloads.download({ url, filename, saveAs: false }, (downloadId) => {
        pending.delete(filename);
        if (chrome.runtime.lastError) {
          chrome.storage.local.get({ downloadedFiles: [] }, ({ downloadedFiles: current }) => {
            chrome.storage.local.set({ downloadedFiles: current.filter(f => f !== filename) });
          });
        }
      });
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
