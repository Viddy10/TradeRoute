
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
        <p className="text-slate-500">No data extracted yet. Enter parameters to start.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Name</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Code</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Type</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Category</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Country</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Region</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Lat / Long</th>
              <th className="px-4 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                {/* Name */}
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-900 text-sm">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.city}</div>
                </td>
                
                {/* Code */}
                <td className="px-4 py-4">
                  <div className="text-xs font-mono font-bold text-slate-600 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                    {item.code}
                  </div>
                </td>
                
                {/* Type */}
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border
                    ${item.type === TransportType.PORT 
                      ? 'bg-slate-50 text-slate-700 border-slate-200' 
                      : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    {item.type === TransportType.PORT ? <Anchor className="w-3 h-3" /> : <Plane className="w-3 h-3" />}
                    {item.type}
                  </span>
                </td>

                {/* Category */}
                <td className="px-4 py-4">
                  <span className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 whitespace-nowrap">
                    {item.category}
                  </span>
                </td>

                {/* Country */}
                <td className="px-4 py-4 text-sm text-slate-700">
                  {item.country}
                </td>

                {/* Region */}
                <td className="px-4 py-4 text-sm text-slate-600">
                  {item.region}
                </td>

                {/* Lat & Long */}
                <td className="px-4 py-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                  <div><span className="text-slate-400">Lat:</span> {item.latitude.toFixed(4)}</div>
                  <div><span className="text-slate-400">Lon:</span> {item.longitude.toFixed(4)}</div>
                </td>

                {/* Action */}
                <td className="px-4 py-4 text-right">
                  {item.verified ? (
                    <a 
                      href={item.mapsUri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      title="View on Google Maps"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      onClick={() => onVerify(item.id)}
                      disabled={verifyingId === item.id}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-70"
                      title="Verify Location"
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
