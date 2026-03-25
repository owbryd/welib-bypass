const EXTS = [".pdf", ".epub", ".mobi", ".djvu", ".azw3", ".fb2"];

function isBook(url) {
  return EXTS.some(e => url.toLowerCase().split("?")[0].endsWith(e));
}

const sentUrls = new Set();

function send(url) {
  if (sentUrls.has(url)) return;
  sentUrls.add(url);
  chrome.runtime.sendMessage({ type: "WELIB_DOWNLOAD", url });
}

// Strategy 1: URL parameters (only send if it looks like a book)
const params = new URLSearchParams(window.location.search);
["url", "file", "src", "path", "book"].forEach(param => {
  const val = params.get(param);
  if (val && isBook(val)) send(val);
});

// Strategy 2: page URL is a book file
if (isBook(window.location.href)) send(window.location.href);

// Strategy 3: patch fetch & XHR in the page's MAIN world via injected script
// Content scripts run in an isolated JS world, so patching fetch/XHR here
// would never intercept calls made by the actual page. We inject into the page.
const injectedCode = `(function() {
  const EXTS = ${JSON.stringify(EXTS)};
  const EVENT_NAME = "WELIB_BOOK_DETECTED";

  function isBook(url) {
    return EXTS.some(e => url.toLowerCase().split("?")[0].endsWith(e));
  }

  function notify(url) {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: url }));
  }

  // Patch fetch
  const _fetch = window.fetch;
  window.fetch = function(input, init) {
    const url = (typeof input === "string") ? input : (input?.url || String(input));
    if (isBook(url)) notify(url);
    return _fetch.apply(this, arguments);
  };

  // Patch XHR
  const _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    const u = String(url);
    if (isBook(u)) notify(u);
    return _xhrOpen.apply(this, arguments);
  };
})();`;

const script = document.createElement("script");
script.textContent = injectedCode;
(document.documentElement || document).appendChild(script);
script.remove();

// Listen for events from the injected page-world script
window.addEventListener("WELIB_BOOK_DETECTED", (e) => {
  if (e.detail && isBook(e.detail)) send(e.detail);
});

// Strategy 4: observe <a>, <iframe> and <embed> elements (with dedup)
const observer = new MutationObserver(() => {
  document.querySelectorAll("a[href], iframe[src], embed[src]").forEach(el => {
    const u = el.href || el.src || "";
    if (u && isBook(u)) send(u);
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
