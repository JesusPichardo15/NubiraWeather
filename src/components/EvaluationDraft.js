"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  clearHandoff, clearTabDraft, EMPTY_DRAFT, loadHandoff, loadTabDraft,
  normalizeDraft, readTabHandoffId, saveHandoff, saveTabDraft, saveTabHandoffId,
} from "@/lib/draft.mjs";

const EvaluationDraft = createContext(null);

export function useEvaluationDraft() {
  return useContext(EvaluationDraft);
}

export default function EvaluationDraftProvider({ children }) {
  const current = useRef(EMPTY_DRAFT);
  const handoffId = useRef(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (current.current === EMPTY_DRAFT) {
      const saved = loadTabDraft();
      if (saved) {
        current.current = saved;
        setDraft(saved);
      }
    }
    setRestored(true);
  }, []);

  const updateDraft = useCallback((patch) => {
    const fields = typeof patch === "function" ? patch(current.current) : patch;
    const next = { ...current.current, ...fields };
    current.current = next;
    setDraft(next);
    saveTabDraft(next);
  }, []);

  const beginHandoff = useCallback(() => {
    const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    handoffId.current = id;
    saveTabHandoffId(id);
    saveHandoff(id, current.current);
  }, []);

  function ownHandoffId() {
    return handoffId.current || readTabHandoffId();
  }

  function canResumeDraft() {
    return Boolean(loadHandoff() || (ownHandoffId() && normalizeDraft(current.current).result));
  }

  function resumeDraft() {
    const own = ownHandoffId();
    handoffId.current = null;
    saveTabHandoffId(null);
    if (own && normalizeDraft(current.current).result) {
      clearHandoff(own);
      return true;
    }
    const shared = loadHandoff();
    if (!shared) return false;
    updateDraft(shared.draft);
    clearHandoff(shared.id);
    return true;
  }

  function clearDraft() {
    current.current = EMPTY_DRAFT;
    handoffId.current = null;
    setDraft(EMPTY_DRAFT);
    clearTabDraft();
    saveTabHandoffId(null);
    clearHandoff();
  }

  return <EvaluationDraft.Provider value={{
    draft, restored, updateDraft, beginHandoff, canResumeDraft, resumeDraft, clearDraft,
  }}>{children}</EvaluationDraft.Provider>;
}
