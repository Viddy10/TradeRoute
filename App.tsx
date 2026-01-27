import React, { useState } from 'react';
import InputForm from './components/InputForm';
import ResultsTable from './components/ResultsTable';
import ExportButtons from './components/ExportButtons';
import ShippingCalculator from './components/ShippingCalculator';
import BulkRateSearch from './components/BulkRateSearch';
import AirRateSearch from './components/AirRateSearch';
import { LocationParams, LogisticsPoint, GenerationStatus } from './types';
import { extractLogisticsData, verifyLocationWithMaps } from './services/geminiService';
import { Ship, Anchor, Database, Calculator, TrendingUp, Coins, Plane } from 'lucide-react';

const App: React.FC = () => {
  // Initialize activeTab based on URL parameter 'mode' to support Webhook/Automation
  const [activeTab, setActiveTab] = useState<'scraping' | 'calculator' | 'bulk_rates' | 'air_rates'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'sea-rates') return 'bulk_rates';
      if (mode === 'air-rates') return 'air_rates';
      if (mode === 'shipping-cost') return 'calculator';
      if (mode === 'data-scraping') return 'scraping';
    }
    return 'scraping';
  });
  
  // Scraping State
  const [data, setData] = useState<LogisticsPoint[]>([]);
  const [status, setStatus] = useState<GenerationStatus>({ loading: false, message: '' });
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleTabChange = (tab: 'scraping' | 'calculator' | 'bulk_rates' | 'air_rates', slug: string) => {
    setActiveTab(tab);
    // Update URL without reloading page
    const newUrl = `${window.location.pathname}?mode=${slug}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleSearch = async (params: LocationParams) => {
    setStatus({ loading: true, message: 'Menghubungi AI (Berpikir)...' });
    setData([]);
    
    try {
      const results = await extractLogisticsData(params);
      setData(results);
      setStatus({ loading: false, message: '' });
    } catch (error: any) {
      setStatus({ loading: false, message: '', error: error.message || 'Terjadi kesalahan sistem.' });
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    const item = data.find(d => d.id === id);
    if (!item) return;

    try {
      const verifiedData = await verifyLocationWithMaps(item);
      setData(prevData => prevData.map(d => 
        d.id === id ? { ...d, ...verifiedData } : d
      ));
    } catch (error) {
      console.error("Verification failed", error);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                FreightForwarder.site
              </h1>
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest leading-none">AI Marketing Assistant</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              AI Engine Aktif
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Tab Navigation */}
        <div className="flex justify-center">
          <div className="bg-slate-100 p-1.5 rounded-xl inline-flex shadow-inner overflow-x-auto max-w-full">
            <button
              onClick={() => handleTabChange('scraping', 'data-scraping')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
                ${activeTab === 'scraping' 
                  ? 'bg-white text-red-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
              `}
            >
              <Database className="w-4 h-4" />
              Scraping Pelabuhan & Bandara
            </button>
            <button
              onClick={() => handleTabChange('bulk_rates', 'sea-rates')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
                ${activeTab === 'bulk_rates' 
                  ? 'bg-white text-red-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
              `}
            >
              <TrendingUp className="w-4 h-4" />
              Sea Rates
            </button>
            <button
              onClick={() => handleTabChange('air_rates', 'air-rates')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
                ${activeTab === 'air_rates' 
                  ? 'bg-white text-red-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
              `}
            >
              <Plane className="w-4 h-4" />
              Air Rates
            </button>
            <button
              onClick={() => handleTabChange('calculator', 'shipping-cost')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
                ${activeTab === 'calculator' 
                  ? 'bg-white text-red-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
              `}
            >
              <Coins className="w-4 h-4" />
              Shipping Cost
            </button>
          </div>
        </div>

        {/* Dynamic Content */}
        {activeTab === 'scraping' && (
          <div className="animate-fade-in space-y-8">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Ekstraksi Data Logistik Global</h2>
              <p className="text-slate-600 text-lg">
                Gunakan AI untuk mengumpulkan data pelabuhan dan bandara di seluruh dunia secara akurat. 
                Data mencakup kode IATA/UN, kategori, hingga koordinat geografis.
              </p>
            </div>
            <InputForm onSearch={handleSearch} isLoading={status.loading} />
            {status.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {status.error}
              </div>
            )}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Anchor className="w-5 h-5 text-slate-400" />
                  Hasil Scraping ({data.length})
                </h3>
                <ExportButtons data={data} disabled={data.length === 0 || status.loading} />
              </div>
              <ResultsTable 
                data={data} 
                onVerify={handleVerify}
                verifyingId={verifyingId}
              />
              {data.length > 0 && (
                <div className="p-4 bg-slate-900 text-white text-xs text-center rounded-lg italic">
                  Hubungi tim FreightForwarder.site untuk konsultasi logistik.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bulk_rates' && (
          <BulkRateSearch />
        )}

        {activeTab === 'air_rates' && (
          <AirRateSearch />
        )}

        {activeTab === 'calculator' && (
          <div className="animate-fade-in">
            <ShippingCalculator />
          </div>
        )}

      </main>

      {/* Centered Footer */}
      <footer className="mt-auto py-8 bg-white border-t border-slate-200 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xl font-bold tracking-tight">
            <span className="text-red-600">Freight</span>
            <span className="text-black">Forwarder.site</span>
          </p>
          <p className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-widest">
            Internal Logistics Marketing Platform
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;