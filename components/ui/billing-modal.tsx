"use client";

import { X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "./button";
import { toast } from "sonner";

const plans = [
  {
    id: "free",
    label: "Free",
    price: "£0",
    period: "forever",
    features: ["5 searches per day", "No search history"],
    current: true,
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "£7.99",
    period: "per month",
    features: ["Unlimited searches", "Full search history"],
    current: false,
  },
  {
    id: "yearly",
    label: "Yearly",
    price: "£49.99",
    period: "per year",
    sub: "£4.17 / month",
    badge: "Best value",
    features: ["Unlimited searches", "Full search history", "Priority support"],
    current: false,
  },
] as const;

export default function BillingModal({ onClose }: { onClose?: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 flex justify-center items-center backdrop-blur-lg bg-black/20 z-50"
      onClick={() => onClose?.()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="flex relative flex-col gap-4 bg-background p-6 rounded-lg shadow-shadow w-full max-w-sm mx-4 overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 cursor-pointer"
          onClick={() => onClose?.()}
        >
          <X size={16} />
        </button>

        <h2 className="text-lg font-bold text-center">Billing</h2>

        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col gap-2 rounded-base border-2 border-border p-4 ${
                plan.current ? "bg-main text-main-foreground" : "bg-background"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-heading">{plan.label}</span>
                  {"badge" in plan && (
                    <span className="text-xs font-heading border-2 border-current rounded-base px-1.5 py-0.5">
                      {plan.badge}
                    </span>
                  )}
                </div>
                {plan.current && (
                  <span className="text-xs font-heading opacity-70">Current plan</span>
                )}
              </div>

              <div>
                <span className="text-xl font-heading">{plan.price}</span>
                <span className="text-xs opacity-70 ml-1">{plan.period}</span>
                {"sub" in plan && (
                  <p className="text-xs opacity-60">{plan.sub}</p>
                )}
              </div>

              <ul className="flex flex-col gap-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs opacity-80">
                    · {f}
                  </li>
                ))}
              </ul>

              {!plan.current && (
                <Button
                  variant="neutral"
                  className="w-full cursor-pointer mt-1"
                  onClick={() => toast.info("Payments are coming soon.")}
                >
                  Upgrade
                </Button>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
