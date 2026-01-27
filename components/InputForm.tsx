import React, { useState, useEffect } from 'react';
import { LocationParams } from '../types';
import { Search, Globe, Map, MapPin, ChevronDown, Ban } from 'lucide-react';
import { worldLocations } from '../data/worldLocations';

interface InputFormProps {
  onSearch: (params: LocationParams) => void;
  isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSearch, isLoading }) => {
  const [params, setParams] = useState<LocationParams>({
    continent: 'Asia',
    region: '',
    country: '',
    excludeCountries: ''
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    if (mode === 'data-scraping') {
      const newParams = { ...params };
      const continent = urlParams.get('continent');
      if (continent) newParams.continent = continent;
      
      const region = urlParams.get('region');
      if (region) newParams.region = region;
      
      const country = urlParams.get('country');
      if (country) newParams.country = country;

      const exclude = urlParams.get('exclude');
      if (exclude) newParams.excludeCountries = exclude;

      setParams(newParams);

      if (urlParams.get('auto') === 'true') {
        onSearch(newParams);
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(params);
  };

  const continents = Object.keys(worldLocations);
  const regions = params.continent ? Object.keys(worldLocations[params.continent] || {}) : [];
  const countries = (params.continent && params.region) 
    ? (worldLocations[params.continent][params.region] || []) 
    : [];

  const handleContinentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newContinent = e.target.value;
    setParams({
      continent: newContinent,
      region: '',
      country: '',
      excludeCountries: ''
    });
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRegion = e.target.value;
    setParams(prev => ({
      ...prev,
      region: newRegion,
      country: ''
    }));
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setParams(prev => ({
      ...prev,
      country: e.target.value
    }));
  };

  const handleExcludeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams(prev => ({
      ...prev,
      excludeCountries: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-6">
        <Search className="w-5 h-5 text-red-600" />
        <h2 className="text-lg font-semibold text-slate-800">Parameter Pencarian Data</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Continent Select */}
        <div className="space-y-2 relative">
          <label className="flex items-center text-sm font-medium text-slate-600 gap-2">
            <Globe className="w-4 h-4" /> Benua
          </label>
          <div className="relative">
            <select
              required
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none appearance-none cursor-pointer text-slate-700"
              value={params.continent}
              onChange={handleContinentChange}
            >
              {continents.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Region Select */}
        <div className="space-y-2 relative">
          <label className="flex items-center text-sm font-medium text-slate-600 gap-2">
            <Map className="w-4 h-4" /> Wilayah (Opsional)
          </label>
          <div className="relative">
            <select
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
              value={params.region}
              onChange={handleRegionChange}
            >
              <option value="">Semua Wilayah</option>
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Country Select */}
        <div className="space-y-2 relative">
          <label className="flex items-center text-sm font-medium text-slate-600 gap-2">
            <MapPin className="w-4 h-4" /> Negara (Opsional)
          </label>
          <div className="relative">
            <select
              disabled={!params.region || countries.length === 0}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
              value={params.country}
              onChange={handleCountryChange}
            >
              <option value="">Semua Negara</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Exclude Section */}
      <div className="space-y-2 mb-8">
        <label className="flex items-center text-sm font-medium text-red-600 gap-2">
          <Ban className="w-4 h-4" /> Kecualikan Negara (Opsional)
        </label>
        <div className="relative">
          <input
            type="text"
            disabled={!!params.country}
            className="w-full pl-4 pr-4 py-2.5 bg-red-50 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none text-slate-700 placeholder:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={params.country ? "Dinonaktifkan saat memilih satu negara spesifik" : "Contoh: Singapore, China (Pisahkan dengan koma)"}
            value={params.excludeCountries || ''}
            onChange={handleExcludeChange}
          />
          {!params.country && (
            <p className="text-xs text-slate-500 mt-1 ml-1">
              Negara yang tercantum di sini tidak akan dimasukkan dalam hasil scraping.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className={`
            flex items-center gap-2 px-8 py-3 rounded-lg font-medium text-white shadow-lg shadow-red-500/30 transition-all
            ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:-translate-y-0.5'}
          `}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              AI Sedang Mengekstrak Data...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Mulai Scraping
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default InputForm;