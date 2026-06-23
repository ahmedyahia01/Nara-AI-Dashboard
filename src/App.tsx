/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  FileText, 
  Presentation, 
  Eye, 
  Code2, 
  Settings, 
  Key, 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle,
  X,
  Clock,
  ExternalLink,
  Table
} from 'lucide-react';

import { TabId } from './types';
import { getStoredApiKey } from './lib/api';

// Component Module import statements
import { ChatTab } from './components/ChatTab';
import { PdfTab } from './components/PdfTab';
import { LiteratureTab } from './components/LiteratureTab';
import { PptxTab } from './components/PptxTab';
import { VisionTab } from './components/VisionTab';
import { CodeTab } from './components/CodeTab';
import { SettingsTab } from './components/SettingsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  // Refresh Connection status of Key
  const refreshKeyStatus = () => {
    const key = getStoredApiKey();
    setHasApiKey(!!key && key.startsWith('sk-nry-'));
  };

  useEffect(() => {
    refreshKeyStatus();
    
    // Simple Clock logic in Arabic UTC
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const clockTimer = setInterval(updateTime, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  // Handle Countdown seconds decrement for 429 cooling periods
  useEffect(() => {
    if (rateLimitCountdown <= 0) return;
    const interval = setInterval(() => {
      setRateLimitCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitCountdown]);

  // Toast trigger utility
  const triggerToast = (message: string, duration = 4000) => {
    setToast({ message, visible: true });
    // Auto fadeout
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, duration);
  };

  const handleRateLimitBlock = (seconds: number) => {
    setRateLimitCountdown(seconds);
    triggerToast(`⚠️ عذراً! تم حظر الطلب مؤقتاً لتجاوز دقيقة الاستعلام القصوى (Rate Limit). تم تفعيل تبريد دقيقة.`);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#F3F4F6]" id="app-workspace">
      
      {/* Sidebar Control Panel */}
      <aside className="w-full md:w-64 bg-[#0A192F] text-[#FDFBF7] shrink-0 border-l border-[#D4AF37]/30 shadow-2xl flex flex-col justify-between p-6 md:h-screen sticky top-0 md:sticky z-10" id="sidebar-panel">
        <div className="space-y-6">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 border-b border-[#D4AF37]/25 pb-4">
            <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center text-[#0A192F] shadow-[0_0_15px_rgba(212,175,55,0.35)] shrink-0 transform rotate-3 hover:rotate-0 transition-all duration-300">
              <svg className="w-6 h-6 text-[#0A192F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight">بوابة نارا الذكية</h1>
              <p className="text-[10px] text-[#D4AF37] uppercase tracking-widest opacity-80 font-bold">Nara Router Workspace</p>
            </div>
          </div>

          {/* Core Sidebar tab triggers - Bento Navigation Pattern */}
          <nav className="space-y-3" id="nav-rail">
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 p-3 transition-all cursor-pointer ${
                activeTab === 'chat' 
                  ? 'bg-white/10 border-r-4 border-[#D4AF37] rounded-l-md text-white font-bold' 
                  : 'text-white/60 hover:bg-white/5 rounded-md text-right'
              }`}
            >
              <MessageSquare className="w-5 h-5 shrink-0 text-[#D4AF37]" />
              <span className="text-xs font-semibold">المحادثة المتقدمة السريعة</span>
            </button>

            <button
              onClick={() => setActiveTab('pdf')}
              className={`w-full flex items-center gap-3 p-3 transition-all cursor-pointer ${
                activeTab === 'pdf' 
                  ? 'bg-white/10 border-r-4 border-[#D4AF37] rounded-l-md text-white font-bold' 
                  : 'text-white/60 hover:bg-white/5 rounded-md text-right'
              }`}
            >
              <FileText className="w-5 h-5 shrink-0 text-[#D4AF37]" />
              <span className="text-xs font-semibold">محلل مستندات الـ PDF العملاقة</span>
            </button>

            <button
              onClick={() => setActiveTab('literature')}
              className={`w-full flex items-center gap-3 p-3 transition-all cursor-pointer ${
                activeTab === 'literature' 
                  ? 'bg-white/10 border-r-4 border-[#D4AF37] rounded-l-md text-white font-bold' 
                  : 'text-white/60 hover:bg-white/5 rounded-md text-right'
              }`}
            >
              <Table className="w-5 h-5 shrink-0 text-[#D4AF37]" />
              <span className="text-xs font-semibold">مصفوفة الدراسات السابقة</span>
            </button>

            <button
              onClick={() => setActiveTab('pptx')}
              className={`w-full flex items-center gap-3 p-3 transition-all cursor-pointer ${
                activeTab === 'pptx' 
                  ? 'bg-white/10 border-r-4 border-[#D4AF37] rounded-l-md text-white font-bold' 
                  : 'text-white/60 hover:bg-white/5 rounded-md text-right'
              }`}
            >
              <Presentation className="w-5 h-5 shrink-0 text-[#D4AF37]" />
              <span className="text-xs font-semibold">صانع العروض (AI-to-PPTX)</span>
            </button>

            <button
              onClick={() => setActiveTab('vision')}
              className={`w-full flex items-center gap-3 p-3 transition-all cursor-pointer ${
                activeTab === 'vision' 
                  ? 'bg-white/10 border-r-4 border-[#D4AF37] rounded-l-md text-white font-bold' 
                  : 'text-white/60 hover:bg-white/5 rounded-md text-right'
              }`}
            >
              <Eye className="w-5 h-5 shrink-0 text-[#D4AF37]" />
              <span className="text-xs font-semibold">فاحص الرؤية والاستوديو</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`w-full flex items-center gap-3 p-3 transition-all cursor-pointer ${
                activeTab === 'code' 
                  ? 'bg-white/10 border-r-4 border-[#D4AF37] rounded-l-md text-white font-bold' 
                  : 'text-white/60 hover:bg-white/5 rounded-md text-right'
              }`}
            >
              <Code2 className="w-5 h-5 shrink-0 text-[#D4AF37]" />
              <span className="text-xs font-semibold">مراجعة وتطوير الأكواد</span>
            </button>

            <div className="border-t border-white/10 my-4 pt-4" />

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 p-3 transition-all cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-white/10 border-r-4 border-[#D4AF37] rounded-l-md text-white font-bold' 
                  : 'text-white/60 hover:bg-white/5 rounded-md text-right'
              }`}
            >
              <Settings className="w-5 h-5 shrink-0 text-[#D4AF37]" />
              <span className="text-xs font-semibold">إعدادات مفاتيح التشفير</span>
            </button>
          </nav>

        </div>

        {/* Sidebar Footer details */}
        <div className="mt-6 pt-4 border-t border-white/5 space-y-3 hidden md:block" id="sidebar-footer">
          {/* Real Key State block inside Sidebar */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-right">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green-400' : 'bg-amber-400'} animate-pulse`}></div>
              <span className="text-[11px] text-white/80 font-semibold">
                {hasApiKey ? 'مفتاح بوابة نارا نشط' : 'بانتظار مفتاح العبور'}
              </span>
            </div>
            <p className="text-[9px] text-white/40 font-mono break-all">
              {hasApiKey ? 'sk-nry-••••••••••••' : 'يرجى تهيئة مفتاح sk-nry-'}
            </p>
          </div>

          {/* Time indicator */}
          <div className="flex items-center justify-between text-[10px] text-white/50 bg-white/5 p-2 rounded-lg">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gold" />
              توقيت مكة/مصر:
            </span>
            <span className="font-mono text-gold font-semibold">{currentTime}</span>
          </div>

          <div className="text-[9px] text-white/40 leading-relaxed text-center">
            <p>مجتمع نارا العربي الحُر</p>
            <p>© 2026 جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </aside>

      {/* Main Container Viewport Content */}
      <main className="flex-1 flex flex-col p-6 space-y-4 h-screen overflow-hidden bg-[#F3F4F6]" id="main-panel">
        
        {/* Dynamic Toolbar Header */}
        <header className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#D4AF37]/20 shadow-sm flex items-center justify-between shrink-0" id="header-toolbar">
          
          {/* Page/Tab Title identifier */}
          <div>
            <h2 className="text-sm md:text-base font-extrabold text-[#0A192F] flex items-center gap-2">
              <span className="text-[#D4AF37]">✦</span>
              {activeTab === 'chat' && <>المحادثة متعددة النماذج</>}
              {activeTab === 'pdf' && <>محلل وقارئ ملفات الـ PDF الشاهقة</>}
              {activeTab === 'literature' && <>مصفوفة الدراسات السابقة ومراجعة الأدبيات</>}
              {activeTab === 'pptx' && <>مهندس عروض الـ PowerPoint المتناسقة</>}
              {activeTab === 'vision' && <>فاحص الصور واستوديو الواجهات</>}
              {activeTab === 'code' && <>مراجع كود المصدر والمطوّر الفني</>}
              {activeTab === 'settings' && <>إعدادات الصلاحية والمفاتيح المحلية</>}
            </h2>
          </div>

          {/* API Server status info badges and stats */}
          <div className="flex items-center gap-4 lg:gap-6">
            
            {/* Model/Quotas stats - hidden on tiny mobile, visible on tablet+ */}
            <div className="hidden lg:flex items-center gap-4 text-right">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">النموذج الافتراضي</span>
                <span className="text-[11px] font-extrabold text-[#0A192F]">Claude-Sonnet-4.5 (200K)</span>
              </div>
              <div className="h-8 w-[1px] bg-gray-200"></div>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">الكوتا المشتركة</span>
                <span className="text-[11px] font-extrabold text-[#B58921]">10 عمليات بالتناوب / د</span>
              </div>
              <div className="h-8 w-[1px] bg-gray-200"></div>
            </div>

            <div className="flex items-center gap-2">
              {/* Countdown blocking badge if rate limited */}
              {rateLimitCountdown > 0 && (
                <span className="animate-pulse bg-red-100 text-red-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-red-200" id="rate-limit-timer-badge">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-650 animate-ping"></span>
                  تبريد: {rateLimitCountdown} ثانية
                </span>
              )}

              {/* API Status Check Connection Badge */}
              {hasApiKey ? (
                <div 
                  onClick={() => setActiveTab('settings')}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-150 rounded-full px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold cursor-pointer transition-colors"
                  title="مفتاح NaraRouter نشط ومطابق، جاهز للاستخدام الفوري"
                  id="key-active-badge"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden xs:inline">رابط العبور: نشط</span>
                </div>
              ) : (
                <div 
                  onClick={() => setActiveTab('settings')}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-150 rounded-full px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold cursor-pointer transition-colors"
                  title="يرجى تزويد مفتاح API Gateway (sk-nry-) للبدء"
                  id="key-missing-badge"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                  <span className="hidden xs:inline">التهيئة مطلوبة</span>
                </div>
              )}

              {/* Default Avatar profile block */}
              <div className="w-9 h-9 rounded-full bg-[#F5EBE0] border border-[#D4AF37]/40 flex items-center justify-center text-xs font-bold shrink-0 shadow-sm" title="مستخدم بوابة نارا">
                👤
              </div>
            </div>
          </div>

        </header>

        {/* Scrollable central Workspace canvas */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl shadow-sm" id="workspace-viewport">
          {activeTab === 'chat' && (
            <ChatTab 
              onErrorToast={triggerToast} 
              onRateLimit={handleRateLimitBlock} 
            />
          )}

          {activeTab === 'pdf' && (
            <PdfTab 
              onErrorToast={triggerToast} 
              onRateLimit={handleRateLimitBlock} 
            />
          )}

          {activeTab === 'literature' && (
            <LiteratureTab 
              onErrorToast={triggerToast} 
              onRateLimit={handleRateLimitBlock} 
            />
          )}

          {activeTab === 'pptx' && (
            <PptxTab 
              onErrorToast={triggerToast} 
              onRateLimit={handleRateLimitBlock} 
            />
          )}

          {activeTab === 'vision' && (
            <VisionTab 
              onErrorToast={triggerToast} 
              onRateLimit={handleRateLimitBlock} 
            />
          )}

          {activeTab === 'code' && (
            <CodeTab 
              onErrorToast={triggerToast} 
              onRateLimit={handleRateLimitBlock} 
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab 
              onKeyChange={refreshKeyStatus} 
              rateLimitCountdown={rateLimitCountdown} 
            />
          )}
        </div>

      </main>

      {/* Unified Global Toast Notification Alert Component */}
      {toast.visible && (
        <div 
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#0A192F] text-white border border-[#D4AF37]/40 shadow-2xl rounded-2xl p-4 max-w-md w-[90%] flex items-start gap-3 z-50 animate-slide-up transition-all duration-300"
          id="global-toast-alert"
        >
          <AlertCircle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold leading-relaxed text-[#FDFBF7] text-right">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            className="text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
