import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { FlowResponse } from "@/lib/schemas/flow";
import { Header } from "@/components/ui/Header";

const RATE_LABELS: Record<string, string> = {
  zero: "Zero-rated · 0%",
  reduced: "Reduced rate · 5%",
  standard: "Standard-rated · 20%",
  exempt: "Exempt",
};

const RATE_TAG_CLASS: Record<string, string> = {
  zero: "govuk-tag govuk-tag--green",
  reduced: "govuk-tag govuk-tag--orange",
  standard: "govuk-tag govuk-tag--blue",
  exempt: "govuk-tag govuk-tag--purple",
};

// No-JS fallback. Server component so the result is fully rendered HTML — no blank screen.
export default async function CheckPage({
  searchParams,
}: {
  searchParams: { "supply-input"?: string };
}) {
  const query = (searchParams["supply-input"] ?? "").trim();

  if (!query) redirect("/");

  // Built from request headers so it works in dev and on Vercel without hardcoding anything.
  const headersList = headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  let result: FlowResponse | null = null;
  let fetchError: string | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/flow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userText: query }),
    });

    // API streams NDJSON — read it all as text and pick out the done event.
    // No point streaming here since we need the full result to render.
    const text = await res.text();

    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.type === "done") result = event.payload as FlowResponse;
        if (event.type === "error") fetchError = event.message;
      } catch {
        /* malformed line — skip */
      }
    }
  } catch (e: unknown) {
    fetchError =
      e instanceof Error ? e.message : "Failed to check VAT liability";
  }

  // Clarification rounds aren't supported here — too much complexity for a
  // path most users won't hit. Just ask them to enable JS.
  const needsClarification =
    result !== null && !result.answer && (result.questions?.length ?? 0) > 0;

  return (
    <>
      <Header />

      <div className="govuk-width-container">
        <main className="govuk-main-wrapper" id="main-content" role="main">
          <a href="/" className="govuk-back-link">
            New query
          </a>

          <div className="govuk-grid-row">
            <div className="govuk-grid-column-two-thirds">
              <p className="govuk-caption-xl">{query}</p>

              {/* API / network error */}
              {fetchError && (
                <div
                  className="govuk-error-summary"
                  role="alert"
                  aria-labelledby="error-summary-title"
                >
                  <h2
                    className="govuk-error-summary__title"
                    id="error-summary-title"
                  >
                    There is a problem
                  </h2>
                  <div className="govuk-error-summary__body">
                    <p className="govuk-body">{fetchError}</p>
                  </div>
                </div>
              )}

              {/* Clarification needed — no-JS cannot continue */}
              {needsClarification && (
                <>
                  <h1 className="govuk-heading-l">More information needed</h1>
                  <div className="govuk-inset-text">
                    <p className="govuk-body">
                      This query requires follow-up questions to classify
                      accurately. Please{" "}
                      <a href="/" className="govuk-link">
                        return to the tool
                      </a>{" "}
                      with JavaScript enabled to continue.
                    </p>
                  </div>
                </>
              )}

              {/* Direct answer */}
              {result?.answer && (
                <>
                  <h1 className="govuk-heading-xl">VAT liability result</h1>

                  {result.answer.vatRate && (
                    <p>
                      <strong
                        className={
                          RATE_TAG_CLASS[result.answer.vatRate] ??
                          "govuk-tag"
                        }
                      >
                        {RATE_LABELS[result.answer.vatRate] ??
                          result.answer.vatRate}
                      </strong>
                    </p>
                  )}

                  {result.needsReview && (
                    <div className="govuk-warning-text">
                      <span
                        className="govuk-warning-text__icon"
                        aria-hidden="true"
                      >
                        !
                      </span>
                      <strong className="govuk-warning-text__text">
                        <span className="govuk-visually-hidden">Warning</span>
                        This classification may be uncertain. Verify with a tax
                        adviser before relying on it.
                      </strong>
                    </div>
                  )}

                  <div className="govuk-inset-text">
                    <p className="govuk-body">{result.answer.conclusion}</p>
                  </div>

                  {result.answer.reasoning.length > 0 && (
                    <>
                      <h2 className="govuk-heading-m">Reasoning</h2>
                      <ul className="reasoning-list">
                        {result.answer.reasoning.map((bullet, i) => (
                          <li key={i} className="govuk-body">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {result.citations.length > 0 && (
                    <>
                      <h2 className="govuk-heading-m">Sources</h2>
                      {result.citations.map((c, i) => {
                        const label = c.basePath
                          .split("/")
                          .pop()
                          ?.replace(/-/g, " ");
                        return (
                          <details key={i} className="govuk-details">
                            <summary className="govuk-details__summary">
                              <span className="govuk-details__summary-text">
                                {label} &mdash; paragraph{" "}
                                {c.docParagraphIndex}
                              </span>
                            </summary>
                            <div className="govuk-details__text">
                              <p className="source-meta">
                                {label} · ¶{c.docParagraphIndex}
                              </p>
                              <p className="govuk-body">{c.snippet}</p>
                            </div>
                          </details>
                        );
                      })}
                    </>
                  )}

                  <div
                    className="govuk-button-group"
                    style={{ marginTop: "32px" }}
                  >
                    <a
                      href="/"
                      className="govuk-button govuk-button--secondary"
                    >
                      Start a new query
                    </a>
                    <a
                      className="govuk-link"
                      href="https://www.gov.uk/government/collections/vat-notices-numerical-order"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GOV.UK VAT Notices
                    </a>
                  </div>
                </>
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
