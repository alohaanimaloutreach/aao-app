import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  try {
    const { image, media_type, field_type } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Build prompt based on field type
    let prompt: string;
    if (field_type?.toLowerCase().includes("lot")) {
      prompt = `This is a photo of a vaccine or medication label. Extract only the lot number from this image. The lot number is typically labeled 'LOT', 'Lot #', 'Batch', or 'Lot No.' followed by alphanumeric characters. Return ONLY the lot number value, nothing else. If you cannot find a lot number, return the word NONE.`;
    } else if (field_type?.toLowerCase().includes("microchip")) {
      prompt = `This is a photo of a microchip number. Extract only the microchip identification number (typically 9, 10, or 15 digits). Return ONLY the number, nothing else. If you cannot find a microchip number, return the word NONE.`;
    } else {
      prompt = `This is a photo of a product label. Extract the product name and any dosage or identifying number visible. Return ONLY the extracted text, nothing else. If you cannot read the label, return the word NONE.`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: media_type || "image/jpeg",
                  data: image,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${errorText}` }),
        { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const result = await response.json();
    const value = result.content?.[0]?.text?.trim() ?? "NONE";

    return new Response(
      JSON.stringify({ value }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
