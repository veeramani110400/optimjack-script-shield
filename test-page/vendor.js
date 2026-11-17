// Pretend "trusted vendor" snippet (like an Optimizely project file) that has been
// tampered with. It injects scripts from other domains, just like OPTIMJACK did.
// Both URLs are on .invalid domains, which never resolve, so nothing real is loaded.
(function () {
  function inject(src) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = function () { window.shieldTestLog("Loaded " + src + " (not blocked)"); };
    s.onerror = function () { window.shieldTestLog("Could not load " + src); };
    document.head.appendChild(s);
  }
  // On the blocklist: the extension should block this.
  inject("https://optimjack-test.invalid/track.js");
  // Not on the blocklist: the extension should only warn.
  inject("https://unknown-tracker.invalid/collect.js");
})();
