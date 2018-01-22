module.exports = {
  "globDirectory": "build/default/",
  "globPatterns": [
    "**/*.{html,js}"
  ],
  "swDest": "build/default/sw.js",
  "globIgnores": [
    "../../workbox-cli-config.js"
  ],
  /**
   * Added config options below. Don't forget the trailing comma (,) above.
   */

  /**
   * Activate this service worker on all active clients without reloading the page.
   */
  "skipWaiting": true,
  "clientsClaim": true,

  /**
   * All navigate requests should serve the contents of "index.html".
   */
  "navigateFallback": "index.html",

  "runtimeCaching": [
    /**
     * Use the "network-first" strategy for data. This means users will always get
     * up-to-date data if they have a reliable network connection, but falls back to
     * cached content otherwise.
     */
    ///*
    {
      "urlPattern": /^https:\/\/dragodindefactory\.firebaseio\.com\/.*\.json/,
      "handler": "networkFirst"
    }
    //*/
  ]
};
