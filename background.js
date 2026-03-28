const FILE_EXTENSIONS = [".pdf", ".epub", ".mobi", ".djvu", ".azw3", ".fb2", ".mp3"];

function hasBookExtension(url) {
  const lower = url.toLowerCase().split("?")[0].split("#")[0];
  return FILE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
}

function extractFilename(url) {
  try {
    const decoded = decodeURIComponent(url);
    const name = decoded.split("/").pop().split("?")[0].split("#")[0];
    if (name && hasBookExtension(name)) return sanitizeFilename(name);
    // Fallback: use hash from URL + guess extension
    const ext = FILE_EXTENSIONS.find(e => decoded.toLowerCase().includes(e)) || ".bin";
    return "welib-download" + ext;
  } catch { return "welib-download.bin"; }
}

// Serial queue to avoid race conditions on chrome.storage.local
let storageQueue = Promise.resolve();
function withStorage(fn) {
  storageQueue = storageQueue.then(fn, fn);
  return storageQueue;
}

// Dedup by filename (not full URL) so token/query changes don't cause re-downloads
const pending = new Set();

function doDownload(url) {
  if (!hasBookExtension(url)) return;

  const filename = extractFilename(url);
  if (pending.has(filename)) return;
  pending.add(filename);

  withStorage(() => new Promise((resolve) => {
    chrome.storage.local.get({ enabled: true, downloadedFiles: [] }, ({ enabled, downloadedFiles }) => {
      if (!enabled || downloadedFiles.includes(filename)) {
        pending.delete(filename);
        return resolve();
      }

      const updated = downloadedFiles.concat(filename);
      const trimmed = updated.length > 500 ? updated.slice(updated.length - 500) : updated;
      chrome.storage.local.set({ downloadedFiles: trimmed }, () => {
        chrome.downloads.download({ url, filename, saveAs: false }, () => {
          pending.delete(filename);
          if (chrome.runtime.lastError) {
            // Rollback: remove filename from history (runs inside the same queue via resolve chaining)
            chrome.storage.local.set({
              downloadedFiles: downloadedFiles.filter(f => f !== filename)
            }, resolve);
          } else {
            resolve();
          }
        });
      });
    });
  }));
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
      "*://welib-public.org/*",
      "*://welib.org/audiobooks/*",
      "*://*.welib.org/audiobooks/*"
    ]
  }
);
