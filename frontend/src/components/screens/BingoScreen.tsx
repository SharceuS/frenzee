"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room } from "@/lib/types";
import { apiBingoClaim } from "@/lib/api";
import { sfxTap, sfxSubmit } from "@/lib/sounds";

// Mirror of backend BINGO_ITEMS array (backend/data/questions.js)
const BINGO_ITEMS = [
  "Someone checks their phone",
  "An awkward silence",
  "Someone says 'literally'",
  "Someone laughs at their own joke",
  "Someone says 'I'm not racist but…'",
  "Dad joke incoming",
  "Plot twist nobody saw coming",
  "We debate something unimportant for 10 min",
  "Someone changes the subject randomly",
  "The word 'vibe' is used",
  "Someone brings up astrology",
  "Group photo attempt",
  "Someone forgets what they were saying mid-sentence",
  "Unsolicited life advice given",
  "Someone impersonates another person",
  "Competitive spirit escalates suddenly",
  "A food gets spilled",
  "Someone does an accent",
  "Nostalgia story from childhood",
  "Someone says 'no offense but…'",
  "A pet makes an appearance",
  "Debate about a movie or show",
  "Someone brings up an ex",
  "Unexpected singing or humming",
  "Someone dramatically overreacts",
  "A plan is made that will never happen",
  "Someone is on a diet but cheats",
  "The WiFi is blamed for something",
  "Inside joke explained to someone new",
  "Someone says 'trust me'",
  "A conspiracy theory surfaces",
  "Someone leaves the room for suspiciously long",
  "Unprompted roast of someone present",
  "Someone falls for a sarcastic comment",
  "The word 'technically' is used",
  "Unsolicited opinion about someone's relationship",
  "A price is mentioned and everyone gasps",
  "Someone admits to something embarrassing",
  "Two people agree on something surprising",
  "A decision goes to a vote",
  "Someone quotes a movie or TV show",
  "A fight over the thermostat",
  "Someone says 'back in my day'",
  "A deep question interrupts the vibe",
  "Someone calls out a double standard",
  "Someone does something 'for content'",
  "A text arrives at an awkward moment",
  "Someone apologizes sarcastically",
  "Competitive game about to get intense",
  "Someone says 'I told you so'",
];

interface Props {
  room: Room;
  myId: string;
}

type ClaimStatus = "idle" | "claiming" | "success" | "invalid";

export default function BingoScreen({ room, myId }: Props) {
  const card = room.bingoCards?.[myId] ?? null;
  const calledItems = room.bingoCalledItems ?? [];
  const winners = room.bingoWinners ?? [];

  // Client-side extra marks (manually tapped by the player).
  // Called-item slots are auto-derived, so this only stores additional manual marks.
  const [extraMarks, setExtraMarks] = useState<Set<number>>(new Set());
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [claimMsg, setClaimMsg] = useState("");
  const [shake, setShake] = useState(false);

  // Derive the complete marked set reactively — no useEffect needed.
  const calledSet = new Set(calledItems);
  const markedSlots = new Set<number>([12]); // FREE center is always marked
  if (card) {
    card.forEach((itemIdx, slotIdx) => {
      if (itemIdx !== -1 && calledSet.has(itemIdx)) markedSlots.add(slotIdx);
    });
  }
  extraMarks.forEach(s => markedSlots.add(s));

  const toggleSlot = (slotIdx: number) => {
    if (slotIdx === 12) return; // FREE cannot be toggled
    sfxTap();
    setExtraMarks(prev => {
      const next = new Set(prev);
      // If already auto-marked (called), toggle removes it from extraMarks won't help;
      // we allow toggling only truly-extra slots
      if (next.has(slotIdx)) next.delete(slotIdx);
      else next.add(slotIdx);
      return next;
    });
  };

  const handleClaim = async () => {
    if (claimStatus === "claiming" || claimStatus === "success") return;
    sfxSubmit();
    setClaimStatus("claiming");
    const res = await apiBingoClaim(room.code, myId);
    if (res.alreadyClaimed) {
      setClaimStatus("success");
      setClaimMsg("Already claimed!");
    } else if (res.ok) {
      setClaimStatus("success");
      setClaimMsg(`BINGO! 🎉`);
    } else {
      setClaimStatus("invalid");
      setClaimMsg(res.error ?? "No valid line yet!");
      setShake(true);
      setTimeout(() => { setShake(false); setClaimStatus("idle"); }, 2200);
    }
  };

  const latestCalled = calledItems.length > 0 ? calledItems[calledItems.length - 1] : null;
  const alreadyWon = winners.some(w => w.id === myId);
  const canClaim = !alreadyWon && claimStatus !== "claiming" && claimStatus !== "success";

  if (!card) {
    return (
      <div className="page-fill items-center justify-center">
        <div className="font-fredoka text-white/40 text-xl">Waiting for your board…</div>
      </div>
    );
  }

  return (
    <div className="page-fill" style={{ gap: 0 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between py-3 px-1 flex-shrink-0">
        <div>
          <div className="font-fredoka text-xl text-white leading-none">🎱 Party Bingo</div>
          <div className="font-nunito text-white/40 text-xs mt-0.5">
            {calledItems.length === 0 ? "Waiting for first call…" : `${calledItems.length} items called`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-nunito text-white/35 text-xs uppercase tracking-widest">Room</div>
          <div className="font-fredoka text-2xl text-white tracking-wider leading-none"
            style={{ textShadow: "0 0 20px rgba(99,102,241,0.8)" }}>
            {room.code}
          </div>
        </div>
      </div>

      {/* ── Latest called item banner ── */}
      <div className="flex-shrink-0 mx-1 mb-2" style={{ minHeight: 52 }}>
        <AnimatePresence mode="wait">
          {latestCalled !== null && (
            <motion.div
              key={latestCalled}
              initial={{ opacity: 0, y: -10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="px-4 py-2.5 rounded-2xl text-center"
              style={{
                background: "rgba(99,102,241,0.18)",
                border: "1.5px solid rgba(99,102,241,0.5)",
                boxShadow: "0 4px 20px rgba(99,102,241,0.2)",
              }}>
              <div className="font-nunito text-[9px] text-white/40 uppercase tracking-widest mb-0.5">Just called</div>
              <div className="font-fredoka text-white text-sm leading-tight">{BINGO_ITEMS[latestCalled]}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 5×5 Board ── */}
      <div className="flex-1 flex flex-col justify-center min-h-0 px-1">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {card.map((itemIdx, slotIdx) => {
            const isFree = slotIdx === 12;
            const isAutoMarked = !isFree && calledSet.has(itemIdx);
            const isMarked = markedSlots.has(slotIdx);
            const label = isFree ? "FREE" : (BINGO_ITEMS[itemIdx] ?? "");

            return (
              <motion.button
                key={slotIdx}
                onClick={() => !isFree && toggleSlot(slotIdx)}
                whileTap={!isFree ? { scale: 0.88 } : undefined}
                className="relative flex flex-col items-center justify-center text-center overflow-hidden rounded-xl"
                style={{
                  aspectRatio: "1",
                  background: isFree
                    ? "rgba(99,102,241,0.75)"
                    : isMarked
                    ? isAutoMarked ? "rgba(99,102,241,0.55)" : "rgba(255,255,255,0.16)"
                    : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${isFree
                    ? "rgba(99,102,241,1)"
                    : isMarked
                    ? isAutoMarked ? "rgba(99,102,241,0.85)" : "rgba(255,255,255,0.3)"
                    : "rgba(255,255,255,0.08)"}`,
                  boxShadow: (isFree || (isMarked && isAutoMarked))
                    ? "0 0 10px rgba(99,102,241,0.4)"
                    : "none",
                  transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
                }}
              >
                {/* Daub overlay when marked */}
                {isMarked && !isFree && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="rounded-full flex items-center justify-center"
                      style={{
                        width: "52%", height: "52%",
                        background: isAutoMarked ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.25)",
                        boxShadow: isAutoMarked ? "0 0 6px rgba(99,102,241,0.6)" : "none",
                      }}>
                      <span style={{ fontSize: 9, color: "white" }}>✓</span>
                    </div>
                  </motion.div>
                )}

                {isFree ? (
                  <span className="font-fredoka text-white font-bold" style={{ fontSize: 10 }}>FREE</span>
                ) : (
                  <span
                    className="font-nunito leading-tight px-0.5"
                    style={{
                      fontSize: "6px",
                      color: isMarked ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.7)",
                      lineHeight: 1.25,
                      wordBreak: "break-word",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {label}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Recent calls history ── */}
      {calledItems.length > 1 && (
        <div className="flex-shrink-0 mt-2 mx-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-1.5 pb-0.5" style={{ minWidth: "max-content" }}>
            {[...calledItems].reverse().slice(1, 9).map((idx, i) => (
              <div key={i}
                className="px-2 py-1 rounded-lg flex-shrink-0 font-nunito text-[8px] text-white/40"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  maxWidth: 90,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                {BINGO_ITEMS[idx]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Winners banner ── */}
      <AnimatePresence>
        {winners.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 mx-1 mt-2 px-4 py-2 rounded-2xl text-center"
            style={{
              background: "rgba(234,179,8,0.15)",
              border: "1.5px solid rgba(234,179,8,0.45)",
            }}>
            <div className="font-fredoka text-yellow-300 text-sm">
              🏆 {winners.map(w => w.name).join(" & ")} got BINGO!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BINGO! claim button ── */}
      <div className="flex-shrink-0 pt-2 pb-2 px-1">
        <motion.button
          animate={shake ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.4 }}
          disabled={!canClaim}
          onClick={handleClaim}
          className="w-full py-4 rounded-2xl font-fredoka text-xl text-white"
          style={{
            background: alreadyWon || claimStatus === "success"
              ? "rgba(99,102,241,0.35)"
              : claimStatus === "invalid"
              ? "rgba(239,68,68,0.5)"
              : "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
            boxShadow: canClaim ? "0 4px 28px rgba(99,102,241,0.5)" : "none",
            border: `1.5px solid ${claimStatus === "invalid" ? "rgba(239,68,68,0.7)" : "rgba(99,102,241,0.5)"}`,
            opacity: !canClaim && claimStatus !== "success" && !alreadyWon ? 0.55 : 1,
            transition: "background 0.2s, box-shadow 0.2s",
          }}>
          {alreadyWon
            ? "✓ BINGO claimed!"
            : claimStatus === "claiming"
            ? "Checking…"
            : claimStatus === "success"
            ? `✓ ${claimMsg}`
            : claimStatus === "invalid"
            ? `❌ ${claimMsg}`
            : "🎱 BINGO!"}
        </motion.button>
      </div>

    </div>
  );
}
