"use client";

import { useState } from "react";

import { Button } from "./button";
import { authClient } from "@/lib/auth-client";
import { Input } from "./input";
import { X } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { toast } from "sonner";
import { motion } from "motion/react";

export default function SignInModal({
  onClose,
  onSuccess,
}: {
  onClose?: () => void;
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp" | "forgot">("signIn");

  async function handleSignIn() {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      console.error(result.error);
    } else {
      toast.success("Signed in!");
      onClose?.();
      onSuccess?.();
    }
  }

  async function handleSignUp() {
    const result = await authClient.signUp.email({ email, password, name });
    if (result.error) {
      console.error(result.error);
    } else {
      toast.success("Account created!");
      onClose?.();
      onSuccess?.();
    }
  }
  return (
    <motion.div
      className="fixed inset-0 flex justify-center items-center backdrop-blur-sm"
      onClick={() => onClose?.()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="flex relative flex-col gap-2 bg-white p-6 rounded-lg shadow-lg w-full max-w-sm mx-4 overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-lg font-bold text-center">
          {mode === "signIn"
            ? "Sign In"
            : mode === "signUp"
              ? "Sign Up"
              : "Forgot Password"}
        </h2>
        <button
          className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 cursor-pointer"
          onClick={() => onClose?.()}
        >
          <X size={16} />
        </button>
        {mode === "signIn" && (
          <>
            <form onSubmit={(e) => { e.preventDefault(); handleSignIn(); }} className="flex flex-col gap-2">
              <Input
                placeholder="Email"
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                placeholder="Password"
                value={password}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="text-xs text-gray-400 cursor-pointer self-end"
                onClick={() => setMode("forgot")}
              >
                Forgot password?
              </button>
              <Button type="submit" className="cursor-pointer">Sign in</Button>
            </form>
            <div className="flex items-center gap-2 my-1">
              <hr className="flex-1 border-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <hr className="flex-1 border-gray-200" />
            </div>
            <button
              className="flex items-center justify-center gap-2 w-full bg-black text-white rounded-md py-2 px-4 hover:bg-gray-900 cursor-pointer"
              onClick={() => authClient.signIn.social({ provider: "github" })}
            >
              <FaGithub size={18} /> Continue with GitHub
            </button>
            <p className="text-xs text-center text-gray-400">
              Don't have an account?{" "}
              <button
                className="underline cursor-pointer"
                onClick={() => setMode("signUp")}
              >
                Create one
              </button>
            </p>
          </>
        )}

        {mode === "signUp" && (
          <>
            <form onSubmit={(e) => { e.preventDefault(); handleSignUp(); }} className="flex flex-col gap-2">
              <Input
                placeholder="Name"
                value={name}
                type="text"
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Email"
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                placeholder="Password"
                value={password}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit">Create account</Button>
            </form>
            <p className="text-xs text-center text-gray-400">
              Already have an account?{" "}
              <button
                className="underline cursor-pointer"
                onClick={() => setMode("signIn")}
              >
                Sign in
              </button>
            </p>
          </>
        )}

        {mode === "forgot" && (
          <>
            <p className="text-sm text-gray-500">
              Enter your email and we'll send you a reset link.
            </p>
            <Input
              placeholder="Email"
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              onClick={() =>
                authClient.requestPasswordReset({
                  email,
                  redirectTo: "/reset-password",
                })
              }
            >
              Send reset link
            </Button>
            <p className="text-xs text-center text-gray-400">
              <button
                className="underline cursor-pointer"
                onClick={() => setMode("signIn")}
              >
                Back to sign in
              </button>
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
