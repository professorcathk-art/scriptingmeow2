import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import mammoth from "mammoth";

const BUCKET = "post-references";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const mod = await import("pdf-parse");
    const pdfParse = mod.default ?? mod;
    const data = await pdfParse(buffer);
    return (data as { text?: string })?.text ?? "";
  } catch (err) {
    console.warn("[upload/references] PDF extract failed:", err);
    return "";
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  } catch (err) {
    console.warn("[upload/references] DOCX extract failed:", err);
    return "";
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const files = formData.getAll("files") as File[];
  if (!files?.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const imageUrls: string[] = [];
  const textParts: string[] = [];
  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : null;

  if (!adminClient) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 500 }
    );
  }

  for (const file of files) {
    if (!(file instanceof File)) continue;

    const mime = file.type || "";
    if (!ALLOWED_TYPES.includes(mime)) {
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      continue;
    }

    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/${randomUUID()}.${ext}`;

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: mime,
        upsert: true,
      });

    if (uploadError) {
      console.warn("[upload/references] Upload failed:", uploadError.message);
      continue;
    }

    const { data: urlData } = adminClient.storage
      .from(BUCKET)
      .getPublicUrl(uploadData.path);
    const url = urlData.publicUrl;

    if (ALLOWED_IMAGE_TYPES.includes(mime)) {
      imageUrls.push(url);
    } else if (ALLOWED_DOC_TYPES.includes(mime)) {
      let text = "";
      if (mime === "application/pdf") {
        text = await extractPdfText(buffer);
      } else if (
        mime === "application/msword" ||
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        text = await extractDocxText(buffer);
      }
      if (text.trim()) {
        textParts.push(text.trim().slice(0, 15000));
      }
    }
  }

  const textContent = textParts.join("\n\n---\n\n").slice(0, 20000);

  return NextResponse.json({
    imageUrls,
    textContent,
  });
}
