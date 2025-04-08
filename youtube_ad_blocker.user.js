// ==UserScript==
// @name         YouTube Ad & Sponsor Blocker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically removes YouTube ads and skips sponsor segments
// @author       Your Name
// @match        *://www.youtube.com/*
// @updateURL    https://raw.githubusercontent.com/YourRepo/YouTubeAdBlocker/main/youtube_ad_blocker.user.js
// @downloadURL  https://raw.githubusercontent.com/YourRepo/YouTubeAdBlocker/main/youtube_ad_blocker.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const blockList = ['doubleclick.net', 'ads.youtube.com', 'youtube.com/api/stats/ads'];
    const SPONSORBLOCK_API = 'https://sponsor.ajay.app/api/skipSegments?videoID=';

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

    async function fetchSponsorSegments() {
        const videoID = new URLSearchParams(window.location.search).get('v');
        if (!videoID) return [];

        try {
            const response = await fetch(`${SPONSORBLOCK_API}${videoID}`);
            if (!response.ok) return [];
            return await response.json();
        } catch {
            return [];
        }
    }

    async function skipSponsors() {
        const video = document.querySelector('video');
        if (!video) return;

        const sponsorSegments = await fetchSponsorSegments();
        sponsorSegments.forEach(segment => {
            if (video.currentTime > segment.segment[0] && video.currentTime < segment.segment[1]) {
                video.currentTime = segment.segment[1];
            }
        });
    }

    setInterval(removeAds, 2000);
    setInterval(skipSponsors, 2000);
    blockAdRequests();
})();
