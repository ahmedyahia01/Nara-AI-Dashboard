/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  Table, 
  Plus, 
  Trash2, 
  Sparkles, 
  Loader, 
  Copy, 
  Check, 
  FileText, 
  AlertCircle, 
  RefreshCw,
  Info
} from 'lucide-react';
import { executeStream } from '../lib/api';

interface ResearchStudy {
  id: string;
  title: string;
  author: string;
  text: string;
}

interface LiteratureTabProps {
  onErrorToast: (message: string, duration?: number) => void;
  onRateLimit: (seconds: number) => void;
}

const PRESET_STUDIES: ResearchStudy[] = [
  {
    id: 'study-1',
    title: 'أثر توظيف نماذج اللغة الضخمة (LLMs) في تحسين جودة الترجمة الآلية للغة العربية الفصحى',
    author: 'العتيبي والقرني (2025)',
    text: 'هدفت الدراسة إلى قياس مدى فعالية دمج نماذج التفكير والاستدلال الحديثة مثل دييب سيك وكلود في أنظمة الترجمة الفورية لمصطلحات الضمان الاجتماعي والقانون. تم استخدام منهج تجريبي عبر تغذية النماذج بـ 50,000 وثيقة مترجمة سابقاً لمقارنة مقياس BLEU Score. أظهرت النتائج ارتفاع الدقة بنسبة 23% مقارنة بالترجمة الآلية التقليدية (NMT). ومع ذلك، لاحظ الباحثون ضعف استنباط النماذج للمصطلحات التراثية والبيئية المحلية لغيابها عن سياق التدريب المسبق.'
  },
  {
    id: 'study-2',
    title: 'تطبيق بنية الخدمات المصغرة (Microservices) لتأمين استقرار المنصات الحكومية تحت الضغط العالي',
    author: 'الرشيد ومحمود (2024)',
    text: 'بحثت الدراسة في جدوى تفكيك الأنظمة المركزية (Monolithic) في المنصات الخدمية الخدمية لوزارة التحول الرقمي. طبق الباحثون دراسة حالة ميدانية من خلال هندسة بوابة خدمات المراجعين باستخدام Kubernetes و Docker مع عزل قواعد البيانات. أثبتت التجربة نجاح البنية الجديدة في الحفاظ على استجابة الموقع بنسبة 99.99% خلال فترات الذروة وتقليص زمن الاستجابة إلى 120ms. لكن تظل التحديات متمثلة في صعوبة تتبع الأخطاء الموزعة عبر الخدمات (Distributed Tracing) وارتفاع تكلفة التجهيزات السحابية الأولية.'
  }
];

export const LiteratureTab: React.FC<LiteratureTabProps> = ({ onErrorToast, onRateLimit }) => {
  const [studies, setStudies] = useState<ResearchStudy[]>(PRESET_STUDIES);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4.5');
  const [isLoading, setIsLoading] = useState(false);
  const [matrixResult, setMatrixResult] = useState('');
  const [copied, setCopied] = useState(false);

  // Add study card
  const handleAddStudy = () => {
    const newId = `study-${Date.now()}`;
    setStudies([
      ...studies,
      {
        id: newId,
        title: `دراسة بحثية جديدة #${studies.length + 1}`,
        author: 'الباحث والسنة (مثلاً: اليافعي، 2026)',
        text: ''
      }
    ]);
  };

  // Update study fields
  const handleUpdateStudy = (id: string, field: keyof ResearchStudy, value: string) => {
    setStudies(studies.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Remove study card
  const handleRemoveStudy = (id: string) => {
    if (studies.length <= 1) {
      onErrorToast('يجب أن تحتفظ بدراسة واحدة على الأقل لعمل مصفوفة المقارنة.');
      return;
    }
    setStudies(studies.filter(s => s.id !== id));
  };

  // Reset to presets
  const handleResetPresets = () => {
    if (window.confirm('هل ترغب حقاً في استعادة الدراسات النموذجية الافتراضية وحذف تعديلاتك؟')) {
      setStudies(PRESET_STUDIES);
      setMatrixResult('');
    }
  };

  // Copy results
  const handleCopyResult = () => {
    if (!matrixResult) return;
    navigator.clipboard.writeText(matrixResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Run Literature Matrix Stream
  const handleGenerateMatrix = async () => {
    // Basic verification
    const invalidStudy = studies.find(s => !s.title.trim() || !s.text.trim());
    if (invalidStudy) {
      onErrorToast('يرجى ملء جميع عناوين ونصوص الدراسات المضافة للتمكن من البدء.');
      return;
    }

    setIsLoading(true);
    setMatrixResult('');

    // System prompt instructing structured Markdown table output
    const systemPromptText = `أنت بروفيسور ومستشار أكاديمي خبير متمرس في كتابة الإطار النظري ومراجعة الأدبيات والدراسات السابقة (Literature Review Matrix).
مهمتك هي مراجعة وتلخيص الأبحاث المقدمة لك من العميل، ثم صياغة مصفوفة دراسات سابقة دقيقة ومنهجية للغاية على شكل جدول Markdown متكامل باللغة العربية.

الجدول يجب أن يحتوي على الأعمدة التالية بدقة:
1. الدراسة والباحث (أسم الباحث وعام النشر مع عنوان الدراسة)
2. أهداف الدراسة (الأهداف التي تسعى إليها الورقة العلمية)
3. المنهجية والأدوات (المنهج العلمي المتبع وحجم العينة والأدوات)
4. النتائج الرئيسية (الخلاصات والأرقام الجوهرية المكتشفة)
5. الفجوة البحثية (القصور العلمي أو حدود الدراسة أو ما لم تغطيه الورقة)

ثم أسفل الجدول، يرجى كتابة تعليق نقدي تركيبي (Synthesis Commentary) بفقرة واحدة متقنة، تلخص فيها التوجه العام للدراسات وتوضح كيف يمكن لبحث جديد أن يبني على هذه الفجوات.
كن أكاديمياً، دقيقاً، واستخدم أرقى المصطلحات البحثية المعتمدة في الجامعات العربية.`;

    const userPrompt = studies.map((s, idx) => {
      return `الدراسة رقم [${idx + 1}]:
العنوان: ${s.title}
الباحث/السنة: ${s.author}
النص المستخلص/الملخص:
${s.text}
---`;
    }).join('\n\n');

    let accumulatedText = '';
    let lastUpdateTime = 0;
    let throttleTimeout: any = null;

    const updateState = (force = false) => {
      const now = Date.now();
      if (force || now - lastUpdateTime >= 60) {
        setMatrixResult(accumulatedText);
        lastUpdateTime = now;
        if (throttleTimeout) {
          clearTimeout(throttleTimeout);
          throttleTimeout = null;
        }
      } else {
        if (!throttleTimeout) {
          throttleTimeout = setTimeout(() => {
            setMatrixResult(accumulatedText);
            lastUpdateTime = Date.now();
            throttleTimeout = null;
          }, 60 - (now - lastUpdateTime));
        }
      }
    };

    try {
      await executeStream(
        {
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPromptText },
            { role: 'user', content: `إليك الدراسات السابقة المراد صياغة مصفوفة المقارنة المنهجية لها:\n\n${userPrompt}` }
          ],
          temperature: 0.3
        },
        (chunk) => {
          accumulatedText += chunk;
          updateState();
        },
        () => {
          if (throttleTimeout) {
            clearTimeout(throttleTimeout);
          }
          setIsLoading(false);
        },
        (errType, errMsg) => {
          setIsLoading(false);
          setMatrixResult(`⚠️ **حدث خطأ أثناء معالجة البيانات من خادم NaraRouter:**\n\n${errMsg}`);
          if (errType === 'ratelimit') {
            onRateLimit(60);
          } else {
            onErrorToast(errMsg);
          }
        }
      );
    } catch (error: any) {
      setIsLoading(false);
      setMatrixResult(`⚠️ **حدث خطأ غير متوقع أثناء توليد مصفوفة الدراسات:**\n\n${error.message || error}`);
      onErrorToast(error.message || 'Network Error');
    }
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
    <div className="space-y-6 animate-fade-in" id="literature-tab-workspace">
      
      {/* Intro Banner */}
      <div className="bento-card bg-navy text-white border-[#D4AF37]/35 flex flex-col md:flex-row items-center justify-between gap-6 p-6">
        <div className="space-y-2 max-w-2xl text-right">
          <div className="inline-flex items-center gap-1.5 bg-gold/15 text-gold border border-gold/20 px-2.5 py-1 rounded-full text-[10px] font-bold">
            <Sparkles className="w-3 h-3 text-gold" />
            <span>خاص بالباحثين والأكاديميين</span>
          </div>
          <h2 className="text-xl font-black text-[#FDFBF7]">مصفوفة الدراسات السابقة (Literature Review Matrix)</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            أداة جبارة تختصر شهور القراءة والمقارنة. ضع نصوص الأبحاث ومستخلصاتها بالأسفل، ليقوم نموذج كلود الذكي بتحليلها وتوليد جدول مقارنة منهجي يوضح الأهداف، المنهجية، النتائج، وتعيين الفجوات البحثية بدقة متناهية.
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shrink-0 flex items-center justify-center text-[#D4AF37]">
          <Table className="w-12 h-12" />
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Studies Input Area */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-navy flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#B58921]" />
              <span>الأوراق العلمية والدراسات المدخلة ({studies.length})</span>
            </h3>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleResetPresets}
                className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="استعادة الدراسات الافتراضية"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={handleAddStudy}
                className="px-3 py-1.5 bg-navy hover:bg-[#1E3A8A] text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة دراسة</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {studies.map((study, idx) => (
              <div 
                key={study.id} 
                className="p-4 bg-[#FDFBF7] border border-[#D4AF37]/20 rounded-2xl hover:border-[#D4AF37]/40 transition-all space-y-3 relative group"
              >
                {/* Delete button */}
                <button
                  onClick={() => handleRemoveStudy(study.id)}
                  className="absolute top-4 left-4 p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="حذف الدراسة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gold/10 text-gold-hover border border-gold/10 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-black text-navy">الدراسة رقم {idx + 1}</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">عنوان البحث أو التقرير:</label>
                    <input
                      type="text"
                      value={study.title}
                      onChange={(e) => handleUpdateStudy(study.id, 'title', e.target.value)}
                      placeholder="أدخل عنوان البحث العلمي بالكامل..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D4AF37]/20 rounded-xl focus:outline-none focus:border-gold text-navy font-bold text-right"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">الباحث وسنة النشر:</label>
                    <input
                      type="text"
                      value={study.author}
                      onChange={(e) => handleUpdateStudy(study.id, 'author', e.target.value)}
                      placeholder="مثلاً: الشمري وحماد (2025)..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D4AF37]/20 rounded-xl focus:outline-none focus:border-gold text-navy text-right"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">ملخص أو نصوص مستخلصة من البحث:</label>
                    <textarea
                      rows={4}
                      value={study.text}
                      onChange={(e) => handleUpdateStudy(study.id, 'text', e.target.value)}
                      placeholder="الصق هنا المستخلص (Abstract)، أو منهجية البحث والنتائج التي نسختها من ملف الـ PDF لتقوم بمقارنتها..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D4AF37]/20 rounded-xl focus:outline-none focus:border-gold text-navy text-right resize-none h-24 leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Model selection and execute button */}
          <div className="p-4 bg-[#F5EBE0]/30 border border-[#D4AF37]/15 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy">نموذج المعالجة المعتمد:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-2.5 py-1 text-xs bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-lg text-navy font-bold focus:outline-none focus:border-gold cursor-pointer"
              >
                <option value="claude-sonnet-4.5">كلود سونيت 4.5 - التحليل المتقدم</option>
                <option value="mistral-large">ميسترال لارج - الفهم المعقد</option>
                <option value="deepseek-3.2">دييب سيك 3.2 - المنطق السريع</option>
              </select>
            </div>

            <button
              disabled={isLoading}
              onClick={handleGenerateMatrix}
              className="w-full py-3 bg-navy hover:bg-[#1E3A8A] disabled:bg-navy/40 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin text-gold" />
                  <span>جاري قراءة ومقارنة الأوراق العلمية...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-gold" />
                  <span>توليد مصفوفة المقارنة المنهجية بالذكاء الاصطناعي</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Matrix Comparison Output View */}
        <div className="lg:col-span-7 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="text-sm font-black text-navy flex items-center gap-1.5">
              <Table className="w-4 h-4 text-gold-hover" />
              <span>مصفوفة مراجعة الأدبيات الناتجة (Literature Matrix)</span>
            </h3>

            {matrixResult && (
              <button
                onClick={handleCopyResult}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ الجدول كاملاً'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 bg-[#FDFBF7] border border-[#D4AF37]/20 rounded-2xl p-5 overflow-auto shadow-inner relative flex flex-col justify-between max-h-[570px]">
            {matrixResult ? (
              <div 
                className="prose-rtl text-xs text-slate-700 leading-relaxed overflow-x-auto w-full select-text" 
                dangerouslySetInnerHTML={renderMarkdown(matrixResult)} 
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4" id="matrix-empty-placeholder">
                <div className="w-16 h-16 rounded-full bg-[#F5EBE0]/60 flex items-center justify-center text-[#B58921] border border-[#D4AF37]/20">
                  <Table className="w-8 h-8 text-[#B58921]" />
                </div>
                <div className="max-w-md space-y-1">
                  <h4 className="font-black text-navy text-sm">بانتظار إيعاز توليد المصفوفة المنهجية</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    قم بتعديل أو إضافة الدراسات البحثية في الجزء الأيمن، ثم اضغط على زر التوليد لصناعة جدول المقارنة الفوري الأكاديمي.
                  </p>
                </div>
                
                <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-xl max-w-sm flex gap-3 text-right">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 leading-relaxed">
                    <strong>نصيحة ذكية:</strong> نحن نقوم بتغذية النماذج بطلب تفصيلي منظم، يضمن الحصول على مصفوفة متكاملة وواضحة جداً تتطابق تماماً مع متطلبات مجلات النشر المحكمة (ISI و Scopus).
                  </p>
                </div>
              </div>
            )}

            {isLoading && !matrixResult && (
              <div className="absolute inset-0 bg-[#FDFBF7]/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-center space-y-3">
                <Loader className="w-10 h-10 text-[#B58921] animate-spin" />
                <p className="text-xs font-black text-navy">جاري معالجة الدراسات السابقة ومقارنتها بشكل متبادل...</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
