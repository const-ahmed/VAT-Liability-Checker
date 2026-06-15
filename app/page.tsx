"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import SignInModal from "@/components/ui/sign-in-modal";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

import type { FlowResponse } from "@/lib/schemas/flow";

import { InitialScreen } from "@/components/vat/InitialScreen";
import { AnswerScreen } from "@/components/vat/AnswerScreen";
import { ClarifierScreen } from "@/components/vat/ClarifierScreen";
import { LoadingScreen } from "@/components/vat/LoadingScreen";

type AnswersMap = Record<string, string>;

export type AnsweredPair = { id: string; value: string; label?: string };

export type RoundEntry = {
  id: string;
  answered: AnsweredPair[];
  data: FlowResponse;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Shape LoadingScreen POSTs to /api/flow
type PendingRequest = {
  userText: string;
  answered?: { id: string; value: string }[];
  state?: FlowResponse["state"];
};

export default function Page() {
  const { data: session } = authClient.useSession();
  const prevSessionRef = useRef<boolean>(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [draft, setDraft] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const [rounds, setRounds] = useState<RoundEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingAnswers, setPendingAnswers] = useState<AnswersMap>({});
  const [showEvidence, setShowEvidence] = useState(false);

  // when set, LoadingScreen renders and owns the fetch
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(
    null,
  );

  // carries answeredMeta across the async boundary
  const pendingAnsweredMetaRef = useRef<AnsweredPair[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const latest = rounds[rounds.length - 1]?.data ?? null;
  const questions = latest?.questions ?? [];
  const isActive = submittedQuery !== null;

  const answeredChipsByRound = useMemo(() => {
    const map = new Map<string, AnsweredPair[]>();
    for (const r of rounds) map.set(r.id, r.answered);
    return map;
  }, [rounds]);

  useEffect(() => {
    if (session && !prevSessionRef.current) toast.success("Signed in!");
    prevSessionRef.current = !!session;
  }, [session]);

  useEffect(() => {
    if (!latest) return;
    const next: AnswersMap = {};
    for (const q of questions) {
      const existing = latest.state.answers[q.id];
      if (existing) next[q.id] = existing;
    }
    setPendingAnswers(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.state?.asked?.length, questions.length]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [rounds.length, loading, error]);

  useEffect(() => {
    const pendingDraft = sessionStorage.getItem("pending_draft");
    if (pendingDraft) {
      setDraft(pendingDraft);
      sessionStorage.removeItem("pending_draft");
    }
  }, []);

  function startFresh() {
    setSubmittedQuery(null);
    setRounds([]);
    setPendingAnswers({});
    setError(null);
    setLoading(false);
    setShowEvidence(false);
    setPendingRequest(null);
  }

  // Called by LoadingScreen when stream emits { type: "done" }
  function handleStreamDone(data: FlowResponse) {
    setRounds((cur) => [
      ...cur,
      { id: uid(), answered: pendingAnsweredMetaRef.current, data },
    ]);
    setLoading(false);
    setPendingRequest(null);
    pendingAnsweredMetaRef.current = [];
  }

  function handleStreamError(msg: string) {
    startFresh();
    setError(msg);
  }

  // Initial submit
  function submitInitial() {
    if (!session) {
      setShowSignInModal(true);
      return;
    }
    signInAndSubmit();
  }

  function signInAndSubmit() {
    const q = draft.trim();
    if (!q) return;
    startFresh();
    setSubmittedQuery(q);
    pendingAnsweredMetaRef.current = [];
    setPendingRequest({ userText: q });
    setLoading(true);
  }

  // Render

  // LoadingScreen takes over while streaming
  if (loading && pendingRequest) {
    return (
      <LoadingScreen
        request={pendingRequest}
        onDone={handleStreamDone}
        onError={handleStreamError}
      />
    );
  }

  if (!isActive) {
    return (
      <>
        <InitialScreen
          draft={draft}
          setDraft={setDraft}
          loading={loading}
          error={error}
          onSubmitInitial={submitInitial}
          onOpenModal={() => setShowSignInModal(true)}
        />
        <AnimatePresence>
          {showSignInModal && (
            <SignInModal
              onClose={() => setShowSignInModal(false)}
              onSuccess={signInAndSubmit}
              draft={draft}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  if (latest?.answer) {
    return (
      <AnswerScreen
        query={submittedQuery}
        response={latest}
        onReset={startFresh}
      />
    );
  }

  if (latest?.questions.length) {
    return (
      <ClarifierScreen
        query={submittedQuery}
        response={latest}
        onSubmitAnswer={(questionId, value) => {
          if (!latest || !submittedQuery) return;
          const q = questions.find((q) => q.id === questionId);
          const opt = q?.options.find((o) => o.value === value);
          const answeredForThisRound: AnsweredPair[] = [
            { id: questionId, value, label: opt?.label },
          ];
          pendingAnsweredMetaRef.current = answeredForThisRound;
          setPendingRequest({
            userText: submittedQuery,
            answered: [{ id: questionId, value }],
            state: latest.state,
          });
          setLoading(true);
        }}
        onReset={startFresh}
      />
    );
  }
}
