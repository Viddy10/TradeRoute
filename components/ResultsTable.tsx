import React from 'react';
import { LogisticsPoint, TransportType } from '../types';
import { Anchor, Plane, CheckCircle, RefreshCw, MapPin, Link2 } from 'lucide-react';

interface ResultsTableProps {
  data: LogisticsPoint[];
  onVerify: (id: string) => void;
  verifyingId: string | null;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ data, onVerify, verifyingId }) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
        <p className="text-slate-500 italic">Belum ada data yang diekstraksi. Masukkan parameter untuk memulai.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Fasilitas & Lokasi</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Kode</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Kategori</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Negara</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Koordinat</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Sumber AI</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded ${item.type === TransportType.PORT ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                      {item.type === TransportType.PORT ? <Anchor className="w-3.5 h-3.5" /> : <Plane className="w-3.5 h-3.5" />}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{item.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-tighter">{item.city}</div>
                    </div>
                  </div>
                </td>
                
                <td className="px-4 py-4">
                  <div className="text-xs font-mono font-bold text-slate-600 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                    {item.code || 'N/A'}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <span className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 whitespace-nowrap">
                    {item.category}
                  </span>
                </td>

                <td className="px-4 py-4 text-sm text-slate-700 font-medium">
                  {item.country}
                </td>

                <td className="px-4 py-4 text-[10px] font-mono text-slate-500 whitespace-nowrap leading-relaxed">
                  <div>LAT: <span className="text-slate-900">{item.latitude?.toFixed(6) || '-'}</span></div>
                  <div>LON: <span className="text-slate-900">{item.longitude?.toFixed(6) || '-'}</span></div>
                </td>

                <td className="px-4 py-4">
                  {item.sources && item.sources.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.sources.slice(0, 2).map((s, idx) => (
                        <a 
                          key={idx} 
                          href={s.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-100 max-w-[100px] truncate"
                          title={s.title}
                        >
                          <Link2 className="w-2.5 h-2.5" />
                          {s.title}
                        </a>
                      ))}
                      {item.sources.length > 2 && <span className="text-[10px] text-slate-400">+{item.sources.length - 2}</span>}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Pengetahuan AI</span>
                  )}
                </td>

                <td className="px-4 py-4 text-right">
                  {item.verified ? (
                    <a 
                      href={item.mapsUri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors shadow-sm"
                      title="Lihat di Google Maps"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      onClick={() => onVerify(item.id)}
                      disabled={verifyingId === item.id}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-red-600 hover:bg-red-600 hover:text-white transition-all disabled:opacity-70 shadow-sm"
                      title="Verifikasi Lokasi"
                    >
                      {verifyingId === item.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 italic">
        * Data dikumpulkan menggunakan Gemini Search Grounding untuk akurasi terbaru.
      </div>
    </div>
  );
};

export default ResultsTable;