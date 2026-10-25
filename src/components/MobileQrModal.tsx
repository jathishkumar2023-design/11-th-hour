import React, { useState } from 'react';
import {
  Smartphone,
  QrCode,
  Copy,
  Check,
  X,
  Share2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface MobileQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileQrModal: React.FC<MobileQrModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://11thhour.health';

  // Google Chart API / QR Server URL for immediate dynamic QR code generation
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    currentUrl
  )}&bgcolor=091126&color=00F5D4`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl bg-[#091126] border-2 border-[#1C3166] shadow-2xl overflow-hidden text-slate-100 flex flex-col p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00F5D4]/20 border border-[#00F5D4] flex items-center justify-center text-[#00F5D4]">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Access on Phone</h3>
              <p className="text-[10px] font-mono text-slate-400">Scan Camera or Share Link</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="my-5 flex flex-col items-center justify-center">
          <div className="p-3 rounded-2xl bg-[#060C1A] border-2 border-[#00F5D4]/40 shadow-xl shadow-[#00F5D4]/10">
            <img
              src={qrCodeUrl}
              alt="Scan QR code on your mobile phone"
              className="w-48 h-48 rounded-xl object-contain"
            />
          </div>
          <span className="text-xs font-mono text-[#00F5D4] mt-2 font-bold flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5" />
            Scan with iPhone or Android camera
          </span>
        </div>

        {/* Copy Link Row */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[#070D1E] border border-slate-800">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="flex-1 bg-transparent text-[11px] font-mono text-slate-300 focus:outline-none truncate px-1"
            />
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 text-slate-200 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Quick instructions */}
          <div className="p-2.5 rounded-xl bg-[#0B1530] border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
            <span className="font-mono text-[10px] text-slate-400 block font-bold">MOBILE TIP:</span>
            <p>1. Open link in <strong>Safari (iOS)</strong> or <strong>Chrome (Android)</strong>.</p>
            <p>2. Tap <strong>Share &gt; Add to Home Screen</strong> for the native fullscreen experience.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-[#00F5D4] text-[#0B132B] font-bold text-xs cursor-pointer hover:bg-[#00c9ae]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
