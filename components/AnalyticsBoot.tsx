import { useEffect } from "react";
import { useRouter } from "next/router";
import { initAnalytics, trackPageView } from "@/lib/analytics";

export default function AnalyticsBoot() {
    const router = useRouter();

    useEffect(() => {
        initAnalytics();
        trackPageView(router.asPath);
    }, [router.asPath]);

    useEffect(() => {
        const handleRouteChange = (url: string) => {
            trackPageView(url);
        };

        router.events.on("routeChangeComplete", handleRouteChange);
        return () => {
            router.events.off("routeChangeComplete", handleRouteChange);
        };
    }, [router.events, router.asPath]);

    return null;
}
