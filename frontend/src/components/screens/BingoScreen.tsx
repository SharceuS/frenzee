"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room } from "@/lib/types";
import { apiBingoClaim } from "@/lib/api";
import { sfxTap, sfxSubmit } from "@/lib/sounds";

interface Props {
  room: Room;
  myId: string;
}

type ClaimStatus = "idle" | "claiming" | "success" | "invalid";

function formatBingoCall(value: number) {
  if (value <= 15) return `B-${value}`;
  if (value <= 30) return `I-${value}`;
  if (value <= 45) return `N-${value}`;
  if (value <= 60) return `G-${value}`;
  return `O-${value}`;
}

export default function BingoScreen({ room, myId }: Props) {
  const card = room.bingoCards?.[myId] ?? null;
  const calledItems = room.bingoCalledItems ?? [];
  const winners = room.bingoWinners ?? [];

  const [selectedSlots, setSelectedSlots] = useState<Set<number>>(new Set());
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [claimMsg, setClaimMsg] = useState("");
  const [shake, setShake] = useState(false);

  const calledSet = new Set(calledItems);
  const markedSlots = new Set<number>(selectedSlots);
  markedSlots.add(12);

  useEffect(() => {
    setSelectedSlots(new Set());
    setClaimStatus("idle");
    setClaimMsg("");
    setShake(false);
  }, [room.code, room.round, card?.join(",")]);

  const toggleSlot = (slotIdx: number) => {
    if (slotIdx === 12) return;
    sfxTap();
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (next.has(slotIdx)) next.delete(slotIdx);
      else next.add(slotIdx);
      return next;
    });
  };

  const handleClaim = async () => {
    if (claimStatus === "claiming" || claimStatus === "success") return;
    sfxSubmit();
    setClaimStatus("claiming");
    const res = await apiBingoClaim(room.code, myId, Array.from(selectedSlots));
    if (res.alreadyClaimed) {
      setClaimStatus("success");
      setClaimMsg("Already claimed!");
    } else if (res.ok) {
      setClaimStatus("success");
      setClaimMsg("BINGO!");
    } else {
      setClaimStatus("invalid");
      setClaimMsg(res.error ?? "No valid line yet!");
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setClaimStatus("idle");
      }, 2200);
    }
  };

  const latestCalled = calledItems.length > 0 ? calledItems[calledItems.length - 1] : null;
  const alreadyWon = winners.some(w => w.id === myId);
  const canClaim = !alreadyWon && claimStatus !== "claiming" && claimStatus !== "success";

  if (!card) {
    return (
      <div className="page-fill items-center justify-center">
        <div className="font-fredoka text-white/40 text-xl">Waiting for your board...</div>
      </div>
    );
  }

  return (
    <div className="page-fill" style={{ gap: 0 }}>
      <div className="flex items-center justify-between py-3 px-1 flex-shrink-0">
        <div>
          <div className="font-fredoka text-xl text-white leading-none">Bingo</div>
          <div className="font-nunito text-white/40 text-xs mt-0.5">
            {calledItems.length === 0 ? "Waiting for first number..." : `${calledItems.length} numbers called`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-nunito text-white/35 text-xs uppercase tracking-widest">Room</div>
          <div
            className="font-fredoka text-2xl text-white tracking-wider leading-none"
            style={{ textShadow: "0 0 20px rgba(99,102,241,0.8)" }}
          >
            {room.code}
          </div>
        </div>
      </div>

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
              }}
            >
              <div className="font-nunito text-[9px] text-white/40 uppercase tracking-widest mb-0.5">Just called</div>
              <div className="font-fredoka text-white text-2xl leading-tight tracking-wider">{formatBingoCall(latestCalled)}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0 px-1">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {card.map((value, slotIdx) => {
            const isFree = slotIdx === 12;
            const isCalled = !isFree && calledSet.has(value);
            const isMarked = markedSlots.has(slotIdx);

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
                    ? isCalled
                      ? "rgba(99,102,241,0.55)"
                      : "rgba(255,255,255,0.16)"
                    : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${isFree
                    ? "rgba(99,102,241,1)"
                    : isMarked
                    ? isCalled
                      ? "rgba(99,102,241,0.85)"
                      : "rgba(255,255,255,0.3)"
                    : isCalled
                    ? "rgba(250,204,21,0.6)"
                    : "rgba(255,255,255,0.08)"}`,
                  boxShadow: isFree || (isMarked && isCalled)
                    ? "0 0 10px rgba(99,102,241,0.4)"
                    : isCalled
                    ? "0 0 10px rgba(250,204,21,0.18)"
                    : "none",
                  transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
                }}
              >
                {isMarked && !isFree && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div
                      className="rounded-full flex items-center justify-center"
                      style={{
                        width: "52%",
                        height: "52%",
                        background: isCalled ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.25)",
                        boxShadow: isCalled ? "0 0 6px rgba(99,102,241,0.6)" : "none",
                      }}
                    >
                      <span style={{ fontSize: 9, color: "white" }}>✓</span>
                    </div>
                  </motion.div>
                )}

                {isFree ? (
                  <span className="font-fredoka text-white font-bold" style={{ fontSize: 10 }}>FREE</span>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <span
                      className="font-fredoka leading-none"
                      style={{
                        fontSize: 18,
                        color: isMarked ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.82)",
                      }}
                    >
                      {value}
                    </span>
                    {isCalled && !isMarked && (
                      <span className="font-nunito text-[7px] uppercase tracking-widest text-yellow-200/85 mt-1">Tap</span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {calledItems.length > 1 && (
        <div className="flex-shrink-0 mt-2 mx-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-1.5 pb-0.5" style={{ minWidth: "max-content" }}>
            {[...calledItems].reverse().slice(1, 9).map((value, index) => (
              <div
                key={index}
                className="px-2 py-1 rounded-lg flex-shrink-0 font-fredoka text-[11px] text-white/70"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  minWidth: 58,
                  textAlign: "center",
                }}
              >
                {formatBingoCall(value)}
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {winners.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 mx-1 mt-2 px-4 py-2 rounded-2xl text-center"
            style={{
              background: "rgba(234,179,8,0.15)",
              border: "1.5px solid rgba(234,179,8,0.45)",
            }}
          >
            <div className="font-fredoka text-yellow-300 text-sm">
              {winners.map(w => w.name).join(" & ")} got BINGO!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          }}
        >
          {alreadyWon
            ? "✓ BINGO claimed!"
            : claimStatus === "claiming"
            ? "Checking..."
            : claimStatus === "success"
            ? `✓ ${claimMsg}`
            : claimStatus === "invalid"
            ? `X ${claimMsg}`
            : "BINGO!"}
        </motion.button>
        <div className="font-nunito text-white/45 text-[11px] text-center mt-2 px-2">
          Called numbers glow. You still need to tap them yourself before claiming.
        </div>
      </div>
    </div>
  );
}
