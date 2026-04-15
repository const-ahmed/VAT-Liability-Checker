"use client";

import { useEffect, useState } from "react";
import type { FlowResponse } from "@/lib/schemas/flow";
import { Header } from "../ui/Header";

const RATE_LABELS: Record<"zero" | "reduced" | "standard" | "exempt", string> =
  {
    zero: "Zero-rated · 0%",
    reduced: "Reduced rate · 5%",
    standard: "Standard-rated · 20%",
    exempt: "Exempt",
  };

const RATE_TAG_CLASS: Record<
  "zero" | "reduced" | "standard" | "exempt",
  string
> = {
  zero: "govuk-tag govuk-tag--green",
  reduced: "govuk-tag govuk-tag--orange",
  standard: "govuk-tag govuk-tag--blue",
  exempt: "govuk-tag govuk-tag--purple",
};

type Props = {
  query: string;
  response: FlowResponse;
  onReset: () => void;
};

export function AnswerScreen({ query, response, onReset }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const answer = response.answer!;
  const vatRate = answer.vatRate as
    | "zero"
    | "reduced"
    | "standard"
    | "exempt"
    | null
    | undefined;

  return (
    <>
      <Header />

      <div className="govuk-width-container">
        <main
          className={`govuk-main-wrapper anim-fade-in`}
          id="main-content"
          role="main"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}
        >
          {/* Back link */}
          <a
            href="#"
            className="govuk-back-link"
            onClick={(e) => {
              e.preventDefault();
              onReset();
            }}
          >
            New query
          </a>

          <div className="govuk-grid-row">
            <div className="govuk-grid-column-two-thirds">

              {/* Query recap */}
              <p className="govuk-caption-xl">{query}</p>

              {/* VAT rate result */}
              <h1 className="govuk-heading-xl">VAT liability result</h1>
              {/* Tag is below the h1, not inside it — it's a label not a heading. */}
              {vatRate && (
                <p>
                  <strong className={RATE_TAG_CLASS[vatRate]}>
                    {RATE_LABELS[vatRate]}
                  </strong>
                </p>
              )}

              {/* ! icon is aria-hidden — the visually-hidden span is what screen readers actually announce. */}
              {response.needsReview && (
                <div className="govuk-warning-text">
                  <span className="govuk-warning-text__icon" aria-hidden="true">
                    !
                  </span>
                  <strong className="govuk-warning-text__text">
                    <span className="govuk-visually-hidden">Warning</span>
                    This classification may be uncertain. Verify with a tax
                    adviser before relying on it.
                  </strong>
                </div>
              )}

              {/* Conclusion */}
              <div className="govuk-inset-text">
                <p className="govuk-body">{answer.conclusion}</p>
              </div>

              {/* Reasoning */}
              <h2 className="govuk-heading-m">Reasoning</h2>
              <ul className="reasoning-list">
                {answer.reasoning.map((bullet, i) => (
                  <li key={i} className="govuk-body">
                    {bullet}
                  </li>
                ))}
              </ul>

              {/* govuk-details is native <details>/<summary> — works without JS. */}
              {response.citations.length > 0 && (
                <>
                  <h2 className="govuk-heading-m">Sources</h2>
                  {response.citations.map((c, i) => {
                    const label = c.basePath
                      .split("/")
                      .pop()
                      ?.replace(/-/g, " ");
                    return (
                      <details key={i} className="govuk-details">
                        <summary className="govuk-details__summary">
                          <span className="govuk-details__summary-text">
                            {label} &mdash; paragraph {c.docParagraphIndex}
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

              {/* Actions */}
              <div className="govuk-button-group" style={{ marginTop: "32px" }}>
                <button
                  className="govuk-button govuk-button--secondary"
                  onClick={onReset}
                  type="button"
                >
                  Start a new query
                </button>
                <a
                  className="govuk-link"
                  href="https://www.gov.uk/government/collections/vat-notices-numerical-order"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GOV.UK VAT Notices
                </a>
              </div>

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
