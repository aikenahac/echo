import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Echo Reads collects, uses, and protects your personal information",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <Button asChild variant="ghost" className="mb-8">
        <Link href="/documents">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Link>
      </Button>

      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground">
            Last Updated: November 29, 2025
          </p>
        </div>

        <div className="border-t pt-8" />

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">Introduction</h2>
          <p className="text-base leading-relaxed">
            Welcome to Echo Reads (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). We are committed to
            protecting your privacy and ensuring you have a positive experience
            on our platform. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our book
            tracking and social reading application.
          </p>
          <p className="text-base leading-relaxed">
            Echo Reads is operated by <strong>Aerio, Aiken Tine Ahac s.p.</strong>,
            a sole proprietorship registered in Slovenia.
          </p>
          <div className="rounded-lg border bg-muted/50 p-6 space-y-2">
            <p className="text-sm font-medium">Legal Entity Information</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Legal Entity:</strong> Aerio, Aiken Tine Ahac s.p.</p>
              <p><strong>Address:</strong> Štihova ulica 13, 1000 Ljubljana, Slovenia</p>
              <p>
                <strong>Contact:</strong>{" "}
                <a href="mailto:me@aiken.si" className="text-primary hover:underline">
                  me@aiken.si
                </a>
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">Information We Collect</h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Information You Provide to Us</h3>
            <ul className="space-y-3 list-disc list-inside text-base leading-relaxed">
              <li>
                <strong>Account Information:</strong> When you create an account,
                we collect your email address and username.
              </li>
              <li>
                <strong>Profile Information:</strong> Optional biographical
                information and profile customization data.
              </li>
              <li>
                <strong>Reading Data:</strong> Information about books you add to
                your library, reading status, progress, ratings, and reviews.
              </li>
              <li>
                <strong>User-Generated Content:</strong> Reviews, comments, and
                other content you create on our platform.
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Automatically Collected Information</h3>
            <p className="text-base leading-relaxed">
              <strong>Usage Data:</strong> We collect anonymous analytics data
              through our self-hosted Plausible Analytics instance (hosted in the
              EU). This includes:
            </p>
            <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
              <li>Pages you visit</li>
              <li>Time spent on pages</li>
              <li>Referral sources</li>
              <li>Device type and browser information</li>
              <li>Geographic location (country level only)</li>
            </ul>
            <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
              <p className="text-sm leading-relaxed">
                <strong>Important:</strong> Our Plausible instance does not use
                cookies, does not track you across websites, and does not collect any
                personally identifiable information. Learn more at{" "}
                <a
                  href="https://plausible.io/data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Plausible&apos;s Data Policy
                </a>
                .
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Third-Party Authentication (Clerk)</h3>
            <p className="text-base leading-relaxed">
              We use Clerk for authentication and user management. Clerk collects
              and processes certain information independently:
            </p>
            <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
              <li>Email addresses</li>
              <li>Authentication credentials</li>
              <li>Session data</li>
              <li>Device and browser information</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              For details on how Clerk handles your data, please review{" "}
              <a
                href="https://clerk.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Clerk&apos;s Privacy Policy
              </a>
              .
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">How We Use Your Information</h2>
          <p className="text-base leading-relaxed">We use your information to:</p>
          <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
            <li>Provide, maintain, and improve our services</li>
            <li>Create and manage your account</li>
            <li>Track your reading progress and preferences</li>
            <li>
              Enable social features (following users, viewing public reading
              activity)
            </li>
            <li>Communicate with you about your account and service updates</li>
            <li>
              Analyze usage patterns to improve user experience (via anonymous
              analytics)
            </li>
            <li>Prevent fraud and ensure platform security</li>
          </ul>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">Data Sharing and Disclosure</h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Public Information</h3>
            <p className="text-base leading-relaxed">The following information is publicly visible to other users:</p>
            <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
              <li>Your username</li>
              <li>Public reviews and ratings</li>
              <li>
                Public reading activity (books marked as reading or finished, if you
                choose to share)
              </li>
              <li>Profile information you&apos;ve made public</li>
            </ul>
          </div>

          <div className="rounded-lg border-l-4 border-green-500 bg-green-500/5 p-4">
            <h3 className="text-lg font-semibold mb-2">We Do Not Sell Your Data</h3>
            <p className="text-sm leading-relaxed">
              We will never sell, rent, or trade your personal information to third
              parties for marketing purposes.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Service Providers</h3>
            <p className="text-base leading-relaxed">
              We share data with trusted service providers who assist us in
              operating our platform:
            </p>
            <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
              <li>
                <strong>Clerk:</strong> Authentication and user management
              </li>
              <li>
                <strong>Hosting Provider:</strong> Application and database hosting
              </li>
              <li>
                <strong>Plausible Analytics:</strong> Self-hosted, privacy-focused
                analytics (EU-based)
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Legal Requirements</h3>
            <p className="text-base leading-relaxed">
              We may disclose your information if required to do so by law or in
              response to valid requests by public authorities.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">Data Storage and Security</h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Data Location</h3>
            <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
              <li>
                <strong>Application Data:</strong> Stored in secure databases with
                encryption at rest
              </li>
              <li>
                <strong>Analytics Data:</strong> Stored on our self-hosted Plausible
                instance in the European Union
              </li>
              <li>
                <strong>Authentication Data:</strong> Managed by Clerk (see their
                privacy policy for details)
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Security Measures</h3>
            <p className="text-base leading-relaxed">We implement industry-standard security measures including:</p>
            <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Encryption of data at rest</li>
              <li>Regular security updates and patches</li>
              <li>Access controls and authentication</li>
              <li>Regular backups</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              However, no method of transmission over the internet is 100% secure,
              and we cannot guarantee absolute security.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">Your Rights and Choices</h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Access and Control</h3>
            <p className="text-base leading-relaxed">You have the right to:</p>
            <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
              <li>Access your personal information</li>
              <li>Update or correct your information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
              <li>Opt out of optional features</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Data Retention</h3>
            <p className="text-base leading-relaxed">
              We retain your data for as long as your account is active or as
              needed to provide services. You may request deletion of your account
              at any time through your account settings or by contacting us.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Cookie Policy</h3>
            <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
              <li>
                <strong>First-Party Cookies:</strong> We use essential cookies for
                authentication and session management
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Our Plausible Analytics does
                not use cookies
              </li>
              <li>
                <strong>Third-Party Cookies:</strong> Clerk may use cookies for
                authentication (see their policy)
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">Children&apos;s Privacy</h2>
          <p className="text-base leading-relaxed">
            Our service is not directed to children under 13. We do not knowingly
            collect personal information from children under 13. If you believe
            we have collected information from a child under 13, please contact
            us immediately.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">International Users</h2>
          <p className="text-base leading-relaxed">
            If you are accessing our service from outside the European Union,
            please note that your information may be transferred to, stored, and
            processed in the EU or other countries where our service providers
            operate.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">Changes to This Privacy Policy</h2>
          <p className="text-base leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify
            you of any material changes by:
          </p>
          <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
            <li>Posting the new Privacy Policy on this page</li>
            <li>Updating the &ldquo;Last Updated&rdquo; date</li>
            <li>Sending you an email notification (for significant changes)</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            Your continued use of our service after changes become effective
            constitutes acceptance of the revised Privacy Policy.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">Contact Us</h2>
          <p className="text-base leading-relaxed">
            If you have questions or concerns about this Privacy Policy, please
            contact us at:
          </p>
          <div className="rounded-lg border bg-muted/50 p-6 space-y-1 text-sm">
            <p className="font-semibold">Aerio, Aiken Tine Ahac s.p.</p>
            <p>Štihova ulica 13</p>
            <p>1000 Ljubljana, Slovenia</p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:me@aiken.si" className="text-primary hover:underline">
                me@aiken.si
              </a>
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">Data Protection Rights (GDPR)</h2>
          <p className="text-base leading-relaxed">
            If you are a resident of the European Economic Area (EEA), you have
            certain data protection rights:
          </p>
          <ul className="space-y-3 list-disc list-inside text-base leading-relaxed ml-4">
            <li>
              <strong>Right to Access:</strong> Request copies of your personal
              data
            </li>
            <li>
              <strong>Right to Rectification:</strong> Request correction of
              inaccurate data
            </li>
            <li>
              <strong>Right to Erasure:</strong> Request deletion of your data
            </li>
            <li>
              <strong>Right to Restrict Processing:</strong> Request restriction
              of processing your data
            </li>
            <li>
              <strong>Right to Data Portability:</strong> Request transfer of your
              data
            </li>
            <li>
              <strong>Right to Object:</strong> Object to our processing of your
              data
            </li>
            <li>
              <strong>Rights Related to Automated Decision-Making:</strong> We do
              not use automated decision-making or profiling
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            To exercise these rights, please contact us at{" "}
            <a href="mailto:me@aiken.si" className="text-primary hover:underline">me@aiken.si</a>.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">Additional Information</h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Open Library API</h3>
            <p className="text-base leading-relaxed">
              We use the Open Library API to search for and retrieve book
              information. When you search for books, your search queries are sent
              to Open Library. Please review{" "}
              <a
                href="https://openlibrary.org/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Open Library&apos;s Terms of Service
              </a>{" "}
              for more information.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Third-Party Links</h3>
            <p className="text-base leading-relaxed">
              Our service may contain links to third-party websites. We are not
              responsible for the privacy practices of these external sites. We
              encourage you to read their privacy policies.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
