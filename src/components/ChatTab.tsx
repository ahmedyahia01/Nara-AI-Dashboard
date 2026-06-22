/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Cpu, Copy, Check, Trash2, ArrowDownCircle, Info } from 'lucide-react';
import { ChatMessage, SystemPromptPreset } from '../types';
import { AVAILABLE_MODELS, executeStream } from '../lib/api';

const SYSTEM_PROMPTS: SystemPromptPreset[] = [
  {
    id: 'general',
    name: 'المساعد الذكي العام',
    icon: '💡',
    prompt: 'أنت مساعد ذكي ومستشار موضوعي فائق الذكاء، تُجيب باللغة العربية الفصحى الأنيقة وتوفر حلولاً مرقمة ومخرجات مرتبة دقيقة.'
  },
  {
    id: 'coder',
    name: 'المبرمج المحترف',
    icon: '💻',
    prompt: 'أنت مهندس برمجيات ومطور حلول خبير (Senior AI Software Architect). تقدم شروحات فنية عميقة وتوفر أكواد برمجية نظيفة خالية من الأخطاء مع تعليقات تفصيلية وسريعة باللغة الإنجليزية في الأكواد وشرح عربي للخطوات.'
  },
  {
    id: 'writer',
    name: 'الكاتب والمنشئ الإبداعي',
    icon: '✍️',
    prompt: 'أنت كاتب محتوى إبداعي وصانع رسائل تسويقية بليغة ومقالات خالية من الركاكة اللغوية وتوظف البلاغة العربية لإنتاج فقرات جذابة للغاية.'
  },
  {
    id: 'translator',
    name: 'المترجم اللغوي النخبوي',
    icon: '🌐',
    prompt: 'أنت مترجم لغوي فوري فائق الدقة. تترجم العبارات والمستندات البرمجية والتقنية بين العربية والإنجليزية وسائر اللغات الحية مع الحفاظ التدقيق اللغوي الاصطلاحي وسياق الثقافة الأصلية.'
  }
];

interface ChatTabProps {
  onErrorToast: (message: string, duration?: number) => void;
  onRateLimit: (seconds: number) => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({ onErrorToast, onRateLimit }) => {
  const [selectedModel, setSelectedModel] = useState('deepseek-3.2');
  const [activePrompt, setActivePrompt] = useState('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Load chat history from localStorage on initialization
  useEffect(() => {
    const saved = localStorage.getItem('nry-chat-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } catch (e) {}
    }
  }, []);

  const saveChatHistory = (newMsgs: ChatMessage[]) => {
    localStorage.setItem('nry-chat-history', JSON.stringify(newMsgs));
  };

  const handleClearHistory = () => {
    if (window.confirm('هل تود بالتأكيد مسح سجل المحادثة بالكامل؟')) {
      setMessages([]);
      localStorage.removeItem('nry-chat-history');
    }
  };

  const handleCopyText = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const promptText = inputMessage.trim();
    if (!promptText || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `m-${Date.now()}-u`,
      role: 'user',
      content: promptText,
      timestamp: new Date()
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    saveChatHistory(updated);
    setInputMessage('');
    setIsStreaming(true);
    setStreamingMessage('');

    const systemText = SYSTEM_PROMPTS.find(p => p.id === activePrompt)?.prompt || SYSTEM_PROMPTS[0].prompt;

    const payloadMessages = [
      { role: 'system', content: systemText },
      ...updated.map(m => ({ role: m.role, content: m.content }))
    ];

    await executeStream(
      {
        model: selectedModel,
        messages: payloadMessages
      },
      (chunk) => {
        setStreamingMessage(prev => prev + chunk);
      },
      (fullText) => {
        const assistantMsg: ChatMessage = {
          id: `m-${Date.now()}-a`,
          role: 'assistant',
          content: fullText,
          timestamp: new Date(),
          modelUsed: selectedModel
        };
        const finalMsgs = [...updated, assistantMsg];
        setMessages(finalMsgs);
        saveChatHistory(finalMsgs);
        setStreamingMessage('');
        setIsStreaming(false);
      },
      (errType, errMsg) => {
        setIsStreaming(false);
        setStreamingMessage('');
        if (errType === 'ratelimit') {
          onRateLimit(60);
        } else {
          onErrorToast(errMsg);
        }
      }
    );
  };

  const renderMarkdown = (text: string) => {
    try {
      const globalMarked = (window as any).marked;
      if (globalMarked && typeof globalMarked.parse === 'function') {
        return { __html: globalMarked.parse(text) };
      }
    } catch (e) {}
    // Custom fallbacks if Marked.js fails
    return { __html: text.replace(/\n/g, '<br />') };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-165px)] animate-fade-in" id="chat-tab-container">
      {/* Top Controller Bar - Styled as Bento Card */}
      <div className="bento-card mb-4 space-y-4 shadow-sm" id="chat-controller">
        {/* Model and System Prompt selection horizontal viewports */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Model selection dropdown wrapper */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-navy shrink-0">النموذج النشط:</span>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white border border-[#D4AF37]/25 rounded-xl pr-3 pl-8 py-2 text-xs font-bold text-navy focus:outline-none focus:ring-1 focus:ring-[#D4AF37] appearance-none cursor-pointer"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.arabicName} ({m.maxTokensText})
                  </option>
                ))}
              </select>
              <Cpu className="w-3.5 h-3.5 text-navy/60 absolute left-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* System Prompt Roles bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-bold text-navy shrink-0 ml-1">توجيه الدور المسبق:</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {SYSTEM_PROMPTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActivePrompt(p.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activePrompt === p.id
                      ? 'bg-navy text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                      : 'bg-[#F2EAE1]/50 hover:bg-[#F2EAE1] text-[#2D3748] border border-transparent'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions - Clear scroll and logs */}
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-3.5 py-1.5 bg-red-50 hover:bg-red-150 text-red-700 hover:text-red-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 self-end lg:self-auto cursor-pointer border border-red-100"
              title="مسح كامل سجل المحادثة"
            >
              <Trash2 className="w-3.5 h-3.5" />
              مسح السجل
            </button>
          )}

        </div>
      </div>

      {/* Messages Sandbox Viewport - Styled with golden mesh dot canvas */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 bg-[#FDFBF7] border border-[#D4AF37]/25 rounded-3xl p-5 lg:p-6 overflow-y-auto shadow-inner space-y-6"
        style={{
          backgroundImage: "radial-gradient(ellipse at center, rgba(212, 175, 55, 0.05) 0%, transparent 70%), radial-gradient(rgba(212, 175, 55, 0.06) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 16px 16px"
        }}
        id="chat-messages-box"
      >
        {messages.length === 0 && !streamingMessage && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4" id="empty-state">
            <div className="p-4 bg-[#F5EBE0] rounded-full border border-[#D4AF37]/30">
              <Sparkles className="w-10 h-10 text-[#B58921] animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-navy">لوحة محادثة بوابة نارا العملاقة</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                ابدأ بكتابة أي استقصار، مهمة توليد كود، أو مسودة عمل إبداعي. يمكنك تبديل النماذج الذكية من الشريط العلوي لمقارنة السرعة وقوة المنطق مجاناً.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full pt-4 text-right">
              <button 
                onClick={() => setInputMessage('اشرح لي بالتفصيل مفهوم الويب ذو الـ 100% Client-Side وما هي مميزاته؟')}
                className="p-3.5 bg-[#FDFBF7] hover:bg-[#F5EBE0]/60 border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 rounded-2xl text-xs text-slate-700 leading-relaxed text-right transition-all cursor-pointer shadow-sm"
              >
                🧠 <span className="font-bold block text-navy text-xs mb-0.5">تجربة استفسار ذكي:</span>
                "اشرح لي بالتفصيل مفهوم الويب ذو الـ 100% Client-Side مميزات الخصوصية وسهولة النشر."
              </button>
              <button 
                onClick={() => {
                  setSelectedModel('claude-sonnet-4.6');
                  setActivePrompt('coder');
                  setInputMessage('اكتب لي كود دالة جافاسكريبت مستقرة تماماً لمعالجة الـ Chunk Stream القادم من server-sent events (SSE).');
                }}
                className="p-3.5 bg-[#FDFBF7] hover:bg-[#F5EBE0]/60 border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 rounded-2xl text-xs text-slate-700 leading-relaxed text-right transition-all cursor-pointer shadow-sm"
              >
                💻 <span className="font-bold block text-[#B58921] text-xs mb-0.5">تجربة كود (كلود سونيت):</span>
                "اكتب لي دالة جافاسكريبت مستقرة تماماً للاستماع ومعالجة تدفقات SSE."
              </button>
            </div>
          </div>
        )}

        {/* Conversation list */}
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 max-w-4xl animate-slide-up ${msg.role === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
          >
            {/* Avatar block */}
            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold shadow-sm ${
              msg.role === 'user' ? 'bg-[#D4AF37] text-navy' : 'bg-navy text-gold'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
            </div>

            {/* Bubble layout context */}
            <div className="space-y-1.5 flex-1 select-text">
              <div className={`p-4 rounded-2xl shadow-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-navy text-white rounded-tr-none' 
                  : 'bg-[#FDFBF7] border border-[#D4AF37]/25 text-charcoal rounded-tl-none'
              }`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.content}</p>
                ) : (
                  <div 
                    className="prose-rtl text-[13px] leading-relaxed"
                    dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                  />
                )}
              </div>

              {/* Message metadata and click-to-copy */}
              <div className={`flex items-center gap-3 text-[10px] text-slate-400 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.modelUsed && (
                  <span className="font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200/50">
                    بواسطة: {msg.modelUsed}
                  </span>
                )}
                <span>
                  {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => handleCopyText(msg.content, msg.id)}
                  className="hover:text-gold transition-colors flex items-center gap-1 cursor-pointer"
                  title="نسخ محتوى الرسالة"
                >
                  {copiedId === msg.id ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-500" />
                      <span className="text-emerald-600 font-bold">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>نسخ الرسالة</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Live Stream visualizer node */}
        {streamingMessage && (
          <div className="flex gap-3 max-w-4xl ml-auto animate-slide-up" id="streaming-node">
            <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold bg-navy text-gold shadow-sm">
              <Cpu className="w-4 h-4 text-gold animate-spin" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="p-4 bg-[#FDFBF7] border border-[#D4AF37]/25 text-charcoal rounded-2xl rounded-tl-none shadow-sm relative">
                <div 
                  className="prose-rtl text-[13px] leading-relaxed"
                  dangerouslySetInnerHTML={renderMarkdown(streamingMessage)}
                />
                <span className="inline-block w-1.5 h-4 bg-gold ml-1 animate-pulse relative top-0.5" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                <span>نموذج {selectedModel} يجيب حالياً بث حي...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input controls form footer */}
      <form onSubmit={handleSend} className="mt-4 flex items-center gap-2" id="chat-composer-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isStreaming ? "الرجاء الانتظار حتى اكتمال التدفق البصري..." : "اكتب مهمتك أو استفسارك هنا للفحص البصري الفوري..."}
          disabled={isStreaming}
          className="flex-1 bg-white border border-[#D4AF37]/25 rounded-xl px-4 py-3 placeholder-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-transparent text-navy hover:border-navy/20 transition-all disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="submit"
          disabled={isStreaming || !inputMessage.trim()}
          className="p-3 bg-navy hover:bg-[#1E3A8A] text-[#D4AF37] hover:text-white rounded-xl transition-all shadow-md disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer border border-[#D4AF37]/35"
          title="إرسال الطلب"
        >
          <Send className="w-5 h-5 shrink-0 transform rotate-180" />
        </button>
      </form>
    </div>
  );
};
