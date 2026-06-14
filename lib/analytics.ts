import posthog from "posthog-js";
import {
    buildTrackedOutboundUrl,
    classifyDestination,
    getAttributionFromLocation,
    getOutboundPath,
    isConversionDestination,
    type AttributionContext,
} from "./attribution";

export const POSTHOG_KEY =
    process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    "phc_vvzGombu49viAehfCEQd9fKbnSHo6dWoDFMaPGiSMgYc";
export const POSTHOG_HOST =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
export const GA_MEASUREMENT_ID =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-TVY6L0GW07";

export type AnalyticsParams = Record<string, unknown>;

let storedAttribution: AttributionContext | null = null;

export function initAnalytics(): void {
    if (typeof window === "undefined" || !POSTHOG_KEY || posthog.__loaded) {
        return;
    }

    storedAttribution = getAttributionFromLocation();

    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: true,
        cross_subdomain_cookie: true,
        persistence: "cookie",
        person_profiles: "identified_only",
        loaded: () => {
            if (process.env.NODE_ENV === "development") {
                posthog.debug();
            }

            registerAttribution();
        },
    });
}

function registerAttribution(): void {
    const attribution = storedAttribution ?? getAttributionFromLocation();

    if (Object.keys(attribution).length === 0) {
        return;
    }

    posthog.register({
        initial_utm_source: attribution.utm_source,
        initial_utm_medium: attribution.utm_medium,
        initial_utm_campaign: attribution.utm_campaign,
        initial_utm_content: attribution.utm_content,
        initial_utm_term: attribution.utm_term,
        initial_referrer: attribution.referrer,
        initial_referring_domain: attribution.referring_domain,
    });
}

export function getDistinctId(): string | undefined {
    if (!posthog.__loaded) {
        return undefined;
    }

    return posthog.get_distinct_id();
}

export function getAttribution(): AttributionContext {
    return storedAttribution ?? getAttributionFromLocation();
}

export function trackPageView(pathname = window.location.pathname): void {
    const attribution = getAttribution();

    trackEvent("links_page_view", {
        page_path: pathname,
        page_title: document.title,
        page_url: window.location.href,
        referrer: attribution.referrer ?? (document.referrer || undefined),
        referring_domain: attribution.referring_domain,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
    });

    if (posthog.__loaded) {
        posthog.capture("$pageview", {
            $current_url: window.location.href,
            path: pathname,
            site: "links_bio",
        });
    }
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}): void {
    if (typeof window === "undefined") {
        return;
    }

    const payload = {
        site: "links_bio",
        ...params,
    };

    if (posthog.__loaded) {
        posthog.capture(eventName, payload);
    }

    if (typeof window.gtag === "function") {
        window.gtag("event", eventName, payload);
    }
}

export function getTrackedLinkHref(
    link: { id: string; title: string; href: string },
    location: string,
): string {
    const distinctId = getDistinctId();
    const attribution = getAttribution();
    const destinationKind = classifyDestination(link.href);
    const conversionIntent = isConversionDestination(link.href);

    if (conversionIntent) {
        return getOutboundPath(link.id, distinctId);
    }

    return buildTrackedOutboundUrl(link.href, {
        linkId: link.id,
        linkTitle: stripHtml(link.title),
        distinctId,
        attribution,
    });
}

export function trackLinkClick(
    link: { id: string; title: string; href: string },
    location: string,
): void {
    const cleanTitle = stripHtml(link.title);
    const attribution = getAttribution();
    const destinationKind = classifyDestination(link.href);
    const conversionIntent = isConversionDestination(link.href);

    trackEvent("link_click", {
        link_id: link.id,
        link_text: cleanTitle,
        link_url: link.href,
        location,
        outbound: true,
        destination_kind: destinationKind,
        conversion_intent: conversionIntent,
        posthog_distinct_id: getDistinctId(),
        referrer: attribution.referrer ?? (document.referrer || undefined),
        referring_domain: attribution.referring_domain,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
    });
}

export function trackSocialClick(item: {
    title: string;
    href: string;
    component: string;
}): void {
    const attribution = getAttribution();

    trackEvent("social_click", {
        link_text: item.title,
        link_url: item.href,
        platform: item.component,
        location: "social_bar",
        outbound: true,
        posthog_distinct_id: getDistinctId(),
        referrer: attribution.referrer ?? (document.referrer || undefined),
        referring_domain: attribution.referring_domain,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
    });
}

function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
    }
}
