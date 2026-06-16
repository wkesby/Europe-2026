# Kesby Europe 2026 — living itinerary

**One source of truth:** `data.json`. Both views read from it.
Edit `data.json`, commit, and GitHub Pages republishes automatically.

## Files
- `index.html` — landing page linking both views
- `mobile.html` — iPhone-native view (fully data-driven)
- `cinematic.html` — rich detailed view (prose cards + data-driven trackers/map)
- `data.json` — **the file you update each time** (bookings, transfers, stops, to-dos)
- `.github/workflows/deploy.yml` — auto-deploy to Pages on every push

## How updates flow
1. New booking arrives → Claude (in the chat, with M365) updates the OneDrive
   spreadsheet and regenerates `data.json`.
2. The updated `data.json` lands in this repo (iOS Shortcut when travelling,
   or Claude Code at home).
3. The GitHub Action republishes Pages automatically.
4. Home Screen icons show fresh data on next open (cache-busted).

## One-time setup
- Settings → Pages → Source = **GitHub Actions**
- Add Home Screen icons pointing at the Pages URL (e.g.
  `https://USERNAME.github.io/REPO/mobile.html`)
