"use client";

import { X } from "lucide-react";
import { motion } from "motion/react";

export default function PrivacyModal({ onClose }: { onClose?: () => void }) {
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
        className="flex relative flex-col gap-2 bg-background p-6 rounded-lg shadow-shadow w-full max-w-sm mx-4 overflow-y-auto max-h-[90vh]"
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

        <h1 className="text-lg font-bold text-center">Privacy Policy</h1>
        <p className="text-xs text-gray-500">This notice tells you what to expect us to do with your personal information.</p>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold mt-4">Contact details</h2>
          <p className="text-xs text-gray-500">
            Email: <a href="mailto:ahmed.h15@hotmail.com" className="underline">ahmed.h15@hotmail.com</a>
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold mt-4">What information we collect, use, and why</h2>
          <p className="text-xs text-gray-500">To provide services:</p>
          <ul className="list-disc pl-4 flex flex-col gap-0.5">
            <li className="text-xs text-gray-500">Names and contact details</li>
            <li className="text-xs text-gray-500">Purchase or account history</li>
            <li className="text-xs text-gray-500">Payment details</li>
            <li className="text-xs text-gray-500">Account information</li>
            <li className="text-xs text-gray-500">Website user information (including user journeys and cookie tracking)</li>
          </ul>
          <p className="text-xs text-gray-500 mt-1">For customer accounts:</p>
          <ul className="list-disc pl-4 flex flex-col gap-0.5">
            <li className="text-xs text-gray-500">Names and contact details</li>
            <li className="text-xs text-gray-500">Addresses</li>
            <li className="text-xs text-gray-500">Payment details</li>
            <li className="text-xs text-gray-500">Purchase history</li>
            <li className="text-xs text-gray-500">Account information, including registration details</li>
            <li className="text-xs text-gray-500">Information used for security purposes</li>
            <li className="text-xs text-gray-500">Marketing preferences</li>
          </ul>
          <p className="text-xs text-gray-500 mt-1">To comply with legal requirements:</p>
          <ul className="list-disc pl-4 flex flex-col gap-0.5">
            <li className="text-xs text-gray-500">Contact information</li>
            <li className="text-xs text-gray-500">Financial transaction information</li>
            <li className="text-xs text-gray-500">Any other personal information required to comply with legal obligations</li>
          </ul>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold mt-4">Lawful bases and data protection rights</h2>
          <p className="text-xs text-gray-500">
            Under UK data protection law, we must have a lawful basis for collecting and using your personal information. Your rights include:
          </p>
          <ul className="list-disc pl-4 flex flex-col gap-0.5">
            <li className="text-xs text-gray-500">Right of access — copies of your personal information</li>
            <li className="text-xs text-gray-500">Right to rectification — correct or delete inaccurate data</li>
            <li className="text-xs text-gray-500">Right to erasure — ask us to delete your data</li>
            <li className="text-xs text-gray-500">Right to restriction of processing</li>
            <li className="text-xs text-gray-500">Right to object to processing</li>
            <li className="text-xs text-gray-500">Right to data portability</li>
            <li className="text-xs text-gray-500">Right to withdraw consent at any time</li>
          </ul>
          <p className="text-xs text-gray-500 mt-1">
            We must respond to requests within one month. Our lawful bases are consent, contract, and legal obligation depending on the purpose of processing.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold mt-4">Where we get personal information from</h2>
          <ul className="list-disc pl-4 flex flex-col gap-0.5">
            <li className="text-xs text-gray-500">Directly from you</li>
            <li className="text-xs text-gray-500">Publicly available sources</li>
          </ul>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold mt-4">How long we keep information</h2>
          <p className="text-xs text-gray-500">
            For more information on how long we store your personal information, please contact us using the details above.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold mt-4">How to complain</h2>
          <p className="text-xs text-gray-500">
            Contact us at <a href="mailto:ahmed.h15@hotmail.com" className="underline">ahmed.h15@hotmail.com</a> with any concerns about our use of your data.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            You can also complain to the ICO: <a href="https://www.ico.org.uk/make-a-complaint" target="_blank" rel="noopener noreferrer" className="underline">ico.org.uk/make-a-complaint</a> · 0303 123 1113
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
