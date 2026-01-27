
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { LocationParams, LogisticsPoint, TransportType, ShippingQuery, ShippingAnalysis, BulkRateQuery, BulkRateItem, RegionDestination, AirRateQuery, AirRateItem, AirCommodityType } from "../types";
import { worldLocations } from "../data/worldLocations";

// --- REFERENCE DATA FOR EXHAUSTIVE PROMPTING ---

const INDONESIAN_PORTS_FULL = [
  "Jakarta (Tanjung Priok)", "Surabaya (Tanjung Perak)", "Semarang (Tanjung Emas)", "Banten (Merak/Ciwandan)", "Subang (Patimban)",
  "Medan (Belawan)", "Batam (Batu Ampar)", "Lampung (Panjang)", "Palembang (Boom Baru)", "Dumai", "Padang (Teluk Bayur)", 
  "Pekanbaru", "Jambi", "Aceh (Malahayati)", "Bengkulu", "Pontianak (Dwikora)", "Balikpapan (Semayang)", "Banjarmasin (Trisakti)", 
  "Samarinda", "Sampit", "Kumai", "Tarakan", "Makassar (Soekarno-Hatta)", "Bitung", "Palu (Pantoloan)", "Kendari", "Gorontalo", 
  "Bali (Benoa)", "Lombok (Lembar)", "Kupang (Tenau)", "Ambon", "Sorong", "Jayapura", "Merauke"
];

const INDONESIAN_AIRPORTS_FULL = [
  "Jakarta (CGK)", "Jakarta (HLP)", "Surabaya (SUB)", "Yogyakarta (YIA)", "Semarang (SRG)", "Solo (SOC)", "Bandung (BDO)", "Majalengka (KJT)",
  "Medan (KNO)", "Batam (BTH)", "Palembang (PLM)", "Padang (PDG)", "Pekanbaru (PKU)", "Banda Aceh (BTJ)", "Jambi (DJB)", "Pangkal Pinang (PGK)",
  "Balikpapan (BPN)", "Pontianak (PNK)", "Banjarmasin (BDJ)", "Tarakan (TRK)", "Makassar (UPG)", "Manado (MDC)", "Kendari (KDI)", "Palu (PLW)",
  "Bali (DPS)", "Lombok (LOP)", "Kupang (KOE)", "Ambon (AMQ)", "Jayapura (DJJ)", "Sorong (SOQ)", "Timika (TIM)", "Merauke (MKQ)"
];

const REGION_HINTS: Record<string, string> = {
  [RegionDestination.ASIA]: "Cover exhaustive list: China (Shanghai, Ningbo, Shenzhen, Qingdao, Tianjin, Guangzhou), Japan (Tokyo, Yokohama, Osaka, Nagoya, Kobe), Korea (Busan, Incheon), Taiwan (Kaohsiung, Keelung), Singapore, Malaysia (Port Klang, Tanjung Pelepas, Penang), Thailand (Laem Chabang, Bangkok), Vietnam (Ho Chi Minh, Haiphong, Da Nang), India (Nhava Sheva, Chennai, Mundra, Pipavav), Pakistan (Karachi, Qasim).",
  [RegionDestination.EUROPE]: "Cover exhaustive list: Netherlands (Rotterdam), Germany (Hamburg, Bremerhaven), Belgium (Antwerp, Zeebrugge), UK (Felixstowe, Southampton, London Gateway), France (Le Havre, Fos-sur-Mer), Spain (Valencia, Barcelona, Algeciras), Italy (Genoa, La Spezia, Trieste), Turkey (Istanbul/Ambarli, Izmit, Mersin), Greece (Piraeus), Poland (Gdansk).",
  [RegionDestination.NORTH_AMERICA]: "Cover exhaustive list: USA West Coast (Los Angeles, Long Beach, Seattle, Oakland, Tacoma), USA East Coast (New York/New Jersey, Savannah, Norfolk, Charleston, Baltimore, Port of Virginia), USA Gulf (Houston, Mobile, New Orleans), Canada (Vancouver, Prince Rupert, Montreal, Toronto).",
  [RegionDestination.SOUTH_AMERICA]: "Cover exhaustive list: Brazil (Santos, Paranagua, Itajai, Rio Grande), Argentina (Buenos Aires), Chile (San Antonio, Valparaiso), Peru (Callao), Colombia (Cartagena, Buenaventura), Ecuador (Guayaquil).",
  [RegionDestination.MIDDLE_EAST]: "Cover exhaustive list: UAE (Jebel Ali, Khalifa, Khor Fakkan), Saudi Arabia (Jeddah, Dammam, King Abdullah), Qatar (Hamad), Oman (Sohar, Salalah), Jordan (Aqaba), Kuwait (Shuaiba), Iraq (Umm Qasr).",
  [RegionDestination.AFRICA]: "Cover exhaustive list: South Africa (Durban, Cape Town, Port Elizabeth, Coega), Nigeria (Lagos/Apapa, Onne), Kenya (Mombasa), Egypt (Alexandria, Port Said, Damietta), Morocco (Tangier Med), Ghana (Tema), Ivory Coast (Abidjan), Senegal (Dakar), Togo (Lome).",
  [RegionDestination.OCEANIA]: "Cover exhaustive list: Australia (Sydney, Melbourne, Brisbane, Fremantle, Adelaide), New Zealand (Auckland, Tauranga, Lyttelton, Napier)."
};

const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n|\n```|```/g, "").trim();
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryGeminiCall<T>(
  operation: () => Promise<T>,
  retries = 3,
  baseDelay = 2000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.status === 429 || 
                          error?.status === 'RESOURCE_EXHAUSTED' || 
                          error?.message?.includes('429') ||
                          error?.message?.includes('quota') ||
                          error?.message?.includes('RESOURCE_EXHAUSTED');
      if (isRateLimit && i < retries - 1) {
        const waitTime = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

const generateForScope = async (
  continent: string,
  region: string,
  country: string,
  excludeCountries: string
): Promise<LogisticsPoint[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-pro-preview";
  const prompt = `
    Act as a high-precision global logistics data engine.
    TASK: Extract a dataset of commercial Seaports and Airports.
    SCOPE: ${continent}, ${region}, ${country || "ALL"}. EXCLUSIONS: ${excludeCountries || "None"}.
    OUTPUT: JSON Array.
    [{
      "name": "string",
      "code": "string",
      "type": "Port" | "Airport",
      "category": "string",
      "country": "string",
      "region": "string",
      "latitude": number,
      "longitude": number,
      "city": "string",
      "description": "string"
    }]
  `;

  try {
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 32768 }, responseMimeType: "application/json" }
    }));
    const jsonStr = cleanJsonString(response.text);
    const parsedData = JSON.parse(jsonStr);
    return parsedData.map((item: any, index: number) => ({
      id: `gen-${Date.now()}-${index}`,
      name: item.name,
      code: item.code,
      type: item.type === 'Airport' ? TransportType.AIRPORT : TransportType.PORT,
      category: item.category || "General",
      country: item.country,
      region: item.region,
      latitude: item.latitude,
      longitude: item.longitude,
      city: item.city,
      description: item.description,
      verified: false
    }));
  } catch (error) { return []; }
};

export const extractLogisticsData = async (params: LocationParams): Promise<LogisticsPoint[]> => {
  try {
    let tasks: (() => Promise<LogisticsPoint[]>)[] = [];
    if (!params.region && params.continent) {
      const regions = Object.keys(worldLocations[params.continent] || {});
      tasks = regions.map(region => () => generateForScope(params.continent, region, "", params.excludeCountries || ""));
    } else {
      tasks = [() => generateForScope(params.continent, params.region, params.country, params.excludeCountries || "")];
    }
    const allResults: LogisticsPoint[] = [];
    for (const task of tasks) {
      const result = await task();
      allResults.push(...result);
    }
    return Array.from(new Map(allResults.map(item => [item.code, item])).values());
  } catch (error) { throw new Error("Failed to extract data."); }
};

export const verifyLocationWithMaps = async (point: LogisticsPoint): Promise<Partial<LogisticsPoint>> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Locate ${point.name} in ${point.country}.`,
      config: { tools: [{ googleMaps: {} }] }
    }));
    const mapsUri = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.maps?.uri;
    return { mapsUri: mapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.name)}`, verified: true };
  } catch (error) { return { verified: false }; }
};

export const analyzeShippingCost = async (query: ShippingQuery): Promise<ShippingAnalysis[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isAllPorts = query.originLocation.includes("All Major Ports");
  const isAllAirports = query.originLocation.includes("All Major Airports");
  let locationScope = query.originLocation;
  if (isAllPorts) locationScope = `ALL PORTS: ${INDONESIAN_PORTS_FULL.join(", ")}`;
  else if (isAllAirports) locationScope = `ALL AIRPORTS: ${INDONESIAN_AIRPORTS_FULL.join(", ")}`;

  const prompt = `
    Act as Senior Freight Forwarder. Generate Local Charges for ${locationScope}. 
    Reference Date: ${query.date}. 
    Provide real market estimates. For "All" locations, you must generate a row for EVERY facility listed. 
    Output JSON Array.
  `;
  try {
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 32768 }, responseMimeType: "application/json" }
    }));
    return JSON.parse(cleanJsonString(response.text)) as ShippingAnalysis[];
  } catch (error) { throw new Error("Analysis failed"); }
};

const fetchRatesForRegion = async (query: BulkRateQuery, targetRegion: RegionDestination): Promise<BulkRateItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const regionCoverageHint = REGION_HINTS[targetRegion] || "";
  const destinationContext = query.destinationPort ? `DESTINATION: ${query.destinationPort}` : `REGION: ${targetRegion}. HINTS: ${regionCoverageHint}`;

  const prompt = `
    Act as a Senior Global Freight Forwarder & Pricing Analyst. 
    I need a **High-Density** "Weekly Ocean Freight Rate Sheet" for EXPORT from ${query.originPort}, Indonesia.

    ${destinationContext}

    TEMPLATE (STRICT JSON KEYS AND ORDER):
    [{
      "origin": "string (Origin port in Indonesia)",
      "destination": "string (Destination port)",
      "containerType": "string (${query.containerSize})",
      "commodity": "string (${query.commodity})",
      "currency": "string (USD)",
      "rate": "string (Numbers only)",
      "validUntil": "string",
      "transitTime": "string",
      "frequency": "string",
      "carrier": "string",
      "country": "string"
    }]

    CRITICAL: 
    - If Global or Region is selected, you MUST provide at least 50-80 rows of unique data.
    - Provide multiple carriers for each major route.
    - Match exactly the TEMPLATE keys.
    - Date reference: ${query.targetDate}.
  `;

  try {
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 32768 }, responseMimeType: "application/json" }
    }));
    return JSON.parse(cleanJsonString(response.text)) as BulkRateItem[];
  } catch (error) { return []; }
};

export const generateBulkRates = async (query: BulkRateQuery): Promise<BulkRateItem[]> => {
  let regionsToFetch: RegionDestination[] = query.destinationRegion === RegionDestination.ALL 
    ? Object.values(RegionDestination).filter(r => r !== RegionDestination.ALL) as RegionDestination[]
    : [query.destinationRegion];
  
  const allResults: BulkRateItem[] = [];
  for (const region of regionsToFetch) {
    const regionRates = await fetchRatesForRegion(query, region);
    allResults.push(...regionRates);
    if (regionsToFetch.length > 1) await delay(500);
  }
  return allResults;
};

export const generateAirRates = async (query: AirRateQuery): Promise<AirRateItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const regionCoverageHint = REGION_HINTS[query.destinationRegion] || "";
  
  const prompt = `
    Act as Air Freight Pricing Manager. 
    Generate exhaustive Air Freight Rates from ${query.originAirport} to ${query.destinationRegion}.
    HINTS: ${regionCoverageHint}.
    Reference Date: ${query.targetDate}.
    Output at least 50 rows if Global/Region is selected.
    Include surcharge details: fuel, war risk, etc.
    Output JSON.
  `;
  try {
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 32768 }, responseMimeType: "application/json" }
    }));
    const items = JSON.parse(cleanJsonString(response.text)) as AirRateItem[];
    return items.map(item => ({
      ...item,
      id: `air-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      commodity: query.commodity,
      weightBreak: query.weightBreak,
      originAirport: query.originAirport,
      verified: false
    }));
  } catch (error) { return []; }
};

export const verifyAirRateLocation = async (item: AirRateItem): Promise<Partial<AirRateItem>> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Locate ${item.destinationAirport} in ${item.country}.`,
      config: { tools: [{ googleMaps: {} }] }
    }));
    const mapsUri = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.maps?.uri;
    return { verified: true, mapsUri: mapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.destinationAirport)}` };
  } catch (error) {
    return { verified: false };
  }
};
