
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { LocationParams, LogisticsPoint, TransportType, ShippingQuery, ShippingAnalysis, BulkRateQuery, BulkRateItem, RegionDestination, AirRateQuery, AirRateItem, AirCommodityType } from "../types";
import { worldLocations } from "../data/worldLocations";

// Helper to clean JSON string from Markdown blocks
const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n|\n```|```/g, "").trim();
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to retry operations on 429/Resource Exhausted errors
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
      // Check for rate limit errors (429 or RESOURCE_EXHAUSTED)
      const isRateLimit = error?.status === 429 || 
                          error?.status === 'RESOURCE_EXHAUSTED' || 
                          error?.message?.includes('429') ||
                          error?.message?.includes('quota') ||
                          error?.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isRateLimit && i < retries - 1) {
        // Exponential backoff with jitter
        const waitTime = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        console.warn(`Rate limit hit. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${retries})`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Helper function to perform the actual API call for a specific scope
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
    
    TASK: Extract a VALID, EXHAUSTIVE, and VERIFIED dataset of commercial Seaports (Pelabuhan) and Airports (Bandara).
    
    TARGET SCOPE:
    - Continent: ${continent}
    - Region: ${region}
    - Country: ${country || "ALL Countries in this region"}
    
    EXCLUSIONS (Strictly omit these): ${excludeCountries || "None"}

    DATA REQUIREMENTS:
    For Airports: Must have IATA code.
    For Seaports: Must have UN/LOCODE.
    
    OUTPUT FORMAT: STRICT JSON Array.
    [{
      "name": "string",
      "code": "string",
      "type": "Port" | "Airport",
      "category": "string (e.g., International, Deep Sea, Regional Hub)",
      "country": "string",
      "region": "string (Administrative Province/State)",
      "latitude": number,
      "longitude": number,
      "city": "string",
      "description": "string (brief trade relevance)"
    }]

    CRITICAL INSTRUCTIONS FOR MAXIMUM VOLUME:
    1. **NO TRUNCATION**: Do not summarize. Do not say "and 50 others". List EVERY single major and medium-sized facility you know.
    2. **MAXIMIZE TOKENS**: Use your full output capability. I expect HUNDREDS of items if they exist in this region.
    3. **COVERAGE**: Ensure you cover all countries in the requested scope (unless excluded).
    4. **ACCURACY**: Coordinates must be precise.
    5. **QUANTITY PRIORITY**: The user needs ~4700 global points distributed. For this specific region, give me as many as technically possible in one response.
  `;

  try {
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: "application/json"
      }
    }));

    const text = response.text;
    if (!text) return [];

    const jsonStr = cleanJsonString(text);
    const parsedData = JSON.parse(jsonStr);

    return parsedData.map((item: any, index: number) => ({
      id: `gen-${region.replace(/\s/g, '')}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name,
      code: item.code,
      type: item.type === 'Airport' || item.type === 'Bandara' ? TransportType.AIRPORT : TransportType.PORT,
      category: item.category || "General",
      country: item.country,
      region: item.region,
      latitude: item.latitude,
      longitude: item.longitude,
      city: item.city,
      description: item.description,
      verified: false
    }));
  } catch (error) {
    console.warn(`Partial failure for region ${region}:`, error);
    return []; 
  }
};

export const extractLogisticsData = async (
  params: LocationParams
): Promise<LogisticsPoint[]> => {
  try {
    let tasks: (() => Promise<LogisticsPoint[]>)[] = [];

    if (!params.region && params.continent) {
      const regions = Object.keys(worldLocations[params.continent] || {});
      tasks = regions.map(region => 
        () => generateForScope(params.continent, region, "", params.excludeCountries || "")
      );
    } else if (params.region && !params.country) {
      tasks = [() => generateForScope(params.continent, params.region, "", params.excludeCountries || "")];
    } else {
      tasks = [() => generateForScope(params.continent, params.region, params.country, params.excludeCountries || "")];
    }

    const allResults: LogisticsPoint[] = [];
    for (const task of tasks) {
      const result = await task();
      allResults.push(...result);
      if (tasks.length > 1) await delay(1000); 
    }
    
    if (allResults.length === 0) {
      throw new Error("No data received. The AI might be busy, please try again.");
    }

    const uniqueResults = Array.from(new Map(allResults.map(item => [item.code, item])).values());
    return uniqueResults;
  } catch (error) {
    console.error("Gemini Extraction Orchestration Error:", error);
    throw new Error("Failed to extract data. Please try again or wait a moment.");
  }
};

export const verifyLocationWithMaps = async (
  point: LogisticsPoint
): Promise<Partial<LogisticsPoint>> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = "gemini-2.5-flash";
    const prompt = `Locate the ${point.type} named "${point.name}" (${point.code}) in ${point.city}, ${point.region}, ${point.country}. 
    I need the exact Google Maps link and precise coordinates.`;

    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      }
    }));

    const candidate = response.candidates?.[0];
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
    let mapsUri = "";
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.maps?.uri) {
          mapsUri = chunk.maps.uri;
          break;
        }
      }
    }
    return {
      mapsUri: mapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.name + " " + point.type)}`,
      verified: true
    };
  } catch (error) {
    console.error("Maps Verification Error:", error);
    return { verified: false };
  }
};

export const verifyAirRateLocation = async (
  item: AirRateItem
): Promise<Partial<AirRateItem>> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = "gemini-2.5-flash";
    const prompt = `Locate the International Airport "${item.destinationAirport}" in ${item.country}. 
    I need to verify it exists and get the Google Maps link.`;

    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      }
    }));

    const candidate = response.candidates?.[0];
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
    let mapsUri = "";
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.maps?.uri) {
          mapsUri = chunk.maps.uri;
          break;
        }
      }
    }
    return {
      mapsUri: mapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.destinationAirport + " Airport")}`,
      verified: true
    };
  } catch (error) {
    console.error("Air Maps Verification Error:", error);
    return { verified: false };
  }
};

export const analyzeShippingCost = async (query: ShippingQuery): Promise<ShippingAnalysis[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-pro-preview";

  const isAllPorts = query.originLocation.includes("All Major Ports");
  const isAllAirports = query.originLocation.includes("All Major Airports");

  let locationScope = query.originLocation;
  if (isAllPorts) {
    locationScope = "ALL MAJOR INDONESIAN PORTS spanning the entire archipelago (Sumatra, Java, Kalimantan, Sulawesi, Bali, Nusa Tenggara, Maluku, and Papua). Include major hubs like Jakarta, Surabaya, Medan, Makassar, Balikpapan, and key eastern ports like Sorong/Ambon/Jayapura.";
  } else if (isAllAirports) {
    locationScope = "ALL MAJOR INDONESIAN INTERNATIONAL AIRPORTS spanning the entire archipelago (Sumatra, Java, Kalimantan, Sulawesi, Bali, Nusa Tenggara, Maluku, and Papua). Include hubs like CGK, SUB, KNO, UPG, DPS, BPN, and eastern hubs like Sentani/Biak/Timika.";
  }

  let prompt = "";
  if (query.transportMode === TransportType.PORT) {
    prompt = `
      Act as a Senior Freight Forwarder in Indonesia.
      I need a **Detailed Ocean Export Local Charges Quotation** (Biaya Lokal Ekspor Laut).
      
      TARGET SCOPE:
      - Location: ${locationScope}
      - Commodity: ${query.commodity}
      - Reference Date: ${query.date} (Use valid USD/IDR rate for THC).

      REQUIRED FIELDS (SEA):
      - THC 20', THC 40', LOLO, Handling, Gate In, Inspection, Storage, Doc Fee (B/L), Seal Fee, COO, Detention Days.

      OUTPUT FORMAT JSON Array:
      [{
        "locationName": "string",
        "thc20": "string",
        "thc40": "string",
        "lolo": "string",
        "handling": "string",
        "gateIn": "string",
        "inspectionFee": "string",
        "storageFee": "string",
        "specialTreatment": "string",
        "adminFee": "string",
        "docFee": "string (B/L Fee)",
        "sealFee": "string",
        "cooFee": "string",
        "detentionDays": "string",
        "note": "string"
      }]
    `;
  } else {
    prompt = `
      Act as a Senior Air Freight Pricing Specialist in Indonesia.
      I need a **Detailed Air Export Local Charges Quotation** (Biaya Lokal Ekspor Udara).

      TARGET SCOPE:
      - Location: ${locationScope}
      - Commodity: ${query.commodity}
      - Reference Date: ${query.date}.

      REQUIRED FIELDS (AIR):
      - TSC (Terminal Service Charge) per Kg.
      - RA (Regulated Agent / X-Ray) per Kg.
      - AWB Fee (Biaya Dokumen).
      - Admin Fee.
      - Handling Fee.
      - COO Fee.
      
      OUTPUT FORMAT JSON Array:
      [{
        "locationName": "string",
        "tsc": "string (e.g. 'Rp 2.500/kg')",
        "ra": "string (e.g. 'Rp 1.000/kg')",
        "awbFee": "string",
        "handling": "string",
        "inspectionFee": "string",
        "storageFee": "string",
        "specialTreatment": "string",
        "adminFee": "string",
        "docFee": "string (Use AWB Fee here)",
        "cooFee": "string",
        "note": "string"
      }]
    `;
  }

  try {
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json"
      }
    }));
    const text = response.text;
    if (!text) throw new Error("Analysis failed");
    return JSON.parse(cleanJsonString(text)) as ShippingAnalysis[];
  } catch (error: any) {
    console.error("Shipping Analysis Error:", error);
    throw new Error(`Could not analyze shipping terms. ${error.message || ''}`);
  }
};

const fetchRatesForRegion = async (
  query: BulkRateQuery, 
  targetRegion: RegionDestination
): Promise<BulkRateItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-pro-preview";

  const destinationContext = query.destinationPort
    ? `SPECIFIC DESTINATION: "${query.destinationPort}". IGNORE the region parameter if it conflicts. Provide at least 3-5 different carrier options (e.g. MSC, OOCL, ONE, Maersk, Evergreen, COSCO) for this specific destination.`
    : `TARGET REGION: ${targetRegion}. Provide rates for key major ports in this region.`;

  const prompt = `
    Act as a Senior Global Freight Forwarder & Pricing Analyst. 
    I need a **High-Density** "Weekly Ocean Freight Rate Sheet" for EXPORT from ${query.originPort}, Indonesia.

    ${destinationContext}

    PARAMETERS:
    - Commodity: ${query.commodity}
    - Container Size: ${query.containerSize}
    - Target Reference Date: ${query.targetDate}

    PRICING RULES:
    1. PROVIDE A SINGLE NUMERIC PRICE ONLY. DO NOT PROVIDE RANGES.
    2. THE "estimatedPrice" FIELD MUST CONTAIN ONLY NUMBERS.
    3. PROVIDE THE CURRENCY SEPARATELY IN THE "currency" FIELD.

    OUTPUT JSON STRUCTURE:
    [{
      "destinationPort": "string",
      "country": "string",
      "region": "string",
      "currency": "string (e.g. USD)",
      "estimatedPrice": "string (NUMBERS ONLY)",
      "transitTime": "string",
      "frequency": "string",
      "validity": "string",
      "carrierIndication": "string"
    }]
  `;

  try {
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json"
      }
    }));
    const text = response.text;
    if (!text) return [];
    const items = JSON.parse(cleanJsonString(text)) as BulkRateItem[];
    return items.map(item => ({
      ...item,
      commodity: query.commodity,
      containerSize: query.containerSize,
      originPort: query.originPort
    }));
  } catch (error) {
    console.warn(`Rate generation failed for ${targetRegion}:`, error);
    return [];
  }
};

export const generateBulkRates = async (query: BulkRateQuery): Promise<BulkRateItem[]> => {
  try {
    let regionsToFetch: RegionDestination[] = [];
    if (query.destinationRegion === RegionDestination.ALL) {
      regionsToFetch = Object.values(RegionDestination).filter(r => r !== RegionDestination.ALL) as RegionDestination[];
    } else {
      regionsToFetch = [query.destinationRegion];
    }
    const allResults: BulkRateItem[] = [];
    for (const region of regionsToFetch) {
       const regionRates = await fetchRatesForRegion(query, region);
       allResults.push(...regionRates);
       if (regionsToFetch.length > 1) await delay(1000);
    }
    return allResults.sort((a, b) => a.country.localeCompare(b.country));
  } catch (error) {
    console.error("Bulk Rate Orchestration Error:", error);
    throw new Error("Failed to generate market rates. Please try again.");
  }
};

const fetchAirRatesForRegion = async (
  query: AirRateQuery,
  targetRegion: RegionDestination
): Promise<AirRateItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-pro-preview";

  const destinationContext = query.destinationAirport 
    ? `SPECIFIC DESTINATION: "${query.destinationAirport}". IGNORE the region parameter if it conflicts. Provide at least 3-5 different carrier options (e.g. Direct, Transit, different airlines) for this specific destination.`
    : `TARGET REGION: ${targetRegion}. Provide rates for key major airports in this region.`;

  const prompt = `
    Act as a Senior Air Freight Pricing Manager.
    Create a **Real-Time Market Rate Sheet** for Air Exports from ${query.originAirport}, Indonesia.

    ${destinationContext}

    PRICING RULES:
    1. PROVIDE A SINGLE NUMERIC PRICE ONLY. NO RANGES.
    2. THE "estimatedPrice" FIELD MUST CONTAIN ONLY NUMBERS.
    3. PROVIDE THE CURRENCY SEPARATELY IN THE "currency" FIELD.

    REQUIRED FIELDS & LOGIC:
    - origin: ${query.originAirport}
    - weightBreak: ${query.weightBreak}
    - commodity: ${query.commodity}
    - FuelSurcharge: Estimate Fuel Surcharge per kg.
    - WarRiskSurcharge: Estimate only if the route passes through a high-risk/war zone (otherwise "N/A" or "0").
    - ULD: Guaranteed or market ULD space indication.
    - DGhandling: Estimate handling fee ONLY IF commodity is "Dangerous Goods (DG)". If not, set "0" or "N/A".
    - TempControl: Estimate fee ONLY IF commodity is "Pharma / Drugs (PIL)" or "Reefer / Perishable". If not, set "0" or "N/A".
    - PerishableFee: Estimate fee ONLY IF commodity is "Reefer / Perishable" or "Live Animals (AVI)". If not, set "0" or "N/A".
    - OversizeFee: Estimate fee ONLY IF commodity is "Heavy Cargo (HEA)" or "Project Cargo". If not, set "0" or "N/A".

    OUTPUT JSON STRUCTURE:
    [{
      "destinationAirport": "string (IATA Code + City)",
      "country": "string",
      "region": "string",
      "currency": "string (e.g. USD)",
      "estimatedPrice": "string (NUMBERS ONLY)",
      "fuelSurcharge": "string",
      "warRiskSurcharge": "string",
      "uld": "string",
      "dgHandling": "string",
      "tempControl": "string",
      "perishableFee": "string",
      "oversizeFee": "string",
      "transitTime": "string",
      "frequency": "string",
      "validity": "string",
      "airlineIndication": "string"
    }]
  `;

  try {
    const response = await retryGeminiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json"
      }
    }));
    const text = response.text;
    if (!text) return [];
    const items = JSON.parse(cleanJsonString(text)) as AirRateItem[];
    return items.map(item => ({
      ...item,
      id: `air-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      commodity: query.commodity,
      weightBreak: query.weightBreak,
      originAirport: query.originAirport,
      verified: false
    }));
  } catch (error) {
    console.warn(`Air rate generation failed for ${targetRegion}:`, error);
    return [];
  }
};

export const generateAirRates = async (query: AirRateQuery): Promise<AirRateItem[]> => {
  try {
    let regionsToFetch: RegionDestination[] = [];
    if (query.destinationRegion === RegionDestination.ALL) {
      regionsToFetch = Object.values(RegionDestination).filter(r => r !== RegionDestination.ALL) as RegionDestination[];
    } else {
      regionsToFetch = [query.destinationRegion];
    }
    const allResults: AirRateItem[] = [];
    for (const region of regionsToFetch) {
       const regionRates = await fetchAirRatesForRegion(query, region);
       allResults.push(...regionRates);
       if (regionsToFetch.length > 1) await delay(1000);
    }
    return allResults.sort((a, b) => a.country.localeCompare(b.country));
  } catch (error) {
    console.error("Air Rate Orchestration Error:", error);
    throw new Error("Failed to generate air market rates. Please try again.");
  }
};
