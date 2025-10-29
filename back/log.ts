export function log(message: any, level: "info" | "warn" | "error", ...optionalParams: any[]) {
    const date = new Date();

    // this timestamp should be in UTC so wherever it's hosted, there's no timezone ambiguity
    const timestamp = date.toISOString();
    
    // conversion to (my) Amsterdam timezone: +1 (winter) or +2 (summer)
    // utcDate.toLocaleString('nl-NL', {
    //     timeZone: 'Europe/Amsterdam'
    // });
    
    const msg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    switch (level) {
        case "warn":
            console.warn(msg, ...optionalParams);
            break;
        case "error":
            console.error(msg, ...optionalParams);
            break;
        case "info":
        default:
            console.log(msg, ...optionalParams);
            break;
    }
}

export function logInfo(message: any, ...optionalParams: any[]) {
    log(message, "info", ...optionalParams);
}

export function logWarning(message: any, ...optionalParams: any[]) {
    log(message, "warn", ...optionalParams);
}

export function logError(message: any, ...optionalParams: any[]) {
    log(message, "error", ...optionalParams);
}