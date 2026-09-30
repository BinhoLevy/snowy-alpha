const CACHE='snowy-alpha-v2';

const ASSETS=[
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install',event=>{
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE).then(cache=>{
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>{
      return Promise.all(
        keys
          .filter(key=>key!==CACHE)
          .map(key=>caches.delete(key))
      );
    }).then(()=>{
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch',event=>{

  const request=event.request;
  const url=new URL(request.url);

  if(url.pathname.endsWith('/app.js')){
    event.respondWith(
      fetch(request).catch(()=>{
        return caches.match(request);
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response=>{
        const copy=response.clone();

        caches.open(CACHE).then(cache=>{
          cache.put(request,copy);
        });

        return response;
      })
      .catch(()=>{
        return caches.match(request);
      })
  );
});
