/**
 * Discover real image URLs for Important Assets: prioritize people in the story, then org/news context.
 * Google Programmable Search (optional) or Wikimedia Commons — never generic continent/demographic-only queries.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { MAX_CONTENT_IDEA_CHARS } from "@/lib/constants";

const WEB_IMAGE_TARGET = 5;
const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp|gif)$/i;
const WIKI_UA = "designermeow/1.0 (create-post web images)";

const LATIN_STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out",
  "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "way",
  "who", "did", "let", "put", "say", "she", "too", "use", "www", "com", "org", "txt", "amp",
  "story", "stories", "hook", "hooks", "slide", "slides", "post", "caption",
]);

/** Must never be the entire search query (avoids random “African entrepreneur” stock). */
const STANDALONE_BANNED_TOKENS = new Set([
  "africa",
  "african",
  "asia",
  "asian",
  "europe",
  "european",
  "america",
  "american",
  "latin",
  "middle",
  "east",
  "west",
  "global",
  "international",
  "diversity",
  "multicultural",
  "people",
  "crowd",
  "community",
  "world",
]);

const IMAGE_QUERY_NOISE = new Set([
  "story", "stories", "hook", "hooks", "slide", "slides", "carousel", "post", "posts", "caption",
  "instagram", "reel", "reels", "content", "brief", "template", "cta", "engagement", "viral",
]);

/** Single-word image search for these usually hits the wrong Wikipedia topic (airline, bank, etc.). */
const AMBIGUOUS_BRAND_SINGLETON = new Set([
  "swoop",
  "chase",
  "delta",
  "swift",
  "square",
  "meta",
  "slack",
  "notion",
  "bolt",
  "kind",
  "bloom",
]);

/** Commons file titles that indicate airline / jet photos (wrong “Swoop”, “Delta”, …). */
const AIRLINE_FILE_TITLE = /\b(boeing|airbus|737|747|757|767|777|787|a320|a330|westjet|airline|airlines|livery|takeoff|runway|yyc|yyz|lcc)\b/i;

/** Phrases that look like names but are usually false positives from briefs. */
const NAME_EXTRACTION_BLOCKLIST = new Set([
  "traditional chinese",
  "simplified chinese",
  "instagram",
  "source image",
  "story",
  "hook",
]);

export type ImageSearchPlan = {
  namedPeopleEnglish: string[];
  organizationOrProduct: string;
  disambiguationPhrase: string;
  eventOrNewsAngle: string;
  doNotUseAlone: string[];
};

function stripNoiseForSearch(s: string): string {
  return s
    .replace(/https?:\/\/[^\s]+/g, " ")
    .replace(/\[Source Image URL:[^\]]+\]/gi, " ")
    .replace(/Source:\s*[^\n]+/gi, " ")
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUnsuitableImageSearchQuery(q: string): boolean {
  const t = q.trim();
  if (t.length < 2 || t.length > 120) return true;
  const nonSpace = t.replace(/\s/g, "");
  if (!nonSpace.length) return true;
  let cjk = 0;
  for (const ch of nonSpace) {
    if (/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(ch)) cjk++;
  }
  if (cjk > 0 && cjk / nonSpace.length > 0.08) return true;
  const wordish = t.split(/\s+/).filter(Boolean);
  if (wordish.length > 16) return true;
  return false;
}

function queryLooksLikeEchoOfBrief(query: string, brief: string): boolean {
  const q = query.trim();
  const b = brief.trim();
  if (q.length < 24 || b.length < 24) return false;
  if (q.length > 180) return true;
  const head = q.slice(0, Math.min(48, q.length));
  return b.includes(head);
}

function latinKeywordsFromBrief(brief: string): string {
  const cleaned = stripNoiseForSearch(brief).slice(0, 800);
  const matches = cleaned.match(/[A-Za-z][A-Za-z0-9.-]{1,}/g) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of matches) {
    const low = w.toLowerCase();
    if (w.length < 2 || LATIN_STOPWORDS.has(low)) continue;
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(w);
    if (out.length >= 12) break;
  }
  return out.join(" ").trim();
}

function fallbackKeywordsFromBrief(brief: string): string {
  const latin = latinKeywordsFromBrief(brief);
  if (latin.length >= 3) return latin.slice(0, 96);
  const t = stripNoiseForSearch(brief).slice(0, 200);
  const words = t.split(/\s+/).filter((w) => w.length > 1).slice(0, 12);
  return words.join(" ").trim().slice(0, 96) || "photography";
}

/** Extra English tokens when expanding an ambiguous one-word brand (funding amount, etc.). */
function extraContextTailFromBrief(brief: string): string {
  const s = stripNoiseForSearch(brief).slice(0, 600);
  const funding = s.match(/\$\s*[\d,.]+\s*[MmBb]\b|[\d,.]+\s*[MmBb](?:illion)?\b/i);
  if (funding) {
    return normalizeWhitespace(`${funding[0]} startup funding news`).slice(0, 80);
  }
  return "startup founder funding news";
}

function expandAmbiguousBrandQuery(q: string, brief: string): string {
  const w = q.split(/\s+/).filter(Boolean);
  if (w.length !== 1) return q;
  const one = (w[0] ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!AMBIGUOUS_BRAND_SINGLETON.has(one)) return q;
  const trimmed = brief.trim().slice(0, MAX_CONTENT_IDEA_CHARS);
  const extra = latinKeywordsFromBrief(trimmed)
    .split(/\s+/)
    .filter((tok) => {
      const low = tok.replace(/[^a-z0-9]/gi, "").toLowerCase();
      return low.length > 1 && low !== one && !LATIN_STOPWORDS.has(low);
    })
    .slice(0, 6)
    .join(" ")
    .trim();
  const tail = extra || extraContextTailFromBrief(trimmed);
  return normalizeWhitespace(`${q} ${tail}`).slice(0, 110);
}

function normalizeWhitespace(q: string): string {
  return stripNoiseForSearch(q).replace(/\s+/g, " ").trim();
}

function normalizeForIdentityMatch(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Likely "Firstname Lastname" (or three tokens) from Latin letters in the brief — no model required.
 */
export function extractLikelyPersonNamesFromBrief(brief: string): string[] {
  const cleaned = stripNoiseForSearch(brief).slice(0, 3500);
  const seen = new Set<string>();
  const out: string[] = [];
  const pushPhrase = (phrase: string) => {
    const p = phrase.trim();
    const low = p.toLowerCase();
    if (NAME_EXTRACTION_BLOCKLIST.has(low)) return;
    if (seen.has(low)) return;
    seen.add(low);
    out.push(p);
  };

  const patterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g, // Title Case
    /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,2})\b/g, // ALL CAPS / mixed (e.g. McDonald)
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(cleaned)) !== null) {
      pushPhrase(m[1]!);
      if (out.length >= 8) return out;
    }
  }
  return out;
}

/** Keep only names that actually appear in the brief (stops model hallucinations like wrong surnames). */
function filterNamesGroundedInBrief(names: string[], brief: string): string[] {
  const b = normalizeForIdentityMatch(brief);
  return names.filter((n) => {
    const nl = normalizeForIdentityMatch(n);
    const parts = n.trim().split(/\s+/).filter((p) => p.length > 1);
    if (parts.length >= 2) {
      if (b.includes(nl)) return true;
      return parts.every((p) => b.includes(normalizeForIdentityMatch(p)));
    }
    // Single-token "names" are not reliable (e.g. given name only); require multi-word after expansion.
    return false;
  });
}

/**
 * Single-token "names" often match only a first name substring in the brief and produce useless one-word image searches.
 * Drop them unless the brief truly has no multi-word Latin name to pair with.
 */
function dropLoneGivenNamesWhenBriefHasFullName(names: string[], brief: string): string[] {
  const hasMulti = names.some((n) => n.trim().split(/\s+/).filter(Boolean).length >= 2);
  const briefHasLikelyFullName = /\b[a-zA-Z]+\s+[a-zA-Z]{2,}\b/.test(stripNoiseForSearch(brief));
  if (!hasMulti && !briefHasLikelyFullName) return names;
  return names.filter((n) => n.trim().split(/\s+/).filter(Boolean).length >= 2);
}

function dedupeNamesCaseInsensitive(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const k = n.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(n.trim());
  }
  return out;
}

function splitFirstLast(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: "", last: parts[0] ?? "" };
  const last = parts[parts.length - 1] ?? "";
  const first = parts.slice(0, -1).join(" ");
  return { first, last };
}

/**
 * For image metadata: require surname; require first name too when it is long enough to be distinctive.
 */
function haystackMatchesPerson(haystack: string, fullName: string): boolean {
  const { first, last } = splitFirstLast(fullName);
  const h = normalizeForIdentityMatch(haystack);
  const lastN = normalizeForIdentityMatch(last);
  if (lastN.length < 2) return true;
  if (!h.includes(lastN)) return false;
  const firstN = normalizeForIdentityMatch(first);
  if (firstN.length >= 4) {
    return h.includes(firstN);
  }
  if (firstN.length >= 2) {
    return h.includes(firstN);
  }
  return true;
}

function queryMentionsAnyCanonicalPerson(q: string, canonicalPeople: string[]): boolean {
  const ql = normalizeForIdentityMatch(q);
  return canonicalPeople.some((p) => ql.includes(normalizeForIdentityMatch(p)));
}

/** One-word search when we know the subject is "First Last" → random wrong portraits (e.g. "Aubrey" alone). */
function isSingleTokenGivenNameOnlyQuery(q: string, canonicalPeople: string[]): boolean {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  if (tokens.length !== 1) return false;
  const qt = normalizeForIdentityMatch(tokens[0]!);
  return canonicalPeople.some((p) => {
    const pts = p.trim().split(/\s+/).filter(Boolean);
    if (pts.length < 2) return false;
    return normalizeForIdentityMatch(pts[0] ?? "") === qt && qt.length >= 3;
  });
}

/** If the model (or grounding) left a lone given name, pull "Given Surname" from the brief when obvious. */
function expandSingleGivenNameToFullFromBrief(given: string, brief: string): string {
  const g = given.trim();
  if (!g || g.includes(" ")) return given;
  const b = stripNoiseForSearch(brief);
  const esc = g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${esc}\\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.-]{0,48})`, "iu");
  const m = b.match(re);
  if (!m?.[1]) return given;
  let next = m[1].replace(/[.,;:)\]]+$/, "");
  if (next.length < 2) return given;
  const badFollow = new Set([
    "the", "and", "for", "was", "has", "said", "says", "told", "from", "with", "that", "this", "startup",
    "company", "founder", "ceo", "cfo", "raised", "seed", "series", "million", "funding", "launch",
  ]);
  if (badFollow.has(next.toLowerCase())) return given;
  return `${g} ${next}`;
}

/** Merge regex-extracted names (ground truth from brief) before model output; drop ungrounded model names. */
function reconcileCanonicalPeople(plan: ImageSearchPlan | null, brief: string): string[] {
  const extracted = extractLikelyPersonNamesFromBrief(brief);
  const groundedExtracted = filterNamesGroundedInBrief(extracted, brief);
  const modelExpanded = (plan?.namedPeopleEnglish ?? []).map((n) => expandSingleGivenNameToFullFromBrief(n, brief));
  const groundedModel = filterNamesGroundedInBrief(modelExpanded, brief);
  const merged = dedupeNamesCaseInsensitive([...groundedExtracted, ...groundedModel]).map((n) =>
    expandSingleGivenNameToFullFromBrief(n, brief)
  );
  return dropLoneGivenNamesWhenBriefHasFullName(dedupeNamesCaseInsensitive(merged), brief).slice(0, 4);
}

function stripWeakImageQueryTokens(q: string): string {
  const parts = q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => !IMAGE_QUERY_NOISE.has(w.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase()));
  const out = parts.join(" ").trim();
  return out.length >= 3 ? out : q.trim();
}

/** Single-token or “vague region + generic noun” patterns — drop as useless. */
function isStandaloneBannedQuery(q: string): boolean {
  const t = normalizeWhitespace(q).toLowerCase();
  if (!t) return true;
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    const w = tokens[0]!.replace(/[^a-z0-9]/g, "");
    if (STANDALONE_BANNED_TOKENS.has(w)) return true;
  }
  if (tokens.length === 2) {
    const [a, b] = tokens;
    const a0 = a!.replace(/[^a-z0-9]/g, "");
    const b0 = b!.replace(/[^a-z0-9]/g, "");
    const genericSecond = new Set([
      "people",
      "person",
      "man",
      "woman",
      "men",
      "women",
      "entrepreneur",
      "business",
      "businessman",
      "businesswoman",
      "student",
      "kids",
      "children",
      "culture",
      "traditional",
    ]);
    if (STANDALONE_BANNED_TOKENS.has(a0) && genericSecond.has(b0)) return true;
    if (STANDALONE_BANNED_TOKENS.has(b0) && genericSecond.has(a0)) return true;
  }
  return false;
}

function withCommonsBitmapMimeFilter(keywords: string): string {
  const k = keywords.trim();
  if (!k) return "filemime:image/jpeg";
  if (/filemime:/i.test(k)) return k;
  return `${k} filemime:image/jpeg`.slice(0, 280);
}

function parseSearchPlanJson(raw: string): ImageSearchPlan | null {
  const cleaned = raw
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  let jsonStr = match ? match[0] : cleaned;
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
  try {
    const o = JSON.parse(jsonStr) as Record<string, unknown>;
    const people = Array.isArray(o.namedPeopleEnglish)
      ? (o.namedPeopleEnglish as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
    const org = typeof o.organizationOrProduct === "string" ? o.organizationOrProduct.trim() : "";
    const dis = typeof o.disambiguationPhrase === "string" ? o.disambiguationPhrase.trim() : "";
    const news = typeof o.eventOrNewsAngle === "string" ? o.eventOrNewsAngle.trim() : "";
    const avoid = Array.isArray(o.doNotUseAlone)
      ? (o.doNotUseAlone as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
    return {
      namedPeopleEnglish: people.map((p) => normalizeWhitespace(p)).filter(Boolean),
      organizationOrProduct: normalizeWhitespace(org),
      disambiguationPhrase: normalizeWhitespace(dis),
      eventOrNewsAngle: normalizeWhitespace(news),
      doNotUseAlone: avoid.map((a) => a.trim().toLowerCase()).filter(Boolean),
    };
  } catch {
    return null;
  }
}

function parseSearchPlanLines(raw: string): ImageSearchPlan | null {
  const lines = stripNoiseForSearch(raw)
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const get = (prefix: RegExp): string => {
    const line = lines.find((l) => prefix.test(l));
    if (!line) return "";
    return normalizeWhitespace(line.replace(prefix, "").trim());
  };
  const personLine = get(/^PERSON:\s*/i);
  const namedPeopleEnglish = personLine
    .split(/[,;]+/)
    .map((s) => normalizeWhitespace(s))
    .filter((s) => s.length > 0 && !/^none$/i.test(s));
  const orgRaw = get(/^ORG:\s*/i);
  const organizationOrProduct = /^none$/i.test(orgRaw) ? "" : normalizeWhitespace(orgRaw);
  const disRaw = get(/^DISAMBIG:\s*/i);
  const disambiguationPhrase = /^none$/i.test(disRaw) ? "" : normalizeWhitespace(disRaw);
  const newsRaw = get(/^NEWS:\s*/i);
  const eventOrNewsAngle = /^none$/i.test(newsRaw) ? "" : normalizeWhitespace(newsRaw);
  const avoidLine = get(/^AVOID:\s*/i);
  const doNotUseAlone = avoidLine
    .split(/[,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (
    namedPeopleEnglish.length === 0 &&
    !organizationOrProduct &&
    !disambiguationPhrase &&
    !eventOrNewsAngle
  ) {
    return null;
  }

  return {
    namedPeopleEnglish,
    organizationOrProduct: normalizeWhitespace(organizationOrProduct),
    disambiguationPhrase: normalizeWhitespace(disambiguationPhrase),
    eventOrNewsAngle: normalizeWhitespace(eventOrNewsAngle),
    doNotUseAlone,
  };
}

/**
 * Build ordered search strings: people first, then company+context (never geography alone).
 */
export function buildQueriesFromPlan(plan: ImageSearchPlan): string[] {
  const extraBanned = new Set(plan.doNotUseAlone.map((s) => s.replace(/[^a-z0-9]/g, "")));
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (q: string) => {
    let s = stripWeakImageQueryTokens(normalizeWhitespace(q)).slice(0, 110);
    if (s.length < 3) return;
    if (isStandaloneBannedQuery(s)) return;
    const firstTok = s.split(/\s+/)[0]?.replace(/[^a-z0-9]/gi, "").toLowerCase() ?? "";
    if (s.split(/\s+/).length === 1 && extraBanned.has(firstTok)) return;
    const key = s.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  for (const person of plan.namedPeopleEnglish.slice(0, 3)) {
    push(person);
    if (plan.organizationOrProduct) {
      push(`${person} ${plan.organizationOrProduct}`);
    }
  }

  const org = plan.organizationOrProduct;
  const dis = plan.disambiguationPhrase;
  const news = plan.eventOrNewsAngle;

  if (org && dis) {
    push(`${org} ${dis}`);
  } else if (org) {
    push(org);
  }

  if (org && news) {
    push(`${org} ${news}`);
    if (dis) push(`${org} ${news} ${dis}`);
  }

  if (dis && org && !out.some((q) => q.toLowerCase().includes(org.toLowerCase()))) {
    push(`${dis} ${org}`);
  }

  return out;
}

async function extractSearchPlanFromBrief(brief: string): Promise<ImageSearchPlan | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You help find REAL reference photos for a social post (news figures, founders, company visuals — NOT generic stock).

Read the brief (any language). Return ONLY valid JSON (no markdown, no explanation) with this shape:
{
  "namedPeopleEnglish": ["..."],
  "organizationOrProduct": "...",
  "disambiguationPhrase": "...",
  "eventOrNewsAngle": "...",
  "doNotUseAlone": ["..."]
}

Rules:
1) namedPeopleEnglish: ONLY real individuals NAMED IN THE BRIEF TEXT — copy spelling EXACTLY as written (e.g. if the brief says "Aubrey Niederhoffer", output exactly that). NEVER invent, substitute, or "guess" a different person (wrong founder = catastrophic). Max 3. Empty array if no individual is named.
2) organizationOrProduct: the startup, company, app, or main subject brand (e.g. "Swoop"). Empty if none.
3) disambiguationPhrase: 4–8 English words describing WHAT they do / sector / product / funding context from the brief — NOT broad geography alone (never "Africa business" or "African entrepreneur" as the whole phrase unless the story is ONLY about that demographic with no entity). Include terms like: fintech, seed funding, mobile payments, SaaS, etc. when the brief implies them.
4) eventOrNewsAngle: concrete beat if any: "Series A", "7.3M funding", "Berkeley dropout", "launch", etc. May be "".
5) doNotUseAlone: lowercase tokens that must NOT be used as the ONLY search term (e.g. continent/region words from the brief that would return unrelated stock photos).

CRITICAL: If the brand name is a common English word (Swoop, Delta, Chase, Swift, etc.), disambiguationPhrase MUST include non-geographic specificity from the brief so image search does NOT return airlines, banks, or unrelated brands.

Brief:
${brief.trim().slice(0, MAX_CONTENT_IDEA_CHARS)}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.15, maxOutputTokens: 512 },
    });
    const text = result.response.text();
    let plan = parseSearchPlanJson(text);
    if (!plan) {
      const linePrompt = `Same brief as before. The JSON failed — use this LINE format only (exact labels, English values):

PERSON: names EXACTLY as in brief, comma-separated, or NONE — never a name not in the brief
ORG: brand or company or NONE
DISAMBIG: 6-10 words — sector, product, funding stage from the story — NOT continent or "African people"
NEWS: funding round, amount, dropout, launch — or NONE
AVOID: comma-separated lowercase tokens never to search alone (e.g. africa, african)

Brief:
${brief.trim().slice(0, MAX_CONTENT_IDEA_CHARS)}`;

      const lineRes = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: linePrompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
      });
      plan = parseSearchPlanLines(lineRes.response.text());
    }
    return plan;
  } catch (e) {
    console.warn("[web-image-discovery] extractSearchPlan failed:", e);
    return null;
  }
}

type CseImageItem = {
  link?: string;
  title?: string;
  htmlTitle?: string;
  snippet?: string;
  mime?: string;
  displayLink?: string;
};

type ImageDiscoverySearchCtx = {
  canonicalPeople: string[];
  /** Latest Custom Search API failure (for user-facing hints). */
  cseLastError?: { status: number; message: string };
};

async function searchGoogleProgrammableImageSearch(
  query: string,
  num: number,
  ctx?: ImageDiscoverySearchCtx
): Promise<string[] | null> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_CX?.trim();
  if (!apiKey || !cx) return null;

  const strictPerson =
    Boolean(ctx?.canonicalPeople?.length) && queryMentionsAnyCanonicalPerson(query, ctx!.canonicalPeople);
  const fetchCount = strictPerson ? Math.min(10, Math.max(num, num + 5)) : Math.min(10, Math.max(1, num + 3));

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    searchType: "image",
    num: String(fetchCount),
    safe: "active",
  });

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const errJson = (await res.json()) as { error?: { message?: string; errors?: Array<{ message?: string }> } };
      message =
        errJson.error?.message ??
        errJson.error?.errors?.map((e) => e.message).filter(Boolean).join("; ") ??
        message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    if (ctx) ctx.cseLastError = { status: res.status, message };
    console.warn("[web-image-discovery] Google CSE error:", res.status, message);
    return null;
  }

  const data = (await res.json()) as { items?: CseImageItem[] };
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of data.items ?? []) {
    const link = it.link?.trim();
    if (!link || (!link.startsWith("http://") && !link.startsWith("https://"))) continue;
    const mime = it.mime || "";
    if (mime && !ALLOWED_MIME.test(mime)) continue;
    if (strictPerson && ctx?.canonicalPeople?.length) {
      const meta = [it.title, it.htmlTitle, it.snippet, it.displayLink, link].filter(Boolean).join(" ");
      const ok = ctx.canonicalPeople.some((p) => haystackMatchesPerson(meta, p));
      if (!ok) continue;
    }
    if (seen.has(link)) continue;
    seen.add(link);
    out.push(link);
    if (out.length >= num) break;
  }
  return out.length > 0 ? out : null;
}

type WikiPage = {
  imageinfo?: Array<{ url?: string; mime?: string }>;
};

function sanitizeWikimediaSearchKeywords(q: string): string {
  return normalizeWhitespace(
    q
      .replace(/[$€£¥]/g, "")
      .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
      .replace(/\s+/g, " ")
  );
}

async function searchWikimediaCommonsImages(
  keywords: string,
  num: number,
  ctx?: ImageDiscoverySearchCtx
): Promise<string[]> {
  const parts = sanitizeWikimediaSearchKeywords(keywords).split(/\s+/).filter(Boolean);
  if (!parts.length) return [];

  const strictPerson =
    Boolean(ctx?.canonicalPeople?.length) && queryMentionsAnyCanonicalPerson(keywords, ctx!.canonicalPeople);

  const firstTok = (parts[0] ?? "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  const ambiguousLead = AMBIGUOUS_BRAND_SINGLETON.has(firstTok);

  const maxPrefix = Math.min(8, parts.length);
  const budgets: number[] = [];
  if (ambiguousLead) {
    for (let w = 2; w <= maxPrefix; w++) budgets.push(w);
  } else {
    for (let w = maxPrefix; w >= 1; w--) {
      if (!budgets.includes(w)) budgets.push(w);
    }
  }

  const multiWordCanonical = (ctx?.canonicalPeople ?? []).filter((p) => p.trim().split(/\s+/).filter(Boolean).length >= 2);
  if (strictPerson && multiWordCanonical.length > 0) {
    const minLen = Math.min(...multiWordCanonical.map((p) => p.trim().split(/\s+/).filter(Boolean).length));
    if (maxPrefix < minLen) return [];
    const floor = Math.min(minLen, maxPrefix);
    const filtered = budgets.filter((w) => w >= floor);
    if (filtered.length > 0) {
      budgets.length = 0;
      budgets.push(...filtered);
    }
  }

  const out: string[] = [];
  const seen = new Set<string>();
  let lastSrsearch = "";

  for (const wordCount of budgets) {
    if (out.length >= num) break;
    const chunk = parts.slice(0, wordCount).join(" ").trim();
    if (!chunk) continue;
    const srsearch = withCommonsBitmapMimeFilter(chunk);
    lastSrsearch = srsearch;

    const searchParams = new URLSearchParams({
      action: "query",
      format: "json",
      list: "search",
      srsearch,
      srnamespace: "6",
      srlimit: "25",
      origin: "*",
    });

    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${searchParams}`, {
      headers: { "User-Agent": WIKI_UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn("[web-image-discovery] Wikimedia search HTTP", res.status);
      continue;
    }

    const searchData = (await res.json()) as { query?: { search?: Array<{ title?: string }> } };
    let titles = (searchData.query?.search ?? [])
      .map((s) => s.title?.trim())
      .filter((t): t is string => Boolean(t));
    if (ambiguousLead) {
      titles = titles.filter((t) => !AIRLINE_FILE_TITLE.test(t));
    }
    const strictPersonTitles =
      Boolean(ctx?.canonicalPeople?.length) && queryMentionsAnyCanonicalPerson(keywords, ctx!.canonicalPeople);
    if (strictPersonTitles && ctx?.canonicalPeople?.length) {
      titles = titles.filter((t) => ctx.canonicalPeople!.some((p) => haystackMatchesPerson(t, p)));
    }
    if (titles.length === 0) continue;

    const chunkSize = 10;
    for (let i = 0; i < titles.length && out.length < num; i += chunkSize) {
      const titleChunk = titles.slice(i, i + chunkSize);
      const infoParams = new URLSearchParams({
        action: "query",
        format: "json",
        titles: titleChunk.join("|"),
        prop: "imageinfo",
        iiprop: "url|mime",
        iiurlwidth: "1200",
        origin: "*",
      });

      const infoRes = await fetch(`https://commons.wikimedia.org/w/api.php?${infoParams}`, {
        headers: { "User-Agent": WIKI_UA },
        signal: AbortSignal.timeout(15000),
      });
      if (!infoRes.ok) continue;

      const infoData = (await infoRes.json()) as { query?: { pages?: Record<string, WikiPage> } };
      const pages = infoData.query?.pages ?? {};

      for (const page of Object.values(pages)) {
        if ("missing" in page) continue;
        const info = page.imageinfo?.[0];
        const url = info?.url?.trim();
        const mime = info?.mime || "";
        if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) continue;
        if (mime) {
          if (!ALLOWED_MIME.test(mime)) continue;
        } else if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test((url.split("?")[0] ?? ""))) {
          continue;
        }
        if (seen.has(url)) continue;
        seen.add(url);
        out.push(url);
        if (out.length >= num) break;
      }
    }
  }

  if (out.length === 0 && lastSrsearch) {
    console.warn("[web-image-discovery] Wikimedia: no File hits after prefix tries, last query:", lastSrsearch.slice(0, 120));
  }

  return out;
}

async function collectUrlsFromQueries(
  queries: string[],
  n: number,
  ctx: ImageDiscoverySearchCtx
): Promise<{ urls: string[]; source: "google" | "wikimedia"; winningQuery: string }> {
  const seen = new Set<string>();
  const urls: string[] = [];
  let source: "google" | "wikimedia" = "wikimedia";
  let winningQuery = "";
  let sawGoogle = false;

  for (const q of queries) {
    if (urls.length >= n) break;
    if (isUnsuitableImageSearchQuery(q) || isStandaloneBannedQuery(q)) continue;
    if (ctx.canonicalPeople.length > 0 && isSingleTokenGivenNameOnlyQuery(q, ctx.canonicalPeople)) continue;

    const need = n - urls.length;
    const google = await searchGoogleProgrammableImageSearch(q, need, ctx);
    if (google && google.length > 0) {
      if (!sawGoogle) {
        sawGoogle = true;
        source = "google";
      }
      if (!winningQuery) winningQuery = q;
      for (const u of google) {
        if (seen.has(u)) continue;
        seen.add(u);
        urls.push(u);
        if (urls.length >= n) break;
      }
      continue;
    }

    const wiki = await searchWikimediaCommonsImages(q, need, ctx);
    if (wiki.length > 0) {
      if (!winningQuery) winningQuery = q;
      for (const u of wiki) {
        if (seen.has(u)) continue;
        seen.add(u);
        urls.push(u);
        if (urls.length >= n) break;
      }
    }
  }

  return { urls, source, winningQuery };
}

export type WebImageDiscoveryResult = {
  urls: string[];
  /** Primary / first successful search string (for UI). */
  query: string;
  /** All queries attempted in order (for debugging). */
  queriesAttempted: string[];
  source: "google" | "wikimedia";
  /** Shown when no URLs; e.g. configure Google Programmable Image Search for news photos. */
  hint?: string;
};

/**
 * Returns up to `maxResults` distinct image URLs (default 5).
 */
export async function discoverWebImageUrlsForPostBrief(
  brief: string,
  maxResults = WEB_IMAGE_TARGET
): Promise<WebImageDiscoveryResult> {
  const trimmed = brief.trim().slice(0, MAX_CONTENT_IDEA_CHARS);
  if (!trimmed) {
    return { urls: [], query: "", queriesAttempted: [], source: "wikimedia", hint: undefined };
  }

  const n = Math.min(10, Math.max(1, maxResults));
  let queries: string[] = [];

  const plan = await extractSearchPlanFromBrief(trimmed);
  const canonicalPeople = reconcileCanonicalPeople(plan, trimmed);
  const planForQueries: ImageSearchPlan = {
    namedPeopleEnglish: canonicalPeople,
    organizationOrProduct: plan?.organizationOrProduct?.trim() ?? "",
    disambiguationPhrase: plan?.disambiguationPhrase?.trim() ?? "",
    eventOrNewsAngle: plan?.eventOrNewsAngle?.trim() ?? "",
    doNotUseAlone: plan?.doNotUseAlone ?? [],
  };
  queries = buildQueriesFromPlan(planForQueries);

  if (queries.length === 0) {
    const fb = stripWeakImageQueryTokens(fallbackKeywordsFromBrief(trimmed)).slice(0, 96).trim();
    if (fb && !isStandaloneBannedQuery(fb)) {
      queries = [fb];
    }
  }

  queries = queries
    .map((q) => stripWeakImageQueryTokens(q).trim())
    .filter((q) => q.length >= 3 && !isUnsuitableImageSearchQuery(q) && !isStandaloneBannedQuery(q));

  queries = queries.map((q) => expandAmbiguousBrandQuery(q, trimmed));

  const multiWordOrSafe = queries.filter((q) => {
    const w = q.split(/\s+/).filter(Boolean);
    if (w.length >= 2) return true;
    const one = (w[0] ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    return one.length > 0 && !AMBIGUOUS_BRAND_SINGLETON.has(one);
  });
  if (multiWordOrSafe.length > 0) {
    queries = multiWordOrSafe;
  }

  if (queries.length === 0) {
    console.warn("[web-image-discovery] No valid queries after plan + fallback");
    return {
      urls: [],
      query: "",
      queriesAttempted: [],
      source: "wikimedia",
      hint:
        !process.env.GOOGLE_CSE_API_KEY || !process.env.GOOGLE_CSE_CX
          ? "Could not build safe search terms, or Wikimedia has no files for this story. Add GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX for news and portrait image search."
          : undefined,
    };
  }

  const identityCtx: ImageDiscoverySearchCtx = { canonicalPeople };
  let { urls, source, winningQuery } = await collectUrlsFromQueries(queries, n, identityCtx);

  if (urls.length === 0) {
    let alt = stripWeakImageQueryTokens(fallbackKeywordsFromBrief(trimmed)).trim();
    alt = expandAmbiguousBrandQuery(alt, trimmed);
    const needsNamedFallback =
      canonicalPeople.length > 0 && canonicalPeople.some((p) => p.trim().split(/\s+/).filter(Boolean).length >= 2);
    const fallbackOkForIdentity = !needsNamedFallback || queryMentionsAnyCanonicalPerson(alt, canonicalPeople);
    if (
      alt &&
      !queries.includes(alt) &&
      !isStandaloneBannedQuery(alt) &&
      fallbackOkForIdentity
    ) {
      const second = await collectUrlsFromQueries([alt], n, identityCtx);
      urls = second.urls;
      source = second.source;
      winningQuery = second.winningQuery || alt;
      queries.push(alt);
    }
  }

  if (urls.length === 0) {
    console.warn("[web-image-discovery] No URLs for queries:", queries.map((q) => q.slice(0, 60)));
  }

  const queryLabel = winningQuery || queries[0] || "";
  const noCse = !process.env.GOOGLE_CSE_API_KEY?.trim() || !process.env.GOOGLE_CSE_CX?.trim();
  const cse403 = identityCtx.cseLastError?.status === 403;
  const hint =
    urls.length === 0 && cse403
      ? "Google image search returned access denied (403). In Google Cloud Console, enable the Custom Search API, ensure billing/quota are OK, and use an API key without HTTP referrer restrictions (server-side keys). Then verify GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX."
      : urls.length === 0 && noCse
        ? "No Wikimedia Commons matches for this specific story (common for small startups). Configure Google Programmable Search (image) for news photos and founder portraits."
        : urls.length === 0
          ? "No images matched these queries. Try a shorter English description with the person or company name, or paste image URLs manually."
          : undefined;

  return {
    urls: urls.slice(0, n),
    query: queryLabel,
    queriesAttempted: [...new Set(queries)],
    source,
    hint,
  };
}
