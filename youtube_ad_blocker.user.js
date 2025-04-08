// ==UserScript==
// @name         Youtube Ad-Remover
// @namespace    http://tampermonkey.net/
// @version      1.1
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

    function preventAdScripts() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'SCRIPT' && node.src.includes('ads')) {
                        node.remove();
                    }
                });
            });
        });
        observer.observe(document.head, { childList: true });
    }

    function removeAds() {
        document.querySelectorAll('.ad-container, .video-ads, .ytp-ad-module').forEach(el => el.remove());
    }

    function skipAds() {
        const video = document.querySelector('video');
        const skipButton = document.querySelector('.ytp-ad-skip-button');
        if (skipButton) skipButton.click();
        if (video && video.classList.contains('ad-showing')) video.currentTime = video.duration;
    }

    async function fetchSponsorSegments() {
        const videoID = new URLSearchParams(window.location.search).get('v');
        if (!videoID) return [];

        try {
            const response = await fetch(`${SPONSORBLOCK_API}${videoID}`);
            return response.ok ? await response.json() : [];
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

    function cleanUI() {
        const elementsToRemove = ['.ytp-pause-overlay', '#player-ads', '#masthead-ad', '.ytp-ad-progress', 'ytd-promoted-video-renderer'];
        elementsToRemove.forEach(selector => document.querySelectorAll(selector).forEach(el => el.remove()));
    }

    setInterval(removeAds, 2000);
    setInterval(skipAds, 2000);
    setInterval(skipSponsors, 2000);
    setInterval(cleanUI, 2000);
    blockAdRequests();
    preventAdScripts();
})();
