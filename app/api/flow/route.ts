import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";

import { resolveGovUkDoc } from "@/lib/govuk/resolve";
import { getVatNoticesIndex } from "@/lib/govuk/vatNoticesIndex";
import {
  FlowRequestSchema,
  FlowResponseSchema,
  type FlowResponse,
} from "@/lib/schemas/flow";

// Types used inside this route only.
// EvidencePara = a paragraph we might cite, flattened into one pool with stable indices.
// ProgressEvent = the NDJSON “event” object we stream to the client.

type EvidencePara = {
  poolIndex: number;
  basePath: string;
  webUrl: string;
  docParagraphIndex: number;
  text: string;
};

type ProgressEvent =
  | { type: "progress"; stage: string; detail?: string }
  | { type: "done"; payload: FlowResponse }
  | { type: "error"; message: string };

// Streaming helper.
// Emits NDJSON lines: JSON.stringify(event) + "\n".
// Client should read the response stream and parse per line (not res.json()).

function createStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  function emit(event: ProgressEvent) {
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
  }

  function close() {
    controller.close();
  }

  return { stream, emit, close };
}

// Notice selection.
// scoreTitle: crude keyword matching against notice titles.
// selectNotices:
//   1) ask model for 1 to 3 generic supply descriptions
//   2) rank notices using those words
//   3) ask model to pick the minimum set of notices from the ranked candidate list
// Output = list of basePath strings (deduped, validated).

function scoreTitle(title: string, words: string[]) {
  const t = title.toLowerCase();
  return words.reduce((s, w) => (t.includes(w) ? s + 1 : s), 0);
}

async function selectNotices(
  userText: string,
  emit: (e: ProgressEvent) => void,
  maxPick = 5,
) {
  const index = await getVatNoticesIndex();

  // UI stage: model is classifying the query into a generic supply category.
  emit({
    type: "progress",
    stage: "classifying",
    detail: "Classifying your supply…",
  });

  // Few-shot prompt to keep the descriptions in the style we want.
  // The extra isPhysicalGood flag lets us bias selection toward notice 700 where relevant.
  const classified = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: z.object({
      supplyDescriptions: z.array(z.string()).min(1).max(3),
      isAmbiguous: z.boolean(),
      isPhysicalGood: z.boolean(),
    }),
    prompt: [
      "Identify the primary legal nature of the supply for UK VAT purposes.",
      "",
      "Rules:",
      "1. Return short supply descriptions that would help identify the correct VAT Notice.",
      "2. If the query is ambiguous, return one description per plausible interpretation (max 3).",
      "3. If the query refers to a physical good, set isPhysicalGood=true.",
      "4. Do not collapse a supply into one component if the query could refer to a finished product.",
      "5. Prefer ordinary commercial descriptions over abstract tax labels.",
      "",
      "Examples:",
      "  'bottled water' -> supplyDescriptions: ['bottled drinking water', 'food products beverage'], isAmbiguous: false, isPhysicalGood: true",
      "  'water bottle' -> supplyDescriptions: ['drinking bottle container', 'general consumer goods'], isAmbiguous: false, isPhysicalGood: true",
      "  'GP appointment' -> supplyDescriptions: ['medical healthcare service'], isAmbiguous: false, isPhysicalGood: false",
      "",
      `Query: ${userText}`,
    ].join("\n"),
  });

  // Tokenise the supply descriptions into words for title scoring.
  const words = Array.from(
    new Set(
      classified.object.supplyDescriptions
        .join(" ")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3),
    ),
  );

  // Rank all notices by crude title match score; then keep a candidate shortlist.
  const ranked = index
    .map((n) => ({ ...n, score: scoreTitle(n.title, words) }))
    .sort((a, b) => b.score - a.score);

  const candidates = ranked.slice(0, 30);

  // UI stage: selecting notices. The detail string is shown directly in the loader.
  emit({
    type: "progress",
    stage: "selecting_notices",
    detail: classified.object.isAmbiguous
      ? `Ambiguous supply — checking ${classified.object.supplyDescriptions.length} interpretations`
      : `Identified as: ${classified.object.supplyDescriptions[0]}`,
  });

  // Ask the model to pick the minimum basePaths from the candidate list.
  const PickSchema = z.object({ picks: z.array(z.string()).max(maxPick) });

  const picked = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: PickSchema,
    prompt: [
      "Pick the minimum set of VAT Notices needed to determine VAT liability for the query.",
      "You may ONLY pick from the provided list.",
      "Prefer specific notices over general ones.",
      "If the supply is ambiguous, include notices for all plausible interpretations.",
      "If the query concerns a physical good, include VAT Notice 700 unless it is already unnecessary because a more specific notice clearly covers the full issue.",
      `Return between 1 and ${maxPick} basePath strings.`,
      "",
      `Query: ${userText}`,
      `Supply descriptions: ${classified.object.supplyDescriptions.join(" | ")}`,
      `Ambiguous: ${classified.object.isAmbiguous}`,
      `Physical good: ${classified.object.isPhysicalGood}`,
      "",
      "Notices (title | basePath):",
      candidates.map((r) => `${r.title} | ${r.basePath}`).join("\n"),
    ].join("\n"),
  });

  // Validate model output against the known index so we never accept hallucinated basePaths.
  const allowed = new Set(index.map((i) => i.basePath));
  const valid = picked.object.picks.filter((p) => allowed.has(p));

  // Fallback: if model output is empty/invalid, use the top few ranked notices.
  return valid.length
    ? { basePaths: Array.from(new Set(valid)), expansionWords: words }
    : {
        basePaths: ranked.slice(0, 3).map((r) => r.basePath),
        expansionWords: words,
      };
}

// Evidence pooling/scoring.
// scoreParagraph: term matching with a light boost for decisive treatment and exclusion wording.
// buildEvidencePool:
//   1) fetch notice docs for chosen basePaths
//   2) find top anchor paragraphs per doc
//   3) expand each anchor into a local window so the model sees the surrounding rule/exceptions
//   4) re-rank globally and cap total
// Output = EvidencePara[] with stable poolIndex (used as cite ids everywhere else).

function scoreParagraph(text: string, terms: string[]) {
  const t = text.toLowerCase();
  let score = 0;

  // Reward paragraphs that actually discuss the supply terms.
  for (const term of terms) {
    if (!term) continue;
    if (t.includes(term)) score += 2;
  }

  // Small boost only. This is here to help surface decisive wording,
  // not to let treatment language overpower supply context.
  if (
    t.includes("except") ||
    t.includes("unless") ||
    t.includes("provided that") ||
    t.includes("excluding") ||
    t.includes("excepted item") ||
    t.includes("standard-rated") ||
    t.includes("zero-rated") ||
    t.includes("reduced rate") ||
    t.includes("exempt")
  ) {
    score += 1;
  }

  return score;
}

function mergeColonParagraphs(paragraphs: { index: number; text: string }[]) {
  // Ensure the model sees multi-line paragraphs as one chunk
  // for example, a condition followed by its consequence.
  const merged: { index: number; text: string }[] = [];
  let i = 0;
  while (i < paragraphs.length) {
    const current = paragraphs[i];
    const trimmed = current.text.trimEnd();
    if (
      (trimmed.endsWith(":") || trimmed.endsWith("—")) &&
      i + 1 < paragraphs.length
    ) {
      merged.push({
        index: current.index,
        text: current.text + " " + paragraphs[i + 1].text,
      });
      i += 2;
    } else {
      merged.push(current);
      i += 1;
    }
  }
  return merged;
}

async function buildEvidencePool(
  basePaths: string[],
  queryTerms: string[],
  emit: (e: ProgressEvent) => void,
) {
  // UI stage: fetching notice docs.
  emit({
    type: "progress",
    stage: "fetching_notices",
    detail: `Reading ${basePaths.length} VAT notice${basePaths.length > 1 ? "s" : ""}…`,
  });

  const docs = await Promise.all(basePaths.map(resolveGovUkDoc));

  // UI stage: scoring paragraphs.
  emit({
    type: "progress",
    stage: "scoring_paragraphs",
    detail: "Scoring paragraphs for relevance…",
  });

  // Instead of snatching isolated high-scoring paragraphs, anchor on the best hits
  // and then pull in the surrounding local window so exclusions/conditions travel
  // with the main rule.
  const MAX_ANCHORS_PER_DOC = 8;
  const WINDOW_BEFORE = 2;
  const WINDOW_AFTER = 14;
  const MAX_TOTAL = 220;

  const candidates: Omit<EvidencePara, "poolIndex">[] = [];
  const seen = new Set<string>();

  for (const doc of docs) {
    const merged = mergeColonParagraphs(doc.paragraphs).slice(0, 1200);

    const anchors = merged
      .map((p) => ({ p, s: scoreParagraph(p.text, queryTerms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, MAX_ANCHORS_PER_DOC);

    for (const anchor of anchors) {
      const start = Math.max(0, anchor.p.index - WINDOW_BEFORE);
      const end = Math.min(
        doc.paragraphs.length,
        anchor.p.index + WINDOW_AFTER + 1,
      );

      for (let i = start; i < end; i++) {
        const p = doc.paragraphs[i];
        const key = `${doc.basePath}:${p.index}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({
          basePath: doc.basePath,
          webUrl: doc.webUrl,
          docParagraphIndex: p.index,
          text: p.text,
        });
      }
    }
  }

  // Global re-rank and assign poolIndex.
  // poolIndex becomes the cite id used everywhere else in this route.
  return candidates
    .map((e) => ({ e, s: scoreParagraph(e.text, queryTerms) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_TOTAL)
    .map((x) => x.e)
    .map((e, i) => ({ ...e, poolIndex: i }));
}

// Citation safety helpers.
// localWindow: build an allowed set around indices.
// filterLocal: keep only indices in the allowed set.
// assertInRange: hard guardrail so we never emit out-of-range cite indices.

function localWindow(indices: number[], maxExclusive: number, window = 1) {
  const s = new Set<number>();
  for (const idx of indices) {
    for (let j = idx - window; j <= idx + window; j++) {
      if (j >= 0 && j < maxExclusive) s.add(j);
    }
  }
  return s;
}

function filterLocal(indices: number[] | undefined, allowed: Set<number>) {
  if (!indices?.length) return [];
  return indices.filter((i) => allowed.has(i));
}

function assertInRange(indices: number[], maxExclusive: number) {
  for (const n of indices) {
    if (!Number.isInteger(n) || n < 0 || n >= maxExclusive) {
      throw new Error(`Model produced out-of-range cite index: ${n}`);
    }
  }
}

// pickMinimalCitations: select a small set of citations from used indices.
// Caps total citations + caps per doc to keep the UI readable.

function pickMinimalCitations(
  evidenceOut: Array<{
    url: string;
    basePath: string;
    paragraphIndex: number;
    docParagraphIndex: number;
    snippet: string;
  }>,
  usedIndices: number[],
  opts?: { maxTotal?: number; maxPerDoc?: number },
) {
  const maxTotal = opts?.maxTotal ?? 5;
  const maxPerDoc = opts?.maxPerDoc ?? 2;

  // Dedup used indices while preserving first-seen order.
  const uniqueUsed: number[] = [];
  const seen = new Set<number>();
  for (const i of usedIndices) {
    if (!seen.has(i)) {
      seen.add(i);
      uniqueUsed.push(i);
    }
  }

  const byIndex = new Map<number, (typeof evidenceOut)[number]>();
  for (const e of evidenceOut) byIndex.set(e.paragraphIndex, e);

  const perDocCount = new Map<string, number>();
  const picked: (typeof evidenceOut)[number][] = [];

  for (const idx of uniqueUsed) {
    const e = byIndex.get(idx);
    if (!e) continue;
    const c = perDocCount.get(e.basePath) ?? 0;
    if (c >= maxPerDoc) continue;
    picked.push(e);
    perDocCount.set(e.basePath, c + 1);
    if (picked.length >= maxTotal) break;
  }

  return picked;
}

// computeNeedsReview: conservative flag for cases where the answer probably needs eyeballing.
// True when we only used the general guide (700) or we never cite a paragraph that explicitly states treatment words.

function computeNeedsReview(basePaths: string[], citedSnippets: string[]) {
  const onlyGeneralGuide = basePaths.every((p) =>
    p.includes("vat-guide-notice-700"),
  );
  const hasExplicitTreatment = citedSnippets.some(
    (s) =>
      s.includes("zero-rated") ||
      s.includes("standard-rated") ||
      s.includes("reduced rate") ||
      s.includes("exempt"),
  );
  return onlyGeneralGuide || !hasExplicitTreatment;
}

// buildSupplyContext: inject “fixed attributes” so the model treats prior answers as hard constraints.
// This is here to stop repeated questions and stop it from assuming away conditions.

function buildSupplyContext(
  userText: string,
  priorAnswers: Record<string, string>,
) {
  const facts = Object.values(priorAnswers);
  if (facts.length === 0) return `ITEM TO CLASSIFY: ${userText}`;
  return [
    `ITEM TO CLASSIFY: ${userText}`,
    `FIXED ATTRIBUTES (MANDATORY CONSTRAINTS):`,
    ...facts.map((v) => `- ${v}`),
    "",
    "INSTRUCTIONS:",
    "1. You must treat FIXED ATTRIBUTES as absolute truth.",
    "2. If a legal branch in a VAT notice is resolved by an attribute, you are FORBIDDEN from asking about it again.",
    "3. Do not ask the user to choose legal labels. Ask for physical or observable facts only.",
  ].join("\n");
}

// Zod schemas for model outputs.
// These schemas are the contract between the route and the model output.
// If you change them, also check prompts + frontend expectations.

const OptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  citeParagraph: z.number().int().nonnegative(),
});

const QuestionSchema = z.object({
  id: z.string(),
  questionText: z.string(),
  reasoning: z.string(),
  options: z.array(OptionSchema).min(2).max(6),
  citeParagraphs: z.array(z.number().int().nonnegative()).min(1),
});

const AuditStepSchema = z.object({
  text: z.string().min(1),
  cites: z.array(z.number().int().nonnegative()).min(1).max(8),
});

const ReadSchema = z.object({
  status: z.enum(["ANSWER", "NEED_CLARIFICATION"]),
  auditGauntlet: z.object({
    candidateRelief: AuditStepSchema,
    exclusionSearch: AuditStepSchema,
    conflictCheck: AuditStepSchema,
    defaultRateComparison: AuditStepSchema,
  }),
  supportCites: z.array(z.number().int().nonnegative()).min(1).max(6),
  blockerCites: z.array(z.number().int().nonnegative()).max(8),
  conclusion: z.string().nullable(),
  vatRate: z.enum(["zero", "reduced", "standard", "exempt"]).nullable(),
  reasoningBullets: z
    .array(
      z.object({
        text: z.string().min(1),
        cites: z.array(z.number().int().nonnegative()).min(1).max(8),
      }),
    )
    .nullable(),
  unresolvedBranch: z.string().nullable(),
});

const AskSchema = z.object({ question: QuestionSchema });

const ForceAnswerSchema = z.object({
  conclusion: z.string().min(1),
  vatRate: z.enum(["zero", "reduced", "standard", "exempt"]).nullable(),
  bullets: z
    .array(
      z.object({
        text: z.string().min(1),
        cites: z.array(z.number().int().nonnegative()).min(1).max(8),
      }),
    )
    .min(1)
    .max(8),
  citeParagraphs: z.array(z.number().int().nonnegative()).min(1).max(16),
});

// Prompt builders.
// buildReadPrompt: model must either answer or return NEED_CLARIFICATION.
// The auditGauntlet forces it to show its working at each stage with grounded cites.
// buildAskPrompt: generate exactly one question with options, each option tied to a cite.
// buildForceAnswerPrompt: used when we’ve hit the question limit; returns conditional rules instead of looping.

function buildReadPrompt(
  userText: string,
  priorAnswers: Record<string, string>,
  evidence: EvidencePara[],
) {
  const supplyContext = buildSupplyContext(userText, priorAnswers);
  return [
    "You are a Senior VAT Auditor. Use ONLY the provided evidence.",
    "",
    "You must follow this exact sequence before concluding any VAT treatment:",
    "1. CANDIDATE RELIEF: Identify the paragraph(s) that appear to grant exemption, reduced rate, or zero-rate.",
    "2. EXCLUSION SEARCH: Search the provided evidence for exceptions, excepted items, exclusions, override wording, or narrower conditions that could block that relief.",
    "3. CONFLICT CHECK: Check whether another more specific notice or paragraph gives a different treatment for the same factual supply.",
    "4. DEFAULT RATE COMPARISON: If the relief route is blocked, contradicted, or unproven, compare against the standard-rate/default position before concluding.",
    "",
    "STRICT RULES:",
    "You must ground each auditGauntlet field in citations from the evidence pool.",
    "Do not say you checked a stage unless you cite the paragraph(s) used for that stage.",
    "Never assume a missing condition is satisfied.",
    "Never stop at the first plausible relief paragraph.",
    "If a decisive fact is missing and would change the outcome, set status=NEED_CLARIFICATION.",
    "If status=ANSWER, blockerCites must be empty.",
    "If status=NEED_CLARIFICATION, blockerCites must cite the paragraph(s) creating the uncertainty or block.",
    "",
    supplyContext,
    "",
    "EVIDENCE (index | source | text):",
    evidence
      .map(
        (p) =>
          `[${p.poolIndex}] ${p.basePath} p${p.docParagraphIndex}: ${p.text}`,
      )
      .join("\n\n"),
    "",
    "Return JSON only.",
  ].join("\n");
}

function buildAskPrompt(
  userText: string,
  priorAnswers: Record<string, string>,
  priorAsked: string[],
  unresolvedBranch: string,
  supportCites: number[],
  blockerCites: number[],
  evidence: EvidencePara[],
) {
  const supplyContext = buildSupplyContext(userText, priorAnswers);

  // Build a local evidence slice around support + blocker cites to keep the ask prompt tight.
  const indices = new Set<number>([...supportCites, ...blockerCites]);
  for (const idx of Array.from(indices)) {
    for (let j = idx - 3; j <= idx + 3; j++) {
      if (j >= 0 && j < evidence.length) indices.add(j);
    }
  }

  const merged = Array.from(indices)
    .sort((a, b) => a - b)
    .map((i) => evidence[i]);

  return [
    "You are a VAT clarification assistant. Generate exactly one question to resolve the blocking condition described below.",
    "",
    "Rules:",
    "Ask only about an observable factual characteristic.",
    "Do not ask the user to make a legal classification.",
    "Options must not be VAT outcomes.",
    "Each option must cite the paragraph that defines the branch or condition.",
    `Do NOT use any of these question ids: ${JSON.stringify(priorAsked)}`,
    "",
    supplyContext,
    "",
    `Blocking condition to resolve: ${unresolvedBranch}`,
    "",
    "Evidence (local region only):",
    merged
      .map(
        (p) =>
          `[${p.poolIndex}] ${p.basePath} p${p.docParagraphIndex}: ${p.text}`,
      )
      .join("\n\n"),
    "",
    "Return JSON only.",
  ].join("\n");
}

function buildForceAnswerPrompt(
  userText: string,
  priorAnswers: Record<string, string>,
  evidence: EvidencePara[],
) {
  const supplyContext = buildSupplyContext(userText, priorAnswers);
  return [
    "You have already asked the maximum number of clarifying questions.",
    "Give the most specific VAT liability conclusion the evidence supports.",
    "If the branch is still unresolved, give the VAT rule for each possible branch rather than refusing.",
    "Do not invent certainty.",
    "",
    supplyContext,
    "",
    "Evidence (index | source | text):",
    evidence
      .map(
        (p) =>
          `[${p.poolIndex}] ${p.basePath} p${p.docParagraphIndex}: ${p.text}`,
      )
      .join("\n\n"),
    "",
    "Return JSON only.",
  ].join("\n");
}

// Read helpers.
// collectReadCites: gather every cite the model relied on across the gauntlet and final reasoning.
// validateReadObject: hard guardrails so every cited index is in range before we trust the output.

function collectReadCites(read: z.infer<typeof ReadSchema>) {
  return Array.from(
    new Set([
      ...read.supportCites,
      ...read.blockerCites,
      ...read.auditGauntlet.candidateRelief.cites,
      ...read.auditGauntlet.exclusionSearch.cites,
      ...read.auditGauntlet.conflictCheck.cites,
      ...read.auditGauntlet.defaultRateComparison.cites,
      ...(read.reasoningBullets?.flatMap((b) => b.cites) ?? []),
    ]),
  );
}

function validateReadObject(read: z.infer<typeof ReadSchema>, maxIdx: number) {
  assertInRange(read.supportCites, maxIdx);
  assertInRange(read.blockerCites ?? [], maxIdx);
  assertInRange(read.auditGauntlet.candidateRelief.cites, maxIdx);
  assertInRange(read.auditGauntlet.exclusionSearch.cites, maxIdx);
  assertInRange(read.auditGauntlet.conflictCheck.cites, maxIdx);
  assertInRange(read.auditGauntlet.defaultRateComparison.cites, maxIdx);

  for (const b of read.reasoningBullets ?? []) {
    assertInRange(b.cites, maxIdx);
  }
}

// Route handler.
// Runs the pipeline async and streams ProgressEvents as each stage completes.

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = FlowRequestSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { stream, emit, close } = createStream();

  (async () => {
    try {
      const userText = (parsed.data.userText ?? "").trim();
      const priorAnswers = parsed.data.state?.answers ?? {};
      const priorAsked = parsed.data.state?.asked ?? [];
      const priorBasePaths = parsed.data.state?.basePaths ?? [];
      const askedSet = new Set(priorAsked);

      // Merge newly answered values into the running state.
      for (const a of parsed.data.answered ?? []) priorAnswers[a.id] = a.value;

      // Used for notice selection. Includes prior answers to reduce ambiguity.
      const mergedQuery = [
        userText,
        ...Object.values(priorAnswers).map(String),
      ].join(" ");

      const { basePaths, expansionWords } =
        priorBasePaths.length > 0
          ? { basePaths: priorBasePaths, expansionWords: [] }
          : await selectNotices(mergedQuery, emit);

      // Query terms = user text + prior answers, tokenised for paragraph scoring.
      const queryTerms = Array.from(
        new Set(
          [userText, ...Object.values(priorAnswers).map(String)]
            .join(" ")
            .toLowerCase()
            .split(/\s+/)
            .map((w) => w.replace(/[^\p{L}\p{N}]+/gu, ""))
            .filter((w) => w.length >= 3)
            .concat(expansionWords),
        ),
      );

      // Stage 1+2: select VAT notices (or re-use cached basePaths from state).

      // Stage 3+4: fetch and rank evidence paragraphs into a single pool.
      const evidence = await buildEvidencePool(basePaths, queryTerms, emit);

      // Evidence output shape sent to frontend.
      // paragraphIndex = poolIndex so citations stay stable across the response.
      const evidenceOut = evidence.map((e) => ({
        url: e.webUrl,
        basePath: e.basePath,
        paragraphIndex: e.poolIndex,
        docParagraphIndex: e.docParagraphIndex,
        snippet: e.text,
      }));

      const maxIdx = evidence.length;

      // Stage 5: “read” step.
      // The model must either answer or return NEED_CLARIFICATION with a grounded blocker.
      emit({
        type: "progress",
        stage: "analysing",
        detail: "Analysing evidence…",
      });

      const read = await generateObject({
        model: "openai/gpt-4o-mini",
        schema: ReadSchema,
        prompt: buildReadPrompt(userText, priorAnswers, evidence),
      });

      // Guardrails: never allow out-of-range cites.
      validateReadObject(read.object, maxIdx);

      // Only allow blockers that stay near the cites actually used in the gauntlet.
      // This keeps the model from inventing some unrelated blocker elsewhere in the pool.
      const allowed = localWindow(
        Array.from(
          new Set([
            ...read.object.supportCites,
            ...read.object.auditGauntlet.candidateRelief.cites,
            ...read.object.auditGauntlet.exclusionSearch.cites,
            ...read.object.auditGauntlet.conflictCheck.cites,
            ...read.object.auditGauntlet.defaultRateComparison.cites,
          ]),
        ),
        maxIdx,
        3,
      );

      const validBlockers = filterLocal(read.object.blockerCites, allowed);

      const canAsk =
        read.object.status === "NEED_CLARIFICATION" &&
        validBlockers.length > 0 &&
        !!read.object.unresolvedBranch;

      // Force-answer path.
      // Used when we can’t or shouldn’t ask more questions.
      async function emitForceAnswer() {
        emit({
          type: "progress",
          stage: "drafting",
          detail: "Drafting conditional answer…",
        });

        const forced = await generateObject({
          model: "openai/gpt-4o-mini",
          schema: ForceAnswerSchema,
          prompt: buildForceAnswerPrompt(userText, priorAnswers, evidence),
        });

        assertInRange(forced.object.citeParagraphs, maxIdx);
        for (const b of forced.object.bullets) assertInRange(b.cites, maxIdx);

        const citations = pickMinimalCitations(
          evidenceOut,
          forced.object.bullets.flatMap((b) => b.cites),
          { maxTotal: 6, maxPerDoc: 2 },
        );

        const needsReview = computeNeedsReview(
          basePaths,
          citations.map((c) => c.snippet),
        );

        const response: FlowResponse = {
          state: { answers: priorAnswers, asked: priorAsked, basePaths },
          questions: [],
          answer: {
            conclusion: forced.object.conclusion,
            reasoning: forced.object.bullets.map((b) => b.text),
            vatRate: forced.object.vatRate ?? null,
          },
          evidencePool: evidenceOut as any,
          citations: citations as any,
          needsReview,
        };

        emit({ type: "done", payload: FlowResponseSchema.parse(response) });
      }

      const readCites = collectReadCites(read.object);

      // Direct answer path.
      // We only accept an answer if the model has no surviving grounded blockers.
      if (
        read.object.status === "ANSWER" &&
        read.object.conclusion &&
        read.object.reasoningBullets &&
        validBlockers.length === 0
      ) {
        emit({
          type: "progress",
          stage: "drafting",
          detail: "Drafting answer…",
        });

        const citations = pickMinimalCitations(evidenceOut, readCites, {
          maxTotal: 6,
          maxPerDoc: 2,
        });

        const needsReview = computeNeedsReview(
          basePaths,
          citations.map((c) => c.snippet),
        );

        // Fold the audit gauntlet into the reasoning array so we can expose the path
        // without changing the shared FlowResponse shape.
        const reasoning = [
          read.object.auditGauntlet.candidateRelief.text,
          read.object.auditGauntlet.exclusionSearch.text,
          read.object.auditGauntlet.conflictCheck.text,
          read.object.auditGauntlet.defaultRateComparison.text,
          ...read.object.reasoningBullets.map((b) => b.text),
        ];

        const response: FlowResponse = {
          state: { answers: priorAnswers, asked: priorAsked, basePaths },
          questions: [],
          answer: {
            conclusion: read.object.conclusion,
            reasoning,
            vatRate: read.object.vatRate ?? null,
          },
          evidencePool: evidenceOut as any,
          citations: citations as any,
          needsReview,
        };

        emit({ type: "done", payload: FlowResponseSchema.parse(response) });
        return;
      }

      // Stall guard: cap how many clarifying questions we allow.
      if (priorAsked.length >= 2) {
        await emitForceAnswer();
        return;
      }

      // If we can’t justify a grounded blocker, don’t ask.
      // Fall back to the force-answer path instead.
      if (!canAsk) {
        await emitForceAnswer();
        return;
      }

      // Stage 6: generate a single clarifying question.
      emit({
        type: "progress",
        stage: "clarifying",
        detail: "Generating clarifying question…",
      });

      const ask = await generateObject({
        model: "openai/gpt-4o-mini",
        schema: AskSchema,
        prompt: buildAskPrompt(
          userText,
          priorAnswers,
          priorAsked,
          read.object.unresolvedBranch ?? "the blocking condition",
          read.object.supportCites,
          validBlockers,
          evidence,
        ),
      });

      const q = ask.object.question;

      assertInRange(q.citeParagraphs, maxIdx);
      assertInRange(
        q.options.map((o) => o.citeParagraph),
        maxIdx,
      );

      // If the model repeats an id we already asked, bail out to force answer.
      if (askedSet.has(q.id)) {
        await emitForceAnswer();
        return;
      }

      const nextAsked = [...priorAsked, q.id];

      const response: FlowResponse = {
        state: { answers: priorAnswers, asked: nextAsked, basePaths },
        questions: [q] as any,
        answer: null,
        evidencePool: evidenceOut as any,
        citations: [],
        needsReview: false,
      };

      emit({ type: "done", payload: FlowResponseSchema.parse(response) });
    } catch (err: any) {
      emit({ type: "error", message: err?.message ?? "Unknown error" });
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
