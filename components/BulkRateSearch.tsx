
import React, { useState, useEffect } from 'react';
import { CommodityType, ContainerSize, BulkRateQuery, BulkRateItem, RegionDestination } from '../types';
import { generateBulkRates } from '../services/geminiService';
import { Ship, Calendar, Package, DollarSign, Clock, Download, CalendarCheck, CalendarDays, Globe, Info, MapPin } from 'lucide-react';
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
    targetDate: new Date().toISOString().split('T')[0],
    destinationRegion: RegionDestination.ALL,
    destinationPort: ''
  });

  const [results, setResults] = useState<BulkRateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'sea-rates') {
      const newQuery = { ...query };
      const origin = params.get('origin');
      if (origin) newQuery.originPort = origin;
      const destination = params.get('destination');
      if (destination) newQuery.destinationPort = destination;
      setQuery(newQuery);
      if (params.get('auto') === 'true') performSearch(newQuery);
    }
  }, []);

  const handleExport = () => {
    if (results.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(results.map(item => ({
        "origin": item.origin,
        "destination": item.destination,
        "containerType": item.containerType,
        "commodity": item.commodity,
        "currency": item.currency,
        "rate": item.rate,
        "validUntil": item.validUntil,
        "transitTime": item.transitTime,
        "frequency": item.frequency,
        "carrier": item.carrier
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sea Rates Template");
    XLSX.writeFile(wb, `Sea_Rates_${query.targetDate}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">Weekly Sea Freight Rate Search</h2>
        <p className="text-slate-600 text-lg">
          Estimated weekly ocean freight market rates based on requested template.
        </p>
      </div>

      <form onSubmit={handleSearch} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Ship className="w-4 h-4" /> Origin Port
            </label>
            <select 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none cursor-pointer"
              value={query.originPort}
              onChange={e => setQuery({...query, originPort: e.target.value})}
            >
              {INDONESIAN_PORTS.map(port => <option key={port} value={port}>{port}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Destination Region
            </label>
            <select 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none cursor-pointer"
              value={query.destinationRegion}
              onChange={e => setQuery({...query, destinationRegion: e.target.value as RegionDestination})}
            >
              {Object.values(RegionDestination).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Destination Port
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none text-slate-700"
              placeholder="e.g. Shanghai"
              value={query.destinationPort || ''}
              onChange={e => setQuery({...query, destinationPort: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Package className="w-4 h-4" /> Commodity
            </label>
            <select 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none cursor-pointer"
              value={query.commodity}
              onChange={e => setQuery({...query, commodity: e.target.value as CommodityType})}
            >
              {Object.values(CommodityType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Container
            </label>
            <select 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none cursor-pointer"
              value={query.containerSize}
              onChange={e => setQuery({...query, containerSize: e.target.value as ContainerSize})}
            >
              {Object.values(ContainerSize).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4 items-center">
          <input 
            type="date" 
            className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none text-sm"
            value={query.targetDate}
            onChange={e => setQuery({...query, targetDate: e.target.value})}
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-lg font-medium text-white shadow-lg bg-red-600 hover:bg-red-700 transition-all disabled:bg-slate-400"
          >
            {loading ? 'Checking Market Rates...' : 'Get Sea Rates'}
          </button>
        </div>
      </form>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-200">{error}</div>}

      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800">Sea Freight Market Database</h3>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 text-sm text-green-700 font-medium bg-white px-3 py-1.5 rounded border border-green-200 hover:bg-green-50 transition-colors"
            >
              <Download className="w-4 h-4" /> Download Template Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-800 text-white font-medium">
                <tr>
                  <th className="px-4 py-3 border-r border-slate-700">origin</th>
                  <th className="px-4 py-3 border-r border-slate-700">destination</th>
                  <th className="px-4 py-3 border-r border-slate-700">containerType</th>
                  <th className="px-4 py-3 border-r border-slate-700">commodity</th>
                  <th className="px-4 py-3 border-r border-slate-700">currency</th>
                  <th className="px-4 py-3 border-r border-slate-700">rate</th>
                  <th className="px-4 py-3 border-r border-slate-700">validUntil</th>
                  <th className="px-4 py-3 border-r border-slate-700">transitTime</th>
                  <th className="px-4 py-3 border-r border-slate-700">frequency</th>
                  <th className="px-4 py-3">carrier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{item.origin}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{item.destination}</div>
                      <div className="text-[10px] text-slate-500">{item.country}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{item.containerType}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{item.commodity}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-500">{item.currency}</td>
                    <td className="px-4 py-3 font-bold text-red-700 text-base">{item.rate}</td>
                    <td className="px-4 py-3 text-slate-600">{item.validUntil}</td>
                    <td className="px-4 py-3 text-slate-600">{item.transitTime}</td>
                    <td className="px-4 py-3 text-slate-600">{item.frequency}</td>
                    <td className="px-4 py-3 font-semibold italic text-slate-500">{item.carrier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-900 text-white text-[10px] text-center italic">
            Hubungi tim FreightForwarder.site untuk konsultasi logistik.
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkRateSearch;
