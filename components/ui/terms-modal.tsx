"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";

export default function TermsModal({ onClose }: { onClose?: () => void }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    fetch("/terms.html")
      .then((r) => r.text())
      .then((raw) => {
        const cleaned = raw
          .replace(/font-family:[^;'"]+;?/g, "")
          .replace(/color:#[0-9a-fA-F]{3,6};?/g, "")
          .replace(/color:rgb\([^)]+\);?/g, "")
          .replace(/mso-[a-z-]+:[^;'"]+;?/g, "");
        setHtml(cleaned);
      });
  }, []);

  return (
    <motion.div
      className="fixed inset-0 flex justify-center items-center backdrop-blur-lg bg-black/20 z-60"
      onClick={() => onClose?.()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="flex relative flex-col bg-background p-6 rounded-lg shadow-shadow w-full max-w-2xl mx-4 overflow-y-auto max-h-[90vh]"
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

        {html ? (
          <div
            className="text-sm leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_li]:mb-1 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-sm text-gray-400">Loading…</p>
        )}
      </motion.div>
    </motion.div>
  );
}
