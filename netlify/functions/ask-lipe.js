exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const question = String(payload.question || "").trim().slice(0, 1200);
  const lang = String(payload.lang || "pt").trim();

  if (!question) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing question" }) };
  }

  const languageMap = {
    pt: "Brazilian Portuguese",
    en: "English",
    es: "Spanish",
    zh: "Simplified Chinese"
  };

  const answerLanguage = languageMap[lang] || "Brazilian Portuguese";

  const systemPrompt = `
You are LIPA, the intelligent travel assistant for Lipe Travel Show.
Answer in ${answerLanguage}.
Style: elegant, concise, practical, premium editorial, not robotic.
Help travelers organize travel ideas with clarity.
You may suggest destinations, planning logic, seasonality, types of hotels, flights, insurance, experiences, itinerary structure, and when to contact Lipe.
Do not invent real-time prices, availability, hotel vacancies, flight fares, visas, or official rules.
If information may change, tell the user to verify before booking.
Always include a practical next step.
When relevant, mention that Lipe can help with human curation via WhatsApp or email.
Keep the answer under 170 words.
`;

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: question }]
      }
    ],
    generationConfig: {
      temperature: 0.55,
      maxOutputTokens: 420
    }
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || "Gemini API error" })
      };
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Empty response from Gemini" }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ answer }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Function error" }) };
  }
};
