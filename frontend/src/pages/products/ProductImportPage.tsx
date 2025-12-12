import React, { useState, useRef } from 'react';
import { productsApi } from '@/lib/api/client';

interface ImportSummary {
  totalRows: number;
  validProducts: number;
  imported: number;
  skipped: number;
  duplicates: number;
  errors?: string[];
}

interface ImportResult {
  success: boolean;
  message: string;
  summary?: ImportSummary;
  data?: {
    imported: number;
    skipped: number;
    duplicates: number;
  };
}

const ProductImportPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const fileName = file.name.toLowerCase();
      const isValidType = fileName.endsWith('.csv') || fileName.endsWith('.json');
      
      if (!isValidType) {
        setError('نوع الملف غير مدعوم. يرجى اختيار ملف CSV أو JSON');
        setSelectedFile(null);
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setError(null);
      setImportResult(null);
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('يرجى اختيار ملف أولاً');
      return;
    }

    setIsUploading(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await productsApi.importProducts(formData);
      
      if (response.success && response.data) {
        setImportResult({
          success: response.data.success,
          message: response.data.message || 'تم الاستيراد بنجاح',
          summary: response.data.summary,
          data: response.data.data,
        });
      } else {
        setError(response.message || 'فشل استيراد المنتجات');
      }
    } catch (err: any) {
      const errorMessage = err.message || err.details?.message || 'حدث خطأ أثناء استيراد المنتجات';
      setError(errorMessage);
      setImportResult(null);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Modern Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-100/30 dark:from-slate-950 dark:via-orange-950/20 dark:to-amber-950/30" />
      
      {/* Subtle Floating Orbs */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-red-400/15 to-orange-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 px-4 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/50">
              <div className="mr-2 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              استيراد المنتجات
            </div>
            <h1 className="bg-gradient-to-r from-slate-900 via-orange-900 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-white sm:text-5xl">
              استيراد المنتجات من ملف
            </h1>
            <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              قم بتحميل ملف CSV أو JSON يحتوي على بيانات المنتجات (اسم المنتج، سعر التكلفة، سعر البيع، الباركود)
            </p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6 sm:p-8">
          {/* File Upload Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
              اختر ملف الاستيراد
            </label>
            
            <div className="space-y-4">
              {/* File Input */}
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="file-upload"
                  className={`flex-1 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
                    selectedFile
                      ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
                      : 'border-slate-300 dark:border-slate-600 hover:border-orange-400 dark:hover:border-orange-500'
                  } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <svg
                      className="h-12 w-12 text-slate-400 dark:text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-orange-600 dark:text-orange-400">
                        اضغط للاختيار
                      </span>{' '}
                      أو اسحب الملف هنا
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500">
                      CSV أو JSON (حد أقصى 10 ميجابايت)
                    </div>
                  </div>
                </label>
              </div>

              {/* Selected File Info */}
              {selectedFile && (
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-8 w-8 text-orange-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  {!isUploading && (
                    <button
                      onClick={handleFileRemove}
                      className="flex-shrink-0 p-2 text-slate-400 hover:text-red-500 transition-colors"
                      aria-label="إزالة الملف"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                </div>
              )}

              {/* Import Button */}
              <button
                onClick={handleImport}
                disabled={!selectedFile || isUploading}
                className={`w-full py-3 px-6 rounded-xl font-medium text-white transition-all duration-300 ${
                  !selectedFile || isUploading
                    ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/50 hover:shadow-xl hover:shadow-orange-500/50'
                }`}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>جاري الاستيراد...</span>
                  </div>
                ) : (
                  'بدء الاستيراد'
                )}
              </button>
            </div>
          </div>

          {/* Import Results Section */}
          {importResult && (
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                نتائج الاستيراد
              </h2>

              {importResult.success ? (
                <div className="space-y-6">
                  {/* Success Message */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <svg
                        className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        {importResult.message}
                      </p>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  {importResult.summary && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Total Rows */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                          إجمالي الصفوف
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {importResult.summary.totalRows}
                        </div>
                      </div>

                      {/* Imported */}
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="text-sm text-green-700 dark:text-green-400 mb-1">
                          تم الاستيراد
                        </div>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {importResult.summary.imported}
                        </div>
                      </div>

                      {/* Skipped */}
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                        <div className="text-sm text-yellow-700 dark:text-yellow-400 mb-1">
                          تم التخطي
                        </div>
                        <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                          {importResult.summary.skipped}
                        </div>
                      </div>

                      {/* Duplicates */}
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                        <div className="text-sm text-orange-700 dark:text-orange-400 mb-1">
                          مكررات
                        </div>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                          {importResult.summary.duplicates}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Errors List */}
                  {importResult.summary?.errors && importResult.summary.errors.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        الأخطاء والتحذيرات ({importResult.summary.errors.length})
                      </h3>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {importResult.summary.errors.map((error, index) => (
                          <div
                            key={index}
                            className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"
                          >
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {importResult.message || 'فشل استيراد المنتجات'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* File Format Help */}
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
              تنسيق الملف المطلوب
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  <span className="font-medium text-slate-900 dark:text-slate-100">CSV:</span> يجب أن يحتوي الملف على الأعمدة التالية:
                </p>
                <ul className="list-disc list-inside mr-4 space-y-1">
                  <li>Product Name (اسم المنتج)</li>
                  <li>Cost Price (سعر التكلفة)</li>
                  <li>Selling Price (سعر البيع)</li>
                  <li>Barcode (الباركود)</li>
                </ul>
                <p className="mt-3">
                  <span className="font-medium text-slate-900 dark:text-slate-100">JSON:</span> يجب أن يكون الملف مصفوفة من الكائنات بنفس الحقول المذكورة أعلاه.
                </p>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
                  ملاحظة: سيتم تخطي المنتجات التي تفتقد الباركود أو البيانات المطلوبة. المنتجات المكررة (بنفس الباركود) لن يتم استيرادها.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductImportPage;

