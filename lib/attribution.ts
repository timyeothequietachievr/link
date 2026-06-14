export type AttributionContext = {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    referrer?: string;
    referring_domain?: string;
};

export type DestinationKind =
    | "owned_site"
    | "payhip"
    | "amazon"
    | "external";

export function classifyDestination(href: string): DestinationKind {
    try {
        const url = new URL(href);
        const host = url.hostname.toLowerCase();

        if (host.endsWith("thequietachievr.com")) {
            return "owned_site";
        }
        if (host.includes("payhip.com")) {
            return "payhip";
        }
        if (host.includes("amazon.") || host.includes("mybook.to")) {
            return "amazon";
        }
        return "external";
    } catch {
        return "external";
    }
}

export function isConversionDestination(href: string): boolean {
    const kind = classifyDestination(href);
    return kind === "owned_site" || kind === "payhip" || kind === "amazon";
}

export function getAttributionFromSearch(search: string): AttributionContext {
    const params = new URLSearchParams(search);
    const context: AttributionContext = {};

    for (const key of [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
    ] as const) {
        const value = params.get(key);
        if (value) {
            context[key] = value;
        }
    }

    return context;
}

export function getAttributionFromLocation(): AttributionContext {
    if (typeof window === "undefined") {
        return {};
    }

    const context = getAttributionFromSearch(window.location.search);

    if (document.referrer) {
        context.referrer = document.referrer;
        try {
            context.referring_domain = new URL(document.referrer).hostname;
        } catch {
            // ignore invalid referrer URLs
        }
    }

    return context;
}

export function buildTrackedOutboundUrl(
    href: string,
    options: {
        linkId: string;
        linkTitle: string;
        distinctId?: string;
        attribution?: AttributionContext;
    },
): string {
    let url: URL;

    try {
        url = new URL(href);
    } catch {
        return href;
    }

    const attribution = options.attribution ?? {};

    url.searchParams.set("utm_source", attribution.utm_source ?? "links_bio");
    url.searchParams.set("utm_medium", attribution.utm_medium ?? "bio_link");
    url.searchParams.set("utm_campaign", attribution.utm_campaign ?? options.linkId);
    url.searchParams.set("utm_content", attribution.utm_content ?? options.linkTitle.slice(0, 80));

    if (options.distinctId) {
        url.searchParams.set("tqa_phid", options.distinctId);
    }

    return url.toString();
}

export function getOutboundPath(linkId: string, distinctId?: string): string {
    const params = new URLSearchParams();
    if (distinctId) {
        params.set("phid", distinctId);
    }
    const query = params.toString();
    return query ? `/api/out/${linkId}?${query}` : `/api/out/${linkId}`;
}
