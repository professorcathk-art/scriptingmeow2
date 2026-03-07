import { Resend } from "resend";
import { NextResponse } from "next/server";

const SUPPORT_EMAIL = "professor.cat.hk@gmail.com";

/**
 * POST /api/support
 * Sends support message via Resend. Requires RESEND_API_KEY in Vercel env.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const message = (body.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (!apiKey) {
      console.error("[support] RESEND_API_KEY not configured");
      return NextResponse.json(
        { error: "Support email not configured" },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `Support: ${name}`,
      html: `
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <p><strong>Message:</strong></p>
        <pre style="white-space: pre-wrap; font-family: sans-serif;">${message.replace(/</g, "&lt;")}</pre>
      `,
    });

    if (error) {
      console.error("[support] Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[support] Error:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
