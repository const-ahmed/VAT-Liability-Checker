"use client";

import { useRef, useEffect, useState } from "react";
import { Header } from "@/components/ui/Header";
import VATInput from "../ui/VATInput";

const EXAMPLE_QUERIES = [
  "Is children's clothing zero-rated or exempt?",
  "What rate applies to hot takeaway food?",
  "Is residential construction standard or zero-rated?",
];

export function InitialScreen({
  draft,
  setDraft,
  loading,
  error,
  onSubmitInitial,
}: {
  draft: string;
  setDraft: (v: string) => void;
  loading: boolean;
  error: string | null;
  onSubmitInitial: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!loading && draft.trim()) onSubmitInitial();
  };

  // Intercept the native form GET when JS is available so the client-side
  // streaming flow runs instead. Without JS the form falls through to /check.
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  return (
    <>
      <Header />

      <div className="govuk-width-container">
        <main
          className="govuk-main-wrapper"
          id="main-content"
          role="main"
        >
          <div className="govuk-grid-row">
            <div className="govuk-grid-column-two-thirds">

              <h1 className="govuk-heading-xl">
                Check the VAT liability of a supply
              </h1>

              <p className="govuk-body-l">
                Describe the goods or services to find out whether they are
                standard-rated, reduced-rated, zero-rated, or exempt from VAT
                under UK law.
              </p>

              <div className="govuk-inset-text">
                This tool is for guidance only. Always verify with{" "}
                <a
                  href="https://www.gov.uk/government/collections/vat-notices-numerical-order"
                  className="govuk-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GOV.UK VAT Notices
                </a>{" "}
                or a qualified tax adviser.
              </div>

              {/* Error summary goes before the form — GDS requirement. The linked
                  list lets keyboard users jump directly to the field. */}
              {error && !loading && (
                <div
                  className="govuk-error-summary"
                  data-module="govuk-error-summary"
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
                    <ul className="govuk-list govuk-error-summary__list">
                      <li>
                        <a href="#supply-input">{error}</a>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* action="/check" handles the no-JS case. onSubmit intercepts when
                  JS is available. noValidate kills browser validation so we
                  control the error UI. */}
              <form action="/check" method="get" onSubmit={handleFormSubmit} noValidate>
                <div
                  className={`govuk-form-group${error && !loading ? " govuk-form-group--error" : ""}`}
                >
                  <label
                    className="govuk-label govuk-label--m"
                    htmlFor="supply-input"
                  >
                    Describe the supply
                  </label>
                  <div className="govuk-hint" id="supply-hint">
                    Include details such as what the goods or services are, how
                    they are supplied, and to whom. Press Enter to submit.
                  </div>

                  {/* GDS needs all three set together for the full error state —
                      left bar on the group, red outline on the input, message above it. */}
                  {error && !loading && (
                    <p className="govuk-error-message" id="supply-input-error">
                      <span className="govuk-visually-hidden">Error:</span>
                      {error}
                    </p>
                  )}

                  <VATInput
                    value={draft}
                    onChange={setDraft}
                    onSubmit={submit}
                    placeholder='e.g. "importing a car from Argentina"'
                    disabled={loading}
                    hasError={!!(error && !loading)}
                    inputRef={inputRef}
                  />
                </div>
              </form>

              {/* Loading state */}
              {loading && (
                <p className="govuk-body" aria-live="polite">
                  <span
                    className="govuk-spinner"
                    style={{ verticalAlign: "middle", marginRight: "8px" }}
                    role="status"
                    aria-label="Loading"
                  />
                  Analysing your query…
                </p>
              )}

              {/* Example queries */}
              <h2 className="govuk-heading-s">Example queries</h2>
              <ul className="govuk-list govuk-list--bullet">
                {EXAMPLE_QUERIES.map((q) => (
                  <li key={q}>
                    <a
                      href="#"
                      className="govuk-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setDraft(q);
                        inputRef.current?.focus();
                      }}
                    >
                      {q}
                    </a>
                  </li>
                ))}
              </ul>

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
