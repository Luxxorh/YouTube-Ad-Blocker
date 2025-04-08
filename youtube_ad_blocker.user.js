// ==UserScript==
// @name         Youtube Ad-Remover
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically removes YouTube ads
// @author       Zale
// @match        *://www.youtube.com/*
// @updateURL    https://github.com/Derpixh/YouTube-Ad-Blocker/raw/refs/heads/main/youtube_ad_blocker.user.js
// @downloadURL  https://github.com/Derpixh/YouTube-Ad-Blocker/raw/refs/heads/main/youtube_ad_blocker.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const blockList = ['doubleclick.net', 'ads.youtube.com', 'youtube.com/api/stats/ads'];

    function blockAdRequests() {
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (typeof url === 'string' && blockList.some(domain => url.includes(domain))) {
                return Promise.resolve(new Response(null, { status: 204 }));
            }
            return originalFetch(url, options);
        };
    }

    function removeAds() {
        document.querySelectorAll('.ad-container, .video-ads, .ytp-ad-module').forEach(el => el.remove());
    }

    setInterval(removeAds, 2000);
    blockAdRequests();
})();
