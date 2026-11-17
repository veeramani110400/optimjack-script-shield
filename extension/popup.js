const list = document.getElementById("list");
async function render() {
  const { events = [] } = await chrome.storage.local.get("events");
  list.textContent = "";
  if (!events.length) {
    list.innerHTML = '<p class="empty">No threats seen yet. Open the test page to try it.</p>';
    return;
  }
  for (const e of events) {
    const d = document.createElement("div");
    d.className = "e";
    d.innerHTML = "<b></b><br><code></code><div class='t'></div>";
    d.querySelector("b").textContent = e.kind;
    d.querySelector("code").textContent = e.detail + (e.from ? ` (from ${e.from})` : "");
    d.querySelector(".t").textContent = new Date(e.time).toLocaleString() + "  " + (e.page || "");
    list.append(d);
  }
}
document.getElementById("clear").onclick = async () => { await chrome.storage.local.set({ events: [] }); render(); };
render();
