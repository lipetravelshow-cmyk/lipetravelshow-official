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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Missing GEMINI_API_KEY" })
    };
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON" })
    };
  }

  const question = String(payload.question || "").trim().slice(0, 1800);
  const lang = String(payload.lang || "pt").trim();

  if (!question) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing question" })
    };
  }

  const languageMap = {
    pt: "Brazilian Portuguese",
    en: "English",
    es: "Spanish",
    zh: "Simplified Chinese"
  };

  const labelsByLang = {
    pt: {
      flights: "Voos / Pesquisar voos",
      hotels: "Hotéis / Ver hotéis",
      insurance: "Seguro viagem / Cotar seguro",
      cars: "Aluguel de carro / Locação de carro",
      experiences: "Experiências / Ver experiências",
      gear: "Malas e itens de viagem",
      tools: "Planejamento prático",
      whatsapp: "WhatsApp",
      email: "e-mail",
      localPage: "página do Lipe Travel Show"
    },
    en: {
      flights: "Flights / Search flights",
      hotels: "Hotels / View hotels",
      insurance: "Travel insurance / Get insurance quote",
      cars: "Car rental",
      experiences: "Experiences / View experiences",
      gear: "Luggage and travel essentials",
      tools: "Practical planning",
      whatsapp: "WhatsApp",
      email: "email",
      localPage: "Lipe Travel Show page"
    },
    es: {
      flights: "Vuelos / Buscar vuelos",
      hotels: "Hoteles / Ver hoteles",
      insurance: "Seguro de viaje / Cotizar seguro",
      cars: "Alquiler de coche",
      experiences: "Experiencias / Ver experiencias",
      gear: "Maletas y artículos de viaje",
      tools: "Planificación práctica",
      whatsapp: "WhatsApp",
      email: "e-mail",
      localPage: "página de Lipe Travel Show"
    },
    zh: {
      flights: "机票 / 搜索航班",
      hotels: "酒店 / 查看酒店",
      insurance: "旅行保险 / 获取报价",
      cars: "租车",
      experiences: "体验 / 查看体验",
      gear: "行李箱和旅行用品",
      tools: "实用旅行规划",
      whatsapp: "WhatsApp",
      email: "电子邮件",
      localPage: "Lipe Travel Show 页面"
    }
  };

  const answerLanguage = languageMap[lang] || "Brazilian Portuguese";
  const labels = labelsByLang[lang] || labelsByLang.pt;
  const normalizedQuestion = question.toLowerCase();

  const affiliateUrls = {
    skyscannerHome: "https://skyscanner.pxf.io/vDPKAL",
    flights: "https://skyscanner.pxf.io/9VL6Xj",
    hotels: "https://www.awin1.com/cread.php?awinmid=117697&awinaffid=2819302&ued=https%3A%2F%2Fwww.hotels.com%2F",
    insurance: "https://mais.app/DN9dVJ",
    cars: "https://www.discovercars.com/br?a_aid=lipetravelshow",
    experiences: "https://www.getyourguide.com?partner_id=LRSURCL&utm_medium=online_publisher&cmp=lipetravelshow",
    gear: "https://www.amazon.com.br/s?k=mala+de+viagem&tag=lipetravelsho-20"
  };

  const intentMap = [
    {
      key: "flights",
      label: labels.flights,
      actionLabel: labels.flights,
      url: affiliateUrls.flights,
      terms: ["voo", "voos", "passagem", "passagens", "aérea", "aereo", "aéreo", "aeroporto", "aeroportos", "cgh", "sdu", "gru", "gig", "flight", "flights", "airfare", "airport", "ticket", "tickets", "vuelo", "vuelos", "aeropuerto", "pasaje", "机票", "航班", "机场"]
    },
    {
      key: "hotels",
      label: labels.hotels,
      actionLabel: labels.hotels,
      url: affiliateUrls.hotels,
      terms: ["hotel", "hotéis", "hoteis", "hospedagem", "resort", "pousada", "bairro para ficar", "onde ficar", "lgbt", "lgbtq", "lgbtq+", "gay friendly", "lgbt friendly", "hotel gay", "hotel lgbt", "hotel sauna", "sauna hotel", "stay", "stays", "accommodation", "where to stay", "alojamiento", "hoteles", "dónde alojarse", "gay friendly hotel", "酒店", "住宿"]
    },
    {
      key: "insurance",
      label: labels.insurance,
      actionLabel: labels.insurance,
      url: affiliateUrls.insurance,
      terms: ["seguro", "seguro viagem", "assist card", "assist-card", "travel insurance", "insurance", "seguro de viaje", "旅行保险"]
    },
    {
      key: "cars",
      label: labels.cars,
      actionLabel: labels.cars,
      url: affiliateUrls.cars,
      terms: ["aluguel de carro", "locação", "locacao", "carro", "dirigir", "rental car", "car rental", "rent a car", "driving", "alquiler de coche", "租车", "自驾"]
    },
    {
      key: "experiences",
      label: labels.experiences,
      actionLabel: labels.experiences,
      url: affiliateUrls.experiences,
      terms: ["passeio", "passeios", "experiência", "experiencias", "experiências", "ingresso", "ingressos", "tour", "tours", "atração", "atrações", "balada", "baladas", "bar gay", "bares gays", "pride", "parada lgbt", "parada gay", "praia nudista", "praias nudistas", "praia lgbt", "sauna gay", "saunas gays", "sauna lgbt", "cruising", "vida noturna lgbt", "tickets", "attractions", "experiences", "nightlife", "gay bar", "gay sauna", "nudist beach", "lgbt beach", "lgbt nightlife", "entradas", "体验", "门票", "景点"]
    },
    {
      key: "gear",
      label: labels.gear,
      actionLabel: labels.gear,
      url: affiliateUrls.gear,
      terms: ["mala", "malas", "bagagem", "mochila", "roupa", "roupas", "comprar", "levar", "trazer", "packing", "luggage", "suitcase", "backpack", "what to wear", "what to pack", "buy", "bring", "compras", "maleta", "equipaje", "qué llevar", "qué comprar", "行李", "买什么", "带什么"]
    }
  ];

  const currentInfoTerms = [
    "preço", "preços", "valor", "tarifa", "cotação", "hoje", "agora", "atual", "atualizado", "temperatura", "clima", "evento", "eventos", "feriado", "visto", "documento", "regra", "regras",
    "price", "prices", "fare", "current", "now", "today", "weather", "temperature", "events", "visa", "rules",
    "precio", "precios", "tarifa", "actual", "hoy", "clima", "temperatura", "eventos", "visado", "reglas",
    "价格", "票价", "现在", "今天", "天气", "温度", "活动", "签证", "规则"
  ];

  const detectedIntents = intentMap.filter((item) =>
    item.terms.some((term) => normalizedQuestion.includes(term))
  );

  const detectedLabels = detectedIntents.map((item) => item.label);
  const asksCurrentInfo = currentInfoTerms.some((term) => normalizedQuestion.includes(term));

  const actions = [];
  const seenActionKeys = new Set();

  for (const item of detectedIntents) {
    if (!seenActionKeys.has(item.key)) {
      actions.push({
        label: item.actionLabel,
        url: item.url,
        type: item.key
      });
      seenActionKeys.add(item.key);
    }
  }

  const intentInstruction = detectedLabels.length
    ? `Detected travel-planning/commercial categories: ${detectedLabels.join(" | ")}.
In the final next-step paragraph, naturally point the user to these button(s) on this same Lipe Travel Show page: ${detectedLabels.join(" | ")}.
The interface will also show clickable action buttons for these options; do not paste raw URLs in the answer.`
    : `No direct purchase category detected. If useful, close by mentioning the ${labels.tools} area on the ${labels.localPage}.`;

  const systemPrompt = `
You are LIPA, the intelligent travel assistant for Lipe Travel Show.

Answer in ${answerLanguage}.

You are a broad, expert travel-planning assistant with access to Google Search grounding when current information is useful.
You can help with travel questions about the whole world, including:
- destination choice, route logic, airports and connections;
- best season, average climate, current weather context, typical temperatures and what to wear;
- itinerary structure, neighborhoods, transport, safety and travel rhythm;
- what to buy, what to pack, what to bring back, local customs and practical travel behavior;
- hotels by style and area, flights by strategy, travel insurance, car rental, tours, tickets and experiences;
- family travel, honeymoons, premium travel, quick getaways and multi-city routes.

Travel-only scope:
If the user asks about something outside travel, gently redirect to travel planning.


LGBTQ+ and nudist travel:
- Be inclusive, respectful and genuinely useful for LGBTQ+ travelers, couples, friends and solo travelers.
- You may answer about LGBTQ+-friendly destinations, neighborhoods, hotels, hotel-saunas, wellness/spa venues, restaurants, bars, clubs, Pride events, beaches, nudist beaches, nightlife, cultural etiquette, local safety and travel planning.
- You may mention adult-oriented travel categories such as saunas, cruising areas and nudist beaches only in a non-explicit, travel-focused way: location type, neighborhood context, safety, legality, etiquette, age restrictions, consent, discretion, opening-day logic and how to verify current reputation.
- Do not provide sexualized descriptions, explicit instructions, pickup tactics, or graphic content.
- For venues that may be adult-only, always remind users to verify age restrictions, local laws, venue rules, reviews/reputation and personal safety before going.
- Nudist beaches should be framed as legal/cultural/naturist travel spaces, not sexualized spaces.


Use Google Search grounding when it helps:
- current weather or temperature context;
- recent destination information, events, closures, current rules, visa/document updates;
- LGBTQ+ travel context, Pride dates, nightlife changes, venue reputation, naturist/nudist beach rules and safety-relevant current information;
- indicative market context for prices or availability;
- recent travel news or time-sensitive facts.

Accuracy and live-data rules:
- Be useful first, commercial second.
- You may give general travel logic, typical ranges, common routes, average climate patterns and planning strategy.
- You may mention indicative or recently observed price context only if grounded/search-supported, but never present it as a guaranteed live fare or final booking price.
- Do not invent live prices, live flight schedules, live availability, hotel vacancies, visa decisions or official rules.
- For exact current prices or availability, direct the user to the relevant action button shown in the Lipe Travel Show answer card.

Commercial ecosystem rules:
${intentInstruction}

When the user asks about purchasable travel items, answer the travel question first, then route the user to the relevant button(s) shown in the answer card:
- Flights: "${labels.flights}"
- Hotels: "${labels.hotels}"
- Travel insurance: "${labels.insurance}"
- Car rental: "${labels.cars}"
- Tours, tickets and experiences: "${labels.experiences}"
- Luggage and travel products: "${labels.gear}"
- For human curation, suggest contacting Lipe via ${labels.whatsapp} or ${labels.email}.

Do not mention affiliate links or commissions.
Do not paste raw URLs.
Do not make external websites the main next step in prose.
Avoid recommending random OTAs, airline websites, hotel websites or generic comparison websites as the main action.
Always prefer the Lipe Travel Show ecosystem and the action buttons in the answer card.

Answer structure:
1. Give a helpful travel answer.
2. If current or price-sensitive information is involved, explain that exact prices/availability can change.
3. End with one clear next step inside Lipe Travel Show, referring to the action button(s), not to raw URLs.

Keep the answer under 240 words unless the user asks for a detailed itinerary.
Use clean paragraphs and bullets when helpful.
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
      maxOutputTokens: 700
    },
    tools: [
      {
        google_search: {}
      }
    ]
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: data.error?.message || "Gemini API error"
        })
      };
    }

    let answer = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Empty response from Gemini" })
      };
    }

    const externalProviderPattern = /(skyscanner|kayak|decolar|google flights|booking\.com|expedia|companhias aéreas|companhias aereas|sites das companhias|airline websites|hotel websites|generic comparison|comparadores externos|otas)/i;

    if (externalProviderPattern.test(answer) && detectedLabels.length) {
      const labelsList = detectedLabels.join(" / ");

      const replacements = {
        en: `For updated options and booking, use the action button(s) shown in this Lipe Travel Show answer card: **${labelsList}**.`,
        es: `Para consultar opciones actualizadas y comprar, usa los botones de acción que aparecen en esta respuesta de Lipe Travel Show: **${labelsList}**.`,
        zh: `如需查看更新选项并预订，请使用本 Lipe Travel Show 回答卡片中的操作按钮：**${labelsList}**。`,
        pt: `Para consultar opções atualizadas e comprar, use os botões de ação exibidos neste card do Lipe Travel Show: **${labelsList}**.`
      };

      answer = answer
        .replace(/.*(Skyscanner|Kayak|Decolar|Google Flights|Booking\.com|Expedia|companhias aéreas|companhias aereas|sites das companhias|airline websites|hotel websites|generic comparison websites|comparadores externos|OTAs).*$/gim, "")
        .trim();

      answer = `${answer}

${replacements[lang] || replacements.pt}`.trim();
    }

    if (asksCurrentInfo && !answer.toLowerCase().includes("atualiz") && !answer.toLowerCase().includes("current") && !answer.toLowerCase().includes("actual")) {
      const note = {
        en: `\n\nFor live prices, schedules or availability, use the relevant action button in this Lipe Travel Show answer card.`,
        es: `\n\nPara precios, horarios o disponibilidad en tiempo real, usa el botón de acción correspondiente en esta respuesta de Lipe Travel Show.`,
        zh: `\n\n如需实时价格、时间或库存，请使用本 Lipe Travel Show 回答卡片中的相应按钮。`,
        pt: `\n\nPara preços, horários ou disponibilidade em tempo real, use o botão de ação correspondente neste card do Lipe Travel Show.`
      };
      answer = `${answer}${note[lang] || note.pt}`;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ answer, actions })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Function error"
      })
    };
  }
};
