(() => {
  'use strict';
  const PLAYLIST_ID = 'PLNjZZNlnN-Kc';
  const CACHE_KEY = `academia-ag:youtube:${PLAYLIST_ID}:index-map:v23`;
  try {
    const current = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    const map = current?.map && typeof current.map === 'object' ? current.map : {};
    map['0'] = 'aiIsKF3sCo8';
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      playlistId: PLAYLIST_ID,
      release: '20260819.25',
      savedAt: Date.now(),
      map
    }));
  } catch (_) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      playlistId: PLAYLIST_ID,
      release: '20260819.25',
      savedAt: Date.now(),
      map: { '0': 'aiIsKF3sCo8' }
    }));
  }
})();
