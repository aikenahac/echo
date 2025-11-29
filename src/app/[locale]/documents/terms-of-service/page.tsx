import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Echo Reads",
};

export default function TermsOfServicePage() {
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
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-lg text-muted-foreground">
            Last Updated: November 29, 2025
          </p>
        </div>

        <div className="border-t pt-8" />

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">1. Acceptance of Terms</h2>
          <p className="text-base leading-relaxed">
            Welcome to Echo Reads, operated by{" "}
            <strong>Aerio, Aiken Tine Ahac s.p.</strong> (Štihova ulica 13, 1000
            Ljubljana, Slovenia). By accessing or using our service, you agree to
            be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to
            these Terms, please do not use our service.
          </p>
          <p className="text-base leading-relaxed">
            We reserve the right to modify these Terms at any time. We will
            notify you of material changes by posting the updated Terms on our
            website and updating the &ldquo;Last Updated&rdquo; date. Your continued use of
            the service after such changes constitutes acceptance of the new
            Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">2. Description of Service</h2>
          <p className="text-base leading-relaxed">
            Echo Reads is a book tracking and social reading platform that allows
            users to:
          </p>
          <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
            <li>Track their reading progress and organize their book library</li>
            <li>Rate and review books</li>
            <li>Follow other users and view their reading activity</li>
            <li>Search for books using our database and the Open Library API</li>
            <li>Maintain a personal reading profile</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            We reserve the right to modify, suspend, or discontinue any aspect of
            the service at any time, with or without notice.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">3. User Accounts</h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">3.1 Account Creation</h3>
            <p className="text-base leading-relaxed">
              To use certain features of our service, you must create an account.
              You agree to:
            </p>
            <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>
                Accept responsibility for all activities under your account
              </li>
              <li>
                Notify us immediately of any unauthorized use of your account
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">3.2 Account Eligibility</h3>
            <p className="text-base leading-relaxed">
              You must be at least 13 years old to create an account. Users under
              18 should have parental or guardian consent to use our service.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">3.3 Account Termination</h3>
            <p className="text-base leading-relaxed">
              You may delete your account at any time through your account
              settings. We reserve the right to suspend or terminate accounts that
              violate these Terms or for any other reason at our sole discretion.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">4. User Content</h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">4.1 Your Content</h3>
            <p className="text-base leading-relaxed">
              Our service allows you to post, upload, and share content, including
              reviews, ratings, comments, and profile information (&ldquo;User Content&rdquo;).
              You retain ownership of your User Content.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">4.2 License to Your Content</h3>
            <p className="text-base leading-relaxed">
              By posting User Content, you grant us a worldwide, non-exclusive,
              royalty-free license to use, reproduce, modify, adapt, publish, and
              display your User Content for the purpose of operating and improving
              our service.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">4.3 Content Standards</h3>
            <p className="text-base leading-relaxed">You agree that your User Content will not:</p>
            <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Contain hate speech, harassment, or threats</li>
              <li>Include spam, advertising, or promotional content</li>
              <li>Contain malicious code or viruses</li>
              <li>Impersonate any person or entity</li>
              <li>Be obscene, pornographic, or sexually explicit</li>
              <li>Violate the privacy of others</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">4.4 Content Moderation</h3>
            <p className="text-base leading-relaxed">
              We reserve the right to review, moderate, edit, or remove any User
              Content at our discretion, but we are not obligated to do so. We do
              not endorse any User Content and are not responsible for its
              accuracy, quality, or legality.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">5. Acceptable Use</h2>
          <p className="text-base leading-relaxed">You agree not to:</p>
          <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
            <li>Use the service for any illegal or unauthorized purpose</li>
            <li>Attempt to gain unauthorized access to our systems or other users&apos; accounts</li>
            <li>Interfere with or disrupt the service or servers</li>
            <li>Use automated systems (bots, scrapers) without our permission</li>
            <li>Collect or harvest user information without consent</li>
            <li>Create multiple accounts to manipulate the service</li>
            <li>Reverse engineer or attempt to extract source code</li>
            <li>Transmit viruses, malware, or harmful code</li>
          </ul>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">6. Intellectual Property</h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">6.1 Our Content</h3>
            <p className="text-base leading-relaxed">
              The service, including its design, features, graphics, and software,
              is owned by us and protected by copyright, trademark, and other
              intellectual property laws. You may not copy, modify, distribute, or
              create derivative works without our permission.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">6.2 Third-Party Content</h3>
            <p className="text-base leading-relaxed">
              Book information and cover images are sourced from third-party
              services including Open Library. We do not claim ownership of this
              content. Such content is subject to the terms and licenses of the
              respective providers.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">6.3 Trademarks</h3>
            <p className="text-base leading-relaxed">
              &ldquo;Echo Reads&rdquo; and associated logos are our trademarks. You may not use
              our trademarks without our prior written consent.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">7. Third-Party Services</h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">7.1 Authentication (Clerk)</h3>
            <p className="text-base leading-relaxed">
              We use Clerk for user authentication. Your use of authentication
              services is subject to{" "}
              <a
                href="https://clerk.com/legal/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Clerk&apos;s Terms of Service
              </a>
              .
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">7.2 Book Data (Open Library)</h3>
            <p className="text-base leading-relaxed">
              Book search and information features use the Open Library API. Your
              use of this data is subject to{" "}
              <a
                href="https://openlibrary.org/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Open Library&apos;s Terms of Service
              </a>
              .
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">7.3 Third-Party Links</h3>
            <p className="text-base leading-relaxed">
              Our service may contain links to third-party websites. We are not
              responsible for the content, privacy practices, or terms of service
              of external sites.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">8. Privacy</h2>
          <p className="text-base leading-relaxed">
            Your use of our service is also governed by our{" "}
            <Link href="/documents/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>. Please
            review our Privacy Policy to understand how we collect, use, and
            protect your information.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">9. Disclaimers</h2>

          <div className="rounded-lg border-l-4 border-yellow-500 bg-yellow-500/5 p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">9.1 No Warranty</h3>
              <p className="text-sm leading-relaxed uppercase">
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES
                OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
                NON-INFRINGEMENT.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">9.2 Service Availability</h3>
              <p className="text-sm leading-relaxed">
                We do not guarantee that the service will be uninterrupted, secure,
                or error-free. We may suspend or terminate the service for
                maintenance, updates, or other reasons without notice.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">9.3 Content Accuracy</h3>
              <p className="text-sm leading-relaxed">
                We do not guarantee the accuracy, completeness, or reliability of any
                content on our service, including book information, user reviews, or
                user-generated content.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">10. Limitation of Liability</h2>
          <div className="rounded-lg border-l-4 border-red-500 bg-red-500/5 p-4 space-y-3">
            <p className="text-sm leading-relaxed uppercase">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
              DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED
              DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER
              INTANGIBLE LOSSES.
            </p>
            <p className="text-sm leading-relaxed uppercase">
              OUR TOTAL LIABILITY FOR ALL CLAIMS RELATED TO THE SERVICE SHALL NOT
              EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRIOR TO
              THE CLAIM, OR ONE HUNDRED EUROS (€100), WHICHEVER IS GREATER.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">11. Indemnification</h2>
          <p className="text-base leading-relaxed">
            You agree to indemnify, defend, and hold harmless Echo Reads, its
            officers, directors, employees, and agents from any claims, damages,
            losses, liabilities, and expenses (including attorney fees) arising
            from:
          </p>
          <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
            <li>Your use of the service</li>
            <li>Your User Content</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another party</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">12. DMCA Copyright Policy</h2>
          <p className="text-base leading-relaxed">
            We respect intellectual property rights. If you believe that content
            on our service infringes your copyright, please contact us at{" "}
            <a href="mailto:me@aiken.si" className="text-primary hover:underline">me@aiken.si</a> with:
          </p>
          <ul className="space-y-2 list-disc list-inside text-base leading-relaxed ml-4">
            <li>Identification of the copyrighted work claimed to be infringed</li>
            <li>Identification of the infringing material and its location</li>
            <li>Your contact information</li>
            <li>A statement of good faith belief that the use is not authorized</li>
            <li>A statement that the information is accurate</li>
            <li>Your physical or electronic signature</li>
          </ul>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">13. Governing Law and Dispute Resolution</h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">13.1 Governing Law</h3>
            <p className="text-base leading-relaxed">
              These Terms shall be governed by and construed in accordance with the
              laws of Slovenia, without regard to its conflict of law provisions.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">13.2 Dispute Resolution</h3>
            <p className="text-base leading-relaxed">
              Any disputes arising from these Terms or your use of the service
              shall be resolved through good faith negotiations. If negotiations
              fail, disputes shall be submitted to the competent courts of
              Ljubljana, Slovenia.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">13.3 EU Users</h3>
            <p className="text-base leading-relaxed">
              If you are a consumer in the European Union, you may also bring a
              claim in the courts of your country of residence.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">14. General Provisions</h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">14.1 Entire Agreement</h3>
            <p className="text-base leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the entire
              agreement between you and Echo Reads regarding the service.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">14.2 Severability</h3>
            <p className="text-base leading-relaxed">
              If any provision of these Terms is found to be invalid or
              unenforceable, the remaining provisions shall remain in full force
              and effect.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">14.3 Waiver</h3>
            <p className="text-base leading-relaxed">
              Our failure to enforce any right or provision of these Terms shall
              not constitute a waiver of such right or provision.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">14.4 Assignment</h3>
            <p className="text-base leading-relaxed">
              You may not assign or transfer these Terms without our prior written
              consent. We may assign these Terms at any time without notice.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">14.5 No Agency</h3>
            <p className="text-base leading-relaxed">
              These Terms do not create any agency, partnership, joint venture, or
              employment relationship between you and Echo Reads.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">15. Contact Information</h2>
          <p className="text-base leading-relaxed">
            If you have questions about these Terms, please contact us at:
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
          <h2 className="text-3xl font-semibold tracking-tight">16. Changes to Service</h2>
          <p className="text-base leading-relaxed">
            We reserve the right to modify, suspend, or discontinue any part of
            the service at any time. We may also impose limits on certain
            features or restrict access to parts of the service without notice or
            liability.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">17. Survival</h2>
          <p className="text-base leading-relaxed">
            Upon termination of these Terms or your account, the following
            sections shall survive: User Content (license), Intellectual
            Property, Disclaimers, Limitation of Liability, Indemnification,
            Governing Law, and General Provisions.
          </p>
        </section>
      </div>
    </div>
  );
}
