/* global workbox */
/* eslint-disable no-restricted-globals*/
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";

// Pre-cache files
precacheAndRoute(self.__WB_MANIFEST || []);

// Activate new Service Worker instantly
self.addEventListener("install", (event) => {
    self.skipWaiting();
  });

// Activate Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
