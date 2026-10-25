import React from 'react';
import { ActiveTab } from './Navbar';
import {
  Mic,
  Stethoscope,
  HeartPulse,
  User,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  redCount: number;
  onOpenQr: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  redCount,
  onOpenQr,
}) => {
  const { currentUser, openLoginModal } = useAuth();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070D1E]/95 backdrop-blur-xl border-t border-[#1C3166] px-2 py-2 flex items-center justify-around shadow-2xl safe-area-inset-bottom">
      {/* 1. Intake */}
      <button
        onClick={() => setActiveTab('intake')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'intake'
            ? 'text-[#00F5D4] font-bold'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-lg ${activeTab === 'intake' ? 'bg-[#00F5D4]/15' : ''}`}>
          <Mic className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-mono mt-0.5">Intake</span>
      </button>

      {/* 2. Nurse Desk */}
      <button
        onClick={() => setActiveTab('nurse')}
        className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'nurse'
            ? 'text-blue-400 font-bold'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-lg relative ${activeTab === 'nurse' ? 'bg-blue-500/15' : ''}`}>
          <Stethoscope className="w-5 h-5" />
          {redCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold flex items-center justify-center animate-pulse">
              {redCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono mt-0.5">Triage</span>
      </button>

      {/* 3. CareContinuum */}
      <button
        onClick={() => setActiveTab('care')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'care'
            ? 'text-emerald-400 font-bold'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <div className={`p-1 rounded-lg ${activeTab === 'care' ? 'bg-emerald-500/15' : ''}`}>
          <HeartPulse className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-mono mt-0.5">Recovery</span>
      </button>

      {/* 4. Patient Profile or Sign In */}
      <button
        onClick={openLoginModal}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
      >
        <div className="p-1 rounded-lg">
          <User className="w-5 h-5 text-slate-300" />
        </div>
        <span className="text-[10px] font-mono mt-0.5">
          {currentUser ? currentUser.patientId || 'Profile' : 'Sign In'}
        </span>
      </button>

      {/* 5. QR Code Link for Phone */}
      <button
        onClick={onOpenQr}
        title="Open on another mobile phone"
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-400 hover:text-[#00F5D4] transition-all cursor-pointer"
      >
        <div className="p-1 rounded-lg">
          <QrCode className="w-5 h-5 text-[#00F5D4]" />
        </div>
        <span className="text-[10px] font-mono mt-0.5 text-[#00F5D4]">Share</span>
      </button>
    </nav>
  );
};
