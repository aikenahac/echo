import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL!;

export async function sendLimitReachedEmail(
  userEmail: string,
  userName: string,
) {
  await resend.emails.send({
    from: fromEmail,
    to: userEmail,
    subject: "You've reached your book limit",
    html: `
      <h2>Hi ${userName},</h2>
      <p>You've added 50 books this year and reached your free tier limit.</p>
      <p>Upgrade to Premium for unlimited books at just €1.99/month!</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/subscription">Upgrade Now</a>
    `,
  });
}

export async function sendLimitWarningEmail(
  userEmail: string,
  userName: string,
  booksAdded: number,
) {
  await resend.emails.send({
    from: fromEmail,
    to: userEmail,
    subject: "Approaching your book limit",
    html: `
      <h2>Hi ${userName},</h2>
      <p>You've added ${booksAdded} of 50 books this year.</p>
      <p>Consider upgrading to Premium for unlimited books!</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/subscription">View Plans</a>
    `,
  });
}

export async function sendPaymentFailedEmail(
  userEmail: string,
  userName: string,
) {
  await resend.emails.send({
    from: fromEmail,
    to: userEmail,
    subject: "Payment failed for your Premium subscription",
    html: `
      <h2>Hi ${userName},</h2>
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
  await resend.emails.send({
    from: fromEmail,
    to: userEmail,
    subject: "Your Premium subscription has been canceled",
    html: `
      <h2>Hi ${userName},</h2>
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
  await resend.emails.send({
    from: fromEmail,
    to: userEmail,
    subject: "Your Premium subscription will renew soon",
    html: `
      <h2>Hi ${userName},</h2>
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
  await resend.emails.send({
    from: fromEmail,
    to: userEmail,
    subject: "Welcome to Echo Premium!",
    html: `
      <h2>Welcome to Premium, ${userName}!</h2>
      <p>Thank you for upgrading! You now have unlimited book tracking.</p>
      <p>Start adding books to your library and enjoy all Premium features!</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/library">Go to Library</a>
    `,
  });
}
