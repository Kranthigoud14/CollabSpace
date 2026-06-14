import { useState } from 'react';
import { suggestNext, summarize } from '../../api/ai.api';
import { pushToast } from '../ui/Toast';

export default function AIAssistant({ onAccept, documentContent = '', selectedText = '' }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  // 1. SUMMARIZE DOCUMENT
  const handleSummarize = async () => {
    // Strip HTML tags for clean text content
    const cleanText = documentContent ? documentContent.replace(/<[^>]*>/g, '').trim() : '';
    if (!cleanText) {
      return pushToast('Document is empty. Write something first!');
    }

    try {
      setLoading(true);
      setResult('');
      const res = await summarize(cleanText);
      const output = res?.data || res?.summary || res?.message || 'Empty summary generated.';
      setResult(output);
      pushToast('Summary generated!');
    } catch (err) {
      console.error('AI Summarize error:', err);
      pushToast('AI Summarization failed.');
    } finally {
      setLoading(false);
    }
  };

  // 2. IMPROVE WRITING (Takes selected text or input prompt)
  const handleImprove = async () => {
    const textToImprove = selectedText.trim() || customPrompt.trim();
    if (!textToImprove) {
      return pushToast('Select some text in the editor or type a prompt first!');
    }

    try {
      setLoading(true);
      setResult('');
      const prompt = `Improve this writing. Fix grammar, make it sound highly professional, engaging, and clear: "${textToImprove}"`;
      const res = await suggestNext(prompt);
      const output = res?.data || res?.answer || res?.message || '';
      setResult(output);
      pushToast('Text improved!');
    } catch (err) {
      console.error('AI improve error:', err);
      pushToast('AI improvement failed.');
    } finally {
      setLoading(false);
    }
  };

  // 3. SUGGEST NEXT LINE
  const handleSuggestNext = async () => {
    const contextText = selectedText.trim() || customPrompt.trim() || documentContent.replace(/<[^>]*>/g, '').trim().slice(-300);
    if (!contextText) {
      return pushToast('Please type something or select a sentence so the AI has context!');
    }

    try {
      setLoading(true);
      setResult('');
      const prompt = `Based on the following text context, autocomplete and write only the next sentence or line that logically follows. Do not repeat the prompt. Context: "${contextText}"`;
      const res = await suggestNext(prompt);
      const output = res?.data || res?.answer || res?.message || '';
      setResult(output);
      
      // broadcast suggestion so editor can show ghost text
      try {
        window.dispatchEvent(new CustomEvent('ai:suggestion', { detail: output }));
      } catch (e) {}
      pushToast('Suggestion generated!');
    } catch (err) {
      console.error('AI suggest error', err);
      pushToast('AI suggestion failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          🔮 AI Assistant
        </span>
        {loading && <span className="text-[10px] text-indigo-400 font-bold animate-pulse">Thinking...</span>}
      </div>

      <div className="space-y-2">
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder={
            selectedText
              ? `Selected text: "${selectedText.slice(0, 40)}..."`
              : "Type a prompt or write a question for the AI..."
          }
          className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-white placeholder-slate-500 text-xs h-20 outline-none focus:border-indigo-500 focus:bg-slate-950/80 transition-all"
        />
        {selectedText && (
          <div className="p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-[10px] text-slate-400 truncate">
            Selected: <span className="text-indigo-300 font-medium font-mono">"{selectedText}"</span>
          </div>
        )}
      </div>

      {/* ACTION CONTROLS */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={handleSummarize}
          disabled={loading}
          className="py-2 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 hover:text-white transition-all"
          title="Summarize document content"
        >
          📝 Summarize
        </button>
        <button
          onClick={handleImprove}
          disabled={loading}
          className="py-2 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 hover:text-white transition-all"
          title="Improve grammar and tone of selected text"
        >
          ✨ Improve
        </button>
        <button
          onClick={handleSuggestNext}
          disabled={loading}
          className="py-2 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 hover:text-white transition-all"
          title="Predict next sentence based on text context"
        >
          🔮 Autocomplete
        </button>
      </div>

      {result && (
        <div className="p-3.5 bg-slate-900 border border-slate-850 rounded-xl space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">AI Result</span>
            <button
              onClick={() => setResult('')}
              className="text-slate-500 hover:text-slate-350 text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <div className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap select-all font-medium font-sans">
            {result}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onAccept && onAccept(result);
                setResult('');
              }}
              className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all"
            >
              Insert at Cursor
            </button>
            <button
              onClick={() => {
                setResult('');
                setCustomPrompt('');
              }}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-350 text-[10px] font-bold rounded-lg transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
