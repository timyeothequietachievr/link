import { createHash } from "crypto";

const POSTHOG_KEY =
    process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    process.env.POSTHOG_PROJECT_API_KEY ||
    "phc_vvzGombu49viAehfCEQd9fKbnSHo6dWoDFMaPGiSMgYc";
const POSTHOG_HOST =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ||
    process.env.POSTHOG_HOST ||
    "https://us.i.posthog.com";

type CapturePayload = {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
    timestamp?: string;
};

export function hashEmail(email: string): string {
    return createHash("sha256")
        .update(email.trim().toLowerCase())
        .digest("hex");
}

export async function captureServerEvent({
    distinctId,
    event,
    properties = {},
    timestamp,
}: CapturePayload): Promise<void> {
    if (!POSTHOG_KEY) {
        return;
    }

    const body = {
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: {
            $lib: "link-server",
            ...properties,
        },
        timestamp: timestamp ?? new Date().toISOString(),
    };

    const response = await fetch(`${POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`PostHog capture failed (${response.status})`);
    }
}

export function getPostHogDistinctIdFromCookie(
    cookieHeader: string | undefined,
): string | undefined {
    if (!cookieHeader) {
        return undefined;
    }

    const match = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("ph_") && part.includes("_posthog="));

    if (!match) {
        return undefined;
    }

    const rawValue = decodeURIComponent(match.slice(match.indexOf("=") + 1));

    try {
        const parsed = JSON.parse(rawValue) as { distinct_id?: string };
        return parsed.distinct_id;
    } catch {
        return undefined;
    }
}
