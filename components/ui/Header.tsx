// Header.tsx
// Shared across all pages. Styles in globals.css under .header-*.
//   onBack     — shows a back chevron for inner pages
//   rightSlot  — defaults to version badge, pass null to hide
"use client";

import Link from "next/link";
import { useState } from "react";
import { NeuBadge } from "@/components/ui/NeuSurface";
import { Button } from "./button";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { CircleUser } from "lucide-react";
import { AnimatePresence } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import AccountModal from "./account-modal";
import BillingModal from "./billing-modal";

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
  const [openModal, setOpenModal] = useState<"account" | "billing" | null>(null);
  return (
    <>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="header-back-btn"
                      style={{ width: 42, height: 42 }}
                      aria-label="Account menu"
                    >
                      <CircleUser size={30} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-background text-foreground"
                  >
                    <DropdownMenuLabel className="bg-background text-foreground">
                      {data.user.name || data.user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="bg-background text-foreground cursor-pointer"
                      onClick={() => setOpenModal("account")}
                    >
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="bg-background text-foreground cursor-pointer"
                      onClick={() => setOpenModal("billing")}
                    >
                      Billing
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="bg-background text-foreground cursor-pointer"
                      onClick={async () => {
                        await authClient.signOut();
                        toast.success("Signed out!");
                      }}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
      <AnimatePresence>
        {openModal === "account" && (
          <AccountModal onClose={() => setOpenModal(null)} />
        )}
        {openModal === "billing" && (
          <BillingModal onClose={() => setOpenModal(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
