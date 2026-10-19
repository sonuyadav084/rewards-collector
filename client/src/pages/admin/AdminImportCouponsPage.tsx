import React, { useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { ImportPreviewData } from '../../types';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { triggerCelebrationConfetti } from '../../utils/confetti';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
} from 'lucide-react';

export const AdminImportCouponsPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isConfirming, setIsConfirming] = useState(false);
  const [importResult, setImportResult] = useState<{ batchId: string; totalImported: number } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      setPreviewError('Invalid format. Please upload a CSV or Excel (.xlsx) spreadsheet.');
      return;
    }

    setPreviewError(null);
    setSelectedFile(file);
    setPreviewData(null);
    setImportResult(null);
  };

  const handlePreviewUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsPreviewLoading(true);
    setPreviewError(null);

    try {
      const res = await adminApi.previewImport(selectedFile);
      setPreviewData(res.data);
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to parse and validate spreadsheet.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    setIsConfirming(true);
    setPreviewError(null);

    try {
      const res = await adminApi.confirmImport(previewData.previewId);
      setImportResult(res.data);
      setPreviewData(null);
      setSelectedFile(null);
      // Trigger confetti celebration!
      triggerCelebrationConfetti();
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to complete batch import.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-slate-50">
      <AdminSidebar />

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                  Catalog Expansion
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Import Valid Coupons
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Upload CSV or Excel spreadsheets containing pre-printed coupon numbers for pre-registration.
              </p>
            </div>
            <button
              onClick={() => adminApi.downloadTemplate()}
              className="px-4 py-2.5 border border-slate-200 glass-card hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              Download Template (.CSV)
            </button>
          </div>

          {previewError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{previewError}</span>
            </div>
          )}

          {/* Success Banner */}
          {importResult && (
            <div className="p-6 bg-emerald-50/90 border border-emerald-200 rounded-3xl text-emerald-800 space-y-2 animate-scale-in shadow-md">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <h3 className="text-base font-extrabold">Batch Import Completed Successfully! 🎉</h3>
              </div>
              <p className="text-sm font-medium">
                Registered <strong>{importResult.totalImported}</strong> new unique coupons into the verified database.
              </p>
              <p className="text-xs font-mono text-emerald-700 bg-emerald-100/60 px-3 py-1 rounded-lg inline-block font-bold">
                Batch ID: {importResult.batchId}
              </p>
            </div>
          )}

          {/* Upload Drop Area with Glassmorphism */}
          <div className="glass-card p-6 sm:p-9 rounded-3xl shadow-lg border border-slate-200/80">
            <form onSubmit={handlePreviewUpload} className="space-y-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-8 bg-slate-50/50 hover:bg-indigo-50/20 transition-all cursor-pointer relative group">
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3.5 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {selectedFile ? selectedFile.name : 'Select a CSV or Excel spreadsheet'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB — Ready to parse & preview`
                      : 'Drag & drop file here or click to browse (up to 10,000 rows)'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={!selectedFile || isPreviewLoading}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-indigo-300/40 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isPreviewLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Validating Spreadsheet...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Parse & Preview File
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Validation Summary & Preview Section */}
          {previewData && (
            <div className="glass-card p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-200/80 space-y-6 animate-scale-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Validation Breakdown</h2>
                  <p className="text-xs text-slate-500">
                    Examine parsed records before committing into the live coupon database.
                  </p>
                </div>
                {previewData.errors.length > 0 && (
                  <button
                    onClick={() => adminApi.downloadErrorReport(previewData.previewId)}
                    className="px-3.5 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Error Report ({previewData.errors.length})
                  </button>
                )}
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Rows</span>
                  <span className="text-2xl font-black text-slate-900">{previewData.totalRowsRead}</span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[11px] font-bold text-emerald-600 block uppercase">Valid New</span>
                  <span className="text-2xl font-black text-emerald-700">{previewData.validNewCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                  <span className="text-[11px] font-bold text-rose-600 block uppercase">Invalid Rows</span>
                  <span className="text-2xl font-black text-rose-700">{previewData.invalidCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <span className="text-[11px] font-bold text-amber-600 block uppercase">File Duplicates</span>
                  <span className="text-2xl font-black text-amber-700">{previewData.duplicateInFileCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <span className="text-[11px] font-bold text-indigo-600 block uppercase">Already in DB</span>
                  <span className="text-2xl font-black text-indigo-700">{previewData.alreadyRegisteredCount}</span>
                </div>
              </div>

              {/* Sample Valid Coupons */}
              {previewData.validNewCoupons.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Valid Coupon Numbers (Previewing {previewData.validNewCoupons.length} sample items):
                  </h4>
                  <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200 flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                    {previewData.validNewCoupons.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-mono font-bold shadow-xs">
                        {c.normalized}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Sample */}
              {previewData.errors.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">
                    Rejected Rows (Previewing first {previewData.errors.length} items):
                  </h4>
                  <div className="border border-rose-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-rose-50 border-b border-rose-100 text-rose-800 font-bold">
                        <tr>
                          <th className="p-2.5">Row #</th>
                          <th className="p-2.5">Raw Value</th>
                          <th className="p-2.5">Rejection Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100">
                        {previewData.errors.slice(0, 5).map((err, i) => (
                          <tr key={i}>
                            <td className="p-2.5 font-mono">{err.rowNumber}</td>
                            <td className="p-2.5 font-mono font-bold text-slate-700">{err.rawValue || '(blank)'}</td>
                            <td className="p-2.5 text-rose-600">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Confirm Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPreviewData(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-bold rounded-2xl"
                >
                  Discard
                </button>
                <button
                  type="button"
                  disabled={previewData.validNewCount === 0 || isConfirming}
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-200/40 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isConfirming ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Registering Coupons...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm & Import {previewData.validNewCount} Coupons
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};
