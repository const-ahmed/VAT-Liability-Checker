"use client";

import { useState, useEffect } from "react";
import type { FlowResponse } from "@/lib/schemas/flow";
import { Header } from "@/components/ui/Header";

type Props = {
  query: string;
  response: FlowResponse;
  onSubmitAnswer: (questionId: string, value: string) => void;
  onReset: () => void;
};

export function ClarifierScreen({
  query,
  response,
  onSubmitAnswer,
  onReset,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(id);
  }, []);

  const q = response.questions[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || submitting) return;
    setSubmitting(true);
    onSubmitAnswer(q.id, selected);
  }

  return (
    <>
      <Header />

      <div className="govuk-width-container">
        <main
          className="govuk-main-wrapper"
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
            Start over
          </a>

          <div className="govuk-grid-row">
            <div className="govuk-grid-column-two-thirds">

              {/* Query recap */}
              <p className="govuk-caption-l">{query}</p>

              <form onSubmit={handleSubmit} noValidate>
                <div className="govuk-form-group">
                  {/* Radio groups must be wrapped in a fieldset with a legend.
                      Without this, screen readers don't know which question the
                      radios belong to. aria-describedby on the fieldset links
                      the hint text to the whole group. */}
                  <fieldset
                    className="govuk-fieldset"
                    aria-describedby="clarifier-hint"
                  >
                    {/* GDS requires the page's main question to be the h1. For
                        radio pages the question is the legend, so the h1 lives
                        inside the legend rather than separately above the form. */}
                    <legend className="govuk-fieldset__legend govuk-fieldset__legend--l">
                      <h1 className="govuk-fieldset__heading">
                        {q.questionText}
                      </h1>
                    </legend>

                    <div
                      id="clarifier-hint"
                      className="govuk-hint"
                    >
                      {q.reasoning}
                    </div>

                    <div className="govuk-radios" data-module="govuk-radios">
                      {q.options.map((opt) => (
                        <div className="govuk-radios__item" key={opt.value}>
                          <input
                            className="govuk-radios__input"
                            id={`opt-${opt.value}`}
                            name="clarifier-answer"
                            type="radio"
                            value={opt.value}
                            checked={selected === opt.value}
                            onChange={() =>
                              !submitting && setSelected(opt.value)
                            }
                            disabled={submitting}
                          />
                          <label
                            className="govuk-label govuk-radios__label"
                            htmlFor={`opt-${opt.value}`}
                          >
                            {opt.label}
                          </label>
                          {opt.description && (
                            <div
                              className="govuk-hint govuk-radios__hint"
                            >
                              {opt.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <div className="govuk-button-group">
                  <button
                    className="govuk-button"
                    type="submit"
                    disabled={!selected || submitting}
                  >
                    {submitting ? "Analysing…" : "Continue"}
                  </button>
                  <a
                    href="#"
                    className="govuk-link"
                    onClick={(e) => {
                      e.preventDefault();
                      onReset();
                    }}
                  >
                    Cancel
                  </a>
                </div>
              </form>

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
