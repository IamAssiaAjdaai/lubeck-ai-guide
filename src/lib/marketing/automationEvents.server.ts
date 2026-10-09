import "server-only";

type ApprovedMarketingContent = {
  id: number;
  cityId: number;
  contentCode: string;
  platform: string;
  format: string;
  hook: string;
  caption: string | null;
  cta: string | null;
};

export async function notifyMarketingContentApproved(
  item: ApprovedMarketingContent,
) {
  const url =
    process.env.CITYWALK_MARKETING_APPROVED_WEBHOOK_URL?.trim();

  const secret =
    process.env.CITYWALK_MARKETING_APPROVED_WEBHOOK_SECRET?.trim();

  // Automation is optional in environments where it isn't configured.
  if (!url || !secret) {
    return { delivered: false, skipped: true };
  }

  console.log("[marketing webhook config]", {
    hasUrl: Boolean(url),
    hasSecret: Boolean(secret),
    url,
  });
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-citywalk-event-key": secret,
      },
      body: JSON.stringify({
        event: "marketing.content.approved",
        content: {
          id: item.id,
          cityId: item.cityId,
          contentCode: item.contentCode,
          platform: item.platform,
          format: item.format,
          hook: item.hook,
          caption: item.caption,
          cta: item.cta,
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(
        "Marketing approval webhook failed:",
        response.status,
      );

      return { delivered: false, skipped: false };
    }

    return { delivered: true, skipped: false };
  } catch (error) {
    console.error("Marketing approval webhook failed:", error);

    return { delivered: false, skipped: false };
  }
}