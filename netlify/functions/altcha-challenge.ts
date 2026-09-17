import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createChallenge } from "altcha-lib";

/**
 * ALTCHA challenge endpoint.
 *
 * Generates cryptographic proof-of-work challenges for spam protection. The
 * challenge expires after 5 minutes and is HMAC-signed so the subscribe function
 * can verify it came from this server. Ported from the gui.do implementation.
 */

const CHALLENGE_EXPIRY_SECONDS = 300; // 5 minutes
const MAX_NUMBER = 300000; // ~1-2s solve time on an average device

const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const hmacKey = process.env.ALTCHA_HMAC_KEY;

    if (!hmacKey) {
      console.error("Missing ALTCHA_HMAC_KEY environment variable");
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    const expires = new Date(Date.now() + CHALLENGE_EXPIRY_SECONDS * 1000);
    const challenge = await createChallenge({ hmacKey, maxNumber: MAX_NUMBER, expires });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        ...corsHeaders,
      },
      body: JSON.stringify(challenge),
    };
  } catch (error) {
    console.error("ALTCHA challenge generation error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({ error: "Failed to generate challenge" }),
    };
  }
};

export { handler };
