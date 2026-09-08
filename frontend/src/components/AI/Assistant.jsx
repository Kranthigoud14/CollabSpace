import { useState, useRef } from 'react';
import { summarize, transform, extractAIData } from '../../api/ai.api';
import { pushToast } from '../ui/Toast';

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const getContextText = (documentContent, selectedText, customPrompt) => {
  if (selectedText.trim()) return selectedText.trim();
  if (customPrompt.trim()) return customPrompt.trim();
  return stripHtml(documentContent);
};

export default function AIAssistant({
  onAccept,
  onReplace,
  documentContent = '',
  selectedText = '',
  textBeforeCursor = '',
  textAfterCursor = '',
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showReplaceModal, setShowReplaceModal] = useState(false);

  // Keep track of last action parameters for Regenerate
  const lastCallRef = useRef(null);

  const runAction = async (
    action,
    {
      useDocument = false,
      useSelection = true,
      overrideContent = null,
      overrideContext = null,
    } = {}
  ) => {
    let content = '';

    if (overrideContent) {
      content = overrideContent;
    } else if (useDocument && !useSelection) {
      content = stripHtml(documentContent);
    } else {
      content = getContextText(
        documentContent,
        useSelection ? selectedText : '',
        customPrompt
      );
    }

    if (!content) {
      pushToast('Select text, type a prompt, or add document content first.');
      return;
    }

    lastCallRef.current = {
      action,
      opts: {
        useDocument,
        useSelection,
        overrideContent,
        overrideContext: overrideContext || customPrompt.trim() || undefined,
      },
    };

    try {
      setLoading(true);
      setResult('');

      let res;
      if (action === 'summarize') {
        res = await summarize(content);
      } else {
        res = await transform(
          action,
          content,
          overrideContext || customPrompt.trim() || undefined
        );
      }

      const output = extractAIData(res);
      if (!output) {
        throw new Error(res?.message || 'Empty AI response received');
      }

      setResult(output);

      if (action === 'continue') {
        try {
          window.dispatchEvent(
            new CustomEvent('ai:suggestion', { detail: output })
          );
        } catch (_) {}
      }

      pushToast('AI response ready ✓');
    } catch (err) {
      console.error(`AI ${action} error:`, err);
      pushToast(
        err?.response?.data?.message ||
          err?.message ||
          'AI request failed. Check your API settings.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Action Handlers ──
  const handleSummarize = () => {
    if (selectedText.trim()) {
      runAction('summarize', { useDocument: false, useSelection: true });
      return;
    }
    if (!stripHtml(documentContent)) {
      pushToast('Document is empty. Add content first!');
      return;
    }
    runAction('summarize', { useDocument: true, useSelection: false });
  };

  const handleRewrite = () => runAction('rewrite');
  const handleImprove = () => runAction('improve');
  const handleConcise = () => runAction('concise');
  const handleExpand = () => runAction('expand');
  const handleKeyPoints = () => runAction('key_points');
  const handleActionItems = () => runAction('action_items');

  const handleRegenerate = () => {
    if (!lastCallRef.current) {
      pushToast('No previous action to regenerate');
      return;
    }
    runAction(lastCallRef.current.action, lastCallRef.current.opts);
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    pushToast('Copied AI result to clipboard ✓');
  };

  const handleInsert = () => {
    if (!result) return;
    onAccept && onAccept(result);
    setResult('');
  };

  const handleConfirmReplace = () => {
    if (!result) return;
    onReplace && onReplace(result);
    setShowReplaceModal(false);
    setResult('');
  };

  const actionButtonClass =
    'py-2 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 hover:text-white transition-all disabled:opacity-50 text-center flex items-center justify-center gap-1';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>🔮</span> AI Writing Assistant
        </span>
        {loading && (
          <span className="text-[10px] text-indigo-400 font-bold animate-pulse flex items-center gap-1">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Generating...
          </span>
        )}
      </div>

      {/* Prompt or Context */}
      <div className="space-y-2">
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder={
            selectedText
              ? `Selected: "${selectedText.slice(0, 35)}..."`
              : "Type an instruction or question for the AI..."
          }
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 text-xs h-20 outline-none focus:border-indigo-500 focus:bg-slate-950/80 transition-all resize-none"
        />
        {selectedText && (
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] text-slate-400 flex items-center justify-between">
            <span className="truncate">
              Selected: <span className="text-indigo-300 font-mono">"{selectedText.slice(0, 45)}..."</span>
            </span>
            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-semibold px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
        )}
      </div>

      {/* 7 AI Actions Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={handleSummarize}
          disabled={loading}
          className={actionButtonClass}
          title="Summarize document or selected text"
        >
          📝 Summarize
        </button>
        <button
          onClick={handleRewrite}
          disabled={loading}
          className={actionButtonClass}
          title="Rewrite text preserving meaning"
        >
          🔄 Rewrite
        </button>
        <button
          onClick={handleImprove}
          disabled={loading}
          className={actionButtonClass}
          title="Improve clarity, grammar, and style"
        >
          ✨ Improve Writing
        </button>
        <button
          onClick={handleConcise}
          disabled={loading}
          className={actionButtonClass}
          title="Make text concise"
        >
          📉 Make Concise
        </button>
        <button
          onClick={handleExpand}
          disabled={loading}
          className={actionButtonClass}
          title="Expand text with detail"
        >
          📈 Expand
        </button>
        <button
          onClick={handleKeyPoints}
          disabled={loading}
          className={actionButtonClass}
          title="Extract key points"
        >
          📌 Key Points
        </button>
        <button
          onClick={handleActionItems}
          disabled={loading}
          className={`${actionButtonClass} col-span-2`}
          title="Extract actionable tasks"
        >
          📋 Generate Action Items
        </button>
      </div>

      {/* AI Output Card */}
      {result && (
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
              AI Output
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="text-slate-400 hover:text-indigo-300 text-[10px] font-semibold transition-colors flex items-center gap-0.5"
                title="Regenerate with same settings"
              >
                🔄 Retry
              </button>
              <button
                onClick={() => setResult('')}
                className="text-slate-500 hover:text-slate-300 text-xs font-bold ml-1"
                title="Dismiss result"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap select-all font-sans max-h-48 overflow-y-auto">
            {result}
          </div>

          {/* Action buttons: Copy, Insert, Replace Selection, Dismiss */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/60">
            <div className="flex gap-1.5">
              <button
                onClick={handleCopy}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1"
              >
                📋 Copy
              </button>
              <button
                onClick={handleInsert}
                className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1"
              >
                📥 Insert at Cursor
              </button>
            </div>

            {selectedText.trim() && (
              <button
                onClick={() => setShowReplaceModal(true)}
                className="w-full py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1"
              >
                ⚠️ Replace Selection
              </button>
            )}
          </div>
        </div>
      )}

      {/* Explicit Confirmation Modal for Replace Selection (Phase 14) */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <span>⚠️</span>
              <span>Confirm Replace Selection</span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Are you sure you want to replace the currently selected text with the AI output?
            </p>

            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400 max-h-24 overflow-y-auto italic">
              "{selectedText.slice(0, 150)}{selectedText.length > 150 ? '...' : ''}"
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowReplaceModal(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReplace}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-900/30"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
