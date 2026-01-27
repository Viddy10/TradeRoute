import React from 'react';
import { LogisticsPoint } from '../types';
import { FileSpreadsheet, FileText, FileCode } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportButtonsProps {
  data: LogisticsPoint[];
  disabled: boolean;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ data, disabled }) => {
  
  const handleExportCSV = () => {
    // Template: [name, code, type, category, country, region, latitude, longitude]
    const headers = ["Name", "Code", "Type", "Category", "Country", "Region", "Latitude", "Longitude", "Maps Link"];
    
    const rows = data.map(item => [
      `"${item.name}"`,
      item.code,
      item.type,
      `"${item.category}"`,
      `"${item.country}"`,
      `"${item.region}"`,
      item.latitude,
      item.longitude,
      item.mapsUri || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "logistics_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(item => ({
      Name: item.name,
      Code: item.code,
      Type: item.type,
      Category: item.category,
      Country: item.country,
      Region: item.region,
      Latitude: item.latitude,
      Longitude: item.longitude,
      "Maps Link": item.mapsUri || ""
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logistics Data");
    XLSX.writeFile(wb, "logistics_data.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns
    doc.text("Trade Logistics Data", 14, 15);
    
    const tableData = data.map(item => [
      item.name,
      item.code,
      item.type,
      item.category,
      item.country,
      item.region,
      `${item.latitude.toFixed(4)}\n${item.longitude.toFixed(4)}`
    ]);

    autoTable(doc, {
      head: [['Name', 'Code', 'Type', 'Category', 'Country', 'Region', 'Lat/Lon']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save("logistics_data.pdf");
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleExportExcel}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
      >
        <FileSpreadsheet className="w-4 h-4" /> Excel
      </button>
      <button
        onClick={handleExportCSV}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
      >
        <FileCode className="w-4 h-4" /> CSV
      </button>
      <button
        onClick={handleExportPDF}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
      >
        <FileText className="w-4 h-4" /> PDF
      </button>
    </div>
  );
};

export default ExportButtons;