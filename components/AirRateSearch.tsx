
import React, { useState, useEffect } from 'react';
import { AirCommodityType, RegionDestination, AirRateQuery, AirRateItem, AirWeightBreak } from '../types';
import { generateAirRates, verifyAirRateLocation } from '../services/geminiService';
import { Plane, Calendar, Package, DollarSign, Clock, Download, CalendarCheck, CalendarDays, Globe, Info, MapPin, CheckCircle, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

const INDONESIAN_AIRPORTS = [
  "Jakarta (CGK) - Soekarno-Hatta",
  "Bali (DPS) - Ngurah Rai",
  "Surabaya (SUB) - Juanda",
  "Medan (KNO) - Kualanamu",
  "Makassar (UPG) - Sultan Hasanuddin",
  "Batam (BTH) - Hang Nadim",
  "Yogyakarta (YIA) - Yogyakarta Int."
];

const AirRateSearch: React.FC = () => {
  const [query, setQuery] = useState<AirRateQuery>({
    originAirport: 'Jakarta (CGK) - Soekarno-Hatta',
    commodity: AirCommodityType.GENERAL,
    weightBreak: AirWeightBreak.P_45,
    targetDate: new Date().toISOString().split('T')[0], // Default to today
    destinationRegion: RegionDestination.ALL,
    destinationAirport: ''
  });

  const [results, setResults] = useState<AirRateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Extracted search logic
  const performSearch = async (searchQuery: AirRateQuery) => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const data = await generateAirRates(searchQuery);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch air rates');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  // Webhook / Automation Listener
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');

    // Updated slug check to 'air-rates'
    if (mode === 'air-rates') {
      const newQuery = { ...query };
      
      const origin = params.get('origin');
      if (origin) newQuery.originAirport = origin;

      const destination = params.get('destination');
      if (destination) newQuery.destinationAirport = destination;

      const commodity = params.get('commodity');
      if (commodity) newQuery.commodity = commodity as AirCommodityType;

      const weight = params.get('weight');
      if (weight) newQuery.weightBreak = weight as AirWeightBreak;

      const region = params.get('region');
      if (region) newQuery.destinationRegion = region as RegionDestination;

      const date = params.get('date');
      if (date) newQuery.targetDate = date;

      setQuery(newQuery);

      // Auto-trigger if 'auto=true'
      if (params.get('auto') === 'true') {
        performSearch(newQuery);
      }
    }
  }, []);

  const handleVerify = async (item: AirRateItem) => {
    if (!item.id) return;
    setVerifyingId(item.id);
    try {
      const verifiedData = await verifyAirRateLocation(item);
      setResults(prev => prev.map(p => 
        p.id === item.id ? { ...p, ...verifiedData } : p
      ));
    } catch (error) {
      console.error("Verification failed", error);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleExport = () => {
    if (results.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(results.map(item => ({
        "origin": item.originAirport,
        "destination": item.destinationAirport,
        "weightBreak": item.weightBreak,
        "commodity": item.commodity,
        "currency": item.currency,
        "rate": item.estimatedPrice,
        "FuelSurcharge": item.fuelSurcharge,
        "WarRiskSurcharge": item.warRiskSurcharge,
        "ULD": item.uld,
        "DGhandling": item.dgHandling,
        "TempControl": item.tempControl,
        "PerishableFee": item.perishableFee,
        "OversizeFee": item.oversizeFee,
        "validUntil": item.validity,
        "transitTime": item.transitTime,
        "frequency": item.frequency,
        "carrier": item.airlineIndication
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Air Rates");
    const regionName = query.destinationRegion.replace(/\s/g, '_');
    XLSX.writeFile(wb, `Air_Rates_${regionName}_${query.targetDate}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <Plane className="w-8 h-8 text-red-600" /> 
          Weekly Air Freight Rate Search
        </h2>
        <p className="text-slate-600 text-lg">
          Get estimated weekly air freight rates from major Indonesian airports.
        </p>
      </div>

      <form onSubmit={handleSearch} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Plane className="w-4 h-4" /> Origin Airport
            </label>
            <div className="relative">
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer"
                value={query.originAirport}
                onChange={e => setQuery({...query, originAirport: e.target.value})}
              >
                {INDONESIAN_AIRPORTS.map(airport => (
                  <option key={airport} value={airport}>{airport}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Destination Region
            </label>
            <div className="relative">
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer"
                value={query.destinationRegion}
                onChange={e => setQuery({...query, destinationRegion: e.target.value as RegionDestination})}
              >
                {Object.values(RegionDestination).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Destination Airport (Optional)
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-slate-700 placeholder-slate-400"
              placeholder="e.g. NRT, KIX, or Haneda"
              value={query.destinationAirport || ''}
              onChange={e => setQuery({...query, destinationAirport: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Package className="w-4 h-4" /> Commodity
            </label>
            <div className="relative">
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer"
                value={query.commodity}
                onChange={e => setQuery({...query, commodity: e.target.value as AirCommodityType})}
              >
                {Object.values(AirCommodityType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <span className="font-bold">Kg</span> Weight Break
            </label>
            <div className="relative">
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer"
                value={query.weightBreak}
                onChange={e => setQuery({...query, weightBreak: e.target.value as AirWeightBreak})}
              >
                {Object.values(AirWeightBreak).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-4">
           <div className="flex-1 max-w-xs">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Reference Date
                </label>
                <input 
                  type="date" 
                  required
                  className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-slate-700"
                  value={query.targetDate}
                  onChange={e => setQuery({...query, targetDate: e.target.value})}
                />
              </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-lg font-medium text-white shadow-lg shadow-red-500/30 transition-all h-12 mt-auto
              ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:-translate-y-0.5'}
            `}
          >
            {loading ? (
              <>
                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking Air Rates...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4" />
                Get Air Rates
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800">
              Air Market Rate Estimates ({query.destinationRegion === RegionDestination.ALL ? 'Global' : query.destinationRegion})
              <span className="ml-2 text-xs text-slate-500 font-normal">({results.length} results)</span>
            </h3>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 text-sm text-red-700 hover:text-red-800 font-medium bg-white px-3 py-1.5 rounded border border-red-200 hover:bg-red-50 transition-colors"
            >
              <Download className="w-4 h-4" /> Download Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">origin</th>
                  <th className="px-4 py-3">destination</th>
                  <th className="px-4 py-3">weightBreak</th>
                  <th className="px-4 py-3">commodity</th>
                  <th className="px-4 py-3">currency</th>
                  <th className="px-4 py-3">rate</th>
                  <th className="px-4 py-3">FuelSurcharge</th>
                  <th className="px-4 py-3">WarRiskSurcharge</th>
                  <th className="px-4 py-3">ULD</th>
                  <th className="px-4 py-3">DGhandling</th>
                  <th className="px-4 py-3">TempControl</th>
                  <th className="px-4 py-3">PerishableFee</th>
                  <th className="px-4 py-3">OversizeFee</th>
                  <th className="px-4 py-3">validUntil</th>
                  <th className="px-4 py-3">transitTime</th>
                  <th className="px-4 py-3">frequency</th>
                  <th className="px-4 py-3">carrier</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      {item.originAirport.split('-')[0].trim()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{item.destinationAirport}</div>
                      <div className="text-xs text-slate-500">{item.country}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-500 font-medium">{item.weightBreak}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded">
                        {item.commodity?.split('(')[0].trim() || 'General'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-medium">
                      {item.currency}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-red-700 text-lg">
                        {Number(item.estimatedPrice.replace(/[^0-9.]/g, '')).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.fuelSurcharge}</td>
                    <td className="px-4 py-3 text-slate-600">{item.warRiskSurcharge}</td>
                    <td className="px-4 py-3 text-slate-600">{item.uld}</td>
                    <td className="px-4 py-3 text-slate-600">{item.dgHandling}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tempControl}</td>
                    <td className="px-4 py-3 text-slate-600">{item.perishableFee}</td>
                    <td className="px-4 py-3 text-slate-600">{item.oversizeFee}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                        {item.validity}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.transitTime}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.frequency}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-semibold italic">{item.airlineIndication}</td>
                     <td className="px-4 py-3 text-right">
                      {item.verified ? (
                        <a 
                          href={item.mapsUri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </a>
                      ) : (
                        <button
                          onClick={() => handleVerify(item)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-yellow-50 text-yellow-800 text-xs text-center border-t border-yellow-100">
            Disclaimer: Rates are AI-generated market estimates.
          </div>
        </div>
      )}
    </div>
  );
};

export default AirRateSearch;
