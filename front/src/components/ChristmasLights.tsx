"use client";

import { motion } from "motion/react";
import { useMemo } from "react";

const COLORS = [
    "#FF0000", // red
    "#00FF00", // green
    "#0000FF", // blue
    "#FFD700", // gold
    "#FFFFFF", // white
    "#FF1493", // pink
];

interface LightBulb {
    id: number;
    color: string;
    delay: number;
    duration: number;
    xPercent: number;
    wireY: number;
}

// Seeded random number generator for consistent SSR/client rendering
function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

export default function ChristmasLights() {
    // Generate bulbs with positions along a curve using useMemo to ensure consistency
    const bulbs: LightBulb[] = useMemo(() => {
        return Array.from({ length: 30 }, (_, i) => {
            const xPercent = (i / 29) * 100;
            // Create a sagging curve using sine wave
            const wireY = 20 + Math.sin((i / 29) * Math.PI) * 35;

            return {
                id: i,
                color: COLORS[Math.floor(seededRandom(i * 7) * COLORS.length)],
                delay: seededRandom(i * 13) * 2,
                duration: 1.5 + seededRandom(i * 17) * 1.5,
                xPercent,
                wireY,
            };
        });
    }, []);

    // Create smooth curve path for the wire using viewBox coordinates
    const pathData = bulbs.reduce((path, bulb, i) => {
        if (i === 0) {
            return `M ${bulb.xPercent} ${bulb.wireY}`;
        }
        const prevBulb = bulbs[i - 1];
        const cpX1 = prevBulb.xPercent + (bulb.xPercent - prevBulb.xPercent) / 3;
        const cpX2 = prevBulb.xPercent + (2 * (bulb.xPercent - prevBulb.xPercent)) / 3;
        return `${path} C ${cpX1} ${prevBulb.wireY}, ${cpX2} ${bulb.wireY}, ${bulb.xPercent} ${bulb.wireY}`;
    }, "");

    return (
        <div className="fixed top-0 left-0 right-0 z-0 pointer-events-none h-32">
            {/* SVG for wire and strings */}
            <svg
                className="absolute top-0 left-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ overflow: "visible" }}
            >
                {/* Main wire */}
                <path
                    d={pathData}
                    stroke="#1a1a1a"
                    strokeWidth="0.3"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}
                />

                {/* String connections from wire to bulbs */}
                {bulbs.map((bulb) => {
                    const stringLength = 8 + (bulb.id * 5) % 12;
                    return (
                        <line
                            key={`string-${bulb.id}`}
                            x1={bulb.xPercent}
                            y1={bulb.wireY}
                            x2={bulb.xPercent}
                            y2={bulb.wireY + stringLength}
                            stroke="#1a1a1a"
                            strokeWidth="0.15"
                            vectorEffect="non-scaling-stroke"
                            opacity="0.7"
                        />
                    );
                })}
            </svg>

            {/* Light Bulbs */}
            <div className="relative w-full h-full">
                {bulbs.map((bulb) => {
                    const stringLength = 8 + (bulb.id * 5) % 12;
                    return (
                        <motion.div
                            key={bulb.id}
                            className="absolute"
                            style={{
                                left: `${bulb.xPercent}%`,
                                top: `${bulb.wireY + stringLength}%`,
                                transform: "translateX(-50%)",
                            }}
                            animate={{
                                opacity: [0.6, 1, 0.6],
                                filter: [
                                    `drop-shadow(0 0 4px ${bulb.color}) brightness(0.8)`,
                                    `drop-shadow(0 0 10px ${bulb.color}) brightness(1.3)`,
                                    `drop-shadow(0 0 4px ${bulb.color}) brightness(0.8)`,
                                ],
                            }}
                            transition={{
                                duration: bulb.duration,
                                repeat: Infinity,
                                delay: bulb.delay,
                                ease: "easeInOut",
                            }}
                        >
                            {/* Bulb */}
                            <div className="flex flex-col items-center">
                                {/* Socket */}
                                <div
                                    className="w-2 h-2.5 bg-gray-800 rounded-t"
                                    style={{
                                        boxShadow: "inset 0 0 2px rgba(0,0,0,0.8)",
                                    }}
                                />
                                {/* Glass bulb */}
                                <div
                                    className="w-4 h-5 rounded-full"
                                    style={{
                                        backgroundColor: bulb.color,
                                        boxShadow: `0 0 8px ${bulb.color}, inset -1px -2px 3px rgba(0,0,0,0.4), inset 1px 1px 2px rgba(255,255,255,0.3)`,
                                    }}
                                />
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
