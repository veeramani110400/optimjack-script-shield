// Isolated content script: relays events, shows the warning banner, and runs the paste check.
const WALLET = /^(0x[a-fA-F0-9]{40}|bc1[a-z0-9]{25,62}|ltc1[a-z0-9]{25,62}|[13LMD][a-km-zA-HJ-NP-Z1-9]{25,34}|T[1-9A-HJ-NP-Za-km-z]{33}|[1-9A-HJ-NP-Za-km-z]{32,44}|(EQ|UQ)[A-Za-z0-9_-]{46})$/;
const TITLES = {
  "blocked-request": "Blocked a request to a known malicious domain",
  "blocked-injection": "Blocked a malicious script injected by another script",
  "third-party-injection": "A script loaded another third-party script",
  "clipboard-swap-blocked": "Stopped this page from swapping a copied wallet address",
  "paste-mismatch": "The address you are pasting is not the one you copied",
  "payload-marker-blocked": "Stopped a known OPTIMJACK payload from running"
};

function send(evt) {
  evt.page = evt.page || location.href;
  chrome.runtime.sendMessage({ shieldEvent: evt }).catch(() => {});
  showBanner(evt);
}

// Messages from monitor-main.js (page world).
window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data || !e.data.__scriptShield) return;
  send(e.data.evt);
});

// Network-block notices from the background.
chrome.runtime.onMessage.addListener((msg) => { if (msg.shieldBanner) showBanner(msg.shieldBanner); });

// Paste check: remember the last wallet address the user actually selected and copied,
// and warn if a different one is pasted (catches swaps done after the copy event).
let lastCopied = null;
chrome.storage.local.get("lastCopied").then((r) => { lastCopied = r.lastCopied || null; });
chrome.storage.onChanged.addListener((c) => { if (c.lastCopied) lastCopied = c.lastCopied.newValue || null; });

window.addEventListener("copy", () => {
  const sel = String(window.getSelection() || "").trim();
  if (WALLET.test(sel)) {
    lastCopied = { addr: sel, time: Date.now() };
    chrome.storage.local.set({ lastCopied });
  }
}, true);

window.addEventListener("paste", (e) => {
  const pasted = (e.clipboardData && e.clipboardData.getData("text") || "").trim();
  if (!WALLET.test(pasted) || !lastCopied) return;
  if (Date.now() - lastCopied.time > 10 * 60 * 1000) return;
  if (pasted !== lastCopied.addr) {
    e.preventDefault();
    e.stopImmediatePropagation();
    send({ kind: "paste-mismatch", detail: `You copied ${lastCopied.addr} but the clipboard now holds ${pasted}. Paste again if this is intended.` });
    lastCopied = null; // the next paste goes through
    chrome.storage.local.remove("lastCopied");
  }
}, true);

// Banner in a shadow root so page CSS can't hide or restyle it.
let host, list;
function showBanner(evt) {
  const mount = () => {
    if (!host) {
      host = document.createElement("div");
      host.style.cssText = "all:initial;position:fixed;top:12px;right:12px;z-index:2147483647;";
      const root = host.attachShadow({ mode: "closed" });
      root.innerHTML = `<style>
        .box{font:14px/1.4 system-ui,sans-serif;width:min(380px,calc(100vw - 24px));display:grid;gap:8px}
        .item{background:#fff;color:#1d2433;border-left:5px solid #c0392b;border-radius:6px;padding:10px 12px;box-shadow:0 4px 16px rgba(20,30,50,.25)}
        .item b{display:block;margin-bottom:4px}
        .item code{font-size:12px;word-break:break-all;color:#5a6478}
        .item button{margin-top:6px;border:0;background:#1d2433;color:#fff;border-radius:4px;padding:4px 10px;cursor:pointer}
      </style><div class="box"></div>`;
      list = root.querySelector(".box");
      document.documentElement.appendChild(host);
    }
    const item = document.createElement("div");
    item.className = "item";
    const title = document.createElement("b");
    title.textContent = "Script Shield: " + (TITLES[evt.kind] || evt.kind);
    const detail = document.createElement("code");
    detail.textContent = evt.detail + (evt.from ? `  (from ${evt.from})` : "");
    const close = document.createElement("button");
    close.textContent = "Dismiss";
    close.onclick = () => item.remove();
    item.append(title, detail, document.createElement("br"), close);
    list.prepend(item);
  };
  document.documentElement ? mount() : document.addEventListener("DOMContentLoaded", mount, { once: true });
}
