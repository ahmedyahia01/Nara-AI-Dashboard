/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TabId = 'chat' | 'pdf' | 'literature' | 'pptx' | 'vision' | 'code' | 'settings';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  arabicName: string;
  badge: 'رائد' | 'ذكي' | 'سريع' | 'سياق ضخم' | 'رؤية';
  maxTokensText: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  modelUsed?: string;
}

export interface SystemPromptPreset {
  id: string;
  name: string;
  prompt: string;
  icon: string;
}

export interface PDFPageData {
  pageNumber: number;
  text: string;
}

export interface PDFDocumentState {
  name: string;
  size: string;
  totalPages: number;
  extractedText: string;
  pages: PDFPageData[];
}

export interface SlideItem {
  title: string;
  subtitle: string;
  bullets: string[];
}

export interface VisionResult {
  imageUrl: string;
  analysisText: string;
}

export interface CodeRefactorPreset {
  id: string;
  name: string;
  prompt: string;
  inputPlaceholder: string;
}
