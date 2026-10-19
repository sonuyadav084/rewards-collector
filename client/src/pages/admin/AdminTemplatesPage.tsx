import React, { useState, useEffect, useRef } from 'react';
import { adminApi, CouponTemplateItem, CreateTemplatePayload } from '../../api/adminApi';
import { customerApi } from '../../api/customerApi';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  QrCode,
  Tag,
  Hash,
  Upload,
  Check,
  X,
  ShieldCheck,
  FileImage,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const AdminTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<CouponTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CouponTemplateItem | null>(null);

  // Sample Card Auto-Detect State
  const sampleCardInputRef = useRef<HTMLInputElement | null>(null);
  const [sampleCardFile, setSampleCardFile] = useState<File | null>(null);
  const [sampleCardPreviewUrl, setSampleCardPreviewUrl] = useState<string | null>(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [autoDetectSuccess, setAutoDetectSuccess] = useState(false);
  const [autoDetectError, setAutoDetectError] = useState<string | null>(null);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrefix, setFormPrefix] = useState('NP');
  const [formPattern, setFormPattern] = useState('^NP\\d{6}$');
  const [formSampleCode, setFormSampleCode] = useState('NP000001');
  const [formKeywords, setFormKeywords] = useState('NATION PRIDE, SCRATCH');
  const [formQrMatch, setFormQrMatch] = useState('thenationpride.store');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Card Tester State
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testPreviewUrl, setTestPreviewUrl] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getTemplates();
      setTemplates(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load coupon templates.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setSampleCardFile(null);
    if (sampleCardPreviewUrl) URL.revokeObjectURL(sampleCardPreviewUrl);
    setSampleCardPreviewUrl(null);
    setIsAutoDetecting(false);
    setAutoDetectSuccess(false);
    setAutoDetectError(null);
    setShowAdvancedFields(false);
    setFormName('');
    setFormDescription('');
    setFormPrefix('NP');
    setFormPattern('^NP\\d{6}$');
    setFormSampleCode('NP000001');
    setFormKeywords('NATION PRIDE, SCRATCH');
    setFormQrMatch('thenationpride.store');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (tmpl: CouponTemplateItem) => {
    setEditingTemplate(tmpl);
    setSampleCardFile(null);
    if (sampleCardPreviewUrl) URL.revokeObjectURL(sampleCardPreviewUrl);
    setSampleCardPreviewUrl(null);
    setIsAutoDetecting(false);
    setAutoDetectSuccess(false);
    setAutoDetectError(null);
    setShowAdvancedFields(true);
    setFormName(tmpl.name);
    setFormDescription(tmpl.description || '');
    setFormPrefix(tmpl.codePrefix);
    setFormPattern(tmpl.codePattern);
    setFormSampleCode(tmpl.sampleCode);
    setFormKeywords(tmpl.requiredKeywords.join(', '));
    setFormQrMatch(tmpl.qrCodeMatch || '');
    setFormIsActive(tmpl.isActive);
    setIsModalOpen(true);
  };

  const handleSampleCardUpload = async (file: File) => {
    setSampleCardFile(file);
    if (sampleCardPreviewUrl) URL.revokeObjectURL(sampleCardPreviewUrl);
    setSampleCardPreviewUrl(URL.createObjectURL(file));
    setIsAutoDetecting(true);
    setAutoDetectError(null);
    setAutoDetectSuccess(false);

    try {
      const res = await adminApi.autoDetectTemplate(file);
      if (res.data) {
        setFormName(res.data.name);
        setFormDescription(res.data.description);
        setFormPrefix(res.data.codePrefix);
        setFormPattern(res.data.codePattern);
        setFormSampleCode(res.data.sampleCode);
        setFormKeywords(res.data.requiredKeywords.join(', '));
        setFormQrMatch(res.data.qrCodeMatch || '');
        setAutoDetectSuccess(true);
      }
    } catch (err: any) {
      setAutoDetectError(err.message || 'Could not auto-analyze card. Please enter details manually.');
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const keywords = formKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const payload: CreateTemplatePayload = {
      name: formName.trim() || 'Official Card Template',
      description: formDescription.trim(),
      codePrefix: formPrefix.trim().toUpperCase() || 'NP',
      codePattern: formPattern.trim() || '^NP\\d{6}$',
      sampleCode: formSampleCode.trim().toUpperCase() || 'NP000001',
      requiredKeywords: keywords.length > 0 ? keywords : ['NATION PRIDE', 'SCRATCH'],
      minKeywordMatches: Math.max(2, keywords.length > 1 ? 2 : 1),
      qrCodeMatch: formQrMatch.trim() || undefined,
      isActive: formIsActive,
    };

    try {
      if (editingTemplate) {
        await adminApi.updateTemplate(editingTemplate._id, payload);
        setSuccessMsg('Template updated successfully!');
      } else {
        await adminApi.createTemplate(payload);
        setSuccessMsg('New card template created successfully!');
      }
      setIsModalOpen(false);
      fetchTemplates();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save template.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await adminApi.toggleTemplateStatus(id);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to update template status.');
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;
    try {
      await adminApi.deleteTemplate(id);
      setSuccessMsg('Template removed.');
      fetchTemplates();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete template.');
    }
  };

  // Test scanning an image against active templates
  const handleTestImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTestFile(file);
    if (testPreviewUrl) URL.revokeObjectURL(testPreviewUrl);
    setTestPreviewUrl(URL.createObjectURL(file));
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await customerApi.scanCouponPhoto(file);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        isTemplateValid: false,
        message: err.message || 'Error occurred while testing template.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      <AdminSidebar />

      <main className="flex-1 p-4 sm:p-7 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Card Template
            </h1>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Card Template</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2 font-medium animate-fade-in shadow-xs">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2 font-medium animate-fade-in shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Grid layout: Templates List + Card Scanner Tester */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List (2 columns on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Active & Registered Templates ({templates.length})
              </h2>
              <button
                onClick={fetchTemplates}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {isLoading ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No Templates Configured</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click "Add Card Template" to define your official coupon design and code formats.
                </p>
                <button
                  onClick={openCreateModal}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                >
                  Create First Template
                </button>
              </div>
            ) : (
              templates.map((tmpl) => (
                <div
                  key={tmpl._id}
                  className={`bg-white rounded-2xl p-5 border transition-all ${
                    tmpl.isActive
                      ? 'border-slate-200/90 shadow-xs hover:border-indigo-300'
                      : 'border-slate-200 opacity-60 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-slate-900">{tmpl.name}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            tmpl.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {tmpl.isActive ? 'Active Template' : 'Inactive'}
                        </span>
                      </div>
                      {tmpl.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{tmpl.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleStatus(tmpl._id)}
                        title={tmpl.isActive ? 'Deactivate' : 'Activate'}
                        className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                          tmpl.isActive
                            ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {tmpl.isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => openEditModal(tmpl)}
                        title="Edit template"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tmpl._id, tmpl.name)}
                        title="Delete template"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Template Details Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3.5 text-xs">
                    {/* Prefix & Format */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Tag className="w-3 h-3 text-indigo-500" />
                        <span>Code Format & Prefix</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          Prefix: {tmpl.codePrefix}
                        </span>
                        <span className="font-mono text-slate-600">Sample: {tmpl.sampleCode}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        Regex: {tmpl.codePattern}
                      </div>
                    </div>

                    {/* Brand Keywords */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span>Required Brand Keywords</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tmpl.requiredKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded text-[10px] font-bold"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                      {tmpl.qrCodeMatch && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                          <QrCode className="w-3 h-3 text-slate-400" />
                          <span>QR Match: {tmpl.qrCodeMatch}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Card Tester Simulator Card (Right Column) */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Live Template Tester</span>
            </h2>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <p className="text-xs text-slate-500">
                Upload any voucher card image here to test whether our AI engine recognizes the template and code format.
              </p>

              {/* Upload area */}
              <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer relative bg-slate-50/50 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleTestImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {!testPreviewUrl ? (
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 text-indigo-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">Choose Card Photo to Test</p>
                    <p className="text-[10px] text-slate-400">JPG, PNG, or WebP</p>
                  </div>
                ) : (
                  <div>
                    <img
                      src={testPreviewUrl}
                      alt="Test preview"
                      className="max-h-36 rounded-lg object-contain mx-auto shadow-xs border border-slate-200 mb-2"
                    />
                    <span className="text-[11px] font-semibold text-slate-600 underline">
                      Click to change image
                    </span>
                  </div>
                )}
              </div>

              {/* Test in progress */}
              {isTesting && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 flex items-center justify-center gap-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Scanning image against templates...</span>
                </div>
              )}

              {/* Test Result Display */}
              {testResult && !isTesting && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 animate-fade-in ${
                    testResult.isTemplateValid
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50/80 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {testResult.isTemplateValid ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Template Recognized: {testResult.matchedTemplateName || 'Official Card'}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Template Not Valid!</span>
                      </>
                    )}
                  </div>

                  <p className="text-[11px] font-medium leading-relaxed">{testResult.message}</p>

                  {testResult.detectedCode && (
                    <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between">
                      <span className="text-slate-600">Extracted Code:</span>
                      <strong className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                        {testResult.detectedCode}
                      </strong>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 pt-1">
                    Status: {testResult.verified ? '✓ Valid in Catalog' : testResult.isSubmitted ? '⚠️ Already Redeemed' : 'Unregistered in Catalog'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal: Add / Edit Template */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-scale-in max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {editingTemplate ? 'Edit Card Template' : 'Add Card Template via Coupon Photo'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {editingTemplate
                        ? 'Update template parameters or upload a new sample card'
                        : 'Upload coupon card photo—AI will auto-detect code format, keywords & QR domain!'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-4">
                {/* 1. Upload Sample Coupon Card (Auto-detect all parameters) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileImage className="w-4 h-4 text-indigo-600" />
                      <span>Upload Sample Coupon Card</span>
                    </label>
                    {autoDetectSuccess && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" /> AI Auto-Configured
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={sampleCardInputRef}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSampleCardUpload(file);
                    }}
                    className="hidden"
                  />

                  <div
                    onClick={() => sampleCardInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                      autoDetectSuccess
                        ? 'border-emerald-300 bg-emerald-50/20 hover:bg-emerald-50/40'
                        : isAutoDetecting
                        ? 'border-indigo-400 bg-indigo-50/40 animate-pulse'
                        : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                  >
                    {sampleCardPreviewUrl ? (
                      <div className="flex items-center gap-3 text-left">
                        <img
                          src={sampleCardPreviewUrl}
                          alt="Uploaded Coupon"
                          className="w-16 h-16 object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          {isAutoDetecting ? (
                            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs">
                              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                              <span>Scanning coupon photo with AI... Analyzing QR & Serial code...</span>
                            </div>
                          ) : autoDetectSuccess ? (
                            <div>
                              <div className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Card recognized! Features extracted:</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold">
                                  Prefix: {formPrefix}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                                  Sample: {formSampleCode}
                                </span>
                                {formQrMatch && (
                                  <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-[10px] font-mono font-bold">
                                    QR: {formQrMatch}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">
                                Click to upload a different coupon photo
                              </p>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-600">
                              <span>Photo selected. Click to re-scan.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-2">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          Click to select or drop official coupon card photo
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                          Our AI will read the card, identify brand keywords, QR URL, and setup the code format automatically!
                        </p>
                      </div>
                    )}
                  </div>

                  {autoDetectError && (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{autoDetectError}</span>
                    </div>
                  )}
                </div>

                {/* 2. Template Name (Auto-filled by AI, can be edited) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Nation Pride - Scratch Card"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Pre-filled by AI based on your coupon card photo. You can edit this name if you wish.
                  </p>
                </div>

                {/* 3. Toggle Advanced / Technical Parameters (Hidden by default) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer py-1"
                  >
                    {showAdvancedFields ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Hide Advanced Technical Fields</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>View / Edit Technical Parameters (Auto-configured by AI)</span>
                      </>
                    )}
                  </button>
                </div>

                {showAdvancedFields && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Official Scratch & Win cards with QR code"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    {/* Prefix & Sample Code */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Code Prefix *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. NP"
                          value={formPrefix}
                          onChange={(e) => setFormPrefix(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono uppercase font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">e.g. NP for Nation Pride</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Sample Code *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. NP000001"
                          value={formSampleCode}
                          onChange={(e) => setFormSampleCode(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono uppercase font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">Example of valid card</p>
                      </div>
                    </div>

                    {/* Code Format Regex */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Code Format Pattern (Regex) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ^NP\d{6}$"
                        value={formPattern}
                        onChange={(e) => setFormPattern(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => { setFormPattern('^NP\\d{6}$'); setFormPrefix('NP'); setFormSampleCode('NP000001'); }}
                          className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                        >
                          Preset: NP + 6 Digits
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => { setFormPattern('^[A-Z0-9]{4,16}$'); setFormPrefix('NP'); setFormSampleCode('NP123456'); }}
                          className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                        >
                          Preset: Alphanumeric
                        </button>
                      </div>
                    </div>

                    {/* Required Brand Keywords */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Required Card Keywords (Comma separated) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. NATION PRIDE, SCRATCH"
                        value={formKeywords}
                        onChange={(e) => setFormKeywords(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Images missing these keywords will be rejected as non-coupon templates.
                      </p>
                    </div>

                    {/* QR Code Match URL */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        QR Code URL Match (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. thenationpride.store"
                        value={formQrMatch}
                        onChange={(e) => setFormQrMatch(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        If card has a QR code, verifies against this store URL domain.
                      </p>
                    </div>
                  </div>
                )}

                {/* Is Active Toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="isActiveToggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Template Active (Only active templates accept card uploads)
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isAutoDetecting}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Template...</span>
                      </>
                    ) : editingTemplate ? (
                      'Update Template'
                    ) : (
                      'Save Card Template'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
export default AdminTemplatesPage;

