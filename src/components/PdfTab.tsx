/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText, FileWarning, HelpCircle, Loader, RefreshCw, Send, Check, Copy } from 'lucide-react';
import { PDFDocumentState, ChatMessage } from '../types';
import { executeStream } from '../lib/api';

interface PdfTabProps {
  onErrorToast: (message: string, duration?: number) => void;
  onRateLimit: (seconds: number) => void;
}

export const PdfTab: React.FC<PdfTabProps> = ({ onErrorToast, onRateLimit }) => {
  const [dragActive, setDragActive] = useState(false);
  const [docState, setDocState] = useState<PDFDocumentState | null>(null);
  const [extractionProgress, setExtractionProgress] = useState({ current: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [liveAnswer, setLiveAnswer] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      onErrorToast("يرجى اختيار ملف مستند PDF صالح فقط.");
      return;
    }

    setIsLoading(true);
    setChatHistory([]);
    setLiveAnswer('');
    setDocState(null);
    setExtractionProgress({ current: 0, total: 0 });

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) {
            onErrorToast("تتعذر تهيئة مكتبة معالجة ملفات PDF، تأكد من الاتصال بالإنترنت.");
            setIsLoading(false);
            return;
          }

          // Pre-assign correctly
          pdfjsLib.GlobalWorkerOptions.workerSrc = (window as any).pdfjsWorkerSrc;

          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
          const pdfDoc = await loadingTask.promise;
          const totalPages = pdfDoc.numPages;
          setExtractionProgress({ current: 0, total: totalPages });

          let fullTextContent = "";
          const pageDataArr = [];

          for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContextObj = await page.getTextContent();
            const pageTxt = textContextObj.items.map((item: any) => item.str).join(" ");
            
            fullTextContent += `\n--- [ الصفحة رقم ${i} ] ---\n${pageTxt}\n`;
            pageDataArr.push({
              pageNumber: i,
              text: pageTxt
            });
            setExtractionProgress({ current: i, total: totalPages });
          }

          setDocState({
            name: file.name,
            size: formatBytes(file.size),
            totalPages: totalPages,
            extractedText: fullTextContent,
            pages: pageDataArr
          });
          setIsLoading(false);
        } catch (err: any) {
          onErrorToast(`فشل استخلاص نصوص ملف الـ PDF: ${err.message || err}`);
          setIsLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      onErrorToast(`فشل قراءة الملف المدخل: ${err.message || err}`);
      setIsLoading(false);
    }
  };

  const dispatchPresetQuery = async (presetType: 'summarize' | 'metrics' | 'gaps') => {
    if (!docState || isAnswering) return;

    let targetPrompt = "";
    let systemInstruction = "";

    if (presetType === 'summarize') {
      systemInstruction = "تلخيص شامل للمستند";
      targetPrompt = `بصفتك محلل تقارير رائد، يرجى تقديم مراجعة وتلخيص شامل ومنظم باللغة العربية للورقة أو التقرير التالي. قم بكتابة هيكل واضح يتضمن:\n1. نظرة عامة ملخصة للموضوع الأساسي\n2. الأقسام الفرعية وأبرز أطروحاتها\n3. التوصيات النهائية والمستنتجات الأساسية.\n\nالمستند النصي المرفق:\n\n${docState.extractedText}`;
    } else if (presetType === 'metrics') {
      systemInstruction = "استخراج القرارات التنفيذية والأرقام الحيوية";
      targetPrompt = `صَفِّ لي واستخرج من التقرير أدناه كافة القرارات التنفيذية الإدارية، التواريخ الحيوية، الأرقام والإحصائيات المهمة، والمؤشرات، وجدولتها في نقاط واضحة ومقروءة بالكامل باللغة العربية.\n\nالمستند النصي المرفق:\n\n${docState.extractedText}`;
    } else {
      systemInstruction = "تحليل الثغرات والمخاطر";
      targetPrompt = `بناءً على التقرير الملحق، قم بإجراء تدقيق نقدي وتحليل ثغرات (Gap Analysis) للمخاطر المحتملة، ونقاط الضعف المذكورة، والفرص الضائعة، مع تفصيل طرق ملء هذه الثغرات وتلافي المخاطر في هيئة نقاط استشارية مكثفة باللغة العربية.\n\nالمستند النصي المرفق:\n\n${docState.extractedText}`;
    }

    // Add user question placeholder to chat
    const userMsg: ChatMessage = {
      id: `p-${Date.now()}-preset`,
      role: 'user',
      content: `${systemInstruction} (استعلام فوري مسبق)`,
      timestamp: new Date()
    };

    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setIsAnswering(true);
    setLiveAnswer('');

    await executeStream(
      {
        model: 'qwen3.7-max-naraya', // Leverage the massive 1 Million Token window
        messages: [
          { role: 'system', content: 'أنت مستشار قراءة عميقة متمرس في تحليل المستندات وتحرير مقتطفات البيانات الفائقة.' },
          { role: 'user', content: targetPrompt }
        ]
      },
      (chunk) => {
        setLiveAnswer(prev => prev + chunk);
      },
      (fullText) => {
        const assistantMsg: ChatMessage = {
          id: `p-${Date.now()}-answer`,
          role: 'assistant',
          content: fullText,
          timestamp: new Date(),
          modelUsed: 'qwen3.7-max-naraya'
        };
        setChatHistory([...newHistory, assistantMsg]);
        setLiveAnswer('');
        setIsAnswering(false);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      (errType, errMsg) => {
        setIsAnswering(false);
        setLiveAnswer('');
        if (errType === 'ratelimit') {
          onRateLimit(60);
        } else {
          onErrorToast(errMsg);
        }
      }
    );
  };

  const submitCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = inputQuestion.trim();
    if (!question || isAnswering || !docState) return;

    const userMsg: ChatMessage = {
      id: `p-${Date.now()}-u`,
      role: 'user',
      content: question,
      timestamp: new Date()
    };

    const updatedMsgs = [...chatHistory, userMsg];
    setChatHistory(updatedMsgs);
    setInputQuestion('');
    setIsAnswering(true);
    setLiveAnswer('');

    // System prompt enclosing the full document content
    const systemPromptText = `أنت مساعد ذكي ومحلل مستندات عميق. المستند التالي قمنا باستخلاصه بشكل كامل وهو يقع ضمن نافذة استيعاب الـ 1 مليون كلمة الخاصة بنموذجك. يرجى مراجعة محتوياته والإجابة على سؤال العميل بدقة وتنسيق ممتاز باللغة العربية.\n\n--- بداية نص المستند المستخلص ---\n${docState.extractedText}\n--- نهاية نص المستند المستخلص ---`;

    const formattedMessages = [
      { role: 'system', content: systemPromptText },
      // To manage context size gracefully in standard API requests, we can send only the last few question-answers
      ...updatedMsgs.slice(-6).map(m => ({ role: m.role, content: m.content }))
    ];

    await executeStream(
      {
        model: 'qwen3.7-max-naraya',
        messages: formattedMessages
      },
      (chunk) => {
        setLiveAnswer(prev => prev + chunk);
      },
      (fullText) => {
        const assistantMsg: ChatMessage = {
          id: `p-${Date.now()}-a`,
          role: 'assistant',
          content: fullText,
          timestamp: new Date(),
          modelUsed: 'qwen3.7-max-naraya'
        };
        setChatHistory([...updatedMsgs, assistantMsg]);
        setLiveAnswer('');
        setIsAnswering(false);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      (errType, errMsg) => {
        setIsAnswering(false);
        setLiveAnswer('');
        if (errType === 'ratelimit') {
          onRateLimit(60);
        } else {
          onErrorToast(errMsg);
        }
      }
    );
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearDocument = () => {
    if (window.confirm('هل ترغب بإيقاف محلل المستند وتفريغ الملف المرفق؟')) {
      setDocState(null);
      setChatHistory([]);
      setLiveAnswer('');
    }
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
    <div className="space-y-6 animate-fade-in" id="pdf-analyzer-tab">
      {/* Upload Screen or Selected File Screen */}
      {!docState ? (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`w-full py-16 px-6 border-2 border-dashed rounded-3xl transition-all duration-300 flex flex-col items-center justify-center text-center space-y-4 cursor-pointer ${
            dragActive 
              ? 'border-[#D4AF37] bg-gold/5 scale-[0.99]' 
              : 'border-[#D4AF37]/35 bg-[#FDFBF7] hover:border-[#D4AF37]/70 hover:bg-[#F2EAE1]/30 shadow-sm'
          }`}
          onClick={() => fileInputRef.current?.click()}
          id="pdf-drop-zone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
          />

          {isLoading ? (
            <div className="space-y-4 flex flex-col items-center justify-center" id="pdf-loading-view">
              <Loader className="w-12 h-12 text-[#B58921] animate-spin" />
              <div>
                <h3 className="text-lg font-black text-navy">جاري استخلاص وقراءة صفحات ملف الـ PDF...</h3>
                <p className="text-xs text-slate-500 mt-2">
                  تمت قراءة الصفحة رقم <span className="font-mono text-gold font-bold text-base">{extractionProgress.current}</span> من أصل <span className="font-mono text-navy font-bold text-base">{extractionProgress.total || '?'}</span> بسلام...
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-5 bg-navy text-[#D4AF37] rounded-2xl shadow-lg ring-4 ring-[#D4AF37]/15">
                <Upload className="w-8 h-8 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-navy">اسحب وأفلت مستند PDF هنا أو اضغط للاستعراض</h3>
                <p className="text-xs text-slate-400">يدعم القراءة المحلية داخل المتصفح بالكامل للمستندات متعددة الصفحات.</p>
              </div>
              <div className="max-w-md bg-gold/5 text-gold-hover border border-gold/15 px-4 py-3 rounded-2xl text-[11px] leading-relaxed flex items-center gap-2">
                <FileText className="w-4 h-4 shrink-0 text-[#B58921]" />
                <span>يتم التوجيه حصراً لمعالج <strong>qwen3.7-max-naraya</strong> الذي يتفوق بنافذة سياق عملاقة تلتهم <strong>1,000,000 كلمة</strong> للـ RAG الحقيقي والذكي.</span>
              </div>
            </>
          )}
        </div>
      ) : (
        // File Selected: Workspace view
        <div className="space-y-6" id="pdf-loaded-workspace">
          {/* File Card info with quick removal - Styled as Bento Card */}
          <div className="bento-card p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3.5 bg-navy text-gold rounded-2xl border border-[#D4AF37]/25 shadow-sm">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-navy text-base">{docState.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                  <span>الحجم اللوكال: <strong className="font-mono text-charcoal">{docState.size}</strong></span>
                  <span className="text-slate-200">|</span>
                  <span>عدد الصفحات: <strong className="font-mono text-charcoal">{docState.totalPages} صفحة</strong></span>
                </p>
              </div>
            </div>
            
            <button
              onClick={handleClearDocument}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-100 transition-colors cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تغيير الملف المرفق
            </button>
          </div>

          {/* Quick Preset Prompts */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-navy tracking-tight">إجراءات التحليل السريعة الفورية المستهدفة:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                disabled={isAnswering}
                onClick={() => dispatchPresetQuery('summarize')}
                className="p-5 bg-[#FDFBF7] hover:bg-[#F5EBE0]/60 border border-[#D4AF37]/25 rounded-3xl text-right transition-all group cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <div className="font-bold text-navy text-sm mb-1 group-hover:text-gold-hover transition-colors flex items-center gap-1.5">
                  <span className="text-[#D4AF37]">📄</span>
                  <span>تلخيص المستند كاملاً</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">توليد ملخص مقتضب يعرض الفكرة العامة والأقسام الجوهرية للتقرير.</p>
              </button>

              <button
                disabled={isAnswering}
                onClick={() => dispatchPresetQuery('metrics')}
                className="p-5 bg-[#FDFBF7] hover:bg-[#F5EBE0]/60 border border-[#D4AF37]/25 rounded-3xl text-right transition-all group cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <div className="font-bold text-navy text-sm mb-1 group-hover:text-gold-hover transition-colors flex items-center gap-1.5">
                  <span className="text-[#D4AF37]">📊</span>
                  <span>استخراج التوصيات والأرقام</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">تحليل التقرير لاستنباط الأرقام الحيوية والنسب والتواريخ المذكورة بصفحاته.</p>
              </button>

              <button
                disabled={isAnswering}
                onClick={() => dispatchPresetQuery('gaps')}
                className="p-5 bg-[#FDFBF7] hover:bg-[#F5EBE0]/60 border border-[#D4AF37]/25 rounded-3xl text-right transition-all group cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <div className="font-bold text-navy text-sm mb-1 group-hover:text-gold-hover transition-colors flex items-center gap-1.5">
                  <span className="text-[#D4AF37]">🛡️</span>
                  <span>دراسة الثغرات والمخاطر</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">تقييم نقدي للفرص، الثقوب التشغيلية، وصيغ معالجتها استشارياً.</p>
              </button>
            </div>
          </div>

          {/* Chat Workspace Sandbox */}
          <div className="bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl shadow-sm flex flex-col h-[500px] overflow-hidden">
            {/* Thread Header */}
            <div className="px-5 py-4 border-b border-[#D4AF37]/20 bg-[#F5EBE0]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-navy">قناة الدردشة الاستقصائية المغلقة (Qwen 3.7 Max 1M)</span>
              </div>
              <span className="text-[10px] text-slate-500">يحتفظ بكامل سياق الأوراق تلقائياً</span>
            </div>

            {/* Conversation list with auto scrolling */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5" id="pdf-chat-messages">
              {chatHistory.length === 0 && !liveAnswer && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                  <HelpCircle className="w-10 h-10 text-gold mb-3" />
                  <p className="text-sm font-bold text-navy">لم تبدأ محادثة المستند بعد!</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                    اختر أحد الإجراءات السريعة بالأعلى لتوليد مقتبسات بلمسة واحدة، أو تفضل بطرح سؤالك الخاص بالأسفل للبحث بالاستقدام المباشر.
                  </p>
                </div>
              )}

              {/* Chat blocks */}
              {chatHistory.map((m) => (
                <div key={m.id} className={`flex gap-3 max-w-3xl ${m.role === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}>
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold shadow-sm ${
                    m.role === 'user' ? 'bg-[#D4AF37] text-navy' : 'bg-navy text-gold'
                  }`}>
                    {m.role === 'user' ? 'أنت' : 'ذكاء'}
                  </div>
                  <div className="space-y-1">
                    <div className={`p-4 rounded-2xl shadow-sm text-[13px] leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-navy text-white rounded-tr-none' 
                        : 'bg-[#FDFBF7] border border-[#D4AF37]/20 text-charcoal rounded-tl-none'
                    }`}>
                      {m.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      ) : (
                        <div 
                          className="prose-rtl text-[13px] leading-relaxed"
                          dangerouslySetInnerHTML={renderMarkdown(m.content)}
                        />
                      )}
                    </div>
                    {/* Copy and helper */}
                    <div className={`flex items-center gap-2 text-[9px] text-slate-400 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <span>بواسطة: {m.modelUsed || 'Qwen 3.7 Max'}</span>
                      <span>•</span>
                      <button
                        onClick={() => handleCopyText(m.content, m.id)}
                        className="hover:text-gold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-500" />
                            <span className="text-emerald-600 font-bold">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Live Answer Streaming */}
              {liveAnswer && (
                <div className="flex gap-3 max-w-3xl ml-auto">
                  <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] bg-navy text-gold shadow-sm animate-pulse">
                    <Loader className="w-3.5 h-3.5 text-gold animate-spin" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="p-4 bg-[#FDFBF7] border border-[#D4AF37]/20 text-charcoal rounded-2xl rounded-tl-none shadow-sm relative">
                      <div 
                        className="prose-rtl text-[13px] leading-relaxed"
                        dangerouslySetInnerHTML={renderMarkdown(liveAnswer)}
                      />
                      <span className="inline-block w-1 h-3.5 bg-gold animate-pulse ml-0.5" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Input Composer Box */}
            <form onSubmit={submitCustomQuestion} className="p-4 border-t border-[#D4AF37]/20 bg-[#F5EBE0]/20 flex items-center gap-2">
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder={isAnswering ? "جاري انتظار رد المستشار الذكي..." : "اسأل أي سؤال بخصوص محتوى ملف الـ PDF..."}
                disabled={isAnswering}
                className="flex-1 bg-white border border-[#D4AF37]/25 rounded-xl px-4 py-3 placeholder-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-transparent text-navy disabled:bg-slate-50"
              />
              <button
                type="submit"
                disabled={isAnswering || !inputQuestion.trim()}
                className="p-3 bg-navy hover:bg-[#1E3A8A] text-[#D4AF37] hover:text-white rounded-xl transition-all shadow-md disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer border border-[#D4AF37]/35"
              >
                <Send className="w-4.5 h-4.5 transform rotate-180" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
