/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layout, Sparkles, Download, Loader, HelpCircle, FileDown, Check, RefreshCw } from 'lucide-react';
import { executeStream } from '../lib/api';
import { SlideItem } from '../types';

interface PptxTabProps {
  onErrorToast: (message: string, duration?: number) => void;
  onRateLimit: (seconds: number) => void;
}

export const PptxTab: React.FC<PptxTabProps> = ({ onErrorToast, onRateLimit }) => {
  const [topicPrompt, setTopicPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [liveLog, setLiveLog] = useState('');
  const [generatedSlides, setGeneratedSlides] = useState<SlideItem[]>([]);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Helper to extract JSON from markdown formatted outputs cleanly
  const extractCleanJson = (rawText: string): SlideItem[] => {
    let cleaned = rawText.trim();
    
    // Attempt block matches first
    const blockMatch = cleaned.match(/```(?:json)?([\s\S]*?)```/);
    if (blockMatch && blockMatch[1]) {
      cleaned = blockMatch[1].trim();
    } else {
      // Find index of first bracket and last bracket to strip surrounding prose
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      }
    }

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      throw new Error("البيانات المستلمة ليست مصفوفة JSON صالحة.");
    } catch (e: any) {
      throw new Error(`تعذر تمشيط البيانات لخلل بياني: ${e.message}`);
    }
  };

  const handleGenerateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    const promptText = topicPrompt.trim();
    if (!promptText || isLoading) return;

    setIsLoading(true);
    setLiveLog('جاري الإرسال وتوجيه المهندس الرقمي لوضع الهيكل التقديمي...');
    setGeneratedSlides([]);
    setDownloadSuccess(false);

    const systemPromptText = `You are a professional PowerPoint Slides Structurer. You MUST design a structured outline of corporate slides.
You are strictly forbidden from outputting any markdown containers (outside of returning clean text), notes, explanation, or polite greetings.
You MUST output ONLY a pure RAW JSON array matching this exact schema:
[
  {
    "title": "Slide main title in elegant professional Arabic",
    "subtitle": "Short subtitle or takeaway in Arabic",
    "bullets": [
      "Key point or bullet line in Arabic",
      "Another key detail bullet in Arabic (keep them concise and punchy, max 4 bullets per slide)"
    ]
  }
]
Do not return any conversational text. Generate exactly ${slideCount} slides covering the user's requested topic with real, insightful corporate content.`;

    try {
      await executeStream(
        {
          model: 'mistral-large', // Ideal model for high-fidelity structures and JSON mapping
          messages: [
            { role: 'system', content: systemPromptText },
            { role: 'user', content: `الموضوع الأساسي المراد تصميمه وبنائه بـ ${slideCount} شرائح هو: ${promptText}` }
          ],
          temperature: 0.2 // Low temp for super strict JSON conforming
        },
        (chunk) => {
          setLiveLog(prev => prev + chunk);
        },
        (fullText) => {
          try {
            const parsedSlides = extractCleanJson(fullText);
            setGeneratedSlides(parsedSlides);
            setIsLoading(false);
            setLiveLog('');
          } catch (err: any) {
            onErrorToast(`فشل تمشيط الهيكل البياني للشرائح: ${err.message}`);
            setIsLoading(false);
          }
        },
        (errType, errMsg) => {
          setIsLoading(false);
          setLiveLog(`⚠️ حدث خطأ أثناء الاتصال بالخادم وتوليد العرض التقديمي:\n${errMsg}`);
          if (errType === 'ratelimit') {
            onRateLimit(60);
          } else {
            onErrorToast(errMsg);
          }
        }
      );
    } catch (err: any) {
      setIsLoading(false);
      setLiveLog(`⚠️ حدث خطأ غير متوقع أثناء توليد العرض التقديمي:\n${err.message || err}`);
      onErrorToast(err.message || 'Network Error');
    }
  };

  const triggerPptxDownload = () => {
    if (generatedSlides.length === 0) return;

    const pptxLib = (window as any).PptxGenJS;
    if (!pptxLib) {
      onErrorToast("تعذر استدعاء محرك PptxGenJS بالمتصفح، يرجى إعادة المحاولة.");
      return;
    }

    try {
      const pptx = new pptxLib();
      pptx.layout = 'LAYOUT_16x9';

      generatedSlides.forEach((slideData, idx) => {
        const slide = pptx.addSlide();
        
        // 1. Sleek Background Canvas (Warm Off-White Surface Color)
        slide.background = { fill: 'FDFBF7' };

        // 2. Decorative Top Corporate Bar (Deep Navy Blue)
        slide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: '100%',
          h: 0.4,
          fill: { color: '0A192F' }
        });

        // 3. Top Right Branding/Tracker Indicator (Gold accent!)
        slide.addText(`بوابة نارا الذكية لإنتاج الشرائح • الشريحة ${idx + 1}`, {
          x: 5.0,
          y: 0.1,
          w: 7.8,
          h: 0.25,
          color: 'D4AF37',
          fontSize: 10,
          fontFace: 'Cairo',
          align: 'left', // Keep aligned to outer margins
          rtl: true
        });

        // 4. Main Slide Heading (RTL aligned Arabic!)
        slide.addText(slideData.title, {
          x: 0.8,
          y: 0.8,
          w: 11.5,
          h: 0.7,
          fontFace: 'Cairo',
          fontSize: 24,
          bold: true,
          color: '0A192F',
          align: 'right',
          rtl: true
        });

        // 5. Gold Subtitle Line
        if (slideData.subtitle) {
          slide.addText(slideData.subtitle, {
            x: 0.8,
            y: 1.5,
            w: 11.5,
            h: 0.35,
            fontFace: 'Cairo',
            fontSize: 13,
            color: 'B58921',
            align: 'right',
            rtl: true
          });
        }

        // 6. Partition/Border line to divide content elegantly
        slide.addShape(pptx.ShapeType.line, {
          x: 0.8,
          y: 2.0,
          w: 11.5,
          h: 0,
          line: { color: 'F5EBE0', width: 2 }
        });

        // 7. Bullet Lists formatting
        if (slideData.bullets && slideData.bullets.length > 0) {
          const formattedTextArray = slideData.bullets.map((bulletPoint) => ({
            text: ` ${bulletPoint}\n`,
            options: {
              fontSize: 13,
              color: '212529',
              fontFace: 'Tajawal',
              bullet: { code: '25BA' }, // Styled Triangle Arrow bullets
              lineSpacing: 24,
              align: 'right',
              rtl: true
            }
          }));

          slide.addText(formattedTextArray, {
            x: 1.0,
            y: 2.3,
            w: 11.1,
            h: 4.2,
            align: 'right',
            rtl: true
          });
        }
      });

      pptx.writeFile({ fileName: `مستند_نارا_${Date.now()}.pptx` });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      onErrorToast(`فشل تصدير مستند PowerPoint التقديمي: ${err.message}`);
    }
  };

  const handleReset = () => {
    setTopicPrompt('');
    setGeneratedSlides([]);
    setLiveLog('');
  };

  return (
    <div className="space-y-6 animate-fade-in" id="pptx-tab">
      
      {/* Intro Description - Styled as Bento Card */}
      <div className="bento-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-navy text-gold rounded-2xl border border-[#D4AF37]/25 shadow-sm">
            <Layout className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-navy">لوحة توليد العروض والمقترحات للشركات (AI-to-PPTX)</h2>
            <p className="text-xs text-slate-500 mt-1">
              أدخل خطة عمل، مرئيات مقال، أو فكرة مبدئية، لحقن نموذج الذكاء الاصطناعي وبدء تصميم عرض PPTX حقيقي منسق بالكامل ومتاح للتحميل بلمسة واحدة.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Input Sidebar Panel */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleGenerateDeck} className="bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl p-5 shadow-sm space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-navy">موضوع العرض التقديمي وتفاصيل المحتوى:</label>
              <textarea
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                placeholder="مثال: خطة تسويق مرنة لشركة برمجيات سعودية ناشئة تستهدف زيادة عملائها بـ 50% عبر الترويج بالمحتوى التعليمي..."
                rows={6}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-2xl border border-[#D4AF37]/20 placeholder-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-transparent text-navy bg-white disabled:bg-slate-50 leading-relaxed shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-navy flex items-center justify-between">
                <span>عدد الشرائح المطلوب:</span>
                <span className="font-mono text-gold-hover font-bold text-base">{slideCount}</span>
              </label>
              <input
                type="range"
                min={3}
                max={15}
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value))}
                disabled={isLoading}
                className="w-full accent-navy cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>3 شرائح</span>
                <span>15 شريحة</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isLoading || !topicPrompt.trim()}
                className="flex-1 py-3 bg-navy hover:bg-[#1E3A8A] text-[#D4AF37] hover:text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 border border-[#D4AF37]/35"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 text-[#D4AF37] animate-spin" />
                    جاري صياغة JSON...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    تحليل وتوليد الهيكل المقترح
                  </>
                )}
              </button>

              {generatedSlides.length > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-colors border border-red-100 cursor-pointer"
                  title="تفريغ الحقول والبدء من جديد"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* Model tracker detail - Styled as Bento Card */}
          <div className="bg-[#FDFBF7] rounded-3xl p-5 border border-[#D4AF37]/25 text-xs text-slate-500 leading-relaxed space-y-3 shadow-sm">
            <h4 className="font-bold text-navy flex items-center gap-1.5 text-xs text-right">
              <HelpCircle className="w-4 h-4 text-[#B58921] shrink-0" />
              كيف يعمل المهندس السحابي للملفات؟
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500">• 1. نأمر محرك <strong>DeepSeek 3.2</strong> بتحليل الفكرة وهندسة مصفوفة JSON متكاملة تمثل شرائح متتالية باللغة العربية الفصحى.</p>
            <p className="text-[11px] leading-relaxed text-slate-500">• 2. يتم تمشيط تلك الكتل برمجياً وحقنها في محركات <strong>PptxGenJS</strong> لبناء الشرائح مع تمثيل مريح للألوان والمحاذاة RTL.</p>
          </div>
        </div>

        {/* Right Output/Review Panel */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl p-8 h-full flex flex-col items-center justify-center text-center space-y-4 shadow-sm min-h-[400px]">
              <Loader className="w-10 h-10 text-[#B58921] animate-spin" />
              <div className="space-y-1">
                <h4 className="font-bold text-navy">جاري معالجة وتغليف هيكل البيانات...</h4>
                <p className="text-xs text-slate-400 max-w-sm">يقوم معالج DeepSeek ببناء المحتوى في هذه الأثناء. يرجى إبقاء هذه الصفحة مفتوحة.</p>
              </div>
              <div className="w-full max-w-md p-3 bg-white rounded-xl max-h-[160px] overflow-y-auto text-left font-mono text-[10px] text-slate-500 border border-[#D4AF37]/15" dir="ltr">
                {liveLog || "Waiting for data chunks..."}
              </div>
            </div>
          ) : generatedSlides.length > 0 ? (
            <div className="space-y-4 animate-slide-up">
              {/* Trigger Toolbar */}
              <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-lg">
                    <FileDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm">تم بناء الهيكل بنجاح ({generatedSlides.length} شرائح)!</h4>
                    <p className="text-xs text-emerald-700">اضغط على زر التحميل المباشر لتوليد ملف الـ PowerPoint وحفظه فوراً.</p>
                  </div>
                </div>

                <button
                  onClick={triggerPptxDownload}
                  className="px-5 py-3 bg-navy hover:bg-navy-light text-gold hover:text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer self-stretch sm:self-auto justify-center border border-[#D4AF37]/35"
                >
                  {downloadSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      مكتمل وجاهز للتصفح!
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-gold" />
                      تنزيل PPTX مخصص
                    </>
                  )}
                </button>
              </div>

              {/* Slide Decks Preview List */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {generatedSlides.map((slide, sIdx) => (
                  <div key={sIdx} className="bg-[#FDFBF7] border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 rounded-3xl p-5 shadow-sm relative overflow-hidden transition-all">
                    {/* Index header */}
                    <div className="absolute left-0 top-0 text-[10px] font-mono font-bold text-[#B58921] bg-gold/10 px-3 py-1 rounded-br-none rounded-bl-3xl border-b border-l border-[#D4AF37]/20">
                      شريحة {sIdx + 1}
                    </div>

                    <div className="space-y-3 mt-2 pr-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">العنوان الأساسي للشريحة / Slide Title</span>
                        <h4 className="text-base font-extrabold text-navy leading-relaxed">{slide.title}</h4>
                      </div>

                      {slide.subtitle && (
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 block font-bold">العنوان الفرعي للملخص / Subtitle</span>
                          <p className="text-xs text-gold-hover font-bold">{slide.subtitle}</p>
                        </div>
                      )}

                      <div className="space-y-1.5 pt-3 border-t border-slate-200/50">
                        <span className="text-[10px] text-slate-400 block font-bold">العناصر والنقاط الهيكلية / Bullet Points</span>
                        <ul className="space-y-2">
                          {slide.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="flex gap-2 text-xs text-slate-700 leading-relaxed items-start">
                              <span className="w-1.5 h-1.5 rounded-full bg-navy mt-1.5 shrink-0" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Empty view of outline
            <div className="bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl p-12 h-[340px] flex flex-col items-center justify-center text-center text-slate-400 space-y-4 shadow-sm">
              <HelpCircle className="w-12 h-12 text-[#D4AF37] animate-pulse" />
              <div>
                <h4 className="font-bold text-navy text-base">بوابة التوليف مغلقة حالياً</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  أدخل موضوع التقرير أو العرض المقترح في الحقل الجانبي الأيمن، واضغط على توليد لبناء العرض التوضيحي بالكامل.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
