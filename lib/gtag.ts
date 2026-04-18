// Tiny wrapper around window.gtag so components can fire GA4 events
// without needing to know whether gtag has loaded yet. The gtag script
// itself is injected in pages/_app.tsx.

type GtagParams = Record<string, unknown>;

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
    }
}

export function trackEvent(eventName: string, params: GtagParams = {}): void {
    if (typeof window === 'undefined') return;
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
}
