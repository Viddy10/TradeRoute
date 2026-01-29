
import React, { useState, useEffect } from 'react';
import { CommodityType, ContainerSize, BulkRateQuery, BulkRateItem, RegionDestination } from '../types';
import { generateBulkRates } from '../services/geminiService';
import { Ship, Calendar, Package, DollarSign, Clock, Download, CalendarCheck, CalendarDays, Globe, Info, MapPin, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

const INDONESIAN_PORTS = [
  "Jakarta (Tanjung Priok)",
  "Surabaya (Tanjung Perak)",
  "Semarang (Tanjung Emas)",
  "Medan (Belawan)",
  "Makassar (Soekarno-Hatta)",
  "Batam (Batu Ampar)",
  "Lampung (Panjang)",
  "Palembang (Boom Baru)",
  "Pontianak (Dwikora)",
  "Balikpapan (Semayang)",
  "Banjarmasin (Trisakti)",
  "Bitung (Bitung)",
  "Bali (Benoa)",
  "Sorong (Sorong)"
];

const BulkRateSearch: React.FC = () => {
  const [query, setQuery] = useState<BulkRateQuery>({
    originPort: 'Jakarta (Tanjung Priok)',
    commodity: CommodityType.GENERAL,
    containerSize: ContainerSize.CNT_40HC,
    targetDate: new Date().toISOString().split('T')[0], // Default to today
    destinationRegion: RegionDestination.ALL,
    destinationPort: ''
  });

  const [results, setResults] = useState<BulkRateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extracted search logic for reusability (auto-search vs manual)
  const performSearch = async (searchQuery: BulkRateQuery) => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const data = await generateBulkRates(searchQuery);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rates');
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

    // Only allow auto-fill if mode is explicitly 'sea'
    if (mode === 'sea') {
      const newQuery = { ...query };
      
      const origin = params.get('origin');
      if (origin) newQuery.originPort = origin;

      const destination = params.get('destination');
      if (destination) newQuery.destinationPort = destination;

      const commodity = params.get('commodity');
      if (commodity) newQuery.commodity = commodity as CommodityType; // Cast to Enum or string

      const container = params.get('container');
      if (container) newQuery.containerSize = container as ContainerSize;

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

  const handleExport = () => {
    if (results.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(results.map(item => ({
        "origin": item.originPort,
        "destination": item.destinationPort,
        "containerType": item.containerSize,
        "commodity": item.commodity,
        "currency": item.currency,
        "rate": item.estimatedPrice,
        "validUntil": item.validity,
        "transitTime": item.transitTime,
        "frequency": item.frequency,
        "carrier": item.carrierIndication,
        // Specific fields appended if available
        "etd": item.etd || 'N/A',
        "vessel": item.vesselName || 'N/A',
        "voyage": item.voyage || 'N/A',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly Rates");
    const regionName = query.destinationRegion.replace(/\s/g, '_');
    XLSX.writeFile(wb, `Sea_Rates_${regionName}_${query.targetDate}.xlsx`);
  };

  const isSpecificSearch = !!query.destinationPort && query.destinationPort.trim().length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">Weekly Global Rate Search</h2>
        <p className="text-slate-600 text-lg">
          Get estimated weekly ocean freight rates from Indonesia to major global destinations. 
        </p>
      </div>

      <form onSubmit={handleSearch} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Ship className="w-4 h-4" /> Origin Port
            </label>
            <div className="relative">
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer"
                value={query.originPort}
                onChange={e => setQuery({...query, originPort: e.target.value})}
              >
                {INDONESIAN_PORTS.map(port => (
                  <option key={port} value={port}>{port}</option>
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
              <MapPin className="w-4 h-4" /> Destination Port (Optional)
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-slate-700 placeholder-slate-400"
              placeholder="e.g. Shanghai, Rotterdam"
              value={query.destinationPort || ''}
              onChange={e => setQuery({...query, destinationPort: e.target.value})}
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
                onChange={e => setQuery({...query, commodity: e.target.value as CommodityType})}
              >
                {Object.values(CommodityType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Container
            </label>
            <div className="relative">
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer"
                value={query.containerSize}
                onChange={e => setQuery({...query, containerSize: e.target.value as ContainerSize})}
              >
                {Object.values(ContainerSize).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

           <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Reference Date
            </label>
            <input 
              type="date" 
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-slate-700"
              value={query.targetDate}
              onChange={e => setQuery({...query, targetDate: e.target.value})}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-lg font-medium text-white shadow-lg shadow-red-500/30 transition-all
              ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:-translate-y-0.5'}
            `}
          >
            {loading ? (
              <>
                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking Market Rates...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4" />
                Get Weekly Rates
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
              Market Rate Estimates ({query.destinationRegion === RegionDestination.ALL ? 'Global' : query.destinationRegion})
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
                  <th className="px-4 py-3">containerType</th>
                  <th className="px-4 py-3">commodity</th>
                  <th className="px-4 py-3">currency</th>
                  <th className="px-4 py-3">rate</th>
                  <th className="px-4 py-3">validUntil</th>
                  <th className="px-4 py-3">transitTime</th>
                  <th className="px-4 py-3">frequency</th>
                  <th className="px-4 py-3">carrier</th>
                  
                  {/* Specific Search Extra Columns */}
                  {isSpecificSearch && (
                    <>
                      <th className="px-4 py-3 border-l border-slate-200">ETD</th>
                      <th className="px-4 py-3">Vessel / Voyage</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {/* 1. Origin */}
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      {item.originPort}
                    </td>

                    {/* 2. Destination */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{item.destinationPort}</div>
                      <div className="text-xs text-slate-500">{item.country}</div>
                    </td>

                    {/* 3. Container Type */}
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {item.containerSize?.split('(')[0].trim() || '40HC'}
                      </div>
                    </td>

                    {/* 4. Commodity */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded">
                        {item.commodity?.split('(')[0].trim() || 'General'}
                      </span>
                    </td>

                    {/* 5. Currency */}
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-500">{item.currency}</span>
                    </td>

                    {/* 6. Rate */}
                    <td className="px-4 py-3">
                      <span className="font-bold text-red-700 text-lg">
                        {Number(item.estimatedPrice.replace(/[^0-9.]/g, '')).toLocaleString()}
                      </span>
                    </td>

                    {/* 7. Valid Until */}
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <CalendarCheck className="w-3 h-3" />
                        {item.validity}
                      </div>
                    </td>

                    {/* 8. Transit Time */}
                    <td className="px-4 py-3 text-slate-600">
                       <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.transitTime}
                       </div>
                    </td>

                    {/* 9. Frequency */}
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                         <RefreshCw className="w-3 h-3" />
                         {item.frequency}
                      </div>
                    </td>

                    {/* 10. Carrier */}
                    <td className="px-4 py-3 text-xs text-slate-500 italic font-medium">{item.carrierIndication}</td>

                    {/* Specific Search Extra Cells */}
                    {isSpecificSearch && (
                      <>
                        <td className="px-4 py-3 border-l border-slate-200 text-slate-700 font-medium">
                          {item.etd || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="text-sm font-medium text-slate-800">{item.vesselName || 'N/A'}</div>
                          <div className="text-xs text-slate-500">{item.voyage || '-'}</div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-yellow-50 text-yellow-800 text-xs text-center border-t border-yellow-100">
            Disclaimer: Rates are AI-generated market estimates. Ocean Freight Only.
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkRateSearch;
