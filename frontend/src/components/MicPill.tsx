"use client";
import { motion } from "framer-motion";

interface Props {
    micEnabled: boolean;
    micMuted: boolean;
    micPermission: "unknown" | "granted" | "denied";
    onToggleEnable: () => void;
    onToggleMute: () => void;
    compact?: boolean;
}

export default function MicPill({ micEnabled, micMuted, micPermission, onToggleEnable, onToggleMute, compact }: Props) {
    const denied = micPermission === "denied";

    let stateClass = "";
    let icon = "🎙️";
    let label = compact ? "" : "Mic Off";

    if (denied) {
        stateClass = "mic-denied";
        icon = "🚫";
        label = compact ? "" : "Denied";
    } else if (micEnabled && !micMuted) {
        stateClass = "mic-live";
        icon = "🎙️";
        label = compact ? "" : "Live";
    } else if (micEnabled && micMuted) {
        stateClass = "mic-muted";
        icon = "🔇";
        label = compact ? "" : "Muted";
    }

    const handleClick = () => {
        if (denied) {
            onToggleEnable();
            return;
        }
        if (!micEnabled) {
            onToggleEnable();
        } else {
            onToggleMute();
        }
    };

    return (
        <motion.button
            onClick={handleClick}
            whileTap={{ scale: 0.92 }}
            className={`mic-pill ${stateClass}`}
            title={denied ? "Microphone access denied" : micEnabled ? (micMuted ? "Tap to unmute" : "Tap to mute") : "Tap to enable mic"}
            style={{ fontSize: compact ? "0.65rem" : undefined, padding: compact ? "4px 9px" : undefined }}
        >
            <span style={{ fontSize: compact ? 12 : 14 }}>{icon}</span>
            {!compact && <span>{label}</span>}
        </motion.button>
    );
}
