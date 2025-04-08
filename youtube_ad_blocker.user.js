// ==UserScript==
// @name         YouTube Ad Remover
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Advanced YouTube ad blocker using multiple techniques
// @author       Zale
// @match        *://*.youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const adKeywords = [
        'ads', 'advertisement', 'doubleclick', 'googleads', 'googlesyndication',
        'pagead', 'adservice', 'log_event', 'ad-break', 'getMidrollInfo',
        'atw', 'ad_', '/ad_', 'instream', 'videoad', 'adblock', 'detectadblock'
    ];

    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : input.url;
        if (url && adKeywords.some(keyword => url.includes(keyword))) {
            console.log('[AdBlocker] Blocked fetch request:', url);
            return Promise.reject(new Error('Ad request blocked'));
        }
        return originalFetch.call(this, input, init);
    };

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    checkForAds(node);
                }
            });
        });
    });

    function checkForAds(element) {
        const videoAds = element.querySelectorAll?.('.video-ads, .ad-showing, .ad-container, .ad-interrupting, .ytp-ad-module') || [];
        videoAds.forEach(ad => {
            console.log('[AdBlocker] Removing video ad element:', ad);
            ad.remove();
            skipAdIfPossible();
        });

        const bannerAds = element.querySelectorAll?.('.ytd-banner-promo-renderer, .ytd-display-ad-renderer, .ytd-in-feed-ad-layout-renderer') || [];
        bannerAds.forEach(ad => {
            console.log('[AdBlocker] Removing banner ad:', ad);
            ad.remove();
        });

        const sponsoredCards = element.querySelectorAll?.('.ytd-sponsored-card-renderer, .sponsored-card, [aria-label="Sponsored"]') || [];
        sponsoredCards.forEach(card => {
            console.log('[AdBlocker] Removing sponsored card:', card);
            card.remove();
        });

        element.querySelectorAll?.('[class*="adblock"], [id*="adblock"]').forEach(el => {
            console.log('[AdBlocker] Removing anti-adblock element:', el);
            el.remove();
        });
    }

    function skipAdIfPossible() {
        const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
        if (skipButton) {
            console.log('[AdBlocker] Clicking skip button');
            skipButton.click();
        }

        const closeButton = document.querySelector('.ytp-ad-overlay-close-button');
        if (closeButton) {
            console.log('[AdBlocker] Clicking close button');
            closeButton.click();
        }

        const video = document.querySelector('video');
        if (video && video.paused && document.querySelector('.ad-showing')) {
            console.log('[AdBlocker] Resuming paused video');
            video.play().catch(e => console.log('[AdBlocker] Play error:', e));
        }
    }

    function overrideAdFunctions() {
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalOpen = xhr.open;
            xhr.open = function(method, url) {
                if (url && adKeywords.some(keyword => url.includes(keyword))) {
                    console.log('[AdBlocker] Blocked XHR request:', url);
                    throw new Error('Ad request blocked');
                }
                return originalOpen.apply(this, arguments);
            };
            return xhr;
        };

        if (window.ytplayer) {
            const originalConfig = window.ytplayer.config;
            Object.defineProperty(window.ytplayer, 'config', {
                get: function() {
                    const config = originalConfig;
                    if (config && config.args && config.args.ad_tag_url) {
                        console.log('[AdBlocker] Removing ad_tag_url');
                        config.args.ad_tag_url = '';
                    }
                    return config;
                },
                set: function(val) {
                    return originalConfig = val;
                }
            });
        }

        if (window.YT && YT.Player) {
            const originalPlayer = YT.Player;
            YT.Player = function(element, options) {
                if (options && options.events && options.events.onAdStart) {
                    options.events.onAdStart = () => {
                        console.log('[AdBlocker] Suppressed ad start event');
                    };
                }
                return new originalPlayer(element, options);
            };
        }
        
        if (window._yt_player) {
            const originalGetAdState = window._yt_player.getAdState;
            window._yt_player.getAdState = function() {
                return -1;
            };
        }
    }

    function blockAdIframes() {
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.apply(this, arguments);
            if (tagName.toLowerCase() === 'iframe') {
                const originalSrc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
                Object.defineProperty(element, 'src', {
                    get: function() {
                        return originalSrc.get.call(this);
                    },
                    set: function(value) {
                        if (value && adKeywords.some(keyword => value.includes(keyword))) {
                            console.log('[AdBlocker] Blocked iframe src:', value);
                            return;
                        }
                        originalSrc.set.call(this, value);
                    }
                });
            }
            return element;
        };
    }

    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        if (url && adKeywords.some(keyword => url.includes(keyword))) {
            console.log('[AdBlocker] Blocked WebSocket connection:', url);
            return {
                send: () => {},
                close: () => {},
                addEventListener: () => {}
            };
        }
        return new originalWebSocket(url, protocols);
    };

    const style = document.createElement('style');
    style.textContent = `
        .video-ads, .ad-showing, .ad-container, 
        .ytp-ad-module, .ytd-banner-promo-renderer,
        .ytd-display-ad-renderer, .ytd-in-feed-ad-layout-renderer,
        .ytd-sponsored-card-renderer, [aria-label="Sponsored"],
        .ytp-ad-overlay-container, .ytp-ad-message-container,
        .ytp-ad-progress, .ad-interrupting { 
            display: none !important; 
            height: 0 !important;
            width: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        
        video::-webkit-media-controls-ad-overlay-feedback-renderer,
        video::-webkit-media-controls-ad-overlay-enclosure {
            display: none !important;
        }
    `;
    document.head.appendChild(style);

    const disableAdTracking = () => {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.includes('google_ads') || key.includes('yt-ads')) {
                localStorage.removeItem(key);
            }
        });
        
        localStorage.setItem('yt-remote-cast-available', 'false');
        localStorage.setItem('yt-remote-fast-check-period', '0');
        localStorage.setItem('yt.innertube::nextId', '0');
    };

    const originalSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function(url, data) {
        if (url && adKeywords.some(keyword => url.includes(keyword))) {
            console.log('[AdBlocker] Blocked beacon:', url);
            return false;
        }
        return originalSendBeacon.call(this, url, data);
    };

    const blockAdCookies = () => {
        const cookieKeywords = ['ads', 'advertising', 'doubleclick', 'googleads'];
        
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            if (cookieKeywords.some(keyword => name.includes(keyword))) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.youtube.com`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.google.com`;
                console.log('[AdBlocker] Removed ad cookie:', name);
            }
        });
    };

    let lastTime = 0;
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
        return originalRAF.call(window, function(timestamp) {
            if (timestamp - lastTime > 1000/30) {
                const stack = new Error().stack;
                if (stack && adKeywords.some(keyword => stack.includes(keyword))) {
                    console.log('[AdBlocker] Blocked ad-related animation frame');
                    return;
                }
            }
            lastTime = timestamp;
            callback(timestamp);
        });
    };

    const observeShadowDOMs = () => {
        document.querySelectorAll('*').forEach(element => {
            if (element.shadowRoot && !element.shadowRoot.__adObserver__) {
                const observer = new MutationObserver(mutations => {
                    mutations.forEach(mutation => {
                        checkForAds(mutation.target);
                    });
                });
                observer.observe(element.shadowRoot, {
                    childList: true,
                    subtree: true
                });
                element.shadowRoot.__adObserver__ = observer;
            }
        });
    };

    const originalWorker = window.Worker;
    window.Worker = function(url, options) {
        if (url && adKeywords.some(keyword => url.includes(keyword))) {
            console.log('[AdBlocker] Blocked ad worker:', url);
            return {
                postMessage: () => {},
                terminate: () => {},
                addEventListener: () => {}
            };
        }
        return new originalWorker(url, options);
    };

    const antiAdblockBypass = () => {
        Object.defineProperty(window, 'adsbygoogle', { value: [], writable: false });
        Object.defineProperty(window, 'adblock', { value: false, writable: false });
        
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(document, tagName);
            if (tagName.toLowerCase() === 'script') {
                const originalSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
                Object.defineProperty(element, 'src', {
                    get: function() { return originalSrc.get.call(this); },
                    set: function(value) {
                        if (value && (value.includes('adblock') || value.includes('detectadblock'))) {
                            console.log('[AdBlocker] Blocked adblock detection script:', value);
                            return;
                        }
                        originalSrc.set.call(this, value);
                    }
                });
            }
            return element;
        };
    };

    function init() {
        overrideAdFunctions();
        blockAdIframes();
        antiAdblockBypass();
        hijackPlayerAPI();

        observer.observe(document, {
            childList: true,
            subtree: true
        });

        setInterval(skipAdIfPossible, 1000);
        setInterval(disableAdTracking, 10000);
        setInterval(blockAdCookies, 15000);
        setInterval(observeShadowDOMs, 5000);

        document.addEventListener('yt-navigate-finish', function() {
            checkForAds(document.body);
        });

        console.log('[AdBlocker] YouTube Ad Remover Pro+ initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
