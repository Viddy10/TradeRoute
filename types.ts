
export interface LocationParams {
  continent: string;
  region: string;
  country: string;
  excludeCountries?: string;
}

export enum TransportType {
  PORT = 'Port',
  AIRPORT = 'Airport'
}

export interface LogisticsPoint {
  id: string;
  name: string;
  code: string; // IATA/ICAO for Airport, UN/LOCODE for Port
  type: TransportType;
  category: string; // e.g., International, Regional, Deep Sea
  country: string;
  region: string; // State / Province
  latitude: number;
  longitude: number;
  city: string;
  description: string;
  mapsUri?: string; // From Google Maps Grounding
  verified?: boolean;
}

export interface GenerationStatus {
  loading: boolean;
  message: string;
  error?: string;
}

// --- Shipping Analysis Types (Updated for Local Charges Table) ---

// SEA FREIGHT COMMODITIES (Updated to specific user list)
export enum CommodityType {
  GENERAL = 'General Cargo',
  VALUABLE = 'Valuable Cargo (VAL)',
  PHARMA = 'Pharma / Drugs (PIL)',
  HEAVY = 'Heavy Cargo (HEA)',
  HUM = 'Human Remains (HUM)',
  DRY_BULK = 'Dry Bulk',
  LIQUID_BULK = 'Liquid Bulk',
  BREAK_BULK = 'Break Bulk',
  PROJECT = 'Project Cargo',
  RORO = 'Ro-Ro (Kendaraan)',
  REEFER = 'Reefer / Perishable',
  DG = 'Dangerous Goods (DG)',
  AVI = 'Live Animals (AVI)'
}

// AIR FREIGHT SPECIFIC COMMODITIES (Unified with user list)
export enum AirCommodityType {
  GENERAL = 'General Cargo',
  VALUABLE = 'Valuable Cargo (VAL)',
  PHARMA = 'Pharma / Drugs (PIL)',
  HEAVY = 'Heavy Cargo (HEA)',
  HUM = 'Human Remains (HUM)',
  DRY_BULK = 'Dry Bulk', 
  LIQUID_BULK = 'Liquid Bulk',
  BREAK_BULK = 'Break Bulk',
  PROJECT = 'Project Cargo',
  RORO = 'Ro-Ro (Kendaraan)', 
  REEFER = 'Reefer / Perishable',
  DG = 'Dangerous Goods (DG)',
  AVI = 'Live Animals (AVI)'
}

export enum ContainerSize {
  CNT_20 = '20\' Standard (20GP)',
  CNT_40 = '40\' Standard (40GP)',
  CNT_40HC = '40\' High Cube (40HC)',
  LCL = 'LCL (Per CBM)',
  ISO_TANK = 'ISO Tank (20\')',
  FLAT_RACK = 'Flat Rack / Open Top (OOG)'
}

export interface ShippingQuery {
  date: string;
  commodity: string; // Can be CommodityType or AirCommodityType
  transportMode: TransportType;
  originLocation: string;
}

export interface ShippingAnalysis {
  locationName: string; // Name of Port or Airport
  
  // Sea Specific
  thc20?: string;
  thc40?: string;
  lolo?: string;
  gateIn?: string;
  sealFee?: string;
  detentionDays?: string;

  // Air Specific
  tsc?: string; // Terminal Service Charge (per kg)
  ra?: string; // Regulated Agent / X-Ray (per kg)
  awbFee?: string; // Air Waybill Fee
  
  // Common
  handling: string;
  inspectionFee: string;
  storageFee: string;
  specialTreatment: string;
  adminFee: string;
  docFee: string; // B/L Doc or AWB Doc
  cooFee: string;
  note: string;
}

export enum RegionDestination {
  ALL = 'All Global Regions',
  ASIA = 'Asia',
  EUROPE = 'Europe',
  NORTH_AMERICA = 'North America',
  SOUTH_AMERICA = 'South America',
  MIDDLE_EAST = 'Middle East & Red Sea',
  AFRICA = 'Africa',
  OCEANIA = 'Oceania'
}

export interface BulkRateQuery {
  originPort: string;
  commodity: CommodityType;
  containerSize: ContainerSize;
  targetDate: string; // YYYY-MM-DD
  destinationRegion: RegionDestination;
  destinationPort?: string; // Added field
}

export interface BulkRateItem {
  destinationPort: string;
  country: string;
  region: string;
  currency: string; // e.g. USD, IDR
  estimatedPrice: string; // Number only string
  transitTime: string; // e.g., "25-30 Days"
  frequency: string; // e.g., "Weekly"
  validity: string; // e.g., "Valid until end of week 42"
  carrierIndication: string; // e.g., "MSC, Maersk, Evergreen"
  commodity?: string;
  containerSize?: string;
  originPort?: string;
}

// --- Air Freight Types ---

export enum AirWeightBreak {
  MIN = 'Min (Minimum)',
  N_45 = '-45 Kg',
  P_45 = '+45 Kg',
  P_100 = '+100 Kg',
  P_300 = '+300 Kg',
  P_500 = '+500 Kg',
  P_1000 = '+1000 Kg'
}

export interface AirRateQuery {
  originAirport: string;
  commodity: AirCommodityType; 
  weightBreak: AirWeightBreak;
  targetDate: string;
  destinationRegion: RegionDestination;
  destinationAirport?: string; // Changed from targetCountry
}

export interface AirRateItem {
  id?: string; 
  originAirport: string;
  destinationAirport: string; // IATA Code + City
  country: string;
  region: string;
  currency: string; 
  estimatedPrice: string; 
  fuelSurcharge: string;
  warRiskSurcharge: string;
  uld: string;
  dgHandling: string;
  tempControl: string;
  perishableFee: string;
  oversizeFee: string;
  transitTime: string;
  frequency: string;
  validity: string;
  airlineIndication: string; 
  commodity?: string;
  weightBreak?: string;
  mapsUri?: string; 
  verified?: boolean;
}
