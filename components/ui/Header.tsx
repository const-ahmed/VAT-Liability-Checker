// Header.tsx
// Shared across all pages. Styles in globals.css under .header-*.
//   onBack     — shows a back chevron for inner pages
//   rightSlot  — defaults to version badge, pass null to hide
"use client";

import Link from "next/link";
import { NeuBadge } from "@/components/ui/NeuSurface";
import { Button } from "./button";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export function Header({
  onBack,
  onReset,
  rightSlot,
  onOpenModal,
}: {
  onBack?: () => void;
  onReset?: () => void;
  rightSlot?: React.ReactNode;
  onOpenModal?: () => void;
}) {
  const { data, isPending } = authClient.useSession();
  return (
    <header className="header">
      <div className="header-left">
        {onBack && (
          <button
            className="header-back-btn"
            onClick={onBack}
            aria-label="Go back"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="10 4 6 8 10 12" />
            </svg>
          </button>
        )}
        <Link href="/" className="header-wordmark" onClick={onReset}>
          Find<span className="accent">VAT</span>
        </Link>
      </div>
      <div>
        {rightSlot !== undefined ? (
          rightSlot
        ) : (
          <>
            {data ? (
              <Button
                className="header-wordmark"
                onClick={async () => { await authClient.signOut(); toast.success("Signed out!"); }}
              >
                Sign out
              </Button>
            ) : (
              <Button
                className="header-wordmark"
                onClick={() => onOpenModal?.()}
              >
                Log in
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
