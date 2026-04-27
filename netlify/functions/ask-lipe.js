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

  const question = String(payload.question || "").trim().slice(0, 1200);
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
      tools: "Planejamento prático",
      whatsapp: "WhatsApp",
      email: "e-mail"
    },
    en: {
      flights: "Flights / Search flights",
      hotels: "Hotels / View hotels",
      insurance: "Travel insurance / Get insurance quote",
      cars: "Car rental",
      experiences: "Experiences / View experiences",
      tools: "Practical planning",
      whatsapp: "WhatsApp",
      email: "email"
    },
    es: {
      flights: "Vuelos / Buscar vuelos",
      hotels: "Hoteles / Ver hoteles",
      insurance: "Seguro de viaje / Cotizar seguro",
      cars: "Alquiler de coche",
      experiences: "Experiencias / Ver experiencias",
      tools: "Planificación práctica",
      whatsapp: "WhatsApp",
      email: "e-mail"
    },
    zh: {
      flights: "机票 / 搜索航班",
      hotels: "酒店 / 查看酒店",
      insurance: "旅行保险 / 获取报价",
      cars: "租车",
      experiences: "体验 / 查看体验",
      tools: "实用旅行规划",
      whatsapp: "WhatsApp",
      email: "电子邮件"
    }
  };

  const answerLanguage = languageMap[lang] || "Brazilian Portuguese";
  const labels = labelsByLang[lang] || labelsByLang.pt;
  const normalizedQuestion = question.toLowerCase();

  const intentMap = [
    {
      key: "flights",
      label: labels.flights,
      terms: ["voo", "voos", "passagem", "passagens", "aérea", "aereo", "aéreo", "cgh", "sdu", "gru", "gig", "flight", "flights", "airfare", "ticket", "tickets", "vuelo", "vuelos", "pasaje", "机票", "航班"]
    },
    {
      key: "hotels",
      label: labels.hotels,
      terms: ["hotel", "hotéis", "hoteis", "hospedagem", "resort", "pousada", "stay", "stays", "accommodation", "alojamiento", "hoteles", "酒店"]
    },
    {
      key: "insurance",
      label: labels.insurance,
      terms: ["seguro", "assist card", "assist-card", "travel insurance", "insurance", "seguro de viaje", "旅行保险"]
    },
    {
      key: "cars",
      label: labels.cars,
      terms: ["aluguel de carro", "locação", "locacao", "carro", "rental car", "car rental", "rent a car", "alquiler de coche", "租车"]
    },
    {
      key: "experiences",
      label: labels.experiences,
      terms: ["passeio", "passeios", "experiência", "experiencias", "experiências", "ingresso", "ingressos", "tour", "tours", "atração", "atrações", "tickets", "attractions", "experiences", "entradas", "体验", "门票"]
    }
  ];

  const detectedIntents = intentMap.filter((item) =>
    item.terms.some((term) => normalizedQuestion.includes(term))
  );

  const intentInstruction = detectedIntents.length
    ? `Detected commercial intent: ${detectedIntents.map((item) => item.key).join(", ")}.
Mandatory routing for this answer: explicitly guide the user to click/use ${detectedIntents.map((item) => `"${item.label}"`).join(" and ")} on this same Lipe Travel Show page.`
    : "No specific commercial product intent detected. Still keep the user inside the Lipe Travel Show ecosystem whenever useful.";

  const systemPrompt = `
You are LIPA, the intelligent travel assistant for Lipe Travel Show.

Answer in ${answerLanguage}.

Style:
- Elegant, concise, practical and premium editorial.
- Never sound generic or robotic.
- Help the user organize travel ideas with clarity.
- Keep the answer under 180 words.
- Use short paragraphs and bullets when useful.

Core role:
You are not a generic travel assistant. You are the travel assistant inside the Lipe Travel Show website. Your job is to help the user stay inside the Lipe Travel Show ecosystem whenever possible.

${intentInstruction}

Strict commercial routing rules:
When the user asks about purchasable travel items — flights, hotels, travel insurance, car rental, tours, attractions, tickets or experiences — do NOT tell them to go to airline websites, hotel websites, generic OTAs, random search engines, external comparison sites or company websites.

Instead, guide them to use the planning tools and buttons already available on this same Lipe Travel Show page.

Use these exact internal directions when relevant:
- Flights: tell the user to use the "${labels.flights}" button on this page.
- Hotels: tell the user to use the "${labels.hotels}" button on this page.
- Travel insurance: tell the user to use the "${labels.insurance}" button on this page.
- Car rental: tell the user to use the "${labels.cars}" tool on this page.
- Tours, tickets and experiences: tell the user to use the "${labels.experiences}" button on this page.
- For complex trips, premium trips, family trips, honeymoons, multi-city routes or human curation, suggest contacting Lipe via ${labels.whatsapp} or ${labels.email}.

Forbidden phrasing:
Never recommend Skyscanner, Kayak, Decolar, Google Flights, Booking, Expedia, airline websites, hotel websites, OTAs, generic comparison websites or external booking sites as the next step.
Never say "acesse sites", "procure em sites", "go to websites", "check airline websites" or equivalent as the next step.

Preferred next-step phrasing:
- "Use the button on this page..."
- "Inside the ${labels.tools} area of this page..."
- "The best next step is to click ${labels.flights} / ${labels.hotels} / ${labels.insurance} here on the Lipe Travel Show page..."
- "If you want human curation, Lipe can help via ${labels.whatsapp} or ${labels.email}."

Do not mention affiliate links or commissions.
Do not invent live prices, live availability, exact fares, hotel vacancies, flight schedules, visa rules or official requirements.
If prices or rules may change, say that the user should use the relevant button on this page to check updated options.
Always include one clear next step inside the Lipe Travel Show ecosystem.
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
      temperature: 0.35,
      maxOutputTokens: 480
    }
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

    const forbiddenPattern = /(skyscanner|kayak|decolar|google flights|booking\.com|expedia|companhias aéreas|companhias aereas|sites das companhias|airline websites|hotel websites|generic comparison|comparadores externos|otas)/i;

    if (detectedIntents.length && forbiddenPattern.test(answer)) {
      const labelsList = detectedIntents.map((item) => item.label).join(" / ");

      if (lang === "en") {
        answer = `For this type of search, the best next step is to stay inside the Lipe Travel Show page.

Use the **${labelsList}** button in the **${labels.tools}** area to check updated options.

For routes like CGH–SDU, compare dates and times carefully, especially for weekends. If you want human curation, Lipe can help via ${labels.whatsapp} or ${labels.email}.`;
      } else if (lang === "es") {
        answer = `Para este tipo de búsqueda, el mejor próximo paso es seguir dentro de la página de Lipe Travel Show.

Usa el botón **${labelsList}** en el área de **${labels.tools}** para consultar opciones actualizadas.

Para rutas como CGH–SDU, compara fechas y horarios con cuidado, especialmente en fines de semana. Si quieres una curaduría humana, Lipe puede ayudarte por ${labels.whatsapp} o ${labels.email}.`;
      } else if (lang === "zh") {
        answer = `对于这类搜索，建议继续留在 Lipe Travel Show 页面内完成下一步。

请在 **${labels.tools}** 区域点击 **${labelsList}**，查看更新后的选项。

像 CGH–SDU 这样的航线，建议特别比较周末的日期和时间。如果你需要人工策划，Lipe 可以通过 ${labels.whatsapp} 或 ${labels.email} 帮助你。`;
      } else {
        answer = `Para esse tipo de pesquisa, o melhor próximo passo é continuar dentro da página do Lipe Travel Show.

Use o botão **${labelsList}** na área de **${labels.tools}** para consultar opções atualizadas.

Para rotas como CGH–SDU, compare datas e horários com atenção, especialmente em fins de semana. Se quiser curadoria humana, Lipe pode ajudar via ${labels.whatsapp} ou ${labels.email}.`;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ answer })
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
