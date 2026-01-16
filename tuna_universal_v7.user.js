// ==UserScript==
// @name         Tuna Universal v7.0
// @namespace    univrsal
// @version      7.0.0
// @description  Universal music info for Tuna - Yandex, YouTube, YouTube Music, Spotify, Deezer, SoundCloud, etc.
// @match        *://music.yandex.ru/*
// @match        *://music.yandex.com/*
// @match        *://open.spotify.com/*
// @match        *://soundcloud.com/*
// @match        *://www.deezer.com/*
// @match        *://*.youtube.com/*
// @match        *://music.youtube.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      localhost
// @connect      127.0.0.1
// @license      GPLv2
// ==/UserScript==

(function () {
    'use strict';

    const PORT = 1608;
    const REFRESH_RATE = 500;
    const DEBUG_ENABLED = true; // Set to false to hide debug panel

    // =========================================
    // DEBUG PANEL
    // =========================================
    let debugBox = null;
    if (DEBUG_ENABLED) {
        debugBox = document.createElement('div');
        debugBox.style.cssText = `
            position: fixed; top: 0; left: 0; width: 320px;
            background: rgba(0,0,0,0.85); color: white; z-index: 999999;
            padding: 10px; font-family: monospace; font-size: 11px;
            border-left: 4px solid #8b5cf6; border-radius: 0 0 8px 0;
            backdrop-filter: blur(10px);
        `;
        debugBox.innerHTML = '🎵 TUNA v7: Loading...';
        document.body.appendChild(debugBox);
    }

    function updateDebug(platform, title, progress, duration, isPlaying, extra = '') {
        if (!debugBox) return;
        const color = isPlaying ? '#22c55e' : '#ef4444';
        const statusText = isPlaying ? '▶ PLAYING' : '⏸ STOPPED';
        debugBox.innerHTML = `
            <b>🎵 TUNA v7</b> <span style="color:#888">(${platform})</span><br>
            <span style="color:#fff">${title}</span><br>
            ⏱ ${Math.floor(progress / 1000)}s / ${Math.floor(duration / 1000)}s<br>
            <span style="color:${color}">${statusText}</span>
            ${extra}
        `;
    }

    // =========================================
    // HTTP REQUEST (Tampermonkey/Violentmonkey compatible)
    // =========================================
    function makeRequest(data) {
        if (typeof GM_xmlhttpRequest === "function") {
            return GM_xmlhttpRequest(data);
        } else if (typeof GM !== "undefined" && GM.xmlHttpRequest) {
            return GM.xmlHttpRequest(data);
        }
        console.error('[Tuna] No GM_xmlhttpRequest available');
        return null;
    }

    let lastState = {};
    function post(data) {
        // Prevent spam: don't send if paused and state unchanged
        if (data.status !== "playing" && lastState.status === data.status) {
            return;
        }
        lastState = data;

        makeRequest({
            method: "POST",
            url: `http://localhost:${PORT}/`,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({ data, hostname: window.location.hostname, date: Date.now() }),
            onerror: () => console.log("[Tuna] Connection error")
        });
    }

    // =========================================
    // HELPERS
    // =========================================
    function query(selector, fn, fallback = null) {
        const el = document.querySelector(selector);
        return el ? fn(el) : fallback;
    }

    function timestampToMs(ts) {
        if (!ts) return 0;
        const parts = ts.split(':').map(Number);
        if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
        if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        return 0;
    }

    // =========================================
    // PLATFORM HANDLERS
    // =========================================

    // --- YANDEX MUSIC (Enhanced) ---
    let yandexLastProgress = -1;
    let yandexLastChange = Date.now();
    let yandexStatus = "stopped";

    function handleYandex() {
        // Read time from slider (most accurate)
        let slider = document.querySelector('input[type="range"][aria-label*="time code"]') ||
            document.querySelector('input[type="range"][class*="ChangeTimecode"]');

        let progress = 0, duration = 0;
        if (slider) {
            progress = parseInt(slider.value) * 1000;
            duration = parseInt(slider.max) * 1000;
        } else {
            // Fallback to text elements
            const pEl = document.querySelector('span[class*="Timecode_root_start"]');
            const dEl = document.querySelector('span[class*="Timecode_root_end"]');
            if (pEl) progress = timestampToMs(pEl.innerText);
            if (dEl) duration = timestampToMs(dEl.innerText);
        }

        // Calculate status from progress changes
        const now = Date.now();
        if (progress !== yandexLastProgress && progress > 0) {
            yandexLastChange = now;
            yandexStatus = "playing";
        } else if (now - yandexLastChange > 1200) {
            yandexStatus = "stopped";
        }
        yandexLastProgress = progress;

        // MediaSession data
        const meta = navigator.mediaSession?.metadata || {};
        const title = meta.title || "Unknown";
        const artists = meta.artist ? [meta.artist] : [];
        const album = meta.album || "";

        // HD Cover
        let cover = "";
        const bigImg = document.querySelector('img[class*="FullscreenPlayer"][class*="cover"]') ||
            document.querySelector('img[class*="DesktopPoster_cover"]');
        if (bigImg) cover = bigImg.src;
        else if (meta.artwork?.length) cover = meta.artwork[meta.artwork.length - 1].src;
        if (cover) cover = cover.replace('%%', '1000x1000').replace(/\/\d+x\d+/, '/1000x1000');

        // Next track from queue
        let nextTrack = null;
        try {
            const queueBlock = document.querySelector('.PlayQueueAfterPlayingBlock_root__A7_wI');
            if (queueBlock) {
                const nextTitle = queueBlock.querySelector('[class*="Meta_title"]');
                const nextArtist = queueBlock.querySelector('[class*="Meta_artistCaption"]');
                const nextImg = queueBlock.querySelector('img');
                if (nextTitle && nextArtist) {
                    let nextCover = nextImg?.src || '';
                    if (nextCover) nextCover = nextCover.replace(/\/\d+x\d+/, '/200x200');
                    nextTrack = {
                        title: nextTitle.innerText.trim(),
                        artist: nextArtist.innerText.trim(),
                        cover: nextCover
                    };
                }
            }
        } catch (e) { }

        const extra = nextTrack ? `<br><span style="color:#888">Next: ${nextTrack.artist} - ${nextTrack.title}</span>` : '';
        updateDebug('Yandex', title, progress, duration, yandexStatus === "playing", extra);

        post({
            source: 'yandex',
            cover, title, artists,
            status: yandexStatus,
            progress, duration,
            album_url: window.location.href, album,
            next_track: nextTrack
        });
    }

    // --- SPOTIFY ---
    function handleSpotify() {
        if (!navigator.mediaSession?.metadata) return;

        const meta = navigator.mediaSession.metadata;
        const status = query('[data-testid="control-button-playpause"]', e =>
            e.getAttribute('aria-label')?.toLowerCase().includes('pause') ? 'playing' : 'stopped', 'stopped');
        const cover = meta.artwork?.[0]?.src || '';
        const title = meta.title;
        const artists = [meta.artist];
        const album = meta.album;
        const progress = query('[data-testid="playback-position"]', e => timestampToMs(e.textContent), 0);
        const duration = query('[data-testid="playback-duration"]', e => timestampToMs(e.textContent), 0);

        updateDebug('Spotify', title, progress, duration, status === 'playing');
        post({ source: 'spotify', cover, title, artists, status, progress, duration, album });
    }

    // --- YOUTUBE ---
    function handleYouTube() {
        const video = document.querySelector('video');
        if (!video) return;

        // Try multiple selectors for artist/channel
        let artists = [];
        try {
            const authorEl = document.querySelector("#text > a") ||
                document.querySelector("#owner #channel-name a") ||
                document.querySelector("ytd-video-owner-renderer #channel-name a");
            if (authorEl) artists = [authorEl.textContent?.trim() || authorEl.innerHTML?.trim()];
        } catch (e) { }

        // Try multiple selectors for title
        let title = '';
        try {
            const titleEl = document.querySelector("#container > h1 > yt-formatted-string") ||
                document.querySelector("h1.ytd-video-primary-info-renderer") ||
                document.querySelector("ytd-watch-metadata h1 yt-formatted-string");
            title = titleEl?.textContent?.trim() || titleEl?.innerHTML?.trim() || '';
        } catch (e) { }

        // Fallback to MediaSession
        if (!title && navigator.mediaSession?.metadata) {
            title = navigator.mediaSession.metadata.title || '';
            if (!artists.length && navigator.mediaSession.metadata.artist) {
                artists = [navigator.mediaSession.metadata.artist];
            }
        }
        const duration = video ? video.duration * 1000 : 0;
        const progress = video ? video.currentTime * 1000 : 0;
        const status = video?.paused ? 'stopped' : 'playing';

        // Get video ID and thumbnail
        let cover = "";
        let videoId = null;
        const match = window.location.toString().match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/);
        if (match?.[1]?.length === 11) {
            videoId = match[1];
            cover = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
        }

        // Clean up title
        if (title && artists.length) {
            title = title.replace(`${artists[0]} - `, "").replace(` - ${artists[0]}`, "");
        }
        title = title.replace(/\(Official.*?\)/gi, "").replace(/\[Official.*?\]/gi, "").trim();

        // Next track from playlist button
        let nextTrack = null;
        try {
            const nextBtn = document.querySelector('a.ytp-next-button[data-preview]');
            if (nextBtn) {
                const nextCover = nextBtn.getAttribute('data-preview') || '';
                const nextTitle = nextBtn.getAttribute('data-tooltip-text') || '';
                if (nextTitle) {
                    nextTrack = {
                        title: nextTitle,
                        artist: '', // YouTube doesn't show artist in next button
                        cover: nextCover.replace('mqdefault', 'hqdefault') // Better quality
                    };
                }
            }
        } catch (e) { }

        const extra = nextTrack ? `<br><span style="color:#888">Next: ${nextTrack.title}</span>` : '';
        updateDebug('YouTube', title, progress, duration, status === 'playing', extra);

        if (status === 'playing') {
            post({ source: 'youtube', video_id: videoId, cover, title, artists, status, progress: Math.floor(progress), duration, next_track: nextTrack });
        } else {
            post({ source: 'youtube', status: 'stopped', title: '', artists: [], progress: 0, duration: 0 });
        }
    }

    // --- YOUTUBE MUSIC ---
    function handleYouTubeMusic() {
        if (!navigator.mediaSession?.metadata) return;

        const artistsSelectors = [
            '.ytmusic-player-bar.byline [href*="channel/"]:not([href*="channel/MPREb_"])',
            '.ytmusic-player-bar.byline .yt-formatted-string:nth-child(2n+1):not([href*="browse/"])'
        ];
        const albumSelectors = [
            '.ytmusic-player-bar [href*="browse/MPREb_"]'
        ];

        const time = query('.ytmusic-player-bar.time-info', e => e.innerText.split(" / "), ["0:00", "0:00"]);
        const status = navigator.mediaSession.playbackState === 'playing' ? 'playing' : 'stopped';
        const title = query('.ytmusic-player-bar.title', e => e.title, '');
        const artists = Array.from(document.querySelectorAll(artistsSelectors.join(','))).map(x => x.innerText);
        const album = query(albumSelectors.join(','), e => e.textContent, '');
        const artwork = navigator.mediaSession.metadata?.artwork || [];
        const cover = artwork.length ? artwork[artwork.length - 1].src : '';
        const progress = timestampToMs(time[0]);
        const duration = timestampToMs(time[1]);

        // Next track from queue
        let nextTrack = null;
        try {
            const queueItems = document.querySelectorAll('ytmusic-player-queue-item');
            // First item in queue is the next track
            if (queueItems.length > 0) {
                const nextItem = queueItems[0];
                const nextTitle = nextItem.querySelector('.song-title')?.textContent?.trim() || '';
                const nextArtist = nextItem.querySelector('.byline')?.textContent?.trim() || '';
                const nextImg = nextItem.querySelector('yt-img-shadow img');
                let nextCover = nextImg?.src || '';
                if (nextCover) nextCover = nextCover.replace(/\/\w+default\.jpg.*/, '/hqdefault.jpg');

                if (nextTitle) {
                    nextTrack = { title: nextTitle, artist: nextArtist, cover: nextCover };
                }
            }
        } catch (e) { }

        const extra = nextTrack ? `<br><span style="color:#888">Next: ${nextTrack.artist} - ${nextTrack.title}</span>` : '';
        updateDebug('YouTube Music', title, progress, duration, status === 'playing', extra);
        post({ source: 'youtube_music', cover, title, artists, status, progress, duration, album, next_track: nextTrack });
    }

    // --- SOUNDCLOUD ---
    function handleSoundCloud() {
        const status = query('.playControl', e => e.classList.contains('playing') ? "playing" : "stopped", 'stopped');
        const cover = query('.playbackSoundBadge span.sc-artwork', e =>
            e.style.backgroundImage.slice(5, -2).replace('t50x50', 't500x500'), '');
        const title = query('.playbackSoundBadge__titleLink', e => e.title, '');
        const artists = [query('.playbackSoundBadge__lightLink', e => e.title, '')];
        const progress = query('.playbackTimeline__timePassed span:nth-child(2)', e => timestampToMs(e.textContent), 0);
        const duration = query('.playbackTimeline__duration span:nth-child(2)', e => timestampToMs(e.textContent), 0);

        if (!title) return;
        updateDebug('SoundCloud', title, progress, duration, status === 'playing');
        post({ source: 'soundcloud', cover, title, artists, status, progress, duration });
    }

    // --- DEEZER ---
    function handleDeezer() {
        const pauseBtn = document.querySelector('[data-testid="play_button_pause"]');
        const status = pauseBtn ? "playing" : "stopped";

        if (!navigator.mediaSession?.metadata) return;

        const meta = navigator.mediaSession.metadata;
        const cover = meta.artwork?.[0]?.src?.replace(/\d+x\d+/, '512x512') || '';
        const title = meta.title;
        const artists = meta.artist?.split(",").map(x => x.trim()) || [];
        const album = meta.album;
        const slider = document.querySelector('input.slider-track-input.mousetrap');
        const progress = slider ? Math.round(slider.value * 1000) : 0;
        const duration = slider ? Math.round(slider.max * 1000) : 0;

        updateDebug('Deezer', title, progress, duration, status === 'playing');
        post({ source: 'deezer', cover, title, artists, status, progress, duration, album });
    }

    // =========================================
    // MAIN LOOP
    // =========================================
    setInterval(() => {
        const host = window.location.hostname;

        if (host.includes('music.yandex')) {
            handleYandex();
        } else if (host === 'open.spotify.com') {
            handleSpotify();
        } else if (host === 'music.youtube.com') {
            handleYouTubeMusic();
        } else if (host.includes('youtube.com')) {
            handleYouTube();
        } else if (host === 'soundcloud.com') {
            handleSoundCloud();
        } else if (host === 'www.deezer.com') {
            handleDeezer();
        }
    }, REFRESH_RATE);

    console.log('[Tuna v7] Universal script loaded for:', window.location.hostname);
})();
