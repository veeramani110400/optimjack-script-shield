# OPTIMJACK Script Shield

A Chrome/Edge browser extension that protects you from the **OPTIMJACK** supply-chain attack and attacks built the same way.

On 16 November 2026, an attacker injected malicious JavaScript into **Optimizely Web** snippets served from `cdn.optimizely.com`. Visitors to at least 178 organisations, including Zoom, the BBC, CNN, HSBC and Equifax, ran a payload that swapped crypto wallet addresses, skimmed payment cards, stole cookies and screenshots, and targeted older iPhones with exploit kits.

📖 **Full write-up:** [OPTIMJACK — How One Trusted Script Turned 178 of the World's Biggest Websites Against Their Own Visitors](https://www.rxnveera.in/)

---

## What It Does

1. **Blocks attacker domains.** Every published OPTIMJACK domain is blocked at the network level, so the loader can't fetch the payload and stolen data can't be sent out.
2. **Watches for injected scripts.** Warns when a script on the page adds another script from a different domain, and blocks it if the domain is known-bad.
3. **Stops the inline payload copy.** Claims the payload's global markers (`window._k7`, `window.__k7b`) before it runs, so the `eval` fallback fails.
4. **Guards your clipboard.** Stops a page swapping a wallet address you copy, and warns if what you paste isn't what you copied.

Warnings appear as a banner on the page, a badge count on the icon, and a log in the popup.

## What It Can't Do

- **New domains:** It can't block an attacker domain nobody has reported yet; it only warns about the injected script.
- **Swapped page text:** If the page already shows the attacker's address, you'll copy the wrong one. Always verify on your hardware wallet's screen.
- **iPhones:** Chrome extensions don't run on iOS, so it can't stop the exploit kits. Update iOS to 18.7.3+ or 26.3+.
- **Not a site fix:** It's a user-side defence, not a replacement for a proper Content Security Policy on the website.

---

## Install

1. Download `script-shield.zip` from the [latest release](https://github.com/veeramani110400/optimjack-script-shield/releases/latest) and unzip it.
2. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and choose the `extension` folder.

## Test It

The `test-page` folder mimics each stage of the attack using fake `.invalid` domains, which never resolve, so nothing real is ever loaded.

```bash
cd test-page
python3 -m http.server 8000
```

Open http://localhost:8000 and run each test:

- **Tampered vendor script:** one injected script is blocked, the other triggers a warning.
- **Inline payload stand-in:** the `eval` copy is stopped.
- **Clipboard swap (during copy / after copy):** your real address is kept, or the paste is stopped.

> Content scripts don't run on `file://` pages by default, so serve the test page over http rather than opening the file directly.

---

## Project Structure

```
extension/
  manifest.json      Extension config (Manifest V3)
  rules.json         Network blocklist of attacker domains
  monitor-main.js    Script monitor, payload kill switch, clipboard guard (page world)
  content.js         Warning banner, paste check, event relay
  background.js      Event log and badge count
  popup.html/js      Event log viewer
test-page/
  index.html         Test bench
  vendor.js          Simulated tampered vendor script
```

## Updating the Blocklist

Add new domains to **both** `extension/rules.json` and the `BLOCKED` list in `extension/monitor-main.js`, then reload the extension.

## Indicators of Compromise

Blocked domains (from Report URI's analysis):

```
1688360.cc            5vobauua3ojpklx.icu   eil786npto9u5bq.icu
l7bcsnwc7nzr3uo.icu   webshell.lol          linkforge.cc
je4ft3gn8vxudum.icu   q1ls1ho9x7wsxlu.icu   ios-hack.icu
p55abnw2pnsz0bo.icu   1y69gy2mdzaltz1.icu   gm38duxoihbmy5o.icu
```

## Credits

IOCs and payload analysis: [Report URI — World's Largest Brands Infected With Malware Via Optimizely](https://blog.report-uri.com/worlds-largest-brands-infected-with-malware-via-optimizely/) (Scott Helme).

## Disclaimer

This is a first-cut, demo-grade defence shared for awareness and research. Use it at your own risk, and keep your browser and OS updated.
