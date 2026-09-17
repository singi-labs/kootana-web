import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { verifySolution } from "altcha-lib";

/**
 * Kootana waitlist subscription proxy.
 *
 * Proxies subscription requests to the self-hosted Listmonk instance, keeping the
 * API credentials server-side. Validates an ALTCHA proof-of-work solution for spam
 * protection, then runs Listmonk's double opt-in flow. Ported from the gui.do
 * implementation.
 */

const LISTMONK_API_URL = "https://n.a11y.nl/api/subscribers";
const DEFAULT_LIST_ID = 8; // Kootana waitlist

interface SubscriptionRequest {
  email: string;
  name?: string;
  listId?: string;
  signupPage?: string;
  altcha?: string;
}

const commonHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
) => {
  if ((event.httpMethod as string) === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      } as Record<string, string>,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...commonHeaders },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    let requestData: SubscriptionRequest;

    if (event.headers["content-type"]?.includes("application/json")) {
      requestData = JSON.parse(event.body || "{}");
    } else {
      const params = new URLSearchParams(event.body || "");
      requestData = {
        email: params.get("email") || "",
        name: params.get("name") || undefined,
        listId: params.get("l") || params.get("listId") || undefined,
        signupPage: params.get("signupPage") || undefined,
        altcha: params.get("altcha") || undefined,
      };
    }

    const { email, name, listId, signupPage, altcha } = requestData;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        statusCode: 400,
        headers: { ...commonHeaders },
        body: JSON.stringify({ error: "Valid email address required" }),
      };
    }

    // Validate ALTCHA proof-of-work solution
    const altchaKey = process.env.ALTCHA_HMAC_KEY;
    if (altchaKey) {
      if (!altcha) {
        return {
          statusCode: 400,
          headers: { ...commonHeaders },
          body: JSON.stringify({
            success: false,
            error: "Verification required. Please try again.",
          }),
        };
      }

      try {
        const isValid = await verifySolution(altcha, altchaKey);
        if (!isValid) {
          return {
            statusCode: 400,
            headers: { ...commonHeaders },
            body: JSON.stringify({
              success: false,
              error: "Verification failed. Please refresh and try again.",
            }),
          };
        }
      } catch (error) {
        console.error("ALTCHA verification error:", error);
        return {
          statusCode: 400,
          headers: { ...commonHeaders },
          body: JSON.stringify({
            success: false,
            error: "Verification expired. Please refresh and try again.",
          }),
        };
      }
    }

    const apiUser = process.env.LISTMONK_API_USER;
    const apiKey = process.env.LISTMONK_API_KEY;

    if (!apiUser || !apiKey) {
      console.error("Missing Listmonk API credentials");
      return {
        statusCode: 500,
        headers: { ...commonHeaders },
        body: JSON.stringify({
          success: false,
          error: "Server configuration error. Please try again later.",
        }),
      };
    }

    const authHeader = `Basic ${Buffer.from(`${apiUser}:${apiKey}`).toString("base64")}`;
    const bypassToken = process.env.CF_BYPASS_TOKEN || "";
    const targetListId = listId ? parseInt(String(listId), 10) : DEFAULT_LIST_ID;

    // Step 1: create the subscriber
    const subscriberPayload = {
      email,
      name: name || "",
      status: "enabled",
      attribs: {
        source: "kootana.social",
        signup_page: signupPage || "unknown",
        signup_date: new Date().toISOString().split("T")[0],
      },
    };

    const response = await fetch(LISTMONK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        "X-Bypass-Token": bypassToken,
      },
      body: JSON.stringify(subscriberPayload),
    });

    const responseData = await response.json().catch(() => null);

    if (response.ok) {
      const subscriberId = responseData?.data?.id;

      if (subscriberId) {
        // Step 2: add to the list (unconfirmed -> triggers double opt-in)
        await fetch("https://n.a11y.nl/api/subscribers/lists", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            "X-Bypass-Token": bypassToken,
          },
          body: JSON.stringify({
            ids: [subscriberId],
            action: "add",
            target_list_ids: [targetListId],
            status: "unconfirmed",
          }),
        });

        // Step 3: send the opt-in confirmation email
        await fetch(`https://n.a11y.nl/api/subscribers/${subscriberId}/optin`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "X-Bypass-Token": bypassToken,
          },
        });
      }

      return {
        statusCode: 200,
        headers: { ...commonHeaders },
        body: JSON.stringify({
          success: true,
          message:
            "Thanks! Please check your email to confirm you're on the list.",
        }),
      };
    }

    if (response.status === 409 || responseData?.message?.includes("already")) {
      return {
        statusCode: 200,
        headers: { ...commonHeaders },
        body: JSON.stringify({
          success: true,
          message: "You're already on the list. See you at launch.",
        }),
      };
    }

    console.log("Listmonk API error:", response.status, responseData);

    return {
      statusCode: 400,
      headers: { ...commonHeaders },
      body: JSON.stringify({
        success: false,
        error: responseData?.message || "Subscription failed. Please try again.",
      }),
    };
  } catch (error) {
    console.error("Waitlist subscription error:", error);

    return {
      statusCode: 500,
      headers: { ...commonHeaders },
      body: JSON.stringify({
        success: false,
        error: "Something went wrong. Please try again later.",
      }),
    };
  }
};

export { handler };
