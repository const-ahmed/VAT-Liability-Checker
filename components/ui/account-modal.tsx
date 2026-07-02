"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { authClient } from "@/lib/auth-client";
import { Input } from "./input";
import { Button } from "./button";
import { toast } from "sonner";

export default function AccountModal({ onClose }: { onClose?: () => void }) {
  const { data } = authClient.useSession();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    if (data?.user.name) setName(data.user.name);
  }, [data?.user.name]);

  async function handleSave() {
    const result = await authClient.updateUser({ name });
    if (result.error) {
      toast.error(result.error.message ?? "Could not update account");
      return;
    }
    if (businessName.trim()) {
      toast.info("Business profiles are coming soon — your business name hasn't been saved yet.");
    } else {
      toast.success("Account updated!");
    }
    onClose?.();
  }

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
        className="flex relative flex-col gap-4 bg-background p-6 rounded-lg shadow-shadow w-full max-w-sm mx-4"
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

        <h2 className="text-lg font-bold text-center">Account</h2>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Email</label>
          <Input
            value={data?.user.email ?? ""}
            disabled
            className="modal-input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Name</label>
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="modal-input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Business name</label>
          <Input
            placeholder="Your business name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="modal-input"
          />
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>

        <Button onClick={handleSave} className="w-full cursor-pointer">
          Save
        </Button>
      </motion.div>
    </motion.div>
  );
}
