const fs = require("fs");
const path = require("path");

let ltsVideoIndex = { videos: [] };
try {
  ltsVideoIndex = require("./lts-youtube-videos.json");
} catch (err) {
  try {
    const indexPath = path.join(__dirname, "lts-youtube-videos.json");
    ltsVideoIndex = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch (fallbackErr) {
    ltsVideoIndex = { videos: [] };
  }
}

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
  const lipeWhatsappUrl = process.env.LIPE_WHATSAPP_URL || "";
  const lipeEmail = process.env.LIPE_EMAIL || "lipetravelshow@gmail.com";

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "A LIPA ainda não está conectada à chave Gemini. Verifique a variável GEMINI_API_KEY no Netlify." })
    };
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Não consegui ler sua pergunta. Tente escrever novamente em uma frase simples." })
    };
  }

  const eventType = String(payload.eventType || "").trim();

  if (eventType === "lipa_event" || eventType === "lipa_lead") {
    const safeEvent = {
      eventType,
      lang: String(payload.lang || "pt").slice(0, 8),
      category: String(payload.category || "").slice(0, 80),
      actionType: String(payload.actionType || "").slice(0, 80),
      destination: String(payload.destination || "").slice(0, 120),
      question: String(payload.question || "").slice(0, 500),
      label: String(payload.label || "").slice(0, 120),
      urlHost: (() => {
        try {
          return payload.url ? new URL(String(payload.url)).hostname : "";
        } catch (e) {
          return "";
        }
      })(),
      userAgent: event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "",
      ts: new Date().toISOString()
    };

    console.log("LIPA_EVENT", JSON.stringify(safeEvent));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  }

  const question = String(payload.question || "").trim().slice(0, 1800);
  const lang = String(payload.lang || "pt").trim();

  if (!question) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Digite sua dúvida de viagem para a LIPA começar." })
    };
  }

  const repeatedChars = /(.)\1{80,}/.test(question);
  const tooManyLinks = (question.match(/https?:\/\//gi) || []).length > 3;

  if (repeatedChars || tooManyLinks) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "A LIPA foi criada para perguntas reais de viagem. Reformule sua dúvida com origem, destino, datas ou objetivo da viagem." })
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
      whatsapp: "Falar com Lipe no WhatsApp",
      email: "Enviar e-mail para Lipe",
      localPage: "página do Lipe Travel Show",
      youtube: "Assistir vídeo do Lipe Travel Show",
      youtubeSearch: "Buscar vídeos no canal Lipe Travel Show",
      mapsRoute: "Abrir rota no Google Maps",
      mapsPlace: "Abrir no Google Maps"
    },
    en: {
      flights: "Flights / Search flights",
      hotels: "Hotels / View hotels",
      insurance: "Travel insurance / Get insurance quote",
      cars: "Car rental",
      experiences: "Experiences / View experiences",
      gear: "Luggage and travel essentials",
      tools: "Practical planning",
      whatsapp: "Talk to Lipe on WhatsApp",
      email: "Email Lipe",
      localPage: "Lipe Travel Show page",
      youtube: "Watch Lipe Travel Show video",
      youtubeSearch: "Search videos on Lipe Travel Show",
      mapsRoute: "Open route in Google Maps",
      mapsPlace: "Open in Google Maps"
    },
    es: {
      flights: "Vuelos / Buscar vuelos",
      hotels: "Hoteles / Ver hoteles",
      insurance: "Seguro de viaje / Cotizar seguro",
      cars: "Alquiler de coche",
      experiences: "Experiencias / Ver experiencias",
      gear: "Maletas y artículos de viaje",
      tools: "Planificación práctica",
      whatsapp: "Hablar con Lipe por WhatsApp",
      email: "Enviar e-mail a Lipe",
      localPage: "página de Lipe Travel Show",
      youtube: "Ver video de Lipe Travel Show",
      youtubeSearch: "Buscar videos en Lipe Travel Show",
      mapsRoute: "Abrir ruta en Google Maps",
      mapsPlace: "Abrir en Google Maps"
    },
    zh: {
      flights: "机票 / 搜索航班",
      hotels: "酒店 / 查看酒店",
      insurance: "旅行保险 / 获取报价",
      cars: "租车",
      experiences: "体验 / 查看体验",
      gear: "行李箱和旅行用品",
      tools: "实用旅行规划",
      whatsapp: "通过 WhatsApp 联系 Lipe",
      email: "给 Lipe 发邮件",
      localPage: "Lipe Travel Show 页面",
      youtube: "观看 Lipe Travel Show 视频",
      youtubeSearch: "搜索 Lipe Travel Show 视频",
      mapsRoute: "在 Google Maps 中打开路线",
      mapsPlace: "在 Google Maps 中打开"
    }
  };

  const answerLanguage = languageMap[lang] || "Brazilian Portuguese";
  const labels = labelsByLang[lang] || labelsByLang.pt;
  const normalizedQuestion = question.toLowerCase();

  function normalizeVideoText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function tokenizeVideoQuery(value) {
    const stopwords = new Set([
      "para","com","como","onde","qual","quais","quando","porque","por","que","vou","viajar","viagem","dicas","melhor","melhores","quero","sobre","uma","um","uns","umas","dos","das","de","do","da","em","no","na","nos","nas","ao","aos","as","os",
      "the","and","for","with","what","where","when","how","trip","travel","best","tips","about","to","in","on","of","is","are","i","want","going",
      "los","las","del","una","uno","unos","unas","viaje","viajar","mejor","mejores","quiero","con","como","donde",
      "旅行","怎么","哪里","什么","最好"
    ]);

    return normalizeVideoText(value)
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !stopwords.has(token))
      .slice(0, 24);
  }

  function truncateActionLabel(prefix, title) {
    const cleanTitle = String(title || "").replace(/\s+/g, " ").trim();
    const max = 72;
    const shortTitle = cleanTitle.length > max ? `${cleanTitle.slice(0, max - 1)}…` : cleanTitle;
    return `${prefix}: ${shortTitle}`;
  }

  function getVideoNoiseWords() {
    return new Set([
      "video","videos","vídeo","vídeos","youtube","canal","channel","watch","assistir","ver","lipe","travel","show","lts",
      "tem","tenho","existe","existem","sobre","dicas","quero","vou","para","pela","pelo","primeira","primeiro","vez","vezes",
      "first","time","going","trip","travel","tips","about","there","are","is","the","and","with","for","what","where","how",
      "hay","ver","canal","quiero","primera","vez","sobre","viaje","viajar"
    ]);
  }

  function extractVideoSearchQuery(rawQuestion) {
    const noise = getVideoNoiseWords();
    const tokens = normalizeVideoText(rawQuestion)
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !noise.has(token));

    const query = tokens.join(" ").trim();
    return query || normalizeVideoText(rawQuestion).replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ").trim().slice(0, 80);
  }

  function buildLtsYoutubeSearchUrl(rawQuestion) {
    const query = extractVideoSearchQuery(rawQuestion);
    if (!query) return "https://www.youtube.com/@LipeTravelShow/videos";
    return `https://www.youtube.com/@LipeTravelShow/search?query=${encodeURIComponent(query)}`;
  }

  function isExplicitVideoRequest(rawQuestion) {
    return /(vídeo|video|vídeos|videos|youtube|canal|assistir|watch|lipe travel show|lts)/i.test(rawQuestion);
  }

  function getFocusedVideoTokens(rawQuestion) {
    const noise = getVideoNoiseWords();
    return tokenizeVideoQuery(rawQuestion)
      .filter((token) => !noise.has(token))
      .filter((token) => token.length >= 3)
      .slice(0, 12);
  }

  function recommendLtsVideos(rawQuestion, maxResults = 2) {
    const videos = Array.isArray(ltsVideoIndex.videos) ? ltsVideoIndex.videos : [];
    if (!videos.length) return [];

    const explicitVideo = isExplicitVideoRequest(rawQuestion);
    const tokens = getFocusedVideoTokens(rawQuestion);
    if (!tokens.length && !explicitVideo) return [];

    const normalizedQuestionForPhrases = normalizeVideoText(rawQuestion);

    const aliasGroups = [
      ["lisboa", "lisbon", "portugal"],
      ["nova york", "new york", "nyc"],
      ["roma", "rome", "italy", "italia"],
      ["buenos aires", "argentina", "palermo", "recoleta", "san telmo"],
      ["orlando", "disney", "florida"],
      ["hangzhou", "china"],
      ["pequim", "beijing", "china"],
      ["xangai", "shanghai", "china"],
      ["rio de janeiro", "rio", "copacabana", "ipanema"],
      ["paris", "france", "franca"],
      ["lima", "peru"],
      ["benidorm", "spain", "espanha"],
      ["lake como", "lago de como", "bellagio", "varenna"]
    ];

    const queryAliases = new Set();
    for (const group of aliasGroups) {
      if (group.some((alias) => normalizedQuestionForPhrases.includes(alias))) {
        group.forEach((alias) => queryAliases.add(alias));
      }
    }

    const scored = videos.map((video) => {
      const title = normalizeVideoText(video.title);
      const description = normalizeVideoText(video.description || "");
      const searchText = normalizeVideoText(video.search_text || `${video.title} ${video.description || ""}`);
      const country = normalizeVideoText(video.country || "");
      const placesArray = Array.isArray(video.places) ? video.places : [];
      const places = normalizeVideoText(placesArray.join(" "));
      const themes = normalizeVideoText((video.themes || []).join(" "));

      let score = 0;

      for (const token of tokens) {
        if (title.includes(token)) score += 12;
        if (places.includes(token)) score += 16;
        if (country.includes(token)) score += 9;
        if (themes.includes(token)) score += 4;
        if (description.includes(token)) score += 3;
        if (searchText.includes(token)) score += 5;
      }

      for (const place of placesArray) {
        const np = normalizeVideoText(place);
        if (np.length >= 4 && normalizedQuestionForPhrases.includes(np)) score += 42;
      }

      if (country && country.length >= 4 && normalizedQuestionForPhrases.includes(country)) score += 22;

      for (const alias of queryAliases) {
        if (title.includes(alias)) score += 20;
        if (places.includes(alias)) score += 22;
        if (country.includes(alias)) score += 12;
        if (searchText.includes(alias)) score += 10;
      }

      if (score > 0 && video.view_count) {
        score += Math.min(4, Math.log10(Number(video.view_count) + 1) / 2);
      }

      score += Math.max(0, 1 - ((Number(video.sort_index || 0)) / 1200));

      return { video, score };
    })
    .filter((item) => item.score >= (explicitVideo ? 4 : 10))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((item) => item.video);

    if (!scored.length) {
      const q = normalizedQuestionForPhrases;
      const fallbackNeedles = [];
      if (q.includes("lisboa") || q.includes("lisbon")) fallbackNeedles.push("lisboa", "lisbon", "portugal");
      if (q.includes("buenos aires")) fallbackNeedles.push("buenos aires");
      if (q.includes("orlando") || q.includes("disney")) fallbackNeedles.push("orlando", "disney");
      if (q.includes("roma") || q.includes("rome")) fallbackNeedles.push("roma", "rome");
      if (q.includes("china")) fallbackNeedles.push("china", "hangzhou", "beijing", "pequim", "shanghai", "xangai", "chengdu");

      if (fallbackNeedles.length) {
        return videos
          .filter((video) => {
            const haystack = normalizeVideoText(`${video.title} ${video.description || ""} ${video.search_text || ""}`);
            return fallbackNeedles.some((needle) => haystack.includes(needle));
          })
          .sort((a, b) => (Number(b.view_count || 0) - Number(a.view_count || 0)))
          .slice(0, maxResults);
      }
    }

    return scored;
  }

  const routeIntent = extractRouteIntent(question);

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

  const firstTripTerms = [
    "primeira viagem", "primeira vez", "nunca viajei", "nunca fui", "primeira viagem internacional", "first trip", "first time", "never been", "primera vez", "primer viaje", "第一次", "首次"
  ];

  const itineraryTerms = [
    "roteiro", "itinerário", "itinerario", "dia a dia", "quantos dias", "monte", "montar", "route", "itinerary", "day by day", "days in", "organiza", "organize", "路线", "行程"
  ];

  const safetyTerms = [
    "segurança", "seguro", "golpe", "golpes", "perigoso", "evitar", "etiqueta", "costumes", "gorjeta", "safety", "safe", "scam", "avoid", "etiquette", "customs", "tips", "seguridad", "estafa", "evitar", "etiqueta", "costumbres", "安全", "骗局", "礼仪"
  ];

  const complexTripTerms = [
    "lua de mel", "honeymoon", "família", "familia", "family", "premium", "luxo", "luxury", "multicidades", "multi-city", "multidestino", "grupo", "idosos", "crianças", "kids", "roteiro complexo", "viagem complexa", "viagem especial", "aniversário", "anniversary", "comemoração"
  ];

  const detectedIntents = intentMap.filter((item) =>
    item.terms.some((term) => normalizedQuestion.includes(term))
  );

  const detectedLabels = detectedIntents.map((item) => item.label);
  const asksCurrentInfo = currentInfoTerms.some((term) => normalizedQuestion.includes(term));
  const isFirstTrip = firstTripTerms.some((term) => normalizedQuestion.includes(term));
  const asksItinerary = itineraryTerms.some((term) => normalizedQuestion.includes(term));
  const asksSafety = safetyTerms.some((term) => normalizedQuestion.includes(term));
  const isComplexTrip = complexTripTerms.some((term) => normalizedQuestion.includes(term));

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

  if (routeIntent && routeIntent.destination) {
    const mapsUrl = routeIntent.origin
      ? buildMapsUrl({
          origin: routeIntent.origin,
          destination: routeIntent.destination,
          travelmode: routeIntent.travelmode
        })
      : buildMapsSearchUrl(routeIntent.destination);

    actions.unshift({
      label: routeIntent.origin ? labels.mapsRoute : labels.mapsPlace,
      url: mapsUrl,
      type: "maps"
    });
  }

  // Contextual commercial refinement: if the user is planning a destination trip but did not mention a specific product,
  // suggest the most useful LTS buttons without overloading the card.
  const generalTripTerms = ["vou para", "quero ir para", "quero ir pra", "ir para", "ir pra", "viajar para", "viagem para", "indo para", "estou indo para", "pretendo ir para", "i am going to", "i want to go to", "traveling to", "trip to", "voy a", "quiero ir a", "viaje a", "去", "旅行"];
  const isGeneralTripPlanning = generalTripTerms.some((term) => normalizedQuestion.includes(term));

  if (isGeneralTripPlanning) {
    const suggested = [
      { key: "flights", label: labels.flights, url: affiliateUrls.flights },
      { key: "hotels", label: labels.hotels, url: affiliateUrls.hotels },
      { key: "experiences", label: labels.experiences, url: affiliateUrls.experiences },
      { key: "insurance", label: labels.insurance, url: affiliateUrls.insurance }
    ];

    for (const item of suggested) {
      if (!seenActionKeys.has(item.key)) {
        actions.push({ label: item.label, url: item.url, type: item.key });
        seenActionKeys.add(item.key);
      }
    }
  }

  if (isComplexTrip) {
    if (lipeWhatsappUrl) {
      actions.push({
        label: labels.whatsapp,
        url: lipeWhatsappUrl,
        type: "whatsapp"
      });
    }

    actions.push({
      label: labels.email,
      url: `mailto:${lipeEmail}?subject=${encodeURIComponent("Planejamento de viagem com Lipe Travel Show")}&body=${encodeURIComponent(`Olá Lipe, quero continuar este planejamento de viagem:\n\n${question}`)}`,
      type: "email"
    });
  }

  const recommendedVideos = recommendLtsVideos(question, 2);
  const asksForLtsVideo = isExplicitVideoRequest(question);

  const existingActionKey = new Set(actions.map((action) => `${action.type}:${action.url}`));

  const videoActions = [];
  for (const video of recommendedVideos) {
    const key = `youtube:${video.url}`;
    if (!existingActionKey.has(key)) {
      videoActions.push({
        label: truncateActionLabel(labels.youtube, video.title),
        url: video.url,
        type: "youtube"
      });
      existingActionKey.add(key);
    }
  }

  if (asksForLtsVideo && !videoActions.length) {
    videoActions.push({
      label: labels.youtubeSearch,
      url: buildLtsYoutubeSearchUrl(question),
      type: "youtube_search"
    });
  }

  if (videoActions.length) {
    const mapActions = actions.filter((action) => action.type === "maps");
    const nonMapActions = actions.filter((action) => action.type !== "maps");
    actions.splice(0, actions.length, ...mapActions, ...videoActions, ...nonMapActions);
  }



  const hasLeadAction = actions.some((action) => action.type === "whatsapp" || action.type === "email" || action.type === "lead");

  if (!hasLeadAction) {
    const leadUrl = lipeWhatsappUrl
      ? `${lipeWhatsappUrl}${lipeWhatsappUrl.includes("?") ? "&" : "?"}text=${encodeURIComponent(`Olá Lipe, quero continuar este planejamento de viagem:\n\n${question}`)}`
      : `mailto:${lipeEmail}?subject=${encodeURIComponent("Planejamento de viagem com Lipe Travel Show")}&body=${encodeURIComponent(`Olá Lipe, quero continuar este planejamento de viagem:\n\n${question}`)}`;

    actions.push({
      label: labels.lead,
      url: leadUrl,
      type: "lead"
    });
  }

  const intentInstruction = detectedLabels.length
    ? `Detected travel-planning/commercial categories: ${detectedLabels.join(" | ")}.
In the final next-step paragraph, naturally point the user to these button(s) on this same Lipe Travel Show page: ${detectedLabels.join(" | ")}.
The interface will also show clickable action buttons for these options; do not paste raw URLs in the answer.`
    : `No direct purchase category detected. If useful, close by mentioning the ${labels.tools} area on the ${labels.localPage}.`;

  const modeInstructions = `
Special response modes:
- If this is a first-trip question, be extra clear, reassuring and step-by-step. Explain airport, immigration, documents, timing, neighborhoods or basic travel logic without sounding childish.
- If this is an itinerary question, structure by day or by planning blocks: arrival, main area, experiences, food/neighborhoods, logistics, booking priorities.
- If this is a safety/etiquette question, include practical safety, scam awareness, local customs, dress codes, transport tips and what to verify before going.
- If this is a complex/premium/family/honeymoon/multi-city trip, give a strong travel-planning answer and suggest human curation with Lipe via WhatsApp or email.
`;

  const systemPrompt = `
You are LIPA, the intelligent travel assistant for Lipe Travel Show.

Answer in ${answerLanguage}.

You are a broad, expert travel-planning assistant with access to Google Search grounding when current information is useful.
You can help with travel questions about the whole world, including:
- destination choice, route logic, airports and connections;
- best season, average climate, current weather context, typical temperatures and what to wear;
- itinerary structure, neighborhoods, transport, route logic, Google Maps directions links, safety and travel rhythm;
- what to buy, what to pack, what to bring back, local customs and practical travel behavior;
- hotels by style and area, flights by strategy, travel insurance, car rental, tours, tickets and experiences;
- family travel, honeymoons, premium travel, quick getaways and multi-city routes.
- relevant Lipe Travel Show YouTube videos when they match the destination or theme.

Travel-only scope:
If the user asks about something outside travel, gently redirect to travel planning.

LGBTQ+ and nudist travel:
- Be inclusive, respectful and genuinely useful for LGBTQ+ travelers, couples, friends and solo travelers.
- You may answer about LGBTQ+-friendly destinations, neighborhoods, hotels, hotel-saunas, wellness/spa venues, restaurants, bars, clubs, Pride events, beaches, nudist beaches, nightlife, cultural etiquette, local safety and travel planning.
- You may mention adult-oriented travel categories such as saunas, cruising areas and nudist beaches only in a non-explicit, travel-focused way: location type, neighborhood context, safety, legality, etiquette, age restrictions, consent, discretion, opening-day logic and how to verify current reputation.
- Do not provide sexualized descriptions, explicit instructions, pickup tactics, or graphic content.
- For venues that may be adult-only, always remind users to verify age restrictions, local laws, venue rules, reviews/reputation and personal safety before going.
- Nudist beaches should be framed as legal/cultural/naturist travel spaces, not sexualized spaces.

${modeInstructions}

Use Google Search grounding when it helps:
- current weather or temperature context;
- practical route context when the user asks how to get from one place to another;
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

Google Maps route rules:
- If the user asks how to get from one place to another, explain the route logic briefly and tell them to use the Google Maps action button shown in the answer card.
- If the origin is missing, explain that Google Maps can open the destination and use the user's current location/device context.
- Do not invent exact travel times, traffic conditions or transit schedules unless grounded/current.
- For live routing, traffic, transport schedules or navigation, the action button is the reliable next step.

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
Do not write commercial button labels as a plain list unless they are also present as action buttons.
Do not make external websites the main next step in prose.
Avoid recommending random OTAs, airline websites, hotel websites or generic comparison websites as the main action.
Always prefer the Lipe Travel Show ecosystem and the action buttons in the answer card.
When relevant Lipe Travel Show videos are available in the answer card, mention that the user can watch them as an extra planning layer, but do not invent video titles. If the user asks specifically for videos, never route them only to e-mail/lead; the interface will show either matched video buttons or a channel search button.

Answer structure:
1. Give a helpful travel answer.
2. If current or price-sensitive information is involved, explain that exact prices/availability can change.
3. End with one clear next step inside Lipe Travel Show, referring to the action button(s), not to raw URLs.

Keep the answer under 260 words unless the user asks for a detailed itinerary.
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
      temperature: 0.52,
      maxOutputTokens: 760
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
      const rawError = data.error?.message || "Gemini API error";
      const friendlyError = rawError.toLowerCase().includes("quota")
        ? "A LIPA atingiu o limite temporário de uso da API. Tente novamente em alguns minutos."
        : "A LIPA não conseguiu responder agora. Tente novamente em alguns instantes.";

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: friendlyError
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
        body: JSON.stringify({ error: "A LIPA não recebeu uma resposta completa agora. Tente novamente." })
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

    const actionLabelFallbacks = {
      youtube: labels.youtube,
      youtube_search: labels.youtubeSearch || labels.youtube,
      hotels: labels.hotels,
      experiences: labels.experiences,
      insurance: labels.insurance,
      flights: labels.flights,
      cars: labels.cars,
      gear: labels.gear,
      maps: labels.mapsRoute,
      lead: labels.lead || labels.email,
      email: labels.email,
      whatsapp: labels.whatsapp
    };

    const cleanActions = actions
      .filter((action) => action && action.url)
      .map((action) => ({
        label: action.label || actionLabelFallbacks[action.type] || "Abrir",
        url: action.url,
        type: action.type || "action"
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ answer, actions: cleanActions })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "A LIPA não conseguiu responder agora. Tente novamente em alguns instantes."
      })
    };
  }
};
