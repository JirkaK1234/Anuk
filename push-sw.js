self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Anuk', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Anuk';
  const options = {
    body: payload.body || payload.message || '',
    data: payload.data || payload,
    icon: '/Anuk-logo.png',
    badge: '/Anuk-logo.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = '/feed.html';
  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clientsList.find((client) => client.url.includes('/feed'));
    if (existing) return existing.focus();
    return clients.openWindow(url);
  })());
});
