// Pure functions only: no env import, so unit tests run without a .env.

// The backend POSTs to whatever endpoint a browser registered, so only accept
// the browser vendors' push services. Anything else could make the server send
// requests to internal or arbitrary hosts (SSRF).
const pushHosts = [
  /^fcm\.googleapis\.com$/, // Chrome, Opera, Samsung Internet
  /^updates\.push\.services\.mozilla\.com$/, // Firefox
  /^[a-z0-9-]+\.notify\.windows\.com$/, // Edge on Windows
  /^web\.push\.apple\.com$/, // Safari and iOS home-screen apps
];

export function isAllowedPushEndpoint(value: string) {
  if (value.length > 2048 || !URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:' && url.port === '' && !url.username && !url.password
    && pushHosts.some(host => host.test(url.hostname));
}

export interface MessagePushInput {
  senderName: string | null;
  listingTitle: string | null;
  conversationId: string | null;
  link: string;
}

const oneLine = (value: string, max: number) => {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

// Shown on the lock screen and desktop: no message body, like the email.
// tag groups notifications per conversation, so a newer one replaces the older.
export function messagePush(input: MessagePushInput) {
  const sender = oneLine(input.senderName || 'A Hootus member', 60);
  const title = input.listingTitle ? oneLine(input.listingTitle, 80) : null;
  return JSON.stringify({
    title: `${sender} sent you a message`,
    body: title ? `About "${title}" on Hootus` : 'Open Hootus to read and reply',
    url: input.link,
    tag: input.conversationId ? `conversation:${input.conversationId}` : 'hootus-message',
  });
}
