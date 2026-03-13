"use client";
import React from "react";
export type { AvatarConfig } from "@/lib/types";
import type { AvatarConfig } from "@/lib/types";

export const AVATAR_PALETTES = [
    { bg1: "#7C3AED", bg2: "#EC4899", hair: "#3B0764" }, // 0 purple-pink
    { bg1: "#0284C7", bg2: "#06B6D4", hair: "#0C4A6E" }, // 1 blue-cyan
    { bg1: "#059669", bg2: "#84CC16", hair: "#14532D" }, // 2 green-lime
    { bg1: "#D97706", bg2: "#EF4444", hair: "#78350F" }, // 3 amber-red
    { bg1: "#6D28D9", bg2: "#A855F7", hair: "#2E1065" }, // 4 deep purple
    { bg1: "#DB2777", bg2: "#F97316", hair: "#831843" }, // 5 pink-orange
    { bg1: "#0F766E", bg2: "#0369A1", hair: "#0D4A5E" }, // 6 teal-blue
    { bg1: "#BE185D", bg2: "#9333EA", hair: "#701A75" }, // 7 fuchsia
];

/** Generate a deterministic default avatar from any string id */
export function defaultAvatarFromId(id: string): AvatarConfig {
    const h = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return { head: h % 12, eyes: (h >> 2) % 12, mouth: (h >> 4) % 12, color: (h >> 6) % 8 };
}

/* ─────────────────────────────────────────────
   Head / hair layer (drawn behind the face oval)
───────────────────────────────────────────── */
function Hair({ type, color }: { type: number; color: string }): React.ReactElement {
    switch (type) {
        case 0: // smooth rounded cap
            return (
                <path
                    d="M 26 64 A 24 24 0 0 1 74 64 L 74 44 C 72 11 28 11 26 44 Z"
                    fill={color}
                />
            );
        case 1: // three spikes
            return (
                <>
                    <rect x="15" y="40" width="70" height="28" fill={color} />
                    <polygon points="26,68 14,16 43,46" fill={color} />
                    <polygon points="50,68 50,10 64,44" fill={color} />
                    <polygon points="74,68 86,16 57,46" fill={color} />
                </>
            );
        case 2: // fluffy / curly
            return (
                <>
                    <circle cx="32" cy="37" r="14" fill={color} />
                    <circle cx="50" cy="29" r="16" fill={color} />
                    <circle cx="68" cy="37" r="14" fill={color} />
                    <rect x="18" y="37" width="64" height="30" fill={color} />
                </>
            );
        case 3: // cat / bunny ears
            return (
                <>
                    <path d="M 26 64 A 24 24 0 0 1 74 64 L 74 44 C 72 11 28 11 26 44 Z" fill={color} />
                    <polygon points="28,54 14,10 44,42" fill={color} />
                    <polygon points="72,54 86,10 56,42" fill={color} />
                    <polygon points="30,50 20,18 41,40" fill="rgba(255,255,255,0.18)" />
                    <polygon points="70,50 80,18 59,40" fill="rgba(255,255,255,0.18)" />
                </>
            );
        case 4: // mohawk
            return (
                <>
                    <rect x="18" y="40" width="64" height="28" fill={color} />
                    <polygon points="50,3 42,42 58,42" fill={color} />
                </>
            );
        case 5: // long hair
            return (
                <>
                    <path d="M 26 64 A 24 24 0 0 1 74 64 L 74 44 C 72 11 28 11 26 44 Z" fill={color} />
                    <path d="M 20 58 L 12 100 L 28 100 L 30 68" fill={color} />
                    <path d="M 80 58 L 88 100 L 72 100 L 70 68" fill={color} />
                </>
            );
        case 6: // bob cut
            return (
                <path d="M 22 66 A 24 24 0 0 1 78 66 L 80 50 C 78 10 22 10 20 50 Z" fill={color} />
            );
        case 7: // big afro
            return (
                <>
                    <circle cx="50" cy="27" r="23" fill={color} />
                    <circle cx="27" cy="40" r="16" fill={color} />
                    <circle cx="73" cy="40" r="16" fill={color} />
                    <rect x="22" y="38" width="56" height="28" fill={color} />
                </>
            );
        case 8: // side-swept bang
            return (
                <>
                    <path d="M 26 64 A 24 24 0 0 1 74 64 L 74 44 C 72 11 28 11 26 44 Z" fill={color} />
                    <path d="M 26 44 Q 38 20 72 28 L 62 42" fill={color} />
                </>
            );
        case 9: // bun on top
            return (
                <>
                    <path d="M 26 64 A 24 24 0 0 1 74 64 L 74 44 C 72 11 28 11 26 44 Z" fill={color} />
                    <circle cx="50" cy="14" r="13" fill={color} />
                </>
            );
        case 10: // pigtails
            return (
                <>
                    <path d="M 26 64 A 24 24 0 0 1 74 64 L 74 44 C 72 11 28 11 26 44 Z" fill={color} />
                    <circle cx="21" cy="44" r="10" fill={color} />
                    <circle cx="79" cy="44" r="10" fill={color} />
                </>
            );
        case 11: // wild spiky all-around
            return (
                <>
                    <polygon points="50,4 43,20 32,10 36,26 18,24 30,36 15,44 30,48 22,62 38,58 38,68 50,60 62,68 62,58 78,62 70,48 85,44 70,36 82,24 64,26 68,10 57,20" fill={color} />
                    <rect x="26" y="38" width="48" height="28" fill={color} />
                </>
            );
        default:
            return <></>;
    }
}

/* ─────────────────────────────────────────────
   Eyes layer
───────────────────────────────────────────── */
function Eyes({ type }: { type: number }): React.ReactElement {
    const lx = 38, rx = 62, ey = 60;
    switch (type) {
        case 0: // open circles
            return (
                <>
                    <circle cx={lx} cy={ey} r="6" fill="white" />
                    <circle cx={rx} cy={ey} r="6" fill="white" />
                    <circle cx={lx} cy={ey + 1} r="3.8" fill="#1a1a2e" />
                    <circle cx={rx} cy={ey + 1} r="3.8" fill="#1a1a2e" />
                    <circle cx={lx + 1.8} cy={ey - 1.8} r="1.4" fill="white" />
                    <circle cx={rx + 1.8} cy={ey - 1.8} r="1.4" fill="white" />
                </>
            );
        case 1: // happy ^^ squint
            return (
                <>
                    <path d={`M ${lx - 5} ${ey + 3} Q ${lx} ${ey - 5} ${lx + 5} ${ey + 3}`}
                        fill="none" stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round" />
                    <path d={`M ${rx - 5} ${ey + 3} Q ${rx} ${ey - 5} ${rx + 5} ${ey + 3}`}
                        fill="none" stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round" />
                </>
            );
        case 2: // stars
            return (
                <>
                    {([lx, rx] as number[]).map((x) => (
                        <text key={x} x={x} y={ey + 5} textAnchor="middle" fontSize="13"
                            fill="#1a1a2e" style={{ userSelect: "none" }}>★</text>
                    ))}
                </>
            );
        case 3: // sleepy half-closed
            return (
                <>
                    <circle cx={lx} cy={ey} r="6" fill="white" />
                    <circle cx={rx} cy={ey} r="6" fill="white" />
                    <circle cx={lx} cy={ey + 2} r="3.8" fill="#1a1a2e" />
                    <circle cx={rx} cy={ey + 2} r="3.8" fill="#1a1a2e" />
                    <rect x={lx - 6.5} y={ey - 6.5} width="13" height="7.5" fill="#FFE4B0" rx="1" />
                    <rect x={rx - 6.5} y={ey - 6.5} width="13" height="7.5" fill="#FFE4B0" rx="1" />
                    <line x1={lx - 4} y1={ey - 0.5} x2={lx + 4} y2={ey - 0.5}
                        stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1={rx - 4} y1={ey - 0.5} x2={rx + 4} y2={ey - 0.5}
                        stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
                </>
            );
        case 4: // heart eyes
            return (
                <>
                    {([lx, rx] as number[]).map(x => (
                        <text key={x} x={x} y={ey + 5} textAnchor="middle" fontSize="14"
                            fill="#EC4899" style={{ userSelect: "none" }}>♥</text>
                    ))}
                </>
            );
        case 5: // angry
            return (
                <>
                    <circle cx={lx} cy={ey} r="6" fill="white" />
                    <circle cx={rx} cy={ey} r="6" fill="white" />
                    <circle cx={lx} cy={ey + 1} r="3.8" fill="#1a1a2e" />
                    <circle cx={rx} cy={ey + 1} r="3.8" fill="#1a1a2e" />
                    <line x1={lx - 6} y1={ey - 8} x2={lx + 5} y2={ey - 4}
                        stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round" />
                    <line x1={rx - 5} y1={ey - 4} x2={rx + 6} y2={ey - 8}
                        stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round" />
                </>
            );
        case 6: // wink
            return (
                <>
                    <circle cx={lx} cy={ey} r="6" fill="white" />
                    <circle cx={lx} cy={ey + 1} r="3.8" fill="#1a1a2e" />
                    <circle cx={lx + 1.8} cy={ey - 1.8} r="1.4" fill="white" />
                    <path d={`M ${rx - 5} ${ey - 1} Q ${rx} ${ey + 7} ${rx + 5} ${ey - 1}`}
                        fill="none" stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round" />
                </>
            );
        case 7: // dizzy X eyes
            return (
                <>
                    {([lx, rx] as number[]).map(x => (
                        <g key={x}>
                            <line x1={x - 5} y1={ey - 5} x2={x + 5} y2={ey + 5}
                                stroke="#1a1a2e" strokeWidth="3.5" strokeLinecap="round" />
                            <line x1={x + 5} y1={ey - 5} x2={x - 5} y2={ey + 5}
                                stroke="#1a1a2e" strokeWidth="3.5" strokeLinecap="round" />
                        </g>
                    ))}
                </>
            );
        case 8: // sunglasses
            return (
                <>
                    <rect x={lx - 8} y={ey - 6} width="16" height="12" rx="4" fill="#1a1a2e" />
                    <rect x={rx - 8} y={ey - 6} width="16" height="12" rx="4" fill="#1a1a2e" />
                    <line x1={lx + 8} y1={ey} x2={rx - 8} y2={ey} stroke="#1a1a2e" strokeWidth="2.5" />
                    <line x1={lx - 8} y1={ey} x2={lx - 14} y2={ey - 2} stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
                    <line x1={rx + 8} y1={ey} x2={rx + 14} y2={ey - 2} stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
                </>
            );
        case 9: // beady dots
            return (
                <>
                    <circle cx={lx} cy={ey} r="3" fill="#1a1a2e" />
                    <circle cx={rx} cy={ey} r="3" fill="#1a1a2e" />
                    <circle cx={lx + 1} cy={ey - 1} r="1" fill="white" fillOpacity="0.6" />
                    <circle cx={rx + 1} cy={ey - 1} r="1" fill="white" fillOpacity="0.6" />
                </>
            );
        case 10: // dollar sign eyes
            return (
                <>
                    {([lx, rx] as number[]).map(x => (
                        <text key={x} x={x} y={ey + 5} textAnchor="middle" fontSize="13"
                            fill="#16A34A" style={{ userSelect: "none" }} fontWeight="bold">$</text>
                    ))}
                </>
            );
        case 11: // hypno spiral rings
            return (
                <>
                    {([lx, rx] as number[]).map(x => (
                        <g key={x}>
                            <circle cx={x} cy={ey} r="7" fill="white" />
                            <circle cx={x} cy={ey} r="5" fill="#7C3AED" />
                            <circle cx={x} cy={ey} r="3" fill="white" />
                            <circle cx={x} cy={ey} r="1.5" fill="#7C3AED" />
                        </g>
                    ))}
                </>
            );
        default:
            return <></>;
    }
}

/* ─────────────────────────────────────────────
   Mouth layer
───────────────────────────────────────────── */
function Mouth({ type }: { type: number }): React.ReactElement {
    const mx = 50, my = 75;
    switch (type) {
        case 0: // big smile
            return (
                <path d={`M 36 ${my} Q ${mx} ${my + 13} 64 ${my}`}
                    fill="none" stroke="#7B3A1A" strokeWidth="3" strokeLinecap="round" />
            );
        case 1: // smirk
            return (
                <path d={`M 38 ${my + 4} Q 52 ${my + 9} 63 ${my - 1}`}
                    fill="none" stroke="#7B3A1A" strokeWidth="3" strokeLinecap="round" />
            );
        case 2: // surprised O
            return (
                <>
                    <ellipse cx={mx} cy={my + 3} rx="7" ry="9" fill="#7B3A1A" />
                    <ellipse cx={mx} cy={my + 4} rx="5" ry="7" fill="#B04020" />
                </>
            );
        case 3: // tongue out
            return (
                <>
                    <path d={`M 36 ${my} Q ${mx} ${my + 10} 64 ${my}`}
                        fill="none" stroke="#7B3A1A" strokeWidth="3" strokeLinecap="round" />
                    <ellipse cx={mx} cy={my + 8} rx="6" ry="7" fill="#EC4899" />
                    <ellipse cx={mx} cy={my + 7} rx="4" ry="3" fill="#F9A8D4" fillOpacity="0.5" />
                </>
            );
        case 4: // sad
            return (
                <path d={`M 36 ${my + 9} Q ${mx} ${my} 64 ${my + 9}`}
                    fill="none" stroke="#7B3A1A" strokeWidth="3" strokeLinecap="round" />
            );
        case 5: // grin with teeth
            return (
                <>
                    <path d={`M 34 ${my} Q ${mx} ${my + 16} 66 ${my}`}
                        fill="#7B3A1A" strokeLinecap="round" />
                    <rect x="35" y={my} width="30" height="7" rx="1" fill="white" />
                    <line x1="43" y1={my} x2="43" y2={my + 7} stroke="#E5C9A0" strokeWidth="1" />
                    <line x1="50" y1={my} x2="50" y2={my + 7} stroke="#E5C9A0" strokeWidth="1" />
                    <line x1="57" y1={my} x2="57" y2={my + 7} stroke="#E5C9A0" strokeWidth="1" />
                </>
            );
        case 6: // cool subtle smile
            return (
                <path d={`M 36 ${my + 2} Q ${mx} ${my + 8} 64 ${my + 2}`}
                    fill="none" stroke="#7B3A1A" strokeWidth="3.5" strokeLinecap="round" />
            );
        case 7: // meh flat line
            return (
                <line x1="36" y1={my + 3} x2="64" y2={my + 3}
                    stroke="#7B3A1A" strokeWidth="3" strokeLinecap="round" />
            );
        case 8: // cat mouth (w shape)
            return (
                <>
                    <path d={`M 36 ${my + 2} Q 42 ${my + 10} ${mx} ${my + 3} Q 58 ${my + 10} 64 ${my + 2}`}
                        fill="none" stroke="#7B3A1A" strokeWidth="3" strokeLinecap="round" />
                </>
            );
        case 9: // wide open laugh
            return (
                <>
                    <path d={`M 32 ${my - 2} Q ${mx} ${my + 20} 68 ${my - 2}`} fill="#7B3A1A" />
                    <ellipse cx={mx} cy={my + 7} rx="14" ry="10" fill="#B04020" />
                </>
            );
        case 10: // zipper teeth
            return (
                <>
                    <path d={`M 35 ${my} Q ${mx} ${my + 12} 65 ${my}`} fill="#7B3A1A" />
                    {[37, 42, 47, 52, 57, 62].map((x, i) => (
                        <rect key={i} x={x} y={my} width="4" height="6" rx="1" fill="white" />
                    ))}
                </>
            );
        case 11: // tiny cute smile
            return (
                <path d={`M 42 ${my + 1} Q ${mx} ${my + 8} 58 ${my + 1}`}
                    fill="none" stroke="#7B3A1A" strokeWidth="3" strokeLinecap="round" />
            );
        default:
            return <></>;
    }
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
interface SvgAvatarProps {
    config: AvatarConfig;
    size?: number;
    className?: string;
}

export default function SvgAvatar({ config, size = 44, className = "" }: SvgAvatarProps) {
    const p = AVATAR_PALETTES[config.color % AVATAR_PALETTES.length];
    const uid = `a${config.color}${config.head}${config.eyes}${config.mouth}`;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            className={className}
            style={{ display: "block", flexShrink: 0 }}
        >
            <defs>
                <radialGradient id={`bg-${uid}`} cx="38%" cy="32%" r="70%">
                    <stop offset="0%" stopColor={p.bg2} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={p.bg1} />
                </radialGradient>
                <radialGradient id={`shine-${uid}`} cx="35%" cy="25%" r="50%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                </radialGradient>
                <clipPath id={`clip-${uid}`}>
                    <circle cx="50" cy="50" r="50" />
                </clipPath>
            </defs>

            <g clipPath={`url(#clip-${uid})`}>
                {/* Background */}
                <circle cx="50" cy="50" r="50" fill={`url(#bg-${uid})`} />

                {/* Hair / head style */}
                <Hair type={config.head} color={p.hair} />

                {/* Face oval */}
                <ellipse cx="50" cy="64" rx="24" ry="26" fill="#FFE4B0" />
                {/* Subtle face highlight */}
                <ellipse cx="43" cy="57" rx="8" ry="9" fill="white" fillOpacity="0.10" />

                {/* Eyes */}
                <Eyes type={config.eyes} />

                {/* Cheek blushes */}
                <ellipse cx="32" cy="68" rx="7" ry="5" fill="#FF8FA3" fillOpacity="0.38" />
                <ellipse cx="68" cy="68" rx="7" ry="5" fill="#FF8FA3" fillOpacity="0.38" />

                {/* Mouth */}
                <Mouth type={config.mouth} />

                {/* Glass shine on bg */}
                <circle cx="50" cy="50" r="50" fill={`url(#shine-${uid})`} />
            </g>
        </svg>
    );
}

/* ─────────────────────────────────────────────
   Picker sub-components for HomeScreen
───────────────────────────────────────────── */
export const HEAD_LABELS = [
    "Clean", "Spiky", "Fluffy", "Cat Ears", "Mohawk", "Long", "Bob", "Afro",
    "Side Sweep", "Top Bun", "Pigtails", "Wild",
];
export const EYES_LABELS = [
    "Open 👀", "Happy ^^", "Star ★", "Sleepy", "Heart ❤️", "Angry", "Wink 😉", "Dizzy ✕",
    "Shades 😎", "Beady", "Money 💰", "Hypno",
];
export const MOUTH_LABELS = [
    "Smile 😊", "Smirk 😏", "Whoa 😮", "Tongue 😛", "Sad 😢", "Grin 😁", "Cool 😌", "Meh 😑",
    "Cat 🐱", "Laugh 😂", "Zipper 🤐", "Tiny",
];
