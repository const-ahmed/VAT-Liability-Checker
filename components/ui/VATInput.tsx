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

  // Always includes the hint id, adds the error id when there is one.
  // Screen readers announce both on focus.
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
        // Red border alone doesn't work for screen readers.
        aria-invalid={hasError ? "true" : undefined}
        style={{ flex: 1 }}
      />
      {/* type="submit" so the form works without JS — type="button" won't submit. */}
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
