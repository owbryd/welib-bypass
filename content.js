const EXTS = [".pdf", ".epub", ".mobi", ".djvu", ".azw3", ".fb2", ".mp3"];

function isBook(url) {
  return EXTS.some(e => url.toLowerCase().split("?")[0].split("#")[0].endsWith(e));
}

const sentUrls = new Set();

function send(url) {
  if (sentUrls.has(url)) return;
  sentUrls.add(url);
  chrome.runtime.sendMessage({ type: "WELIB_DOWNLOAD", url });
}

// Check if the current page URL (or its query params) points to a book file
if (isBook(window.location.href)) send(window.location.href);

const params = new URLSearchParams(window.location.search);
for (const val of params.values()) {
  if (val && isBook(val)) send(val);
}

// Observe DOM for <a>, <iframe>, <embed> elements with book URLs
function checkElement(el) {
  const u = el.href || el.src || "";
  if (u && isBook(u)) send(u);
}

function scanNodes(nodes) {
  for (const node of nodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    if (node.matches("a[href], iframe[src], embed[src]")) checkElement(node);
    node.querySelectorAll("a[href], iframe[src], embed[src]").forEach(checkElement);
  }
}

const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.type === "childList") {
      scanNodes(m.addedNodes);
    } else if (m.type === "attributes") {
      checkElement(m.target);
    }
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "src"] });
