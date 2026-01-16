# 🎵 Audio Visualizer for OBS Studio

**Real-time audio visualization for your stream!**

> ⚠️ **No Tuna plugin required!** Everything works out of the box.

---

## ✨ Features

- 🎧 **WASAPI Loopback** — Captures what you hear (speakers/headphones)
- 📊 **128-band FFT** — Smooth, detailed spectrum analysis
- 🌈 **Dynamic colors** — Adapts to your album cover
- 🔌 **No external dependencies** — Single `.exe`, no Python required!
- ⚡ **Auto-start** — Server launches with OBS
- 🎵 **Built-in Track API** — Gets track info directly

---

## 📦 What's Included

| File | Description |
|------|-------------|
| `audio_server.exe` | Unified server (FFT + Track API) |
| `audio_visualizer.lua` | OBS Script with settings UI |
| `tuna_universal_v7.user.js` | Browser userscript |
| `stream_overlay_premium.html` | Full-screen visualizer overlay |
| `widget_premium.html` | Compact music widget |
| `icons/` | Streaming service icons |

---

## 🚀 Installation

### Step 1: Copy Files
Copy this entire `audio-visualizer-plugin` folder to:
```
C:\Program Files\obs-studio\data\obs-plugins\
```

### Step 2: Add Script to OBS
1. Open OBS Studio
2. Go to **Tools** → **Scripts**
3. Click the **+** button
4. Select `audio_visualizer.lua`

### Step 3: Install Browser Userscript
1. Install **Tampermonkey** or **Violentmonkey**:
   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey)
   - [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)

2. Open the file `tuna_universal_v7.user.js`
3. Click **Install** when prompted

> 💡 Supports: Yandex Music, YouTube Music, YouTube, Spotify, SoundCloud, Deezer

### Step 4: You're Done!
Server auto-starts when OBS loads.

---

## 🎛 Settings

| Control | Description |
|---------|-------------|
| **Audio Device** | Select your output device |
| **FFT Bands** | 32/64/128 frequency bands |
| **Smoothing** | Animation smoothness (0.0-0.9) |
| **Preset** | Vinyl / Pill / Glass / Minimal |
| **Opacity** | Background transparency (0-100%) |
| **Sensitivity** | Visualizer amplitude (0.5x-3x) |

---

## 🎨 Presets

| Preset | Description |
|--------|-------------|
| **Vinyl** | Spinning record (classic) |
| **Pill** | Rounded rectangle (Spotify style) |
| **Glass** | Glassmorphism with blur |
| **Minimal** | Text only, no cover art |

---

## 🔧 How It Works

```
Browser (music playing)
    ↓ userscript
Our Server (port 1608 + 8765)
    ↓
OBS Widget (shows track + visualizer)
```

**One server — all in one!**

---

## ❓ FAQ

### Q: Nothing happens?
- Check if server is running (button in script settings)
- Antivirus may be blocking `audio_server.exe`

### Q: Visualizer not reacting to music?
- Make sure correct audio device is selected
- Music must play through selected device

### Q: Track info not showing?
- Verify userscript is installed and active
- Open browser console (F12) for diagnostics

---

## 📝 License

MIT License — Free for personal and commercial use.

---

**Enjoy your streams!** 🎶
