import { PublicPageLayout } from "@/components/landing/public-page-layout";
import { SupportForm } from "@/components/support/support-form";

export default function SupportPage() {
  return (
    <PublicPageLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Support</h1>
        <p className="text-zinc-400 mb-8">
          Have a question or need help? Send us a message and we&apos;ll get back to you as soon as possible.
        </p>
        <SupportForm />
      </div>
    </PublicPageLayout>
  );
}
