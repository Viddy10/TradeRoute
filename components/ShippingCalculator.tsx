
import React, { useState, useEffect } from 'react';
import { ShippingQuery, ShippingAnalysis, CommodityType, AirCommodityType, TransportType } from '../types';
import { Coins, Package, Info, Download, CalendarDays, Ship, Plane, MapPin } from 'lucide-react';
import { analyzeShippingCost } from '../services/geminiService';
import * as XLSX from 'xlsx';

// Comprehensive List of Indonesian International & Major Domestic Ports (Sabang to Merauke)
const PORT_OPTIONS = [
  "All Major Ports (Sabang - Merauke)",
  // JAVA
  "Jakarta (Tanjung Priok)",
  "Surabaya (Tanjung Perak)",
  "Semarang (Tanjung Emas)",
  "Banten (Merak / Ciwandan)",
  "Subang (Patimban)",
  "Cilacap (Tanjung Intan)",
  // SUMATRA
  "Medan (Belawan)",
  "Batam (Batu Ampar / Kabil)",
  "Lampung (Panjang)",
  "Palembang (Boom Baru)",
  "Dumai (Dumai)",
  "Padang (Teluk Bayur)",
  "Pekanbaru (Perawang)",
  "Jambi (Talang Duku)",
  "Aceh (Malahayati / Krueng Geukueh)",
  "Bengkulu (Pulau Baai)",
  // KALIMANTAN
  "Pontianak (Dwikora)",
  "Balikpapan (Semayang / Karingau)",
  "Banjarmasin (Trisakti)",
  "Samarinda (Palaran)",
  "Sampit (Bagendang)",
  "Kumai (Pangkalan Bun)",
  "Tarakan (Malundung)",
  // SULAWESI
  "Makassar (Soekarno-Hatta)",
  "Bitung (International Hub)",
  "Palu (Pantoloan)",
  "Kendari (Kendari New Port)",
  "Gorontalo (Anggrek)",
  // BALI & NUSA TENGGARA
  "Bali (Benoa)",
  "Lombok (Lembar)",
  "Kupang (Tenau)",
  // MALUKU & PAPUA
  "Ambon (Yos Sudarso)",
  "Sorong (Sorong)",
  "Jayapura (Jayapura)",
  "Manokwari",
  "Merauke"
];

// Comprehensive List of Indonesian Airports for Cargo (Sabang to Merauke)
const AIRPORT_OPTIONS = [
  "All Major Airports (Sabang - Merauke)",
  // JAVA
  "Jakarta (CGK) - Soekarno-Hatta",
  "Jakarta (HLP) - Halim Perdanakusuma",
  "Surabaya (SUB) - Juanda",
  "Yogyakarta (YIA) - Yogyakarta Int.",
  "Semarang (SRG) - Ahmad Yani",
  "Solo (SOC) - Adi Soemarmo",
  "Bandung (BDO) - Husein Sastranegara",
  "Majalengka (KJT) - Kertajati",
  // SUMATRA
  "Medan (KNO) - Kualanamu",
  "Batam (BTH) - Hang Nadim",
  "Palembang (PLM) - Sultan Mahmud Badaruddin II",
  "Padang (PDG) - Minangkabau",
  "Pekanbaru (PKU) - Sultan Syarif Kasim II",
  "Banda Aceh (BTJ) - Sultan Iskandar Muda",
  "Jambi (DJB) - Sultan Thaha",
  "Pangkal Pinang (PGK) - Depati Amir",
  // KALIMANTAN
  "Balikpapan (BPN) - Sultan Aji Muhammad Sulaiman",
  "Pontianak (PNK) - Supadio",
  "Banjarmasin (BDJ) - Syamsudin Noor",
  "Tarakan (TRK) - Juwata",
  // SULAWESI
  "Makassar (UPG) - Sultan Hasanuddin",
  "Manado (MDC) - Sam Ratulangi",
  "Kendari (KDI) - Haluoleo",
  "Palu (PLW) - Mutiara SIS Al-Jufrie",
  // BALI & NUSA TENGGARA
  "Bali (DPS) - I Gusti Ngurah Rai",
  "Lombok (LOP) - Zainuddin Abdul Madjid",
  "Kupang (KOE) - El Tari",
  // MALUKU & PAPUA
  "Ambon (AMQ) - Pattimura",
  "Jayapura (DJJ) - Sentani",
  "Sorong (SOQ) - Domine Eduard Osok",
  "Timika (TIM) - Mozes Kilangin",
  "Merauke (MKQ) - Mopah"
];

const ShippingCalculator: React.FC = () => {
  const [query, setQuery] = useState<ShippingQuery>({
    date: new Date().toISOString().split('T')[0], // Default to today
    commodity: CommodityType.GENERAL,
    transportMode: TransportType.PORT, // Default to Sea/Port
    originLocation: PORT_OPTIONS[0]
  });

  const [results, setResults] = useState<ShippingAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract analysis logic for reuse
  const performAnalyze = async (searchQuery: ShippingQuery) => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const analysisData = await analyzeShippingCost(searchQuery);
      setResults(analysisData);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze shipping costs');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    performAnalyze(query);
  };

  // Webhook / Automation Listener
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');

    if (mode === 'shipping-cost') {
      const newQuery = { ...query };
      
      const transport = params.get('transport'); // 'Port' or 'Airport'
      if (transport) {
        newQuery.transportMode = transport as TransportType;
        // Also ensure location matches mode
        if (transport === TransportType.PORT && !newQuery.originLocation.includes("Port")) {
            newQuery.originLocation = PORT_OPTIONS[0];
        } else if (transport === TransportType.AIRPORT && !newQuery.originLocation.includes("Airport")) {
            newQuery.originLocation = AIRPORT_OPTIONS[0];
        }
      }

      const origin = params.get('origin');
      if (origin) newQuery.originLocation = origin;

      const commodity = params.get('commodity');
      if (commodity) newQuery.commodity = commodity;

      const date = params.get('date');
      if (date) newQuery.date = date;

      setQuery(newQuery);

      if (params.get('auto') === 'true') {
        performAnalyze(newQuery);
      }
    }
  }, []);

  const handleModeChange = (mode: TransportType) => {
    const isPort = mode === TransportType.PORT;
    setQuery({
      ...query,
      transportMode: mode,
      originLocation: isPort ? PORT_OPTIONS[0] : AIRPORT_OPTIONS[0],
      commodity: isPort ? CommodityType.GENERAL : AirCommodityType.GENERAL
    });
    setResults([]); // Clear previous results on mode switch
  };

  const handleExportExcel = () => {
    if (results.length === 0) return;
    
    // Dynamically map fields based on mode
    const exportData = results.map(item => {
      const base = {
        "Location": item.locationName,
        "Handling": item.handling,
        "Inspection": item.inspectionFee,
        "Storage": item.storageFee,
        "Special Treatment": item.specialTreatment,
        "Admin Fee": item.adminFee,
        "Doc Fee": item.docFee,
        "COO": item.cooFee,
        "Note": item.note
      };

      if (query.transportMode === TransportType.PORT) {
        return {
          ...base,
          "THC 20'": item.thc20,
          "THC 40'": item.thc40,
          "LOLO": item.lolo,
          "Gate In": item.gateIn,
          "Seal": item.sealFee,
          "Detention": item.detentionDays,
        };
      } else {
        return {
          ...base,
          "TSC (per Kg)": item.tsc,
          "RA (per Kg)": item.ra,
          "AWB Fee": item.awbFee
        };
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    const sheetName = query.transportMode === TransportType.PORT ? "Sea Local Charges" : "Air Local Charges";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Local_Charges_${query.transportMode}_${query.date}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="max-w-4xl">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">Cek Biaya Lokal (Local Charges Calculator)</h2>
        <p className="text-slate-600 text-lg">
          Dapatkan penawaran harga pasar (Market Rates) untuk komponen biaya lokal ekspor (Export Local Charges).
          Mendukung data pelabuhan dan bandara di seluruh Indonesia (Sabang - Merauke).
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAnalyze} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        
        {/* Top Controls: Mode & Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Transport Mode Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              {query.transportMode === TransportType.PORT ? <Ship className="w-4 h-4" /> : <Plane className="w-4 h-4" />}
              Mode Transportasi
            </label>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleModeChange(TransportType.PORT)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${query.transportMode === TransportType.PORT ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Ship className="w-4 h-4" /> Sea Freight (Port)
              </button>
              <button
                type="button"
                onClick={() => handleModeChange(TransportType.AIRPORT)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${query.transportMode === TransportType.AIRPORT ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Plane className="w-4 h-4" /> Air Freight (Airport)
              </button>
            </div>
          </div>

          {/* Location Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {query.transportMode === TransportType.PORT ? 'Origin Port' : 'Origin Airport'}
            </label>
            <div className="relative">
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer"
                value={query.originLocation}
                onChange={e => setQuery({...query, originLocation: e.target.value})}
              >
                {(query.transportMode === TransportType.PORT ? PORT_OPTIONS : AIRPORT_OPTIONS).map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Controls: Date & Commodity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Date (For Exchange Rate)
            </label>
            <input 
              type="date" 
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-slate-700"
              value={query.date}
              onChange={e => setQuery({...query, date: e.target.value})}
            />
             <p className="text-xs text-slate-500">
              Rates set in USD/Foreign Currency will be converted to IDR based on this date.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Package className="w-4 h-4" /> Commodity Type
            </label>
            <div className="relative">
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer"
                value={query.commodity}
                onChange={e => setQuery({...query, commodity: e.target.value})}
              >
                {(query.transportMode === TransportType.PORT 
                  ? Object.values(CommodityType) 
                  : Object.values(AirCommodityType)
                ).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
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
                Calculating...
              </>
            ) : (
              <>
                <Coins className="w-4 h-4" />
                Cek Biaya ({query.transportMode})
              </>
            )}
          </button>
        </div>
      </form>

      {/* Results */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="animate-fade-in space-y-4">
          
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-red-500" />
                Quotation: {query.transportMode} Export Local Charges
              </h3>
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" /> Download Excel
              </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-800 text-white font-medium">
                  <tr>
                    <th className="px-4 py-3 border-r border-slate-700">Location</th>
                    {query.transportMode === TransportType.PORT ? (
                      <>
                        <th className="px-4 py-3 border-r border-slate-700">THC 20'</th>
                        <th className="px-4 py-3 border-r border-slate-700">THC 40'</th>
                        <th className="px-4 py-3 border-r border-slate-700">LOLO</th>
                        <th className="px-4 py-3 border-r border-slate-700">Gate In</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 border-r border-slate-700">TSC (per Kg)</th>
                        <th className="px-4 py-3 border-r border-slate-700">RA (per Kg)</th>
                        <th className="px-4 py-3 border-r border-slate-700">AWB Fee</th>
                      </>
                    )}
                    <th className="px-4 py-3 border-r border-slate-700">Handling</th>
                    <th className="px-4 py-3 border-r border-slate-700">Admin</th>
                    <th className="px-4 py-3 border-r border-slate-700">Doc Fee</th>
                    <th className="px-4 py-3 border-r border-slate-700">COO</th>
                    <th className="px-4 py-3 border-r border-slate-700">Storage</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.locationName}</td>
                      
                      {query.transportMode === TransportType.PORT ? (
                        <>
                          <td className="px-4 py-3">{item.thc20}</td>
                          <td className="px-4 py-3">{item.thc40}</td>
                          <td className="px-4 py-3">{item.lolo}</td>
                          <td className="px-4 py-3">{item.gateIn}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-red-700 font-medium">{item.tsc}</td>
                          <td className="px-4 py-3">{item.ra}</td>
                          <td className="px-4 py-3">{item.awbFee}</td>
                        </>
                      )}

                      <td className="px-4 py-3">{item.handling}</td>
                      <td className="px-4 py-3">{item.adminFee}</td>
                      <td className="px-4 py-3">{item.docFee}</td>
                      <td className="px-4 py-3">{item.cooFee}</td>
                      <td className="px-4 py-3">{item.storageFee}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 italic max-w-xs truncate" title={item.note}>{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-yellow-50 border-t border-yellow-100">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">AI Disclaimer:</span> Rates subject to VAT 1.1%. {query.transportMode === TransportType.PORT ? "THC" : "TSC/RA"} rates are market averages.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCalculator;
