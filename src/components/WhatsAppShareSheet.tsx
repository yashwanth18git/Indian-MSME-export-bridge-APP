import React, { useState } from 'react';
import { Check, Copy, MessageSquareShare, X } from 'lucide-react';

interface WhatsAppShareSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  recipientPhone?: string;
  message: string;
}

export const WhatsAppShareSheet: React.FC<WhatsAppShareSheetProps> = ({
  open,
  onClose,
  title,
  recipientPhone,
  message,
}) => {
  const [editedMessage, setEditedMessage] = useState(message);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    setEditedMessage(message);
    setCopied(false);
  }, [message, open]);

  if (!open) return null;

  const cleanPhone = (recipientPhone || '').replace(/[^\d]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    editedMessage
  )}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Share via WhatsApp Business"
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-3" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {recipientPhone
                ? `Recipient: ${recipientPhone}`
                : 'Ready to share via WhatsApp Business or Email'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share sheet"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">
              Buyer Message Preview (Editable)
            </span>
            <textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              rows={8}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
            />
          </label>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Message</span>
                </>
              )}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3D5E] text-sm font-medium text-white hover:bg-[#0b2f49] transition-colors whitespace-nowrap"
            >
              <MessageSquareShare className="w-4 h-4" />
              <span>Open WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
