// ==UserScript==
// @name         Youtube Ad-Remover
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Automatically Removes YouTube Ads & Sponsored Content Instantly & Cleans Up Gaps (No Reflows)
// @author       Zale
// @match        *://www.youtube.com/*
// @updateURL    https://raw.githubusercontent.com/Derpixh/YouTube-Ad-Blocker/main/youtube_ad_blocker.user.js
// @downloadURL  https://raw.githubusercontent.com/Derpixh/YouTube-Ad-Blocker/main/youtube_ad_blocker.user.js
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

    function removeAdsInstantly() {
        const selectors = [
            '.ad-container', '.video-ads', '.ytp-ad-module',
            'ytd-ad-slot-renderer', '#masthead-ad', '#player-ads',
            '.ytp-ad-overlay-container', '.ytp-ad-progress',
        ];
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                const parent = el.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-item-section-renderer') || el;
                parent.remove();
            });
        });
    }

    function skipAdsInstantly() {
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

    async function skipSponsorsInstantly() {
        const video = document.querySelector('video');
        if (!video) return;
        const sponsorSegments = await fetchSponsorSegments();
        sponsorSegments.forEach(segment => {
            if (video.currentTime > segment.segment[0] && video.currentTime < segment.segment[1]) {
                video.currentTime = segment.segment[1];
            }
        });
    }

    function removeSponsoredVideosInstantly() {
        document.querySelectorAll('ytd-promoted-video-renderer, ytd-promoted-sparkles-text-search-renderer, ytd-sponsored-card-renderer')
            .forEach(el => {
                const container = el.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-item-section-renderer') || el;
                container.remove();
            });
    }

    function removeHomepageSponsoredSectionsInstantly() {
        document.querySelectorAll('ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-merch-shelf-renderer')
            .forEach(el => el.remove());
    }

    function removeSponsoredDescriptionsInstantly() {
        document.querySelectorAll('#description a').forEach(link => {
            if (/sponsored|aff|referral/i.test(link.textContent) || /aff|referral/.test(link.href)) {
                const container = link.closest('ytd-expander, ytd-text-inline-expander-renderer');
                (container || link).remove();
            }
        });
    }

    function removeSponsoredTitlesInstantly() {
        document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer').forEach(video => {
            const title = video.querySelector('#video-title');
            if (title && /sponsored|promotion|ad/i.test(title.textContent)) {
                video.remove();
            }
        });
    }

    function cleanUIInstantly() {
        const selectors = [
            '.ytp-pause-overlay',
            'ytd-ad-slot-renderer',
            '.ytp-ad-overlay-container',
            '#player-ads',
            '.ytp-ad-module',
        ];
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                const parent = el.closest('ytd-rich-item-renderer, ytd-video-renderer') || el;
                parent.remove();
            });
        });
    }

    function removeBlankAdContainers() {
        document.querySelectorAll('ytd-ad-slot-renderer, .ytp-ad-overlay-container, #player-ads, .ytp-ad-module').forEach(el => {
            if (el.innerHTML.trim() === '') {
                const container = el.closest('ytd-rich-item-renderer, ytd-item-section-renderer, ytd-video-renderer') || el;
                container.remove();
            }
        });

        document.querySelectorAll('ytd-rich-item-renderer, ytd-item-section-renderer').forEach(el => {
            if (!el.textContent.trim()) {
                el.remove();
            }
        });
    }

    function observeAndRemoveAds() {
        const observer = new MutationObserver(() => {
            removeAdsInstantly();
            skipAdsInstantly();
            skipSponsorsInstantly();
            removeSponsoredVideosInstantly();
            removeHomepageSponsoredSectionsInstantly();
            removeSponsoredDescriptionsInstantly();
            removeSponsoredTitlesInstantly();
            cleanUIInstantly();
            removeBlankAdContainers();
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    blockAdRequests();
    preventAdScripts();
    observeAndRemoveAds();
})();
