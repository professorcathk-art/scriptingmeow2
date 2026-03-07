import { NextResponse } from "next/server";

/**
 * POST /api/support
 * Sends support message via Resend. Configure RESEND_API_KEY and use Resend API.
 * For now, returns success - wire up Resend when ready.
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

    // TODO: Integrate Resend API to email professor.cat.hk@gmail.com
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ from: '...', to: 'professor.cat.hk@gmail.com', subject: `Support: ${name}`, html: `...` });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
