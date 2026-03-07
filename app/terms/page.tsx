import { PublicPageLayout } from "@/components/landing/public-page-layout";
import Link from "next/link";

export default function TermsPage() {
  return (
    <PublicPageLayout>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-zinc-500 text-sm mb-12">
          Last updated: February 2026
        </p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-zinc-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using designermeow (&quot;Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">2. Description of Service</h2>
            <p>
              designermeow is an AI-powered Instagram post generator. We provide tools to create Brand Spaces,
              generate brandbooks, and produce on-brand visual content. Features, pricing, and availability may change.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">3. Account and Registration</h2>
            <p>
              You must provide accurate information when creating an account. You are responsible for maintaining
              the security of your credentials and for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use the Service for illegal purposes or to violate any laws</li>
              <li>Generate content that infringes intellectual property, is defamatory, or harmful</li>
              <li>Attempt to reverse-engineer, scrape, or abuse the Service</li>
              <li>Share account access or resell the Service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">5. Intellectual Property</h2>
            <p>
              You retain ownership of your brand assets and generated content. By using the Service, you grant us
              a limited license to process your content for the purpose of providing the Service. Our platform,
              branding, and technology remain our property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">6. Payment and Refunds</h2>
            <p>
              Paid plans are billed monthly. Credits reset each billing cycle and do not roll over. Refunds are
              handled on a case-by-case basis. Contact support for billing inquiries.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">7. Termination</h2>
            <p>
              We may suspend or terminate your account for violation of these terms. You may cancel your account
              at any time. Upon termination, your right to use the Service ceases.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">8. Disclaimer</h2>
            <p>
              The Service is provided &quot;as is.&quot; We do not guarantee uninterrupted access or that generated
              content will meet your expectations. AI outputs may vary.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential
              damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">10. Contact</h2>
            <p>
              For questions about these terms, contact us at{" "}
              <Link href="/support" className="text-violet-400 hover:text-violet-300">
                Support
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </PublicPageLayout>
  );
}
