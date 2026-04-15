import React from "react";

interface VATInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export default function VATInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'e.g. "importing a car from Argentina"',
  disabled = false,
  hasError = false,
  inputRef,
}: VATInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  };

  // aria-describedby always includes the hint and adds the error message id
  // when there is one. Screen readers announce both when the field is focused
  // so users hear the context and the error without having to navigate to them.
  const describedBy = [
    "supply-hint",
    hasError ? "supply-input-error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
      <input
        ref={inputRef}
        id="supply-input"
        className={`govuk-input${hasError ? " govuk-input--error" : ""}`}
        type="text"
        name="supply-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        aria-describedby={describedBy}
        // aria-invalid signals the error state to assistive technology
        // independently of the red border, which is a visual-only cue.
        aria-invalid={hasError ? "true" : undefined}
        style={{ flex: 1 }}
      />
      {/* type="submit" so the form submits natively without JS. A type="button"
          inside a form does nothing on its own when JavaScript is off. */}
      <button
        className="govuk-button"
        style={{ marginBottom: 0 }}
        disabled={disabled || !value.trim()}
        type="submit"
      >
        Check
      </button>
    </div>
  );
}
