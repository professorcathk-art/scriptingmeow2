"use client";

interface PolishModalProps {
  originalText: string;
  polishedText: string;
  fieldLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function PolishModal({
  originalText,
  polishedText,
  fieldLabel,
  onConfirm,
  onCancel,
  loading = false,
}: PolishModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="polish-modal-title"
    >
      <div className="glass-elevated rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/5">
          <h2 id="polish-modal-title" className="text-xl font-semibold text-white">
            AI polished: {fieldLabel}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Review the polished version below. Click &quot;Use polished&quot; to replace your text, or &quot;Cancel&quot; to keep your original.
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Your original
            </label>
            <div className="p-3 bg-white/5 rounded-xl text-zinc-300 text-sm whitespace-pre-wrap border border-white/5">
              {originalText || "(empty)"}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              AI polished version
            </label>
            <div className="p-3 bg-violet-500/10 rounded-xl text-white text-sm whitespace-pre-wrap border border-violet-500/20">
              {loading ? "Polishing..." : polishedText}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !polishedText}
            className="px-4 py-2 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Polishing..." : "Use polished"}
          </button>
        </div>
      </div>
    </div>
  );
}
