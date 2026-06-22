/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Cpu, Info, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { getStoredApiKey, saveStoredApiKey, AVAILABLE_MODELS } from '../lib/api';

interface SettingsTabProps {
  onKeyChange: () => void;
  rateLimitCountdown: number;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onKeyChange, rateLimitCountdown }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorWord, setErrorWord] = useState('');

  useEffect(() => {
    setApiKey(getStoredApiKey());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (trimmed && !trimmed.startsWith('sk-nry-')) {
      setErrorWord('تنبيه: يجب أن يبدأ المفتاح المدخل بالبادئة sk-nry- لضمان صحة مطابقة عبور البوابة.');
      setIsSaved(false);
      return;
    }
    setErrorWord('');
    saveStoredApiKey(trimmed);
    setIsSaved(true);
    onKeyChange();
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="settings-tab">
      {/* Rate limit status alert if active */}
      {rateLimitCountdown > 0 && (
        <div className="p-5 bg-red-50 border border-red-200/50 rounded-3xl flex items-center gap-4 text-red-900 shadow-sm" id="rate-limit-warning">
          <AlertCircle className="w-6 h-6 text-[#D4AF37] shrink-0 animate-bounce" />
          <div>
            <h4 className="font-extrabold text-base">وضع التبريد النشط (Rate Limiting)</h4>
            <p className="text-sm">لقد واجهت حد الاستهلاك المسموح (10 طلبات بالدقيقة). يرجى الانتظار <span className="font-mono font-bold text-lg text-[#D4AF37]">{rateLimitCountdown}</span> ثانية قبل إرسال طلبات جديدة.</p>
          </div>
        </div>
      )}

      {/* Main Settings Card - Styled as Bento Card */}
      <div className="bento-card shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-navy text-gold rounded-2xl border border-[#D4AF37]/25 shadow-sm">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl lg:text-2xl font-black text-navy">إعدادات بوابة عبور NaraRouter</h2>
            <p className="text-xs text-slate-500 mt-1">قم بتهيئة مفتاح تشفير العبور للوصول للنماذج الحصرية فائقة الإمكانيات مجاناً.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-navy">
              مفتاح الـ API الخاص بك (NaraRouter Secret Key):
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setErrorWord('');
                }}
                placeholder="sk-nry-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#D4AF37]/25 bg-white text-navy font-mono placeholder:font-sans placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-transparent transition-all shadow-inner"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute left-3 p-2 text-slate-500 hover:text-navy transition-colors cursor-pointer"
                title={showKey ? "إخفاء المفتاح" : "عرض المفتاح"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errorWord && (
              <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 mt-1" id="key-prefix-error">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorWord}
              </p>
            )}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              * يجب أن يبدأ المفتاح بالعبارة <span className="font-mono text-navy font-bold">sk-nry-</span>. للحصول على مفتاح البوابة، تفضل بزيارة الكونسول الرسمي لـ Naraya AI.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-6 py-3.5 bg-navy text-[#D4AF37] font-bold text-xs rounded-xl hover:bg-[#1E3A8A] hover:text-white transition-all duration-300 flex items-center gap-2 shadow-md cursor-pointer border border-[#D4AF37]/35"
            >
              {isSaved ? (
                <>
                  <Check className="w-5 h-5 text-emerald-500 animate-pulse" />
                  تم الحفظ بنجاح
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-gold animate-pulse" />
                  حفظ مفتاح المرور وأمان العبور
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Security Transparency Alert */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#FDFBF7] rounded-3xl p-6 border border-[#D4AF37]/25 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-navy flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gold" />
            أمانك وسريتك التامة مكفولة 100%
          </h3>
          <ul className="space-y-3 text-xs text-slate-500 leading-relaxed">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0"></span>
              <span>يتم تخزين مفتاح العبور مشفراً داخل <strong>localStorage</strong> المحصورة بمتصفحك الذاتي فقط.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0"></span>
              <span>لا توجد أي قواعد بيانات وسيطة أو خوادم خلفية تستمع لمفاتيحك أو تسترق رسائلك.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0"></span>
              <span>الاستعلامات والطلبات تبث مباشرة من متصفحك الشخصي إلى الواجهة البرمجية لبوابة NaraRouter مما يضمن توافق تام للعمل سحابياً.</span>
            </li>
          </ul>
        </div>

        <div className="bg-[#FDFBF7] rounded-3xl p-6 border border-[#D4AF37]/25 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-navy flex items-center gap-2">
            <Info className="w-5 h-5 text-gold" />
            دليل معدل استهلاك البوابة والمستويات
          </h3>
          <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
            <p className="text-xs bg-gold/15 text-gold-hover p-3 rounded-lg border border-gold/10 font-bold mb-2">
              ⚠️ يسمح لك مجتمع نارا المجاني بتسيير 10 طلبات في الدقيقة (10 requests/min).
            </p>
            <p>عند تجاوز هذا المعدل لأي نموذج، سيقوم نظام الأمان بالبوابة بحجب طلبك المؤقت مسبباً خطأ (429 Rate Limit).</p>
            <p>ستقوم لوحة التحكم الذكية باعتراض هذا الحجب وإظهار عداد تنازلي تلقائي لمرحلة تبريد دقيقة كاملة لتنبيهك ببدء نشاط الحوسبة مجدداً بسلاسة.</p>
          </div>
        </div>
      </div>

      {/* List Models Showcase & Statuses */}
      <div className="space-y-4">
        <h3 className="text-md font-bold text-navy flex items-center gap-2 tracking-tight">
          <Cpu className="w-5 h-5 text-gold" />
          توزيعة النماذج المدعومة وسعة السياق الخاص بها
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_MODELS.map((model) => (
            <div key={model.id} className="bg-[#FDFBF7] hover:bg-[#F5EBE0]/30 border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                    {model.id}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    model.badge === 'رائد' ? 'bg-navy/10 text-navy' :
                    model.badge === 'ذكي' ? 'bg-gold/10 text-gold-hover' :
                    model.badge === 'سياق ضخم' ? 'bg-emerald-100 text-emerald-800' :
                    model.badge === 'رؤية' ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {model.badge}
                  </span>
                </div>
                <h4 className="font-extrabold text-navy text-sm mb-1">{model.arabicName}</h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{model.description}</p>
              </div>
              <div className="border-t border-slate-200/50 pt-3 flex justify-between items-center text-[11px] text-slate-400">
                <span>سعة نافذة الإدخال:</span>
                <span className="font-mono font-bold text-[#B58921]">{model.maxTokensText} كلمة</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
