import React from 'react';
import { LogisticsPoint, TransportType } from '../types';
import { Anchor, Plane, CheckCircle, ExternalLink, RefreshCw, MapPin } from 'lucide-react';

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
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Nama Fasilitas</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Kode</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Kategori</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Negara</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Wilayah</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Koordinat</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                {/* Name */}
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
                
                {/* Code */}
                <td className="px-4 py-4">
                  <div className="text-xs font-mono font-bold text-slate-600 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                    {item.code || 'N/A'}
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-4">
                  <span className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 whitespace-nowrap">
                    {item.category}
                  </span>
                </td>

                {/* Country */}
                <td className="px-4 py-4 text-sm text-slate-700 font-medium">
                  {item.country}
                </td>

                {/* Region */}
                <td className="px-4 py-4 text-sm text-slate-600">
                  {item.region}
                </td>

                {/* Lat & Long */}
                <td className="px-4 py-4 text-[10px] font-mono text-slate-500 whitespace-nowrap leading-relaxed">
                  <div>LAT: <span className="text-slate-900">{item.latitude.toFixed(6)}</span></div>
                  <div>LON: <span className="text-slate-900">{item.longitude.toFixed(6)}</span></div>
                </td>

                {/* Action */}
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
    </div>
  );
};

export default ResultsTable;