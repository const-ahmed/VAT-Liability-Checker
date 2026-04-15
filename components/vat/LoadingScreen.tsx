"use client";

import { useEffect, useRef, useState } from "react";
import type { FlowResponse } from "@/lib/schemas/flow";
import { Header } from "@/components/ui/Header";

const STAGE_META: Record<string, string> = {
  classifying: "Classifying supply",
  selecting_notices: "Selecting VAT notices",
  fetching_notices: "Fetching legislation",
  scoring_paragraphs: "Scoring paragraphs",
  analysing: "Analysing evidence",
  drafting: "Drafting answer",
  clarifying: "Forming question",
};

const STAGE_ORDER = Object.keys(STAGE_META);

type StageRecord = {
  stage: string;
  detail?: string;
  completedAt?: number;
};

type Props = {
  request: {
    userText: string;
    answered?: { id: string; value: string }[];
    state?: FlowResponse["state"];
  };
  onDone: (response: FlowResponse) => void;
  onError: (message: string) => void;
};

export function LoadingScreen({ request, onDone, onError }: Props) {
  const startRef = useRef(Date.now());

  const [stages, setStages] = useState<StageRecord[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  // Stream the pipeline from /api/flow
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const res = await fetch("/api/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.body) {
        onError("No response body");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone || cancelled) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "progress") {
              setActive(event.stage);
              setStages((prev) => {
                const next = prev.map((s) =>
                  s.completedAt == null
                    ? { ...s, completedAt: Date.now() }
                    : s,
                );
                if (!next.find((s) => s.stage === event.stage))
                  next.push({ stage: event.stage, detail: event.detail });
                return next;
              });
            }

            if (event.type === "done") {
              setStages((prev) =>
                prev.map((s) =>
                  s.completedAt == null
                    ? { ...s, completedAt: Date.now() }
                    : s,
                ),
              );
              setActive(null);
              setDone(true);
              setTimeout(() => onDone(event.payload), 600);
            }

            if (event.type === "error") onError(event.message);
          } catch {
            /* malformed line — skip */
          }
        }
      }
    }

    run().catch((e) => onError(e?.message ?? "Fetch failed"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick the elapsed timer until done
  useEffect(() => {
    if (done) return;
    const id = setInterval(
      () => setElapsed(Date.now() - startRef.current),
      100,
    );
    return () => clearInterval(id);
  }, [done]);

  const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const completedCount = stages.filter((s) => s.completedAt != null).length;

  return (
    <>
      <Header />

      <div className="govuk-width-container">
        <main className="govuk-main-wrapper" id="main-content" role="main">
          <div className="govuk-grid-row">
            <div className="govuk-grid-column-two-thirds">

              <h1 className="govuk-heading-l">
                {done ? "Analysis complete" : "Analysing your query"}
              </h1>

              {/* Query text */}
              <div className="govuk-inset-text">
                <p className="govuk-body">&ldquo;{request.userText}&rdquo;</p>
              </div>

              {/* aria-live="polite" and aria-atomic="true" mean screen readers
                  announce the current stage as it changes without cutting off
                  whatever they're currently reading. */}
              {!done && (
                <p className="govuk-body" aria-live="polite" aria-atomic="true">
                  <span
                    className="govuk-spinner"
                    style={{ verticalAlign: "middle", marginRight: "8px" }}
                    role="status"
                    aria-label="Loading"
                  />
                  {active ? (STAGE_META[active] ?? active) : "Starting…"}
                  <span
                    className="govuk-!-colour-secondary"
                    style={{ marginLeft: "12px", fontSize: "0.875rem" }}
                  >
                    {fmt(elapsed)}
                  </span>
                </p>
              )}

              {/* All icons in the stage list are aria-hidden because the stage
                  name text is the meaningful content. aria-current="step" marks
                  the active item for screen readers. */}
              <ul className="loading-stage-list" aria-label="Progress steps">
                {STAGE_ORDER.map((key) => {
                  const record = stages.find((s) => s.stage === key);
                  const isActive = active === key;
                  const isDone = !!record?.completedAt;
                  const isPending = !record && !isActive;

                  return (
                    <li
                      key={key}
                      className={
                        isDone ? "done" : isActive ? "active" : undefined
                      }
                      aria-current={isActive ? "step" : undefined}
                    >
                      {isDone ? (
                        /* Tick mark */
                        <svg
                          className="loading-stage-done-icon"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : isActive ? (
                        <span
                          className="govuk-spinner"
                          style={{ width: "16px", height: "16px" }}
                          aria-hidden="true"
                        />
                      ) : (
                        <svg
                          className="loading-stage-pending-icon"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <circle cx="10" cy="10" r="4" />
                        </svg>
                      )}
                      {STAGE_META[key]}
                      {isDone && record?.completedAt && (
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: "0.75rem",
                            color: "#505a5f",
                          }}
                        >
                          done
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {done && (
                <p className="govuk-body govuk-!-colour-secondary">
                  Completed in {fmt(elapsed)} across {completedCount} steps.
                </p>
              )}

            </div>
          </div>
        </main>
      </div>

      <footer className="govuk-footer">
        <div className="govuk-width-container">
          <div className="govuk-footer__meta">
            <div className="govuk-footer__meta-item govuk-footer__meta-item--grow">
              <p className="govuk-body-s govuk-!-colour-secondary">
                VAT rates and rules are set by HMRC. This tool uses GOV.UK
                guidance and is not a substitute for professional advice.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
