/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Eye, FileSearch, Code2, Upload, Loader, HelpCircle, Check, Copy, RefreshCw, Layers, MonitorPlay } from 'lucide-react';
import { executeStream } from '../lib/api';

type VisionMode = 'describe' | 'ocr' | 'code';

interface VisionTabProps {
  onErrorToast: (message: string, duration?: number) => void;
  onRateLimit: (seconds: number) => void;
}

export const VisionTab: React.FC<VisionTabProps> = ({ onErrorToast, onRateLimit }) => {
  const [selectedModel, setSelectedModel] = useState('claude-haiku-4.5');
  const [visionMode, setVisionMode] = useState<VisionMode>('describe');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageRawBase64, setImageRawBase64] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState<'preview' | 'code'>('preview');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  const processImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onErrorToast('يرجى سحب وإدراج ملف صورة صالح فقط (.png, .jpg, .jpeg).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUri = reader.result as string;
      setImagePreview(dataUri);
      
      // Extract pure base64 for vision payload formatting
      const base64Content = dataUri.split(',')[1];
      setImageRawBase64(base64Content);
      setAnalysisResult('');
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageRawBase64 || isLoading) return;

    setIsLoading(true);
    setAnalysisResult('');

    let promptText = "";
    if (visionMode === 'describe') {
      promptText = "بصفتك مستشاراً بصرياً رائد، قم بتحليل هذه الصورة ووصف تفاصيل المشهد، الألوان المستخدمة، الإضاءة، العناصر المكونة والنسب والرموز الحيوية بدقة فائقة باللغة العربية الفصحى.";
    } else if (visionMode === 'ocr') {
      promptText = "استخرج تفاصيل الكلمات والنصوص المكتوبة في هذه المستند/الصورة كاملة. في حال وجود جداول أو استمارات تداول بياني مالي أو إداري، قم بإعادة تمثيلها وصياغتها برمجياً في جداول Markdown مريحة ومفهومة بالكامل باللغة العربية.";
    } else {
      promptText = "أنت مهندس واجهات مستخدم متمكن (Senior Frontend UI/UX Developer). تفحص وحلل سكتش التصميم أو الواجهة الملحقة، وقم بتوليد كود صفحة كاملة مستقلة (Static UI component) معاصرة وجميلة للغاية متوافقة مع نظام ألوان وتدرجات ممتازة باستخدام مكتبات Tailwind CSS التجميلية الكبيرة وخريطة خط القاهرة (Cairo Font). يجب أن تخرج كود الـ HTML البرمجي كاملاً محصوراً بداخل حاويات ```html و ``` فقط ليتم استخلاصها وعرضها كمعاينة حية للمستخدمين في المتصفح تلقائياً. لا تكتب أي مقدمات أو اعتذارات أو نصوص جانبية إضافية على الإطلاق.";
    }

    // Body content arrays for multimodal
    const messagesPayload = [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageRawBase64}`
            }
          }
        ]
      }
    ];

    await executeStream(
      {
        model: selectedModel,
        messages: messagesPayload
      },
      (chunk) => {
        setAnalysisResult(prev => prev + chunk);
      },
      (fullText) => {
        setIsLoading(false);
      },
      (errType, errMsg) => {
        setIsLoading(false);
        if (errType === 'ratelimit') {
          onRateLimit(60);
        } else {
          onErrorToast(errMsg);
        }
      }
    );
  };

  const extractHtmlFromResponse = (text: string): string => {
    let cleaned = text.trim();
    const match = cleaned.match(/```html([\s\S]*?)```/);
    if (match && match[1]) {
      return match[1].trim();
    }
    const match2 = cleaned.match(/```([\s\S]*?)```/);
    if (match2 && match2[1]) {
      return match2[1].trim();
    }
    return cleaned;
  };

  const handleCopyCode = () => {
    const code = visionMode === 'code' ? extractHtmlFromResponse(analysisResult) : analysisResult;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setImagePreview(null);
    setImageRawBase64(null);
    setAnalysisResult('');
  };

  // Compile full iframe document string dynamically
  const getSandboxIframeSrcDoc = (): string => {
    const codePart = extractHtmlFromResponse(analysisResult);
    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl" class="h-full">
        <head>
          <meta charset="UTF-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Cairo', sans-serif; background-color: #F8F9FA; padding: 1.25rem; margin: 0; }
          </style>
        </head>
        <body class="h-full antialiased">
          ${codePart || '<div class="h-full flex items-center justify-center text-slate-400 text-xs">شريط المعاينة فارغ، جاري التوليد...</div>'}
        </body>
      </html>
    `;
  };

  const renderMarkdown = (text: string) => {
    try {
      const globalMarked = (window as any).marked;
      if (globalMarked && typeof globalMarked.parse === 'function') {
        return { __html: globalMarked.parse(text) };
      }
    } catch (e) {}
    return { __html: text.replace(/\n/g, '<br />') };
  };

  return (
    <div className="space-y-6 animate-fade-in" id="vision-tab">
      
      {/* Control Navigation Header - Styled as Bento Card */}
      <div className="bento-card shadow-sm space-y-4" id="vision-nav-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-gold" />
            <span className="text-sm font-bold text-navy">نمط التحليل البصري الاسترجاعي:</span>
          </div>

          {/* Mode Selector Tab buttons */}
          <div className="flex items-center bg-[#F2EAE1]/50 rounded-xl p-1 gap-1 shrink-0">
            <button
              onClick={() => { setVisionMode('describe'); setAnalysisResult(''); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                visionMode === 'describe' ? 'bg-navy text-[#D4AF37] shadow-sm' : 'text-[#2D3748] hover:bg-white/50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              صف ورؤية
            </button>
            <button
              onClick={() => { setVisionMode('ocr'); setAnalysisResult(''); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                visionMode === 'ocr' ? 'bg-navy text-[#D4AF37] shadow-sm' : 'text-[#2D3748] hover:bg-white/50'
              }`}
            >
              <FileSearch className="w-3.5 h-3.5" />
              استخراج النصوص الذكي
            </button>
            <button
              onClick={() => { setVisionMode('code'); setAnalysisResult(''); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                visionMode === 'code' ? 'bg-navy text-[#D4AF37] shadow-sm' : 'text-[#2D3748] hover:bg-white/50'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              تصميم كود الواجهات
            </button>
          </div>

          {/* Model picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-navy">النموذج البصري:</span>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white border border-[#D4AF37]/25 rounded-xl pr-2.5 pl-8 py-1.5 text-xs text-navy font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37] appearance-none cursor-pointer"
              >
                <option value="claude-haiku-4.5">Claude Haiku 4.5 (سريع)</option>
                <option value="minimax-m3">Minimax M3 Unified (دقيق)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Drag Uploader Zone */}
        <div className="lg:col-span-2 space-y-4">
          {!imagePreview ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`py-16 px-4 border-2 border-dashed rounded-3xl text-center flex flex-col items-center justify-center space-y-4 cursor-pointer transition-all ${
                dragActive 
                  ? 'border-[#D4AF37] bg-gold/5 scale-[0.99]' 
                  : 'border-[#D4AF37]/30 bg-[#FDFBF7] hover:border-[#D4AF37]/65 hover:bg-[#F2EAE1]/30 hover:scale-[1.01] shadow-sm'
              }`}
              id="vision-drop-zone"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div className="p-4 bg-navy text-[#D4AF37] rounded-all shadow-lg ring-4 ring-[#D4AF37]/15">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-extrabold text-navy text-sm">اسحب النموذج أو المخطط هنا للصق الصورة</h4>
                <p className="text-xs text-slate-400 mt-1">نسق اللوحات أو صور الكاميرا الـ PNG والـ JPEG.</p>
              </div>
            </div>
          ) : (
            // Preview Image display
            <div className="bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl p-4 shadow-sm space-y-4 animate-slide-up">
              <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/20 max-h-[340px] flex items-center justify-center bg-[#FDFBF7]">
                <img 
                  src={imagePreview} 
                  alt="Vision Asset Preview" 
                  className="max-h-[340px] object-contain"
                  referrerPolicy="no-referrer"
                />
                
                <button
                  onClick={handleReset}
                  className="absolute bottom-3 left-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md cursor-pointer border border-red-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  حذف الصورة
                </button>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="w-full py-3.5 bg-navy hover:bg-[#1E3A8A] text-[#D4AF37] hover:text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 border border-[#D4AF37]/35"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 text-gold animate-spin" />
                    جاري المسح الفوري بالبصر...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-gold" />
                    تحليل الصورة بصرياً برمجياً
                  </>
                )}
              </button>
            </div>
          )}

          {/* Guidelines notes */}
          <div className="bg-[#FDFBF7] rounded-3xl p-5 border border-[#D4AF37]/25 text-xs text-slate-500 leading-relaxed space-y-3 shadow-sm">
            <h5 className="font-bold text-navy flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-[#B58921] shrink-0" />
              توضيح الميزات البصرية:
            </h5>
            <p>• <strong>وصف دقيق:</strong> يقوم بخرز أجزاء الرسوم لوصف مكوناتها الهيدروليكية والإدارية.</p>
            <p>• <strong>استخلاص OCR:</strong> معالجة آلية استخلاصية لعزل الأرقام وجدولتها بمرونة.</p>
            <p>• <strong>التصميم للأكواد:</strong> مبرمج يعيد تشكيل مخططات واجهات المواقع الورقية لتتحول إلى كتل تصميمية تفاعلية بـ Tailwind CSS.</p>
          </div>
        </div>

        {/* Right Output results screen */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl p-12 h-full flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
              <Loader className="w-10 h-10 text-[#B58921] animate-spin" />
              <div>
                <h4 className="font-bold text-navy">الماسح البصري الذكي يفحص اللوحة...</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">يقوم نموذج {selectedModel} حالياً بتحليل الكيانات والجداول والرموز المضمنة.</p>
              </div>
            </div>
          ) : analysisResult ? (
            <div className="space-y-4 animate-slide-up">
              
              {/* Header result actions */}
              <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-emerald-800">اكتمل الفحص وتم بث النتائج بنجاح!</span>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 bg-navy hover:bg-navy-light text-gold hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-[#D4AF37]/35"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      تم النسخ
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      نسخ مخرجات التقرير
                    </>
                  )}
                </button>
              </div>

              {/* Result Pane or Sandbox Sandbox if Code mode selected */}
              {visionMode === 'code' ? (
                <div className="bg-white border border-[#D4AF37]/25 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[520px]">
                  {/* Selector sandbox tabs */}
                  <div className="flex bg-[#F2EAE1]/30 border-b border-[#D4AF37]/20 p-2 gap-1.5 shrink-0">
                    <button
                      onClick={() => setPreviewTab('preview')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        previewTab === 'preview' ? 'bg-navy text-[#D4AF37] shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <MonitorPlay className="w-3.5 h-3.5" />
                      معاينة تفاعلية (Interactive Live UI)
                    </button>
                    <button
                      onClick={() => setPreviewTab('code')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        previewTab === 'code' ? 'bg-navy text-[#D4AF37] shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      كود المصدر (HTML Source)
                    </button>
                  </div>

                  {/* Body sandbox content */}
                  <div className="flex-1 overflow-auto bg-[#F8F9FA]">
                    {previewTab === 'preview' ? (
                      <iframe
                        title="Vision UI Sandboxed Sandbox"
                        srcDoc={getSandboxIframeSrcDoc()}
                        className="w-full h-full border-none"
                        sandbox="allow-scripts"
                      />
                    ) : (
                      <pre className="p-5 font-mono text-xs text-slate-700 bg-slate-950 text-emerald-400 leading-relaxed max-h-full overflow-auto text-left" dir="ltr">
                        {extractHtmlFromResponse(analysisResult)}
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                // Standard text or markdown markdown renderer
                <div className="bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl p-6 shadow-sm overflow-y-auto max-h-[520px]" id="vision-text-output">
                  <div 
                    className="prose-rtl text-sm leading-relaxed"
                    dangerouslySetInnerHTML={renderMarkdown(analysisResult)}
                  />
                </div>
              )}

            </div>
          ) : (
            // Output waiting view
            <div className="bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl p-12 h-[340px] flex flex-col items-center justify-center text-center text-slate-400 space-y-3 shadow-sm">
              <HelpCircle className="w-12 h-12 text-[#D4AF37] animate-pulse" />
              <div>
                <h4 className="font-bold text-navy text-base">بانتظار تلقي الصورة لبدء الفحص</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  قم بإرفاق لوحة التصميم، سكتش مرسوم باليد، أو لقطة شاشة لتقرير مالي، ثم اضغط على زر التحليل البصري من العمود الجانبي الأيمن.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
