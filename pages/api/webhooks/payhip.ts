import type { NextApiRequest, NextApiResponse } from "next";
import { createHash } from "crypto";
import { captureServerEvent, hashEmail } from "@/lib/posthog-server";

type PayHipItem = {
    product_id?: string;
    product_name?: string;
    product_key?: string;
    product_permalink?: string;
    quantity?: string;
};

type PayHipWebhookPayload = {
    id?: string;
    email?: string;
    currency?: string;
    price?: number;
    items?: PayHipItem[];
    payment_type?: string;
    type?: string;
    signature?: string;
    date?: number;
    amount_refunded?: number;
};

function verifyPayHipSignature(
    signature: string | undefined,
    apiKey: string,
): boolean {
    if (!signature) {
        return false;
    }

    const expected = createHash("sha256").update(apiKey).digest("hex");
    return expected === signature;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.PAYHIP_API_KEY;
    if (!apiKey) {
        console.error("[payhip webhook] PAYHIP_API_KEY is not configured");
        return res.status(500).json({ error: "Webhook not configured" });
    }

    const payload = req.body as PayHipWebhookPayload;
    if (!verifyPayHipSignature(payload.signature, apiKey)) {
        return res.status(403).json({ error: "Invalid signature" });
    }

    if (!payload.type || !payload.email) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    const emailHash = hashEmail(payload.email);
    const items = payload.items ?? [];
    const primaryItem = items[0];
    const amount = typeof payload.price === "number" ? payload.price / 100 : undefined;

    try {
        if (payload.type === "paid") {
            await captureServerEvent({
                distinctId: emailHash,
                event: "purchase_completed",
                properties: {
                    provider: "payhip",
                    transaction_id: payload.id,
                    email_domain: payload.email.split("@")[1] ?? undefined,
                    currency: payload.currency,
                    amount,
                    payment_type: payload.payment_type,
                    product_id: primaryItem?.product_id,
                    product_name: primaryItem?.product_name,
                    product_key: primaryItem?.product_key,
                    product_permalink: primaryItem?.product_permalink,
                    item_count: items.length,
                    funnel_source: "payhip",
                    site: "links_bio",
                    $set: {
                        last_purchase_at: new Date().toISOString(),
                        last_purchase_provider: "payhip",
                    },
                },
            });
        }

        if (payload.type === "refunded") {
            await captureServerEvent({
                distinctId: emailHash,
                event: "purchase_refunded",
                properties: {
                    provider: "payhip",
                    transaction_id: payload.id,
                    currency: payload.currency,
                    amount,
                    amount_refunded:
                        typeof payload.amount_refunded === "number"
                            ? payload.amount_refunded / 100
                            : undefined,
                    product_name: primaryItem?.product_name,
                    site: "links_bio",
                },
            });
        }
    } catch (error) {
        console.error("[payhip webhook]", error);
        return res.status(500).json({ error: "Failed to record event" });
    }

    return res.status(200).json({ ok: true });
}

export const config = {
    api: {
        bodyParser: true,
    },
};
