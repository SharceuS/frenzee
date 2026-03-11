"use client";
import { motion } from "framer-motion";

// Individual sparkle star path
function Star({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
    const s = size;
    return (
        <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0] }}
            transition={{ duration: 2.4, delay, repeat: Infinity, repeatDelay: 1.5 + delay }}
        >
            <path
                d={`M${x},${y - s} L${x + s * 0.22},${y - s * 0.22} L${x + s},${y} L${x + s * 0.22},${y + s * 0.22} L${x},${y + s} L${x - s * 0.22},${y + s * 0.22} L${x - s},${y} L${x - s * 0.22},${y - s * 0.22} Z`}
                fill="white"
                opacity={0.9}
            />
        </motion.g>
    );
}

export default function FrenezeeLogo() {
    return (
        <svg
            viewBox="0 0 360 88"
            width="100%"
            style={{ maxWidth: 360, overflow: "visible", display: "block" }}
            aria-label="Frenzee"
        >
            <defs>
                {/* Main rainbow gradient */}
                <linearGradient id="fz-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FBBF24" />
                    <stop offset="30%" stopColor="#FB7185" />
                    <stop offset="65%" stopColor="#C084FC" />
                    <stop offset="100%" stopColor="#60A5FA" />
                </linearGradient>

                {/* Glow filter */}
                <filter id="fz-glow" x="-25%" y="-25%" width="150%" height="150%">
                    <feGaussianBlur stdDeviation="5" result="blur1" />
                    <feGaussianBlur stdDeviation="10" result="blur2" />
                    <feMerge>
                        <feMergeNode in="blur2" />
                        <feMergeNode in="blur1" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {/* Inner glow for shine */}
                <filter id="fz-shine" x="-5%" y="-5%" width="110%" height="120%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Drop shadow behind everything */}
            <text
                x="50%" y="70"
                textAnchor="middle"
                fontFamily="'Fredoka One', cursive"
                fontSize="74"
                fill="#0d0020"
                opacity={0.55}
                dx="4" dy="5"
            >
                FRENZEE
            </text>

            {/* White bubble outline — gives the "cartoon" inflated feel */}
            <text
                x="50%" y="70"
                textAnchor="middle"
                fontFamily="'Fredoka One', cursive"
                fontSize="74"
                fill="none"
                stroke="white"
                strokeWidth="12"
                strokeLinejoin="round"
                opacity={0.18}
            >
                FRENZEE
            </text>

            {/* Mid outline for depth */}
            <text
                x="50%" y="70"
                textAnchor="middle"
                fontFamily="'Fredoka One', cursive"
                fontSize="74"
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="5"
                strokeLinejoin="round"
            >
                FRENZEE
            </text>

            {/* Main gradient fill with glow */}
            <text
                x="50%" y="70"
                textAnchor="middle"
                fontFamily="'Fredoka One', cursive"
                fontSize="74"
                fill="url(#fz-grad)"
                filter="url(#fz-glow)"
            >
                FRENZEE
            </text>

            {/* Shine highlight on top portion */}
            <text
                x="50%" y="70"
                textAnchor="middle"
                fontFamily="'Fredoka One', cursive"
                fontSize="74"
                fill="white"
                opacity={0.08}
                filter="url(#fz-shine)"
                dy="-18"
                style={{ clipPath: "inset(0 0 50% 0)" }}
            >
                FRENZEE
            </text>

            {/* Sparkle stars scattered around the logo */}
            <Star x={16} y={28} size={7} delay={0.0} />
            <Star x={340} y={20} size={5} delay={0.6} />
            <Star x={350} y={60} size={8} delay={1.2} />
            <Star x={8} y={62} size={5} delay={1.8} />
            <Star x={175} y={4} size={6} delay={0.9} />
            <Star x={295} y={8} size={4} delay={0.3} />
            <Star x={62} y={10} size={4} delay={1.5} />
        </svg>
    );
}
