// Pure functions only: no env import, so unit tests run without a .env.

export interface MessageEmailInput {
  recipientName: string | null;
  senderName: string | null;
  listingTitle: string | null;
  link: string;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const html = (value: string) => value.replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]!));

// Names and titles are user-written; keep them on one short line in the subject.
const oneLine = (value: string, max: number) => {
  const clean = value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

// The message body is deliberately left out: it stays in Hootus, not in
// inboxes and email-provider logs.
export function messageEmail(input: MessageEmailInput): EmailContent {
  const sender = oneLine(input.senderName || 'A Hootus member', 60);
  const title = input.listingTitle ? oneLine(input.listingTitle, 80) : null;
  const greeting = input.recipientName ? `Hi ${oneLine(input.recipientName, 60)},` : 'Hi,';
  const about = title ? ` about "${title}"` : '';
  const subject = `${sender} sent you a message${about}`;
  const text = [
    greeting,
    '',
    `${sender} sent you a message on Hootus${about}.`,
    `Open Hootus to read and reply: ${input.link}`,
    '',
    "You'll get one email per conversation until you open it.",
  ].join('\n');
  const htmlBody = `<p>${html(greeting)}</p>
<p><strong>${html(sender)}</strong> sent you a message on Hootus${title ? ` about <strong>${html(title)}</strong>` : ''}.</p>
<p><a href="${html(input.link)}">Open Hootus to read and reply</a></p>
<p style="color:#666;font-size:12px">You'll get one email per conversation until you open it.</p>`;
  return { subject, text, html: htmlBody };
}
