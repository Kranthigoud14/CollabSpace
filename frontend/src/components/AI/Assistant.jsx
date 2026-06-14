import { useState } from 'react';
import { summarize, transform, extractAIData } from '../../api/ai.api';
import { pushToast } from '../ui/Toast';

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').trim();

const getContextText = (documentContent, selectedText, customPrompt) => {
  if (selectedText.trim()) return selectedText.trim();
  if (customPrompt.trim()) return customPrompt.trim();
  return stripHtml(documentContent);
};

export default function AIAssistant({ onAccept, documentContent = '', selectedText = '' }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const runAction = async (action, { useDocument = false, useSelection = true } = {}) => {
    let content = '';

    if (useDocument && !useSelection) {
      content = stripHtml(documentContent);
    } else {
      content = getContextText(documentContent, useSelection ? selectedText : '', customPrompt);
    }

    if (!content) {
      pushToast('Select text, type a prompt, or add document content first.');
      return;
    }

    try {
      setLoading(true);
      setResult('');

      let res;
      if (action === 'summarize') {
        res = await summarize(content);
      } else {
        res = await transform(action, content, customPrompt.trim() || undefined);
      }

      const output = extractAIData(res);
      if (!output) {
        throw new Error(res?.message || 'Empty AI response');
      }

      setResult(output);

      if (action === 'continue') {
        try {
          window.dispatchEvent(new CustomEvent('ai:suggestion', { detail: output }));
        } catch (e) {
          /* ignore */
        }
      }

      pushToast('AI response ready.');
    } catch (err) {
      console.error(`AI ${action} error:`, err);
      pushToast(err?.response?.data?.message || err?.message || 'AI request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = () => {
    if (!stripHtml(documentContent)) {
      pushToast('Document is empty. Write something first!');
      return;
    }
    runAction('summarize', { useDocument: true, useSelection: false });
  };
  const handleImprove = () => runAction('improve');
  const handleSuggestNext = () => runAction('continue');
  const handleRewrite = () => runAction('rewrite');
  const handleExpand = () => runAction('expand');
  const handleShorten = () => runAction('shorten');
  const handleGrammar = () => runAction('grammar');
  const handleGenerate = () => runAction('generate', { useSelection: false });

  const actionButtonClass =
    'py-2 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 hover:text-white transition-all disabled:opacity-50';

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
          className={actionButtonClass}
          title="Summarize document content"
        >
          📝 Summarize
        </button>
        <button
          onClick={handleImprove}
          disabled={loading}
          className={actionButtonClass}
          title="Improve grammar and tone of selected text"
        >
          ✨ Improve
        </button>
        <button
          onClick={handleSuggestNext}
          disabled={loading}
          className={actionButtonClass}
          title="Predict next sentence based on text context"
        >
          🔮 Autocomplete
        </button>
        <button
          onClick={handleRewrite}
          disabled={loading}
          className={actionButtonClass}
          title="Rewrite selected text"
        >
          🔄 Rewrite
        </button>
        <button
          onClick={handleExpand}
          disabled={loading}
          className={actionButtonClass}
          title="Expand selected text with more detail"
        >
          📈 Expand
        </button>
        <button
          onClick={handleShorten}
          disabled={loading}
          className={actionButtonClass}
          title="Shorten selected text"
        >
          📉 Shorten
        </button>
        <button
          onClick={handleGrammar}
          disabled={loading}
          className={actionButtonClass}
          title="Fix grammar and spelling"
        >
          ✅ Grammar
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={actionButtonClass}
          title="Generate content from prompt"
        >
          ✏️ Generate
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
