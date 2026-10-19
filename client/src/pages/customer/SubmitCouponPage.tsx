import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { customerApi } from '../../api/customerApi';
import { authApi } from '../../api/authApi';
import { triggerCelebrationConfetti } from '../../utils/confetti';
import {
  Ticket,
  Smartphone,
  CheckCircle,
  CheckCircle2,
  Upload,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  FileImage,
  User,
  ScanLine,
  Zap,
  Layers,
  Lock,
  ShieldCheck,
  LogIn,
  ArrowRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const FEEDBACK_PRESETS: Record<'Good' | 'Better' | 'Excellent', string[]> = {
  Excellent: [
    'The Nation Pride Whisky delivers an extraordinarily rich taste and velvety smooth finish. The oak-aged aroma and perfect grain balance make every celebratory sip unforgettable!',
    'Truly a masterpiece blend! Bold character yet amazingly smooth on the throat. Best Indian whisky for celebrations—pure premium craftsmanship in every sip.',
    'Exceptional whisky with a deep malt character, warm aroma, and an elegant oak finish. Crafted with real pride, perfect for evening gatherings with friends!',
    'Rich golden amber color, subtle woody notes from oak aging, and a remarkably refined taste. The Nation Pride Whisky truly elevates every special moment.',
    'Unforgettable taste! The smoothness is unmatched with zero harsh burn. Pairs brilliantly with ice or a splash of water. Absolute five-star drink!',
    'Distilled with true pride and dedication. The richness from oak casks and selection of fine grains makes this my top choice for any grand toast.',
    'An absolute delight to drink! The rich mouthfeel, subtle caramel-oak aroma, and silky finish make The Nation Pride Whisky a league above the rest.',
    'Full-bodied flavor with a wonderfully gentle warmth that lingers pleasantly. An extraordinary blend that makes weekend gatherings truly memorable.',
    'Crafted to absolute perfection! The balance between bold strength and mellow smoothness is world-class. Highly recommended for genuine whisky connoisseurs.',
    'From the moment you pour the glass to the very last sip, the aromatic oak notes and velvety texture showcase authentic master blending.',
    'A proud Indian whisky that easily stands tall against top international brands. Impeccable aroma, smooth pour, and an unforgettable drinking experience.',
    'Remarkably refined and mature spirit. Best enjoyed on the rocks with close companions—smooth, sophisticated, and deeply satisfying.',
    'The oak barrel aging gives it an exquisite character and golden richness. Every sip feels celebratory and luxurious.',
    'Distinctive character with a clean, flawless finish. No harsh aftertaste whatsoever—just pure, aged excellence.',
    'Hands down one of the finest whiskies I have ever savored. Rich heritage in every drop, bold aroma, and unmatched smoothness.',
  ],
  Better: [
    'Very smooth drink with a satisfying oak-matured aroma. The balance between bold spirit and mellow grain taste is really enjoyable.',
    'Great quality Indian whisky! Pleasantly smooth and rich. Thoroughly enjoyed it over ice during our weekend celebration.',
    'Distinct flavor profile with strong character and a lingering, mellow finish. Distinctly better than many commercial alternatives.',
    'Crisp aroma and balanced depth. Pairs wonderfully with soda or water, giving a refreshing and refined drinking experience.',
    'Very enjoyable pour with warm woody notes. Goes down easily without any sharp bite. Perfect drink for unwinding after work.',
    'A well-crafted spirit with solid depth and an appealing golden color. Great choice for sharing a drink with close colleagues.',
    'Impressive smoothness and a very clean finish. The oak cask aging is clearly noticeable in the aroma.',
    'Thoroughly pleased with the balance and richness. It has quickly become our favorite bottle for weekend get-togethers.',
    'Smooth, aromatic, and rich in body. Offers a premium drinking feel that is much better than expected.',
    'Pleasantly surprised by how mellow and balanced this blend is. Great companion for casual evening sessions.',
    'Good oak notes combined with a mild sweetness from fine grains. Mixes exceptionally well with soda and lime.',
    'Smooth entry with a warm, satisfying finish. Great value for the refined quality and taste it delivers.',
    'Rich amber hue and gentle smoky undertone. An easy-drinking whisky that appeals to all taste preferences.',
    'A reliable pour for any occasion. Smooth enough on the palate to sip slowly with friends.',
    'Very balanced and full of flavor. The aroma upon opening the bottle is inviting and promises great taste.',
  ],
  Good: [
    'Good smooth taste and pleasant woody aroma. A dependable, enjoyable drink for casual parties and get-togethers.',
    'Decent flavor with nice grain notes and a balanced finish. Satisfying pour for relaxed evenings with friends.',
    'Pleasant blend with nice warmth and good character. Smooth enough to drink neat or on the rocks.',
    'Solid Indian whisky with good aroma and decent smoothness. Great pour for social gatherings.',
    'Enjoyable drink with mild malt notes. Mixes smoothly with cola, soda, or ice.',
    'Clean taste and pleasant warmth. A reliable bottle to have on hand for everyday weekend relaxation.',
    'Fairly smooth on the palate with a recognizable oak presence. Good overall drinking experience.',
    'Decent balance of grains and spirit. Enjoyed it during a casual family gathering.',
    'Good value and enjoyable taste. Suitable for anyone looking for an honest, smooth pour.',
    'Pleasant fragrance and decent body. A nice, unpretentious whisky to share with buddies.',
    'Satisfactory pour that goes down nicely over a couple of ice cubes. Solid weekend drink.',
    'Good aroma and warm finish. Works well as a casual celebration drink.',
    'Light oak aroma with a straightforward grain flavor. Nice and easy to drink.',
    'Dependable blend that delivers what it promises. A good drink for an enjoyable evening.',
    'Simple, smooth, and satisfying. A good everyday pour for whisky lovers.',
  ],
};

export const SubmitCouponPage: React.FC = () => {
  const {
    customerMobile,
    customerName: authCustomerName,
    isCustomerAuthenticated,
    setCustomerAuth,
    logoutCustomer,
  } = useAuth();

  // Login Form States (for Step 1)
  const [loginName, setLoginName] = useState(authCustomerName || '');
  const [loginPhone, setLoginPhone] = useState(customerMobile || '');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sync login inputs if auth context changes
  useEffect(() => {
    if (authCustomerName) setLoginName(authCustomerName);
    if (customerMobile) setLoginPhone(customerMobile);
  }, [authCustomerName, customerMobile]);

  // Form Fields (for Step 2: Upload & Submit)
  const [couponNumber, setCouponNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState<'Good' | 'Better' | 'Excellent'>('Excellent');
  const [aiPresetIndex, setAiPresetIndex] = useState<number>(() =>
    Math.floor(Math.random() * FEEDBACK_PRESETS['Excellent'].length)
  );
  const [feedbackComment, setFeedbackComment] = useState<string>(() => {
    const list = FEEDBACK_PRESETS['Excellent'];
    return list[Math.floor(Math.random() * list.length)];
  });

  const handleRatingChange = (newRating: 'Good' | 'Better' | 'Excellent') => {
    setFeedbackRating(newRating);
    const list = FEEDBACK_PRESETS[newRating];
    const randomIdx = Math.floor(Math.random() * list.length);
    setAiPresetIndex(randomIdx);
    setFeedbackComment(list[randomIdx]);
  };

  const handleCycleAiSuggestion = () => {
    const suggestions = FEEDBACK_PRESETS[feedbackRating];
    const nextIdx = (aiPresetIndex + 1) % suggestions.length;
    setAiPresetIndex(nextIdx);
    setFeedbackComment(suggestions[nextIdx]);
  };

  // AI OCR Scanning State
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);
  const [scanResult, setScanResult] = useState<{
    isTemplateValid: boolean;
    matchedTemplateName?: string;
    detectedCode: string | null;
    verified: boolean;
    isSubmitted: boolean;
    message: string;
    confidence?: number;
  } | null>(null);

  // Success State
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    submissionReference: string;
    couponNumber: string;
    customerMobile: string;
    status: string;
    isAutoApproved?: boolean;
    feedbackRating?: string;
    feedbackComment?: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Update phone if customerMobile changes
  useEffect(() => {
    if (customerMobile && !loginPhone) {
      setLoginPhone(customerMobile);
    }
  }, [customerMobile, loginPhone]);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Automatically scan photo for coupon code using AI OCR and template matching
  const scanPhotoAndExtractCoupon = async (file: File) => {
    setIsScanningPhoto(true);
    setScanResult(null);
    try {
      const res = await customerApi.scanCouponPhoto(file);

      // Check if uploaded template is valid
      if (res.isTemplateValid === false) {
        setCouponNumber('');
        setSubmitError(res.message || 'This template is not valid. Please upload an official recognized coupon card.');
        setScanResult({
          isTemplateValid: false,
          matchedTemplateName: undefined,
          detectedCode: null,
          verified: false,
          isSubmitted: false,
          message: res.message || 'This template is not valid. The uploaded card does not match any authorized voucher template.',
        });
        return;
      }

      if (res.detectedCode) {
        setCouponNumber(res.detectedCode);
        setScanResult({
          isTemplateValid: true,
          matchedTemplateName: res.matchedTemplateName,
          detectedCode: res.detectedCode,
          verified: res.verified,
          isSubmitted: res.isSubmitted,
          message: res.message,
          confidence: res.confidence,
        });

        if (res.verified && !res.isSubmitted) {
          setSubmitError(null);
        } else if (res.isSubmitted) {
          setSubmitError(`Coupon code '${res.detectedCode}' has already been redeemed.`);
        } else {
          setSubmitError(null);
        }
      } else {
        setCouponNumber('');
        setScanResult({
          isTemplateValid: true,
          matchedTemplateName: res.matchedTemplateName,
          detectedCode: null,
          verified: false,
          isSubmitted: false,
          message: res.message || 'Template recognized, but coupon code could not be detected.',
        });
      }
    } catch {
      setScanResult({
        isTemplateValid: false,
        detectedCode: null,
        verified: false,
        isSubmitted: false,
        message: 'Could not auto-scan photo. Please type coupon code manually.',
      });
    } finally {
      setIsScanningPhoto(false);
    }
  };

  // Validate and set image file
  const validateAndSetFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('File is too large. Image size must not exceed 5MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setSubmitError('Invalid file type. Only JPG, PNG, and WebP images are permitted.');
      return;
    }

    setSubmitError(null);
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    // Automatically trigger AI OCR coupon scanning and catalog verification
    scanPhotoAndExtractCoupon(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  // Handle customer login (Step 1)
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim()) {
      setLoginError('Please enter your full name.');
      return;
    }

    const cleaned = loginPhone.replace(/[\s\-\(\)\.]/g, '');
    if (cleaned.length < 10) {
      setLoginError('Please enter a valid 10 to 15 digit mobile phone number.');
      return;
    }

    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await authApi.customerLogin(loginName.trim(), loginPhone.trim());
      setCustomerAuth(res.data.token, res.data.customerMobile, res.data.customerName);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please verify your phone number.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle direct coupon submission (Step 2)
  const handleSubmitCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    const activeName = (authCustomerName || loginName).trim();
    const activePhone = (customerMobile || loginPhone).trim();

    if (!activeName) {
      setSubmitError('Please enter your full name.');
      return;
    }

    const cleanedPhone = activePhone.replace(/[\s\-\(\)\.]/g, '');
    if (cleanedPhone.length < 10) {
      setSubmitError('Please enter a valid 10 to 15 digit mobile phone number.');
      return;
    }

    if (!selectedFile) {
      setSubmitError('Please upload a clear photo of your official coupon card.');
      return;
    }

    if (scanResult && !scanResult.isTemplateValid) {
      setSubmitError('This coupon template is not valid. Please upload an official recognized voucher card.');
      return;
    }

    if (!couponNumber.trim()) {
      setSubmitError('Coupon code could not be detected from the uploaded image. Please ensure the card photo is clear and well-lit.');
      return;
    }

    if (scanResult && scanResult.isSubmitted) {
      setSubmitError(`Coupon code '${couponNumber}' has already been redeemed.`);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const res = await customerApi.submitCoupon(
        {
          customerName: activeName,
          customerMobile: activePhone,
          couponNumber: couponNumber.trim(),
          photoFile: selectedFile,
          feedbackRating,
          feedbackComment: feedbackComment.trim() || undefined,
        },
        (progress) => setUploadProgress(progress)
      );

      // Save customer session token, phone and name so history & profile is accessible
      if (res.data?.token) {
        setCustomerAuth(
          res.data.token,
          res.data.customerMobile || activePhone,
          res.data.customerName || activeName
        );
      }

      setSubmissionResult(res.data);
      setIsSuccess(true);
      // Trigger festive celebration confetti explosion!
      triggerCelebrationConfetti();
    } catch (err: any) {
      setSubmitError(err.message || 'Coupon submission failed. Please verify the coupon number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReferenceToClipboard = () => {
    if (submissionResult?.submissionReference) {
      navigator.clipboard.writeText(submissionResult.submissionReference);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleResetForAnother = () => {
    setCouponNumber('');
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFeedbackRating('Excellent');
    const resetIdx = Math.floor(Math.random() * FEEDBACK_PRESETS['Excellent'].length);
    setAiPresetIndex(resetIdx);
    setFeedbackComment(FEEDBACK_PRESETS['Excellent'][resetIdx]);
    setIsSuccess(false);
    setSubmissionResult(null);
    setSubmitError(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">

      {!isCustomerAuthenticated ? (
        /* ========================================================================= */
        /* STEP 1: CUSTOMER LOGIN (NAME & MOBILE ONLY) */
        /* ========================================================================= */
        <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-sm border border-slate-200/80 animate-fade-in">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-indigo-600 mb-0.5">
                <span>Step 1 of 2</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Customer Login</h2>
              <p className="text-xs text-slate-500">
                Enter your Name and Mobile Number to login, then upload your scratch card photo.
              </p>
            </div>
          </div>

          <form onSubmit={handleCustomerLogin} className="space-y-4">
            {/* Customer Full Name */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Customer Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={loginName}
                  onChange={(e) => {
                    setLoginName(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium shadow-xs"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Mobile Phone Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210 or +91 9876543210"
                  value={loginPhone}
                  onChange={(e) => {
                    setLoginPhone(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium shadow-xs"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Enter 10 to 15 digits. No OTP or password required.
              </p>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5 animate-fade-in shadow-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="leading-relaxed">{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>Login & Continue to Upload</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure Session
            </span>
            <span>Single-use voucher validation</span>
          </div>
        </div>
      ) : !isSuccess ? (
        /* ========================================================================= */
        /* STEP 2: PHOTO UPLOAD & AUTOMATIC OCR VERIFICATION */
        /* ========================================================================= */
        <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-sm border border-slate-200/80 animate-fade-in">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Ticket className="w-5 h-5 rotate-45" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-indigo-600 mb-0.5">
                <span>Step 2 of 2</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Upload & Verify Coupon</h2>
              <p className="text-xs text-slate-500">
                Upload card photo to auto-detect and verify coupon code.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitCoupon} className="space-y-5">

            {/* Upload Photo of Physical Coupon */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Upload Photo of Physical Coupon *
              </label>

              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`mt-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 transition-colors cursor-pointer relative overflow-hidden ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                {!previewUrl ? (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700">
                      Drag & Drop coupon card photo here, or <span className="text-indigo-600 underline">browse files</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG, or WebP up to 5MB (code will be auto-detected and verified from photo)
                    </p>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="relative group/preview mb-2 rounded-xl overflow-hidden border border-slate-200">
                      <img
                        src={previewUrl}
                        alt="Coupon preview"
                        className="max-h-48 object-contain shadow-xs block"
                      />

                      {/* Animated Laser Scanning Overlay */}
                      {isScanningPhoto && (
                        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
                          {/* Laser Bar */}
                          <div className="absolute left-1 right-1 h-1 bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 shadow-[0_0_12px_#38bdf8] animate-scan-laser rounded-full" />
                          <div className="px-3 py-1.5 rounded-full bg-slate-900/90 text-cyan-300 text-xs font-semibold flex items-center gap-2 border border-cyan-500/30 shadow-lg">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                            <span>Reading coupon code...</span>
                          </div>
                        </div>
                      )}

                      {!isScanningPhoto && (
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold pointer-events-none">
                          Click to change photo
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full font-semibold border border-emerald-200">
                        <FileImage className="w-3.5 h-3.5" />
                        {selectedFile?.name} ({(selectedFile ? selectedFile.size / 1024 : 0).toFixed(1)} KB)
                      </div>
                      {isScanningPhoto ? (
                        <span className="text-[11px] font-semibold text-indigo-600 animate-pulse">
                          Scanning with AI...
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedFile) scanPhotoAndExtractCoupon(selectedFile);
                          }}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 z-20 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Re-scan</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coupon Code Input */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Coupon Code
              </label>

              <div className="relative">
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  placeholder={
                    isScanningPhoto
                      ? "Reading coupon code from photo..."
                      : selectedFile
                      ? "Scanning photo above..."
                      : "Upload coupon card photo to detect code"
                  }
                  value={couponNumber}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono uppercase font-bold tracking-wider shadow-xs cursor-not-allowed select-all transition-colors ${
                    scanResult?.verified && !scanResult?.isSubmitted
                      ? 'border-emerald-400 bg-emerald-50/30 text-emerald-950'
                      : scanResult?.isSubmitted
                      ? 'border-amber-400 bg-amber-50/30 text-amber-950'
                      : scanResult && !scanResult.isTemplateValid
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                />
                <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none">
                  {scanResult?.verified && !scanResult?.isSubmitted ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Customer Feedback Section (Shown when image is selected) */}
            {selectedFile && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 border border-indigo-100/90 shadow-xs space-y-3.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        Rate The Nation Pride Whisky Experience
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Share your drink tasting review for The Nation Pride Whisky
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full">
                    Tasting Review
                  </span>
                </div>

                {/* Rating Radio Buttons: Good, Better, Excellent */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Whisky Taste & Quality Rating:
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['Good', 'Better', 'Excellent'] as const).map((rating) => {
                      const isSelected = feedbackRating === rating;
                      return (
                        <label
                          key={rating}
                          className={`relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-bold shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-medium'
                          }`}
                        >
                          <input
                            type="radio"
                            name="feedbackRating"
                            value={rating}
                            checked={isSelected}
                            onChange={() => handleRatingChange(rating)}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer accent-indigo-600"
                          />
                          <span className="text-xs sm:text-sm flex items-center gap-1">
                            {rating === 'Excellent' && '⭐'}
                            {rating === 'Better' && '👍'}
                            {rating === 'Good' && '👌'}
                            {rating}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Drink Review & Tasting Notes Comment Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Drink Review & Tasting Notes
                    </label>
                    <button
                      type="button"
                      onClick={handleCycleAiSuggestion}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Click to see another review option"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Suggest Another</span>
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={3}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Share your tasting notes, aroma, and overall drink experience for The Nation Pride Whisky..."
                      className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-xs sm:text-sm text-slate-800 bg-white shadow-xs resize-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner Right Above The Submit Button */}
            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in shadow-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 font-medium">{submitError}</div>
              </div>
            )}

            {/* Upload Progress Bar */}
            {isSubmitting && (
              <div className="space-y-1 animate-fade-in">
                <div className="flex justify-between text-xs text-slate-600 font-semibold">
                  <span>Uploading coupon photo & verifying...</span>
                  <span className="text-indigo-600 font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stable Submit Button with Fixed Dimensions */}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedFile ||
                !couponNumber.trim() ||
                !(authCustomerName || loginName).trim() ||
                !(customerMobile || loginPhone).trim()
              }
              className="w-full h-12 min-h-[48px] rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-semibold text-sm sm:text-base shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Verifying Coupon Code...</span>
                </>
              ) : (
                <>
                  <span>Submit Coupon for Verification</span>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* ========================================================================= */
        /* SUBMISSION SUCCESS CONFIRMATION SCREEN */
        /* ========================================================================= */
        submissionResult && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 text-center shadow-sm border border-slate-200/80 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">
              Coupon Verified & Approved! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6">
              Your coupon has been automatically verified and approved instantly without delay.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-sm mx-auto mb-6 text-left space-y-3">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-500">Reference ID:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100">
                    {submissionResult.submissionReference}
                  </span>
                  <button
                    type="button"
                    onClick={copyReferenceToClipboard}
                    title="Copy Reference"
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-500">Coupon Number:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {submissionResult.couponNumber}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-mono font-medium text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {submissionResult.customerMobile}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-500">Status:</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Approved ✅
                </span>
              </div>

              {submissionResult.feedbackRating && (
                <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500">Your Feedback:</span>
                  <span className="font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1 text-xs">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    {submissionResult.feedbackRating}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/history"
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all text-center"
              >
                View Submission History
              </Link>
              <button
                onClick={handleResetForAnother}
                className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all"
              >
                Submit Another Coupon
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};
