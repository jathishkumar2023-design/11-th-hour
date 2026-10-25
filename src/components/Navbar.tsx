import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  ShieldAlert,
  Stethoscope,
  HeartPulse,
  Mic,
  Volume2,
  VolumeX,
  UserCheck,
  LogOut,
  Smartphone,
  Info,
} from 'lucide-react';

export type ActiveTab = 'intake' | 'nurse' | 'care';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  redCount: number;
  amberCount: number;
  greenCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  onOpenPurpose: () => void;
  onOpenQr: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  redCount,
  amberCount,
  greenCount,
  soundEnabled,
  setSoundEnabled,
  onOpenPurpose,
  onOpenQr,
}) => {
  const { currentUser, openLoginModal, logout, isDbConnected } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-[#070D1F]/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
      {/* Top Clinical Safety & Network Bar */}
      <div className="bg-[#0A1329] border-b border-slate-800/80 px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-200 font-semibold tracking-wider text-[11px]">
            11TH HOUR EMERGENCY MEDICINE
          </span>
          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-slate-400 hidden sm:inline text-[11px]">
            Trauma Center Level-1 Hub
          </span>
          <span className="text-slate-600 hidden md:inline" aria-hidden="true">·</span>
          <button
            onClick={onOpenPurpose}
            className="inline-flex items-center gap-1 font-mono text-[11px] text-[#00F5D4] hover:text-white transition-colors cursor-pointer"
          >
            <Info className="w-3 h-3 text-[#00F5D4]" />
            <span>Mission &amp; Clinical Blueprint</span>
          </button>
        </div>

        {/* Human-in-the-Loop Safety Notice */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-300">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="hidden sm:inline">Assistive AI Protocol</span>
            <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
            <span>Clinician Sign-off Required</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F5D4]/20 via-[#0A1838] to-[#0A1838] border border-[#00F5D4]/40 flex items-center justify-center shrink-0 shadow-sm">
            <Activity className="w-5 h-5 text-[#00F5D4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="flex items-baseline">
                <span className="font-mono text-2xl font-black tracking-tight text-[#00F5D4]">
                  11
                </span>
                <span className="text-[10px] font-mono font-bold text-[#00F5D4] ml-0.5 -translate-y-1.5 inline-block">
                  TH
                </span>
                <span className="text-lg font-black tracking-[0.2em] text-white uppercase ml-1.5 font-sans">
                  HOUR
                </span>
              </div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase">
                TRIAGE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block tracking-normal font-normal">
              Seconds decide outcomes. Zero intake friction.
            </p>
          </div>
        </div>

        {/* Tab Navigation Segmented Control */}
        <nav className="flex items-center p-1 bg-[#050A17] rounded-xl border border-slate-800/90 shadow-inner">
          {/* VIEW A: Intake */}
          <button
            onClick={() => setActiveTab('intake')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'intake'
                ? 'bg-[#00F5D4] text-[#050A17] shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Mic className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Voice Intake</span>
          </button>

          {/* VIEW B: Nurse Desk */}
          <button
            onClick={() => setActiveTab('nurse')}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'nurse'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Nurse Desk</span>
            {/* Acuity counters */}
            <div className="flex items-center gap-1 ml-1 text-[10px] font-mono tabular-nums">
              {redCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold">
                  {redCount}
                </span>
              )}
              {amberCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-black font-bold">
                  {amberCount}
                </span>
              )}
            </div>
          </button>

          {/* VIEW C: CareContinuum */}
          <button
            onClick={() => setActiveTab('care')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'care'
                ? 'bg-teal-600 text-white shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">CareContinuum</span>
          </button>
        </nav>

        {/* Right Action Cluster: User Auth, Phone QR, Audio */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {currentUser ? (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#0B142B] border border-slate-700/80">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  currentUser.role === 'nurse'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#00F5D4] text-[#050A17]'
                }`}
              >
                {currentUser.role === 'nurse' ? 'RN' : 'PT'}
              </div>
              <div className="hidden sm:block text-left pr-1 leading-tight">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="truncate max-w-[130px]">{currentUser.displayName}</span>
                  {currentUser.patientId && (
                    <span className="text-[10px] font-mono text-cyan-300">
                      {currentUser.patientId}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  {currentUser.role === 'nurse' ? 'Clinical Staff' : 'Patient Chart'}
                </div>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="p-1 rounded-md text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00F5D4] hover:bg-[#00e0c2] text-[#050A17] font-bold text-xs transition-colors cursor-pointer shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* QR on Phone Button */}
          <button
            onClick={onOpenQr}
            title="Scan QR to open on smartphone"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-[#00F5D4] border border-slate-700/70 transition-colors cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#00F5D4]" />
            <span>Phone Access</span>
          </button>

          {/* Audio Alerts Mute/Unmute */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Medical Audio Alerts' : 'Enable Medical Audio Alerts'}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 transition-colors cursor-pointer"
            aria-label="Toggle sound alerts"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#00F5D4]" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
