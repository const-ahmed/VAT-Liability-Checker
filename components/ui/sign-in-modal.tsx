"use client";

import { useState } from "react";

import { Button } from "./button";
import { authClient } from "@/lib/auth-client";
import { Input } from "./input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { Checkbox } from "./checkbox";
import { Label } from "./label";
import { X } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { toast } from "sonner";
import { motion } from "motion/react";

export default function SignInModal({
  onClose,
  onSuccess,
  draft,
}: {
  onClose?: () => void;
  onSuccess?: () => void;
  draft?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp" | "forgot">("signIn");

  async function handleSignIn() {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      toast.error(result.error.message ?? "Invalid email or password");
    } else {
      toast.success("Signed in!");
      onClose?.();
      onSuccess?.();
    }
  }

  async function handleSignUp() {
    const result = await authClient.signUp.email({ email, password, name });
    if (result.error) {
      toast.error(result.error.message ?? "Could not create account");
    } else {
      toast.success("Account created!");
      onClose?.();
      onSuccess?.();
    }
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
        className="flex relative flex-col gap-2 bg-background p-6 rounded-lg shadow-lg w-full max-w-sm mx-4 overflow-y-auto max-h-[90vh]"
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

        {mode === "forgot" ? (
          <>
            <h2 className="text-lg font-bold text-center">Forgot Password</h2>
            <p className="text-sm text-gray-500">
              Enter your email and we'll send you a reset link.
            </p>
            <Input
              placeholder="Email"
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              className="modal-input"
            />
            <Button
              onClick={async () => {
                const result = await authClient.requestPasswordReset({
                  email,
                  redirectTo: "/reset-password",
                });
                if (result.error) {
                  toast.error(
                    result.error.message ?? "Could not send reset link",
                  );
                } else {
                  toast.success("Reset link sent!");
                }
              }}
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
        ) : (
          <Tabs defaultValue="signIn">
            <TabsList className="w-full">
              <TabsTrigger value="signIn" className="flex-1">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signUp" className="flex-1">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signIn" className="flex flex-col gap-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSignIn();
                }}
                className="flex flex-col gap-4"
              >
                <h1 className="text-lg font-bold text-center">Sign in</h1>
                <Input
                  placeholder="Email"
                  value={email}
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  className="modal-input"
                />
                <Input
                  placeholder="Password"
                  value={password}
                  type="password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="modal-input"
                />
                <button
                  type="button"
                  className="text-xs text-gray-400 cursor-pointer self-end"
                  onClick={() => setMode("forgot")}
                >
                  Forgot password?
                </button>
                <Button type="submit" className="cursor-pointer">
                  Sign in
                </Button>
              </form>
              <div className="flex items-center gap-2 my-1">
                <hr className="flex-1 border-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <hr className="flex-1 border-gray-200" />
              </div>
              <button
                className="flex items-center justify-center gap-2 w-full bg-black text-white rounded-md py-2 px-4 hover:bg-gray-900 cursor-pointer"
                onClick={() => {
                  if (draft) sessionStorage.setItem("pending_draft", draft);
                  authClient.signIn.social({ provider: "github" });
                }}
              >
                <FaGithub size={18} /> Continue with GitHub
              </button>
            </TabsContent>

            <TabsContent value="signUp" className="flex flex-col gap-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSignUp();
                }}
                className="flex flex-col gap-4"
              >
                <h1 className="text-lg font-bold text-center">Sign up</h1>
                <Input
                  placeholder="Name"
                  value={name}
                  type="text"
                  onChange={(e) => setName(e.target.value)}
                  className="modal-input"
                />
                <Input
                  placeholder="Email"
                  value={email}
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  className="modal-input"
                />
                <Input
                  placeholder="Password"
                  value={password}
                  type="password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="modal-input"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="terms"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(!!v)}
                    className="cursor-pointer m-1"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-xs text-gray-500 font-normal cursor-pointer"
                  >
                    I agree to the Terms of Service and Privacy Policy
                  </Label>
                </div>
                <Button type="submit" disabled={!agreed}>
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </motion.div>
    </motion.div>
  );
}
