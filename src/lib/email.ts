import { Resend } from "resend";

// Lazily initialized so importing this module never requires RESEND_API_KEY
// (e.g. during `next build`)
let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const fromEmail = () => process.env.RESEND_FROM_EMAIL!;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Limit-related notification emails removed — unlimited books are available to all users.

export async function sendPaymentFailedEmail(
  userEmail: string,
  userName: string,
) {
  await getResend().emails.send({
    from: fromEmail(),
    to: userEmail,
    subject: "Payment failed for your Premium subscription",
    html: `
      <h2>Hi ${escapeHtml(userName)},</h2>
      <p>We couldn't process your payment for your Premium subscription.</p>
      <p>Please update your payment method to continue enjoying unlimited books.</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/subscription">Update Payment Method</a>
    `,
  });
}

export async function sendSubscriptionCanceledEmail(
  userEmail: string,
  userName: string,
  periodEnd: Date,
) {
  await getResend().emails.send({
    from: fromEmail(),
    to: userEmail,
    subject: "Your Premium subscription has been canceled",
    html: `
      <h2>Hi ${escapeHtml(userName)},</h2>
      <p>Your Premium subscription has been canceled.</p>
      <p>You'll continue to have Premium access until ${periodEnd.toLocaleDateString()}.</p>
      <p>We'd love to have you back!</p>
    `,
  });
}

export async function sendUpcomingRenewalEmail(
  userEmail: string,
  userName: string,
  renewalDate: Date,
  amount: number,
) {
  await getResend().emails.send({
    from: fromEmail(),
    to: userEmail,
    subject: "Your Premium subscription will renew soon",
    html: `
      <h2>Hi ${escapeHtml(userName)},</h2>
      <p>Your Premium subscription will renew on ${renewalDate.toLocaleDateString()}.</p>
      <p>Amount: €${(amount / 100).toFixed(2)}</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/subscription">Manage Subscription</a>
    `,
  });
}

export async function sendWelcomeToPremiumEmail(
  userEmail: string,
  userName: string,
) {
  await getResend().emails.send({
    from: fromEmail(),
    to: userEmail,
    subject: "Welcome to Echo Premium!",
    html: `
      <h2>Welcome to Premium, ${escapeHtml(userName)}!</h2>
      <p>Thank you for upgrading! You now have unlimited book tracking.</p>
      <p>Start adding books to your library and enjoy all Premium features!</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/library">Go to Library</a>
    `,
  });
}

const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

export async function sendSupportTicketNotification(ticket: {
  id: string;
  name: string;
  email: string;
  message: string;
}) {
  const to = process.env.SUPPORT_EMAIL;
  if (!to) throw new Error("SUPPORT_EMAIL is not set");

  await getResend().emails.send({
    from: fromEmail(),
    to,
    replyTo: ticket.email,
    subject: `Support request from ${oneLine(ticket.name)}`,
    html: `
      <p><strong>${escapeHtml(ticket.name)}</strong> &lt;${escapeHtml(ticket.email)}&gt;</p>
      <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(ticket.message)}</pre>
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/support/${ticket.id}">Open in admin</a></p>
    `,
  });
}

export async function sendSupportAcknowledgement(ticket: {
  name: string;
  email: string;
  message: string;
}) {
  await getResend().emails.send({
    from: fromEmail(),
    to: ticket.email,
    replyTo: process.env.SUPPORT_EMAIL,
    subject: "We got your message",
    html: `
      <h2>Hi ${escapeHtml(ticket.name)},</h2>
      <p>Thanks for contacting Echo. We received your message and will reply to this address.</p>
      <p>Your message:</p>
      <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(ticket.message)}</pre>
    `,
  });
}
