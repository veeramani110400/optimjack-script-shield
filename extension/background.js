// Collects events from all layers, keeps a short log, updates the badge,
// and tells the tab to show a warning banner.
const MAX_EVENTS = 50;
const tabCounts = {};

async function record(evt, tabId) {
  evt.time = Date.now();
  const { events = [] } = await chrome.storage.local.get("events");
  events.unshift(evt);
  await chrome.storage.local.set({ events: events.slice(0, MAX_EVENTS) });

  if (tabId >= 0) {
    tabCounts[tabId] = (tabCounts[tabId] || 0) + 1;
    chrome.action.setBadgeBackgroundColor({ color: "#C0392B", tabId });
    chrome.action.setBadgeText({ text: String(tabCounts[tabId]), tabId });
  }
}

// Layer 1: network blocks (works for unpacked extensions via the feedback permission).
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  const { request } = info;
  const evt = { kind: "blocked-request", detail: request.url, page: request.initiator || "" };
  record(evt, request.tabId);
  if (request.tabId >= 0) {
    chrome.tabs.sendMessage(request.tabId, { shieldBanner: evt }).catch(() => {});
  }
});

// Layers 2 and 3: reports from content scripts.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.shieldEvent) record(msg.shieldEvent, sender.tab ? sender.tab.id : -1);
});

chrome.tabs.onRemoved.addListener((tabId) => delete tabCounts[tabId]);
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") {
    tabCounts[tabId] = 0;
    chrome.action.setBadgeText({ text: "", tabId });
  }
});
