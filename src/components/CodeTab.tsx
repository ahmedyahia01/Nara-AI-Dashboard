/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Code2, Zap, ShieldCheck, Languages, Sparkles, Loader, Copy, Check, Info, Trash2 } from 'lucide-react';
import { executeStream } from '../lib/api';
import { CodeRefactorPreset } from '../types';

const PRESENTS: CodeRefactorPreset[] = [
  {
    id: 'optimise',
    name: 'تحسين كفاءة التشغيل وبطء المعالجة',
    prompt: 'أنت مهندس خبير لتحسين جودة الكود والأداء (Performance Profiling Expert). قم بتحليل الكود المفرغ بالأسفل واستكشاف اختناقات المعالجة، والعمليات الحسابية المكررة، وحلقات الدوران بطيئة الأمد، وإعادة كتابته بأعلى كفاءة زمنية ومساحية (Big O Optimization). ضع شروحاً تفصيلية باللغة العربية بجانب الكود المحدث لحجم التوفير.',
    inputPlaceholder: '// الصق هنا الكود البطيء أو الدالات التي ترغب بتحسين كفاءتها...'
  },
  {
    id: 'security',
    name: 'تدقيق الثغرات الأمنية ومعايير الحماية',
    prompt: 'أنت مدقق أمني برمجيات خبير (Cybersecurity Auditor). افحص كود المصدر الملحق بالأسفل لتحديد الثغرات مثل SQL Injection, XSS, Buffer Overflows, Hardcoded Keys, CORS Issues, or Prototype Pollutions. أعد صياغة الكود بإحكام لحمايته من أي استقصاءات أمنية غازية، مع سرد جدول بالثغرات المكتشفة باللغة العربية.',
    inputPlaceholder: '// الصق هنا الملف البرمجي أو كود العبور المطلوب تأمينه وفحص ثغراته...'
  },
  {
    id: 'trans',
    name: 'ترجمة الكود للغة برمجية بديلة',
    prompt: 'أنت خبير فك شفرات اللغات وحوسبتها وتكاملها. قم بتحويل الكود البرمجي التالي من لغته الحالية بأمانية تامة إلى لغة برمجة أخرى بديلة (مثال: من بايثون إلى جافاسكريبت / تي اس، أو من سي شارب إلى كوتلن) مع المحافظة على معايير تشغيل المخرجات والمكتبات والتعليقات التوضيحية.',
    inputPlaceholder: 'قم بنسخ شفرة المصدر ولصقها هنا، واكتب في أول سطر تعليقاً يوضح اللغة البرمجية المستهدفة (مثال: تفضل بتحويل الكود إلى Python)...'
  },
  {
    id: 'refactor',
    name: 'إعادة الهيكلة وتنسيق البناء الهيكلي',
    prompt: 'أنت مهندس تنسيق كود خبير (Professional Refactoring Engine). قم بإعادة ترتيب وتنسيق الكود المذكور بالأسفل وجعله يتبع مبادئ الكود النظيف (Clean Code, SOLID Principles, DRY pattern, DRY principles). تخلص من الفحوصات الطويلة المقعدية، ووحد صياغة المتغيرات، ونوع التوثيقات مع كتابة شرح مختصر عربي لما تم تصنيفه.',
    inputPlaceholder: '// الصق الكود غير المرتب أو المركّب لمسحه وإعادة تنسيق بنائه الهيكلي...'
  }
];

interface CodeTabProps {
  onErrorToast: (message: string, duration?: number) => void;
  onRateLimit: (seconds: number) => void;
}

export const CodeTab: React.FC<CodeTabProps> = ({ onErrorToast, onRateLimit }) => {
  const [activePreset, setActivePreset] = useState<'optimise' | 'security' | 'trans' | 'refactor'>('optimise');
  const [inputCode, setInputCode] = useState('');
  const [targetLangInput, setTargetLangInput] = useState('TypeScript');
  const [isLoading, setIsLoading] = useState(false);
  const [optimizedCode, setOptimizedCode] = useState('');
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const activePresetConfig = PRESENTS.find(p => p.id === activePreset) || PRESENTS[0];

  const handleRefactor = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawContent = inputCode.trim();
    if (!rawContent || isLoading) return;

    setIsLoading(true);
    setOptimizedCode('');

    let requestPrompt = activePresetConfig.prompt;
    if (activePreset === 'trans') {
      requestPrompt = `${activePresetConfig.prompt} لغة البرمجة المستهدفة لتحويل الكود إليها هي: (${targetLangInput}).`;
    }

    const payloadMessages = [
      { role: 'system', content: 'أنت مهندس فني خارق من شركة نارا لتعديل الأكواد البرمجية (Claude 4.5 Engine). أنت مبرمج ممتاز، تكتب أكواداً ذكية فائقة الجودة منسقة بأقصى درجات المهنية والصواب مع إقصاء تام للأخطاء النحوية للغات.' },
      { role: 'user', content: `${requestPrompt}\n\nكود المصدر البرمجي المدخل ومحتواه:\n\n\`\`\`\n${rawContent}\n\`\`\`` }
    ];

    let accumulatedText = '';
    let lastUpdateTime = 0;
    let throttleTimeout: any = null;

    const updateState = (force = false) => {
      const now = Date.now();
      if (force || now - lastUpdateTime >= 60) {
        setOptimizedCode(accumulatedText);
        lastUpdateTime = now;
        if (throttleTimeout) {
          clearTimeout(throttleTimeout);
          throttleTimeout = null;
        }
      } else {
        if (!throttleTimeout) {
          throttleTimeout = setTimeout(() => {
            setOptimizedCode(accumulatedText);
            lastUpdateTime = Date.now();
            throttleTimeout = null;
          }, 60 - (now - lastUpdateTime));
        }
      }
    };

    await executeStream(
      {
        model: 'claude-sonnet-4.5', // Ideal model for code manipulation and technical logical transformations
        messages: payloadMessages
      },
      (chunk) => {
        accumulatedText += chunk;
        updateState();
      },
      (fullText) => {
        if (throttleTimeout) {
          clearTimeout(throttleTimeout);
        }
        setIsLoading(false);
      },
      (errType, errMsg) => {
        setIsLoading(false);
        setOptimizedCode(`⚠️ **حدث خطأ أثناء الاتصال بالخادم وتحسين الشفرة البرمجية:**\n\n${errMsg}`);
        if (errType === 'ratelimit') {
          onRateLimit(60);
        } else {
          onErrorToast(errMsg);
        }
      }
    );
  };

  const handleCopyInput = () => {
    navigator.clipboard.writeText(inputCode);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(optimizedCode);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const handleClear = () => {
    setInputCode('');
    setOptimizedCode('');
  };

  const renderMarkdown = (text: string) => {
    try {
      const globalMarked = (window as any).marked;
      if (globalMarked && typeof globalMarked.parse === 'function') {
        const renderer = new globalMarked.Renderer();
        renderer.code = (codeText: string, infoString: string) => {
          const lang = (infoString || 'code').trim().toLowerCase();
          const cleanCode = typeof codeText === 'object' ? (codeText as any).text : codeText;
          const escapedCode = encodeURIComponent(cleanCode);
          
          let highlighted = '';
          const prism = (window as any).Prism;
          if (prism && prism.languages[lang]) {
            try {
              highlighted = prism.highlight(cleanCode, prism.languages[lang], lang);
            } catch (e) {
              highlighted = '';
            }
          }
          
          if (!highlighted) {
            highlighted = globalMarked.escape 
              ? globalMarked.escape(cleanCode) 
              : cleanCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          }

          return `
<div class="code-block-wrapper my-4 rounded-2xl overflow-hidden border border-[#D4AF37]/20 bg-[#0A111E] text-right font-mono shadow-md" dir="ltr">
  <div class="code-block-header flex items-center justify-between bg-[#111928] px-4 py-2 border-b border-[#D4AF37]/15 select-none" dir="rtl">
    <span class="text-[10px] font-black text-[#D4AF37] font-sans tracking-wider uppercase">${lang}</span>
    <button onclick="window.naraCopyText('${escapedCode}', this)" class="text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer bg-white/5 px-2.5 py-1 rounded-lg border border-[#D4AF37]/10 font-sans">
      <span>نسخ الكود</span>
    </button>
  </div>
  <pre class="p-4 m-0 overflow-x-auto text-[12px] leading-relaxed text-[#E2E8F0] bg-transparent text-left font-mono"><code class="language-${lang}">${highlighted}</code></pre>
</div>`;
        };
        return { __html: globalMarked.parse(text, { renderer }) };
      }
    } catch (e) {
      console.error(e);
    }
    return { __html: text.replace(/\n/g, '<br />') };
  };

  return (
    <div className="space-y-6 animate-fade-in" id="code-review-tab">
      
      {/* Tab Header Selector - Styled as Bento Card */}
      <div className="bento-card flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm" id="code-nav-header">
        <div className="flex items-center gap-2 shrink-0">
          <Code2 className="w-5 h-5 text-gold" />
          <span className="text-sm font-bold text-navy">نمط التحسين الفني المطلوب:</span>
        </div>

        {/* Preset selections */}
        <div className="flex items-center bg-[#F2EAE1]/50 rounded-xl p-1 gap-1 shrink-0 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => { setActivePreset('optimise'); setOptimizedCode(''); }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activePreset === 'optimise' ? 'bg-navy text-[#D4AF37] shadow-sm' : 'text-[#2D3748] hover:bg-white/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            كفاءة الأداء
          </button>
          
          <button
            type="button"
            onClick={() => { setActivePreset('security'); setOptimizedCode(''); }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activePreset === 'security' ? 'bg-navy text-[#D4AF37] shadow-sm' : 'text-[#2D3748] hover:bg-white/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            التدقيق الأمني
          </button>

          <button
            type="button"
            onClick={() => { setActivePreset('trans'); setOptimizedCode(''); }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activePreset === 'trans' ? 'bg-navy text-[#D4AF37] shadow-sm' : 'text-[#2D3748] hover:bg-white/50'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            ترجمة الكود
          </button>

          <button
            type="button"
            onClick={() => { setActivePreset('refactor'); setOptimizedCode(''); }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activePreset === 'refactor' ? 'bg-navy text-[#D4AF37] shadow-sm' : 'text-[#2D3748] hover:bg-white/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            إعادة الهيكلة
          </button>
        </div>

        {/* Special target translation language option */}
        {activePreset === 'trans' && (
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="text-xs font-bold text-navy text-right">لغة التصدير المستهدفة:</span>
            <input
              type="text"
              value={targetLangInput}
              onChange={(e) => setTargetLangInput(e.target.value)}
              placeholder="مثال: Python, Dart..."
              className="bg-white border border-[#D4AF37]/35 rounded-xl px-2.5 py-1 text-xs text-navy font-bold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
        )}
      </div>

      {/* Dual Split Workspace layout */}
      <form onSubmit={handleRefactor} className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="code-review-split-workspace">
        
        {/* Input Pane - Original Code - Bento Card */}
        <div className="bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col h-[560px]">
          <div className="flex justify-between items-center shrink-0">
            <h4 className="font-extrabold text-navy text-sm flex items-center gap-1.5">
              <span>🖥️ الكود الأصلي والمحتوى المراد معالجته</span>
            </h4>
            <div className="flex items-center gap-2">
              {inputCode && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyInput}
                    className="p-1.5 text-slate-500 hover:text-navy transition-colors cursor-pointer"
                    title="نسخ الكود المدخل"
                  >
                    {copiedInput ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                    title="مسح الكود وتفريغه"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <textarea
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder={activePresetConfig.inputPlaceholder}
            className="flex-1 w-full p-4 font-mono text-xs rounded-2xl border border-[#D4AF37]/20 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-transparent text-navy resize-none bg-white"
            dir="ltr"
            disabled={isLoading}
            required
          />

          <button
            type="submit"
            disabled={isLoading || !inputCode.trim()}
            className="w-full py-3 bg-navy hover:bg-[#1E3A8A] text-[#D4AF37] hover:text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 border border-[#D4AF37]/35"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 text-gold animate-spin" />
                جاري مراجعة وإعادة صياغة الكود...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-gold" />
                إطلاق عملية التحسين الذكي
              </>
            )}
          </button>
        </div>

        {/* Output Pane - Optimized Code - Bento Card */}
        <div className="bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col h-[560px]">
          <div className="flex justify-between items-center shrink-0">
            <h4 className="font-extrabold text-navy text-sm flex items-center gap-1.5">
              <span>🚀 النتيجة المحدّثة والتقرير الاستشاري (Claude 4.6)</span>
            </h4>
            {optimizedCode && (
              <button
                type="button"
                onClick={handleCopyOutput}
                className="p-1.5 text-slate-500 hover:text-navy cursor-pointer"
                title="نسخ التحليل البرمجي المخرجي"
              >
                {copiedOutput ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>

          {isLoading && !optimizedCode ? (
            <div className="flex-1 rounded-2xl border border-dashed border-[#D4AF37]/25 flex flex-col items-center justify-center text-center p-8 space-y-3 bg-[#FDFBF7]">
              <Loader className="w-8 h-8 text-[#B58921] animate-spin" />
              <div>
                <h5 className="font-bold text-navy text-sm">يقوم Claude Sonnet 4.6 بالتفكير المتعمق...</h5>
                <p className="text-[11px] text-slate-400 mt-1">يجري فحص شامل لبنى البيانات وبطء المعالجة وحالات الامتثال.</p>
              </div>
            </div>
          ) : optimizedCode ? (
            <div className="flex-1 overflow-y-auto bg-white rounded-2xl p-4 border border-[#D4AF37]/20" id="code-output-pane">
              <div 
                className="prose-rtl text-sm leading-relaxed"
                dangerouslySetInnerHTML={renderMarkdown(optimizedCode)}
              />
            </div>
          ) : (
            // Idle empty state
            <div className="flex-1 rounded-2xl border border-dashed border-[#D4AF37]/25 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3 bg-[#FDFBF7]">
              <Info className="w-8 h-8 text-[#D4AF37]" />
              <div>
                <h5 className="font-bold text-navy text-sm">لم تبدأ عملية التحسين حتى اللحظة</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto mt-1">
                  أدخل الشفرة المصدرية على اليمين، واختر النمط المناسب بالأعلى، ثم أطلق محركات إعادة الهيكلة الرقمية لمخرجات فورية.
                </p>
              </div>
            </div>
          )}
        </div>

      </form>
    </div>
  );
};
