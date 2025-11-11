const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface PerfLogData {
    fps: number;
    avgFrameTime: number;
    longTasks: number;
    memoryUsage?: number;
    url?: string;
    userNickname?: string;
    deviceType?: string;
}

/**
 * Manually log performance data to the backend
 * Usage: await logPerf({ fps: 25, avgFrameTime: 40, longTasks: 5 })
 */
export async function logPerf(data: PerfLogData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const payload = {
            ...data,
            url: data.url || window.location.href,
            deviceType: data.deviceType || (/Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop"),
        };

        const response = await fetch(`${BACKEND_URL}/api/perf`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("✅ Performance logged:", result);
        return { success: true, id: result.id };
    } catch (error) {
        console.error("❌ Failed to log performance:", error);
        return { success: false, error: String(error) };
    }
}

/**
 * Fetch performance logs from the backend
 * Usage: const logs = await getPerf({ limit: 50, maxFps: 30 })
 */
export async function getPerf(options?: {
    limit?: number;
    minFps?: number;
    maxFps?: number;
}): Promise<{ count: number; logs: any[] } | null> {
    try {
        const params = new URLSearchParams();
        if (options?.limit) params.append("limit", String(options.limit));
        if (options?.minFps !== undefined) params.append("minFps", String(options.minFps));
        if (options?.maxFps !== undefined) params.append("maxFps", String(options.maxFps));

        const response = await fetch(`${BACKEND_URL}/api/perf?${params}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`📊 Retrieved ${data.count} performance logs`);
        return data;
    } catch (error) {
        console.error("❌ Failed to fetch performance logs:", error);
        return null;
    }
}

/**
 * Format performance logs as a readable string for pasting
 * Usage: console.log(formatPerfLogs(logs))
 */
export function formatPerfLogs(data: { count: number; logs: any[] }): string {
    if (!data || data.count === 0) {
        return "No performance logs found.";
    }

    const lines = [
        `=== Performance Logs (${data.count} entries) ===\n`,
        ...data.logs.map((log, i) => {
            return `
${i + 1}. [${log.timestamp}]
   FPS: ${log.fps} | Frame Time: ${log.avgFrameTime} | Long Tasks: ${log.longTasks}
   Memory: ${log.memoryUsage} | Device: ${log.device}
   User: ${log.user} | URL: ${log.url}
   User-Agent: ${log.userAgent}
`;
        }),
    ];

    return lines.join("\n");
}

/**
 * Helper to get and format logs in one call
 * Usage: await getPerfFormatted({ maxFps: 30 })
 */
export async function getPerfFormatted(options?: {
    limit?: number;
    minFps?: number;
    maxFps?: number;
}): Promise<string> {
    const data = await getPerf(options);
    if (!data) {
        return "Failed to fetch performance logs.";
    }
    return formatPerfLogs(data);
}

// Export to window for console access (only in browser)
if (typeof window !== "undefined") {
    (window as any).logPerf = logPerf;
    (window as any).getPerf = getPerf;
    (window as any).getPerfFormatted = getPerfFormatted;
    console.log("🔧 Performance helpers available: logPerf(), getPerf(), getPerfFormatted()");
}
