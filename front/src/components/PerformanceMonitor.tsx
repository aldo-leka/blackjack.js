"use client";

import { useEffect, useState, useRef } from "react";
import "@/lib/perf"; // Load perf helpers into window

interface PerformanceStats {
    fps: number;
    avgFrameTime: number;
    longTasks: number;
    memoryUsage?: number;
}

const FPS_THRESHOLD = 55; // Log when FPS drops below this (targeting 60fps)
const LOG_COOLDOWN_MS = 10000; // Only log once every 10 seconds

export default function PerformanceMonitor() {
    const [stats, setStats] = useState<PerformanceStats>({
        fps: 60,
        avgFrameTime: 0,
        longTasks: 0,
        memoryUsage: 0,
    });
    const [isExpanded, setIsExpanded] = useState(false);
    const frameTimesRef = useRef<number[]>([]);
    const longTaskCountRef = useRef(0);
    const lastLogTimeRef = useRef(0);

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let lastFrameTime = performance.now();

        const measureFrame = () => {
            const currentTime = performance.now();
            const frameTime = currentTime - lastFrameTime;

            // Track frame times for average
            frameTimesRef.current.push(frameTime);
            if (frameTimesRef.current.length > 60) {
                frameTimesRef.current.shift();
            }

            // Count long tasks (frames taking > 16.67ms = dropping below 60fps)
            if (frameTime > 50) {
                // 50ms = severe jank
                longTaskCountRef.current++;
            }

            frameCount++;
            lastFrameTime = currentTime;

            // Update stats every second
            if (currentTime >= lastTime + 1000) {
                const avgFrameTime =
                    frameTimesRef.current.reduce((a, b) => a + b, 0) /
                    frameTimesRef.current.length;

                const memoryUsage =
                    (performance as any).memory?.usedJSHeapSize /
                    1024 /
                    1024;

                const newStats = {
                    fps: frameCount,
                    avgFrameTime: Math.round(avgFrameTime * 100) / 100,
                    longTasks: longTaskCountRef.current,
                    memoryUsage: memoryUsage
                        ? Math.round(memoryUsage * 10) / 10
                        : undefined,
                };

                setStats(newStats);

                // Auto-log when performance drops
                const timeSinceLastLog = currentTime - lastLogTimeRef.current;
                if (
                    frameCount < FPS_THRESHOLD &&
                    timeSinceLastLog > LOG_COOLDOWN_MS
                ) {
                    lastLogTimeRef.current = currentTime;

                    // Log to backend
                    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/perf`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            fps: frameCount,
                            avgFrameTime: newStats.avgFrameTime,
                            longTasks: newStats.longTasks,
                            memoryUsage: newStats.memoryUsage,
                            url: window.location.href,
                            deviceType: /Mobile|Android|iPhone/i.test(
                                navigator.userAgent
                            )
                                ? "mobile"
                                : "desktop",
                        }),
                    }).catch((err) =>
                        console.error("Failed to log performance:", err)
                    );

                    console.warn(
                        `🐌 Performance drop detected: ${frameCount} FPS (logged to DB)`
                    );
                }

                frameCount = 0;
                longTaskCountRef.current = 0;
                lastTime = currentTime;
            }

            requestAnimationFrame(measureFrame);
        };

        const rafId = requestAnimationFrame(measureFrame);

        // Use PerformanceObserver to catch long tasks
        if ("PerformanceObserver" in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            console.warn(
                                `🐌 Long task detected: ${Math.round(entry.duration)}ms`,
                                entry
                            );
                        }
                    }
                });
                observer.observe({ entryTypes: ["longtask", "measure"] });

                return () => {
                    cancelAnimationFrame(rafId);
                    observer.disconnect();
                };
            } catch (e) {
                // PerformanceObserver not fully supported
            }
        }

        return () => cancelAnimationFrame(rafId);
    }, []);

    const getFpsColor = (fps: number) => {
        if (fps >= 55) return "text-green-400";
        if (fps >= 30) return "text-yellow-400";
        return "text-red-400";
    };

    const getFrameTimeColor = (time: number) => {
        if (time <= 16.67) return "text-green-400"; // 60fps
        if (time <= 33.33) return "text-yellow-400"; // 30fps
        return "text-red-400";
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 font-mono text-xs">
            <div
                className="bg-black/80 backdrop-blur-sm rounded-lg p-2 cursor-pointer border border-gray-700"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <div className={`font-bold ${getFpsColor(stats.fps)}`}>
                        {stats.fps} FPS
                    </div>
                    {stats.longTasks > 0 && (
                        <div className="text-red-400">⚠️ {stats.longTasks}</div>
                    )}
                </div>

                {isExpanded && (
                    <div className="mt-2 space-y-1 text-gray-300 border-t border-gray-700 pt-2">
                        <div
                            className={getFrameTimeColor(stats.avgFrameTime)}
                        >
                            Frame: {stats.avgFrameTime.toFixed(2)}ms
                        </div>
                        <div>
                            Target: 16.67ms (60fps)
                        </div>
                        {stats.memoryUsage !== undefined && (
                            <div>Memory: {stats.memoryUsage}MB</div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                            Click to collapse
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
