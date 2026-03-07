import { PublicPageLayout } from "@/components/landing/public-page-layout";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <PublicPageLayout>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 text-sm mb-12">
          Last updated: February 2026
        </p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-zinc-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">1. Information We Collect</h2>
            <p>
              We collect information you provide when signing up (email, password), creating Brand Spaces (name,
              brand type, reference images), and using the Service (content ideas, generated posts). We also
              collect usage data to improve the product.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">2. How We Use Your Information</h2>
            <p>We use your data to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide and improve the Service</li>
              <li>Process AI generation requests</li>
              <li>Send account and billing notifications</li>
              <li>Respond to support requests</li>
              <li>Analyze usage patterns (aggregated and anonymized)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">3. Data Sharing</h2>
            <p>
              We do not sell your personal data. We share data with service providers (e.g., hosting, AI APIs,
              payment processors) necessary to operate the Service. We may disclose data if required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">4. Data Retention</h2>
            <p>
              We retain your account data and generated content while your account is active. You may request
              deletion of your account and associated data by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">5. Security</h2>
            <p>
              We use industry-standard measures to protect your data. Passwords are hashed; communications use
              HTTPS. You are responsible for keeping your credentials secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">6. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We may use analytics cookies
              to understand how the Service is used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">7. Your Rights</h2>
            <p>
              Depending on your location, you may have rights to access, correct, or delete your data. Contact
              us at{" "}
              <Link href="/support" className="text-violet-400 hover:text-violet-300">
                Support
              </Link>{" "}
              to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">8. Changes</h2>
            <p>
              We may update this policy from time to time. We will notify you of material changes via email or
              a notice in the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">9. Contact</h2>
            <p>
              For privacy questions, contact us at{" "}
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
