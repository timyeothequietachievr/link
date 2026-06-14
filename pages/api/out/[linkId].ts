import type { NextApiRequest, NextApiResponse } from "next";
import data from "@/data.json";
import {
    buildTrackedOutboundUrl,
    classifyDestination,
    isConversionDestination,
} from "@/lib/attribution";
import {
    captureServerEvent,
    getPostHogDistinctIdFromCookie,
} from "@/lib/posthog-server";

function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const linkId = req.query.linkId;
    if (typeof linkId !== "string") {
        return res.status(400).json({ error: "Missing link id" });
    }

    const link = data.links.find((item) => item.id === linkId);
    if (!link) {
        return res.status(404).json({ error: "Unknown link" });
    }

    const attribution = {
        utm_source: typeof req.query.utm_source === "string" ? req.query.utm_source : undefined,
        utm_medium: typeof req.query.utm_medium === "string" ? req.query.utm_medium : undefined,
        utm_campaign: typeof req.query.utm_campaign === "string" ? req.query.utm_campaign : undefined,
        utm_content: typeof req.query.utm_content === "string" ? req.query.utm_content : undefined,
        utm_term: typeof req.query.utm_term === "string" ? req.query.utm_term : undefined,
    };
    const referrer = req.headers.referer;
    let referringDomain: string | undefined;
    if (referrer) {
        try {
            referringDomain = new URL(referrer).hostname;
        } catch {
            referringDomain = undefined;
        }
    }
    const distinctId =
        (typeof req.query.phid === "string" && req.query.phid) ||
        getPostHogDistinctIdFromCookie(req.headers.cookie) ||
        "anonymous-link-visitor";
    const cleanTitle = stripHtml(link.title);
    const destinationKind = classifyDestination(link.href);
    const destination = buildTrackedOutboundUrl(link.href, {
        linkId: link.id,
        linkTitle: cleanTitle,
        distinctId,
        attribution,
    });

    try {
        await captureServerEvent({
            distinctId,
            event: "link_outbound_redirect",
            properties: {
                link_id: link.id,
                link_text: cleanTitle,
                link_url: link.href,
                destination_url: destination,
                destination_kind: destinationKind,
                conversion_intent: isConversionDestination(link.href),
                referrer,
                referring_domain: referringDomain,
                utm_source: attribution.utm_source,
                utm_medium: attribution.utm_medium,
                utm_campaign: attribution.utm_campaign,
                utm_content: attribution.utm_content,
                utm_term: attribution.utm_term,
                site: "links_bio",
            },
        });
    } catch (error) {
        console.error("[api/out]", error);
    }

    res.setHeader(
        "Set-Cookie",
        [
            `tqa_attribution=${encodeURIComponent(
                JSON.stringify({
                    phid: distinctId,
                    link_id: link.id,
                    link_text: cleanTitle,
                    destination_kind: destinationKind,
                    ts: Date.now(),
                }),
            )}; Domain=.thequietachievr.com; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`,
        ].join(", "),
    );

    return res.redirect(302, destination);
}
