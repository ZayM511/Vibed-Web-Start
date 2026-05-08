"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Copy, Pencil, Save, X, RotateCcw, Check, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import { getOutreachContent, type OutreachContent } from "@/lib/outreach-content";

type StoredOverride = {
  subject: string;
  body: string;
};

const STORAGE_PREFIX = "outreach-email:";

function loadOverride(influencerId: string): StoredOverride | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + influencerId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredOverride;
    if (typeof parsed.subject === "string" && typeof parsed.body === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveOverride(influencerId: string, override: StoredOverride) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + influencerId,
      JSON.stringify(override),
    );
  } catch {
    // localStorage write can fail (quota, private mode, etc.); silent ignore is fine
  }
}

function clearOverride(influencerId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + influencerId);
  } catch {
    // see above
  }
}

export function OutreachEmailSection({
  influencerId,
  influencerName,
}: {
  influencerId: string;
  influencerName: string;
}) {
  const baked: OutreachContent | null = useMemo(
    () => getOutreachContent(influencerId),
    [influencerId],
  );

  const [hydrated, setHydrated] = useState(false);
  const [override, setOverride] = useState<StoredOverride | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const { copiedKey, copyText } = useCopyFeedback();

  useEffect(() => {
    setOverride(loadOverride(influencerId));
    setHydrated(true);
  }, [influencerId]);

  if (!baked) {
    return (
      <div className="space-y-2 md:col-span-2">
        <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          Outreach Email
        </h5>
        <p className="text-xs text-zinc-500 italic bg-white/5 rounded-lg p-3 border border-white/10">
          No baked email content yet for this creator. Add an entry in
          <code className="mx-1 px-1 py-0.5 bg-black/30 rounded text-zinc-400">lib/outreach-content.ts</code>
          to generate one.
        </p>
      </div>
    );
  }

  const effectiveSubject = override?.subject ?? baked.subject;
  const effectiveBody = override?.body ?? baked.body;
  const isOverridden = override !== null;

  const beginEdit = () => {
    setDraftSubject(effectiveSubject);
    setDraftBody(effectiveBody);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraftSubject("");
    setDraftBody("");
  };

  const commitEdit = () => {
    const next: StoredOverride = {
      subject: draftSubject.trim(),
      body: draftBody.trim(),
    };
    saveOverride(influencerId, next);
    setOverride(next);
    setIsEditing(false);
  };

  const resetToBaked = () => {
    clearOverride(influencerId);
    setOverride(null);
    setIsEditing(false);
  };

  const fullCopyKey = `email-full:${influencerId}`;
  const subjectCopyKey = `email-subject:${influencerId}`;
  const bodyCopyKey = `email-body:${influencerId}`;

  const fullText = `Subject: ${effectiveSubject}\n\n${effectiveBody}`;

  // While hydrating from localStorage, render a stable view to avoid SSR mismatch
  if (!hydrated) {
    return (
      <div className="space-y-2 md:col-span-2">
        <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          Outreach Email
        </h5>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-xs text-zinc-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 md:col-span-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          Outreach Email
        </h5>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {baked.score.toFixed(1)}/10
          </span>
          <span className="text-[10px] text-zinc-500">
            from <span className="text-zinc-300 font-mono">{baked.sender}</span>
          </span>
          {isOverridden && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              edited
            </span>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
          {/* Subject row */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 flex-shrink-0">
                Subject
              </span>
              <span className="text-xs text-white truncate">{effectiveSubject}</span>
            </div>
            <button
              type="button"
              onClick={() => copyText(subjectCopyKey, effectiveSubject)}
              className="text-zinc-400 hover:text-white transition-colors flex-shrink-0"
              aria-label="Copy subject"
              title="Copy subject"
            >
              {copiedKey === subjectCopyKey ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Body */}
          <pre className="text-xs text-zinc-200 leading-relaxed p-3 whitespace-pre-wrap font-sans">
            {effectiveBody}
          </pre>

          {/* Action bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-white/10 bg-white/[0.02] flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => copyText(fullCopyKey, fullText)}
                className="flex items-center gap-1.5 text-[11px] text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/10 transition-colors"
              >
                {copiedKey === fullCopyKey ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy email
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => copyText(bodyCopyKey, effectiveBody)}
                className="flex items-center gap-1.5 text-[11px] text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/10 transition-colors"
              >
                {copiedKey === bodyCopyKey ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy body
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={beginEdit}
                className="flex items-center gap-1.5 text-[11px] text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/10 transition-colors"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </div>
            {isOverridden && (
              <button
                type="button"
                onClick={resetToBaked}
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white bg-transparent hover:bg-white/5 px-2.5 py-1 rounded-md border border-white/10 transition-colors"
                title={`Reset to baked email for ${influencerName}`}
              >
                <RotateCcw className="h-3 w-3" />
                Reset to original
              </button>
            )}
          </div>
        </div>
      )}

      {isEditing && (
        <div className="bg-white/5 rounded-lg border border-amber-500/30 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10 bg-amber-500/5">
            <span className="text-[10px] uppercase tracking-wider text-amber-300/80">
              Editing email for {influencerName}
            </span>
          </div>
          <div className="p-3 space-y-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500">
                Subject
              </label>
              <Input
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
                className="h-8 bg-white/5 border-white/10 text-xs text-white"
                placeholder="lowercase, under 45 chars works best"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500">
                Body
              </label>
              <Textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                className="min-h-[260px] bg-white/5 border-white/10 text-xs text-zinc-200 leading-relaxed font-sans resize-y"
                placeholder="Write your tailored cold email..."
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-white/10 bg-white/[0.02]">
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center gap-1.5 text-[11px] text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/10 transition-colors"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button
              type="button"
              onClick={commitEdit}
              disabled={!draftSubject.trim() || !draftBody.trim()}
              className="flex items-center gap-1.5 text-[11px] text-white bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1 rounded-md border border-emerald-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="h-3 w-3" />
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
