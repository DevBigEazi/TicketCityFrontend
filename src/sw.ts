import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { Route, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();

// cache images
const imageRoute = new Route(
  ({ request, sameOrigin }) => {
    return sameOrigin && request.destination === 'image';
  },
  new CacheFirst({
    cacheName: 'images',
  }),
);
registerRoute(imageRoute);
