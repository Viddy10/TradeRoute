import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { LocationParams, LogisticsPoint, TransportType, ShippingQuery, ShippingAnalysis, BulkRateQuery, BulkRateItem, RegionDestination, AirRateQuery, AirRateItem, AirCommodityType, GroundingSource } from "../types";
import { worldLocations } from "../data/worldLocations";

const cleanJsonString = (str: string): string => {
  // Handle case where AI might include conversational text before/after JSON
  const match = str.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (match) return match[0];
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

const extractSources = (response: any): GroundingSource[] => {
  const sources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks && Array.isArray(chunks)) {
    chunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({
          title: chunk.web.title || "Web Source",
          uri: chunk.web.uri
        });
      }
    });
  }
  return sources;
};

const generateForScope = async (
  continent: string,
  region: string,
  country: string,
  excludeCountries: string
): Promise<LogisticsPoint[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using Flash with Search Grounding for high-speed, up-to-date scraping
  const modelId = "gemini-3-flash-preview";
  const prompt = `
    Act as a high-precision global logistics data engine.
    Use Google Search to find and extract a list of major commercial Seaports and Airports.
    SCOPE: ${continent}, ${region}, ${country || "ALL"}. EXCLUSIONS: ${excludeCountries || "None"}.
    Include real IATA/ICAO codes and UN/LOCODEs.
    Output ONLY as a JSON Array with this schema:
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
      config: { 
        tools: [{ googleSearch: {} }]
      }
    }));
    
    const sources = extractSources(response);
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
      verified: false,
      sources: sources
    }));
  } catch (error) { 
    console.error("Scraping error:", error);
    return []; 
  }
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
  } catch (error) { throw new Error("Gagal mengekstrak data."); }
};

export const verifyLocationWithMaps = async (point: LogisticsPoint): Promise<Partial<LogisticsPoint>> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Locate ${point.name} (${point.code}) in ${point.country} precisely.`,
      config: { tools: [{ googleMaps: {} }] }
    }));
    const mapsUri = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.maps?.uri;
    return { mapsUri: mapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.name + " " + point.country)}`, verified: true };
  } catch (error) { return { verified: false }; }
};

export const analyzeShippingCost = async (query: ShippingQuery): Promise<ShippingAnalysis[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Use Pro for complex analysis with max thinking budget
  const prompt = `
    Act as Senior Freight Forwarder at FreightForwarder.site. 
    Analyze and generate real-time market estimates for Export Local Charges in ${query.originLocation}. 
    Commodity: ${query.commodity}. Transport: ${query.transportMode}. Reference Date: ${query.date}.
    Output JSON Array with detailed breakdown of all port/airport handling fees.
  `;
  try {
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 32768 }, responseMimeType: "application/json" }
    }));
    return JSON.parse(cleanJsonString(response.text)) as ShippingAnalysis[];
  } catch (error) { throw new Error("Analisis biaya gagal."); }
};

export const generateBulkRates = async (query: BulkRateQuery): Promise<BulkRateItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Act as Senior Global Freight Forwarder at FreightForwarder.site. 
    Generate a High-Density Weekly Ocean Freight Rate Sheet for EXPORT from ${query.originPort}, Indonesia.
    Target: ${query.destinationRegion}. Destination Port: ${query.destinationPort || 'Any'}.
    Commodity: ${query.commodity}. Container: ${query.containerSize}. Date: ${query.targetDate}.
    Provide realistic market rates for at least 30-50 unique routes.
    Use Google Search for current carrier trends.
    Output JSON.
  `;

  try {
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { 
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }] 
      }
    }));
    return JSON.parse(cleanJsonString(response.text)) as BulkRateItem[];
  } catch (error) { throw new Error("Gagal mengambil data Sea Rates."); }
};

export const generateAirRates = async (query: AirRateQuery): Promise<AirRateItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Act as Air Freight Pricing Manager at FreightForwarder.site. 
    Generate exhaustive Air Freight Rates from ${query.originAirport} to ${query.destinationRegion}.
    Commodity: ${query.commodity}. Weight Break: ${query.weightBreak}. Date: ${query.targetDate}.
    Include fuel/security surcharges. Provide at least 30-50 routes.
    Use Google Search to verify current airline rates.
    Output JSON.
  `;
  try {
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { 
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }] 
      }
    }));
    const items = JSON.parse(cleanJsonString(response.text)) as AirRateItem[];
    const sources = extractSources(response);
    return items.map(item => ({
      ...item,
      id: `air-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      commodity: query.commodity,
      weightBreak: query.weightBreak,
      originAirport: query.originAirport,
      verified: false,
      sources: sources
    }));
  } catch (error) { return []; }
};

export const verifyAirRateLocation = async (item: AirRateItem): Promise<Partial<AirRateItem>> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Locate airport ${item.destinationAirport} in ${item.country}.`,
      config: { tools: [{ googleMaps: {} }] }
    }));
    const mapsUri = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.maps?.uri;
    return { verified: true, mapsUri: mapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.destinationAirport)}` };
  } catch (error) { return { verified: false }; }
};