/* global clients */
// Hootus service worker: shows push notifications and opens Hootus when one is clicked.
// The payload is built by backend/src/helpers/pushContent.ts.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Hootus";
  const options = {
    body: data.body || "You have something new on Hootus.",
    data: { url: data.url || "/" },
  };
  event.waitUntil(
    (async () => {
      try {
        // Same tag replaces the previous notification for that conversation.
        await self.registration.showNotification(
          title,
          data.tag ? { ...options, tag: data.tag, renotify: true } : options,
        );
      } catch (error) {
        console.error(
          "Hootus: tagged notification failed, showing a plain one",
          error,
        );
        await self.registration.showNotification(title, options);
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only ever open pages on this site.
  let target = new URL("/", self.location.origin);
  try {
    const url = new URL(
      event.notification.data?.url || "/",
      self.location.origin,
    );
    if (url.origin === self.location.origin) target = url;
  } catch {
    // keep the home page
  }
  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const open =
        windows.find((client) => client.url === target.href) ?? windows[0];
      if (open) {
        await open.focus();
        if (open.url !== target.href && "navigate" in open)
          await open.navigate(target.href).catch(() => {});
        return;
      }
      await clients.openWindow(target.href);
    })(),
  );
});
