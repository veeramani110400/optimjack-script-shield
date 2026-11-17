// Runs in the page's own JS world, before any page script.
// 1) Script monitor: catches scripts injected by other scripts (the OPTIMJACK loader pattern).
// 2) Payload kill switch: stops the inline (eval) copy of the payload via its global markers.
// 3) Clipboard guard: stops a page from swapping a copied wallet address.
(() => {
  const BLOCKED = ["1688360.cc", "5vobauua3ojpklx.icu", "eil786npto9u5bq.icu", "l7bcsnwc7nzr3uo.icu", "webshell.lol", "linkforge.cc", "je4ft3gn8vxudum.icu", "q1ls1ho9x7wsxlu.icu", "ios-hack.icu", "p55abnw2pnsz0bo.icu", "1y69gy2mdzaltz1.icu", "gm38duxoihbmy5o.icu", "optimjack-test.invalid"];
  const WALLET = /^(0x[a-fA-F0-9]{40}|bc1[a-z0-9]{25,62}|ltc1[a-z0-9]{25,62}|[13LMD][a-km-zA-HJ-NP-Z1-9]{25,34}|T[1-9A-HJ-NP-Za-km-z]{33}|[1-9A-HJ-NP-Za-km-z]{32,44}|(EQ|UQ)[A-Za-z0-9_-]{46})$/;

  const report = (evt) => window.postMessage({ __scriptShield: true, evt }, "*");
  const isBlocked = (host) => BLOCKED.some((d) => host === d || host.endsWith("." + d));

  // Work out which script did the injecting.
  function injector() {
    if (document.currentScript && document.currentScript.src) return document.currentScript.src;
    const urls = (new Error().stack || "").match(/https?:\/\/[^\s)]+/g) || [];
    const found = urls.map((u) => u.replace(/:\d+:\d+$/, "")).find((u) => !u.startsWith("chrome-extension://"));
    return found || "inline or unknown script";
  }

  // ---- 1) Script monitor ----
  function inspect(node) {
    if (!(node instanceof HTMLScriptElement) || !node.src) return;
    let url;
    try { url = new URL(node.src, location.href); } catch { return; }
    if (url.host === location.host) return; // first-party, ignore

    const from = injector();
    if (isBlocked(url.hostname)) {
      node.type = "text/script-shield-blocked"; // stops it from loading or running
      node.removeAttribute("src");
      report({ kind: "blocked-injection", detail: url.href, from });
    } else {
      report({ kind: "third-party-injection", detail: url.href, from });
    }
  }

  for (const [proto, names] of [
    [Node.prototype, ["appendChild", "insertBefore", "replaceChild"]],
    [Element.prototype, ["append", "prepend", "before", "after"]]
  ]) {
    for (const name of names) {
      const original = proto[name];
      if (!original) continue;
      proto[name] = function (...args) {
        args.forEach((a) => {
          if (a instanceof DocumentFragment) a.querySelectorAll("script").forEach(inspect);
          else inspect(a);
        });
        return original.apply(this, args);
      };
    }
  }

  // ---- 2) Payload kill switch ----
  // Report URI lists window._k7 and window.__k7b as globals the payload sets.
  // Claiming them first means the payload throws when it tries to set them.
  for (const marker of ["_k7", "__k7b"]) {
    try {
      Object.defineProperty(window, marker, {
        configurable: false,
        get() { return undefined; },
        set() {
          report({ kind: "payload-marker-blocked", detail: "Payload tried to set window." + marker, from: injector() });
          throw new Error("Script Shield blocked a known OPTIMJACK payload");
        }
      });
    } catch { /* already defined */ }
  }

  // ---- 3) Clipboard guard ----
  const selectionText = () => String(window.getSelection() || "").trim();

  // Copy-event path: a handler replaces the selected address while you press Ctrl+C.
  const originalSetData = DataTransfer.prototype.setData;
  DataTransfer.prototype.setData = function (format, data) {
    if (/^text/i.test(format) && typeof data === "string") {
      const selected = selectionText();
      const written = data.trim();
      if (WALLET.test(written) && selected && written !== selected) {
        report({ kind: "clipboard-swap-blocked", detail: `Tried to replace ${selected} with ${written}`, from: injector() });
        return originalSetData.call(this, format, selected);
      }
    }
    return originalSetData.call(this, format, data);
  };

  // navigator.clipboard path: a script overwrites the clipboard with a different address.
  if (window.Clipboard && Clipboard.prototype.writeText) {
    const originalWriteText = Clipboard.prototype.writeText;
    Clipboard.prototype.writeText = function (text) {
      const selected = selectionText();
      const written = String(text).trim();
      if (WALLET.test(written) && WALLET.test(selected) && written !== selected) {
        report({ kind: "clipboard-swap-blocked", detail: `Tried to replace ${selected} with ${written}`, from: injector() });
        return originalWriteText.call(this, selected);
      }
      return originalWriteText.call(this, text);
    };
  }
})();
