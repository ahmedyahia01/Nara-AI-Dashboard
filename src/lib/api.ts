/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModelOption } from '../types';

export const API_BASE_URL = '/api/v1/chat/completions';

// Premium Model Configuration Matrix
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'mistral-large',
    name: 'mistral-large',
    arabicName: 'ميسترال لارج - النصوص المعقدة (32K)',
    description: 'نموذج أوروبي متطور يتميز بدقة البناء اللغوي والقدرات المنطقية المتينة لشتى الأغراض العامة.',
    badge: 'رائد',
    maxTokensText: '32K'
  },
  {
    id: 'mimo-v2.5-pro-free',
    name: 'mimo-v2.5-pro-free',
    arabicName: 'ميمو برو 2.5 - التحليل المتقدم',
    description: 'تحليل دلالي عميق وفهم سياقي متقدم وصياغة كود فائقة الجودة.',
    badge: 'ذكي',
    maxTokensText: '32K'
  },
  {
    id: 'mistral-medium-3-5',
    name: 'mistral-medium-3-5',
    arabicName: 'ميسترال ميديام 3.5 - الرؤية المتوازنة (32K)',
    description: 'معالجة بصرية رائعة وفهم متوازن وسريع للمستندات متعددة الوسائط والرسوم البيانية.',
    badge: 'رؤية',
    maxTokensText: '32K'
  },
  {
    id: 'mimo-v2.5-free',
    name: 'mimo-v2.5-free',
    arabicName: 'ميمو 2.5 - الرؤية السريعة',
    description: 'معالجة بصرية خارقة وفهم للصور واستخلاص النصوص الـ OCR وتخطيط واجهات الاستخدام بكفاءة وسرعة فائقة.',
    badge: 'سريع',
    maxTokensText: '16K'
  }
];

export const getStoredApiKey = (): string => {
  return localStorage.getItem('sk-nry-key') || '';
};

export const saveStoredApiKey = (key: string): void => {
  if (key) {
    localStorage.setItem('sk-nry-key', key.trim());
  } else {
    localStorage.removeItem('sk-nry-key');
  }
};

export interface StreamPayload {
  model: string;
  messages: { role: string; content: string | any[] }[];
  temperature?: number;
}

export async function executeStream(
  payload: StreamPayload,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (type: 'unauthorized' | 'ratelimit' | 'error', message: string) => void
) {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    onError('unauthorized', 'برجاء تزويد مفتاح API Gateway NaraRouter ساري الصلاحية في لوحة الإعدادات للبدء.');
    return;
  }

  try {
    // Making a direct, uncached CORS connection to bypass any intermediate proxy or middleware blocks
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify({
        ...payload,
        reasoning_effort: 'medium',
        stream: true
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let extractedMessage = '';
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error?.message) {
          extractedMessage = errJson.error.message;
        }
      } catch (e) {}

      const displayMsg = extractedMessage || `فشل الاتصال بالبوابة الإلكترونية: ${response.status} - ${errText || response.statusText}`;

      if (response.status === 429) {
        onError('ratelimit', displayMsg);
      } else if (response.status === 401) {
        onError('unauthorized', displayMsg);
      } else {
        onError('error', displayMsg);
      }
      return;
    }

    if (!response.body) {
      onError('error', 'استجابة فارغة من خادم البوابة.');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep tail buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed === 'data: [DONE]') {
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              accumulatedText += content;
              onChunk(content);
            }
          } catch (e) {
            // Silence json parse issues on incomplete line fragments
          }
        }
      }
    }

    // Process leftover buffer
    if (buffer && buffer.startsWith('data: ')) {
      const jsonStr = buffer.slice(6);
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) {
          accumulatedText += content;
          onChunk(content);
        }
      } catch (e) {}
    }

    onComplete(accumulatedText);
  } catch (err: any) {
    onError('error', `حدث خطأ غير متوقع بالشبكة: ${err.message || err}`);
  }
}
