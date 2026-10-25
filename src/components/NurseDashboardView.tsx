import React, { useState } from 'react';
import {
  TriageRecord,
  AcuityLevel,
} from '../types/triage';
import {
  ShieldAlert,
  CheckCircle,
  AlertOctagon,
  Flame,
  Clock,
  User,
  Activity,
  FileCode,
  CheckSquare,
  Square,
  ChevronRight,
  X,
  Copy,
  Check,
  Stethoscope,
  HeartPulse,
  Zap,
  TrendingDown,
  Filter,
  Search,
  Sparkles,
  ClipboardList,
  SlidersHorizontal,
  ArrowUpRight,
} from 'lucide-react';
import ecgMonitorImg from '../assets/images/ecg_heart_monitor_1792832897081.jpg';

interface NurseDashboardViewProps {
  patients: TriageRecord[];
  onApproveTriage: (id: string) => void;
  onEscalateTriage: (id: string) => void;
  onOverrideAcuity: (id: string, newAcuity: AcuityLevel) => void;
  onDischargePatient: (id: string) => void;
  onSelectPatientForCare: (patient: TriageRecord) => void;
}

export const NurseDashboardView: React.FC<NurseDashboardViewProps> = ({
  patients,
  onApproveTriage,
  onEscalateTriage,
  onOverrideAcuity,
  onDischargePatient,
  onSelectPatientForCare,
}) => {
  const [selectedPatient, setSelectedPatient] = useState<TriageRecord | null>(null);
  const [checkedPreOrders, setCheckedPreOrders] = useState<Record<string, boolean>>({});
  const [copiedJson, setCopiedJson] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'RED' | 'AMBER' | 'GREEN'>('ALL');
  const [drawerTab, setDrawerTab] = useState<'clinical' | 'care' | 'json'>('clinical');

  // Filter patients
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.triage_metadata.patient_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.patient_name && p.patient_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.clinical_summary.chief_complaint.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'ALL') return true;
    return p.triage_metadata.acuity_level === activeFilter;
  });

  const redPatients = filteredPatients.filter((p) => p.triage_metadata.acuity_level === 'RED');
  const amberPatients = filteredPatients.filter((p) => p.triage_metadata.acuity_level === 'AMBER');
  const greenPatients = filteredPatients.filter((p) => p.triage_metadata.acuity_level === 'GREEN');

  // Queue counts
  const totalPatients = patients.length;
  const activeQueueCount = patients.filter((p) => p.nurse_status !== 'DISCHARGED').length;
  const totalMinutesSaved = Math.round(totalPatients * 7.5);

  const toggleOrder = (orderKey: string) => {
    setCheckedPreOrders((prev) => ({
      ...prev,
      [orderKey]: !prev[orderKey],
    }));
  };

  const copyPatientJson = (patient: TriageRecord) => {
    const cleanObj = {
      triage_metadata: patient.triage_metadata,
      clinical_summary: patient.clinical_summary,
      nurse_pre_orders: patient.nurse_pre_orders,
      care_continuum_plan: patient.care_continuum_plan,
      guardrails: patient.guardrails,
    };
    navigator.clipboard.writeText(JSON.stringify(cleanObj, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const renderLangBadge = (lang: string) => {
    if (lang === 'Hindi') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-orange-950/70 text-orange-300 border border-orange-500/30">
          HI
        </span>
      );
    }
    if (lang === 'Telugu') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-purple-950/70 text-purple-300 border border-purple-500/30">
          TE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-sky-950/70 text-sky-300 border border-sky-500/30">
        EN
      </span>
    );
  };

  const renderPatientCard = (patient: TriageRecord) => {
    const isRed = patient.triage_metadata.acuity_level === 'RED';
    const isAmber = patient.triage_metadata.acuity_level === 'AMBER';
    const isApproved = patient.nurse_status === 'APPROVED';
    const isEscalated = patient.nurse_status === 'ESCALATED';
    const isDischarged = patient.nurse_status === 'DISCHARGED';

    return (
      <div
        key={patient.id}
        className={`p-3.5 sm:p-4 rounded-2xl bg-[#0c1630] border transition-all duration-150 relative group ${
          isRed
            ? 'border-rose-500/40 hover:border-rose-400/80 shadow-lg shadow-rose-950/20'
            : isAmber
            ? 'border-amber-500/40 hover:border-amber-400/80 shadow-lg shadow-amber-950/20'
            : 'border-emerald-500/40 hover:border-emerald-400/80 shadow-lg shadow-emerald-950/20'
        }`}
      >
        {/* Top Meta Line: ID, Language, Time, ESI Badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-white bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700">
              {patient.triage_metadata.patient_id}
            </span>
            {renderLangBadge(patient.triage_metadata.detected_language)}
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 ml-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {new Date(patient.triage_metadata.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              isRed
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                : isAmber
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
            }`}
          >
            ESI-{patient.triage_metadata.acuity_level} · {patient.triage_metadata.esi_category}
          </span>
        </div>

        {/* Patient Name & Demographics */}
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h3 className="font-bold text-white text-sm sm:text-base tracking-tight truncate">
            {patient.patient_name || 'Emergency Walk-In'}
          </h3>
          <span className="text-xs text-slate-400 font-mono shrink-0">
            {patient.age ? `${patient.age}y` : 'Adult'} • {patient.gender || 'ED'}
          </span>
        </div>

        {/* Compact Chief Complaint */}
        <div className="p-2.5 rounded-xl bg-[#070e20] border border-slate-800/80 mb-2.5">
          <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-relaxed">
            {patient.clinical_summary.chief_complaint}
          </p>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-1.5">
            <span>
              Onset: <strong className="text-slate-300 font-normal">{patient.clinical_summary.symptom_onset_duration}</strong>
            </span>
            {patient.intake_duration_seconds && (
              <span className="text-[#00F5D4] font-mono text-[10px]">
                Intake: ~{patient.intake_duration_seconds}s
              </span>
            )}
          </div>
        </div>

        {/* Mini Telemetry Bar for Critical Patients */}
        {isRed && (
          <div className="mb-2.5 p-1.5 px-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-[11px] font-mono text-rose-300">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Telemetry: HR 87 BPM • SpO2 98%</span>
            </span>
            <span className="text-[10px] text-rose-400 font-bold uppercase">Critical Monitor</span>
          </div>
        )}

        {/* Symptoms Pills (Minimal) */}
        {patient.clinical_summary.reported_symptoms?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {patient.clinical_summary.reported_symptoms.slice(0, 3).map((s, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[10px] font-medium"
              >
                {s}
              </span>
            ))}
            {patient.clinical_summary.reported_symptoms.length > 3 && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-800/60 text-slate-400 text-[10px] font-mono">
                +{patient.clinical_summary.reported_symptoms.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Pre-Orders Tag Preview */}
        {patient.nurse_pre_orders && patient.nurse_pre_orders.length > 0 && (
          <div className="mb-3 text-[11px] text-slate-300 flex items-center gap-1.5 font-mono truncate">
            <ClipboardList className="w-3.5 h-3.5 text-[#00F5D4] shrink-0" />
            <span className="text-slate-400 truncate">
              Orders ({patient.nurse_pre_orders.length}):{' '}
              <span className="text-slate-200">{patient.nurse_pre_orders[0]}</span>
            </span>
          </div>
        )}

        {/* Status Badge + Actions */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 gap-2">
          {/* Status Badge */}
          <div>
            {isApproved ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/30">
                <Check className="w-3 h-3" /> Approved
              </span>
            ) : isEscalated ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-950/70 px-2 py-0.5 rounded border border-rose-500/40 animate-pulse font-bold">
                <Flame className="w-3 h-3" /> Escalated (MD)
              </span>
            ) : isDischarged ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-500/30">
                <HeartPulse className="w-3 h-3" /> Discharged
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                Pending Review
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {!isApproved && (
              <button
                onClick={() => onApproveTriage(patient.id)}
                title="Approve triage protocol"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>
            )}

            {!isRed && !isEscalated && (
              <button
                onClick={() => onEscalateTriage(patient.id)}
                title="Escalate acuity to MD"
                className="px-2 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/50 text-rose-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Escalate</span>
              </button>
            )}

            <button
              onClick={() => {
                setSelectedPatient(patient);
                setDrawerTab('clinical');
              }}
              title="Expand clinical chart & pre-orders"
              className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Review</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Streamlined Live HUD Bar */}
      <div className="mb-5 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-[#0C1630] via-[#091124] to-[#0D1836] border border-[#1C3166] shadow-xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
          {/* Active Patients */}
          <div className="flex items-center gap-3 pr-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-[#00F5D4]/40 flex items-center justify-center shrink-0 text-[#00F5D4]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Active Queue</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono text-white">{activeQueueCount}</span>
                <span className="text-xs text-slate-400 font-mono">/ {totalPatients} total</span>
              </div>
            </div>
          </div>

          {/* Acuity Breakdown */}
          <div className="flex items-center gap-3 sm:pl-4 pt-2 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300">
              <SlidersHorizontal className="w-4 h-4 text-[#00F5D4]" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">ESI Triage Mix</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/40">
                  {patients.filter((p) => p.triage_metadata.acuity_level === 'RED').length} RED
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40">
                  {patients.filter((p) => p.triage_metadata.acuity_level === 'AMBER').length} AMB
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  {patients.filter((p) => p.triage_metadata.acuity_level === 'GREEN').length} GRN
                </span>
              </div>
            </div>
          </div>

          {/* Intake Latency */}
          <div className="flex items-center gap-3 sm:pl-4 pt-2 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-[#00F5D4]/40 flex items-center justify-center shrink-0 text-[#00F5D4]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Inference Speed</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono text-[#00F5D4]">&lt; 1s</span>
                <span className="text-xs text-slate-400 font-mono">Gemini 1.5 Flash</span>
              </div>
            </div>
          </div>

          {/* Clinician Time Saved */}
          <div className="flex items-center gap-3 sm:pl-4 pt-2 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Shift Time Saved</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">~90%</span>
                <span className="text-xs text-slate-400 font-mono">({totalMinutesSaved}m saved)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Clean Search + Filter Tabs */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#091124] border border-slate-800">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search queue by Patient ID, Name, or Chief Complaint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#0e1936] border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00F5D4] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-[#00F5D4] text-[#050A17] font-bold shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            All ({patients.length})
          </button>
          <button
            onClick={() => setActiveFilter('RED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'RED'
                ? 'bg-rose-600 text-white font-bold shadow-sm'
                : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/40'
            }`}
          >
            RED ({patients.filter((p) => p.triage_metadata.acuity_level === 'RED').length})
          </button>
          <button
            onClick={() => setActiveFilter('AMBER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'AMBER'
                ? 'bg-amber-600 text-black font-bold shadow-sm'
                : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 border border-amber-800/40'
            }`}
          >
            AMBER ({patients.filter((p) => p.triage_metadata.acuity_level === 'AMBER').length})
          </button>
          <button
            onClick={() => setActiveFilter('GREEN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'GREEN'
                ? 'bg-emerald-600 text-[#050A17] font-bold shadow-sm'
                : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/40'
            }`}
          >
            GREEN ({patients.filter((p) => p.triage_metadata.acuity_level === 'GREEN').length})
          </button>
        </div>
      </div>

      {/* Real-time Priority Queue: 3 ESI Columns */}
      <div
        className={`grid gap-4 sm:gap-5 items-start ${
          activeFilter === 'ALL' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'
        }`}
      >
        {/* COLUMN 1: RED (Critical / Resuscitation) */}
        {(activeFilter === 'ALL' || activeFilter === 'RED') && (
          <div className="flex flex-col rounded-3xl bg-[#091124] border border-rose-500/50 shadow-xl p-4 sm:p-4.5">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-rose-500/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-600/20 border border-rose-500 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold tracking-wider text-rose-300 font-mono uppercase">
                    RED QUEUE
                  </h2>
                  <span className="text-[10px] text-slate-400">Critical / Resuscitation (ESI 1-2)</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold font-mono">
                {redPatients.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3 min-h-[140px]">
              {redPatients.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-2xl">
                  No active critical patients in RED queue.
                </div>
              ) : (
                redPatients.map(renderPatientCard)
              )}
            </div>
          </div>
        )}

        {/* COLUMN 2: AMBER (Urgent / Acutely Unstable) */}
        {(activeFilter === 'ALL' || activeFilter === 'AMBER') && (
          <div className="flex flex-col rounded-3xl bg-[#091124] border border-amber-500/50 shadow-xl p-4 sm:p-4.5">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-amber-500/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-600/20 border border-amber-500 flex items-center justify-center">
                  <AlertOctagon className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold tracking-wider text-amber-300 font-mono uppercase">
                    AMBER QUEUE
                  </h2>
                  <span className="text-[10px] text-slate-400">Urgent / Acutely Unstable (ESI 3)</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-600 text-black text-xs font-bold font-mono">
                {amberPatients.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3 min-h-[140px]">
              {amberPatients.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-2xl">
                  No urgent patients in AMBER queue.
                </div>
              ) : (
                amberPatients.map(renderPatientCard)
              )}
            </div>
          </div>
        )}

        {/* COLUMN 3: GREEN (Non-Urgent / Stable) */}
        {(activeFilter === 'ALL' || activeFilter === 'GREEN') && (
          <div className="flex flex-col rounded-3xl bg-[#091124] border border-emerald-500/50 shadow-xl p-4 sm:p-4.5">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-emerald-500/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold tracking-wider text-emerald-300 font-mono uppercase">
                    GREEN QUEUE
                  </h2>
                  <span className="text-[10px] text-slate-400">Non-Urgent / Stable (ESI 4-5)</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-[#0B132B] text-xs font-bold font-mono">
                {greenPatients.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3 min-h-[140px]">
              {greenPatients.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-2xl">
                  No non-urgent patients in GREEN queue.
                </div>
              ) : (
                greenPatients.map(renderPatientCard)
              )}
            </div>
          </div>
        )}
      </div>

      {/* Structured Clinical Workstation Drawer / Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0B132B] border-2 border-[#1C3166] shadow-2xl overflow-hidden">
            {/* Workstation Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0F1C3F]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    selectedPatient.triage_metadata.acuity_level === 'RED'
                      ? 'bg-rose-500 animate-ping'
                      : selectedPatient.triage_metadata.acuity_level === 'AMBER'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base sm:text-lg font-bold text-white">
                      {selectedPatient.patient_name || 'Emergency Intake'}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedPatient.triage_metadata.patient_id}
                    </span>
                    {renderLangBadge(selectedPatient.triage_metadata.detected_language)}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    ESI:{' '}
                    <span className="text-white font-bold">
                      {selectedPatient.triage_metadata.acuity_level} (
                      {selectedPatient.triage_metadata.esi_category})
                    </span>{' '}
                    • {new Date(selectedPatient.triage_metadata.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPatient(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs Inside Drawer */}
            <div className="flex border-b border-slate-800 bg-[#080E21] px-4 pt-2 gap-2 text-xs font-medium">
              <button
                onClick={() => setDrawerTab('clinical')}
                className={`pb-2.5 px-3 border-b-2 font-mono transition-colors cursor-pointer ${
                  drawerTab === 'clinical'
                    ? 'border-[#00F5D4] text-[#00F5D4] font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Clinical Orders &amp; Vitals
              </button>
              <button
                onClick={() => setDrawerTab('care')}
                className={`pb-2.5 px-3 border-b-2 font-mono transition-colors cursor-pointer ${
                  drawerTab === 'care'
                    ? 'border-[#00F5D4] text-[#00F5D4] font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Raw Intake &amp; Discharge Plan
              </button>
              <button
                onClick={() => setDrawerTab('json')}
                className={`pb-2.5 px-3 border-b-2 font-mono transition-colors cursor-pointer ${
                  drawerTab === 'json'
                    ? 'border-[#00F5D4] text-[#00F5D4] font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Clinical JSON
              </button>
            </div>

            {/* Workstation Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-200 flex-1">
              {drawerTab === 'clinical' && (
                <>
                  {/* Chief Complaint summary */}
                  <div className="p-3.5 rounded-2xl bg-[#0c1630] border border-slate-800">
                    <span className="text-[10px] font-mono text-[#00F5D4] font-bold uppercase tracking-wider block mb-1">
                      CHIEF COMPLAINT
                    </span>
                    <p className="text-sm font-semibold text-white leading-relaxed">
                      {selectedPatient.clinical_summary.chief_complaint}
                    </p>
                    <div className="mt-2 text-[11px] text-slate-400">
                      Onset Duration: <span className="text-slate-200">{selectedPatient.clinical_summary.symptom_onset_duration}</span>
                    </div>
                  </div>

                  {/* Reported Symptoms */}
                  {selectedPatient.clinical_summary.reported_symptoms?.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#0c1630] border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                        Reported Symptoms ({selectedPatient.clinical_summary.reported_symptoms.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPatient.clinical_summary.reported_symptoms.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-200 text-xs border border-slate-700/60 font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pre-Orders Checklist */}
                  <div className="p-3.5 rounded-2xl bg-[#0c1630] border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-[#00F5D4] font-bold uppercase tracking-wider">
                        Nurse Pre-Orders Checklist
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">Tap to toggle</span>
                    </div>

                    <div className="space-y-1.5">
                      {selectedPatient.nurse_pre_orders.map((order, idx) => {
                        const key = `${selectedPatient.id}-order-${idx}`;
                        const isChecked = !!checkedPreOrders[key];
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleOrder(key)}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                : 'bg-[#080E21] border-slate-800/80 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                            )}
                            <span className={`text-xs ${isChecked ? 'line-through text-slate-400' : ''}`}>
                              {order}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vital Targets */}
                  {selectedPatient.suggested_vitals && selectedPatient.suggested_vitals.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#0c1630] border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                        Target Vitals &amp; Parameters
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedPatient.suggested_vitals.map((v, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-[#080E21] border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-slate-200 block text-xs">{v.parameter}</span>
                              <span className="text-[11px] text-slate-400 font-mono">{v.expectedRange}</span>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              v.priority === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-600/40' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {v.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinician Acuity Override */}
                  <div className="p-3.5 rounded-2xl bg-[#080E21] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block">Acuity Override</span>
                      <span className="text-[11px] text-slate-400">Reassign level based on bedside exam</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onOverrideAcuity(selectedPatient.id, 'RED');
                          setSelectedPatient({
                            ...selectedPatient,
                            triage_metadata: {
                              ...selectedPatient.triage_metadata,
                              acuity_level: 'RED',
                              esi_category: 'Emergent',
                            },
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono cursor-pointer ${
                          selectedPatient.triage_metadata.acuity_level === 'RED'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
                        }`}
                      >
                        RED
                      </button>
                      <button
                        onClick={() => {
                          onOverrideAcuity(selectedPatient.id, 'AMBER');
                          setSelectedPatient({
                            ...selectedPatient,
                            triage_metadata: {
                              ...selectedPatient.triage_metadata,
                              acuity_level: 'AMBER',
                              esi_category: 'Urgent',
                            },
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono cursor-pointer ${
                          selectedPatient.triage_metadata.acuity_level === 'AMBER'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                        }`}
                      >
                        AMBER
                      </button>
                      <button
                        onClick={() => {
                          onOverrideAcuity(selectedPatient.id, 'GREEN');
                          setSelectedPatient({
                            ...selectedPatient,
                            triage_metadata: {
                              ...selectedPatient.triage_metadata,
                              acuity_level: 'GREEN',
                              esi_category: 'Non-Urgent',
                            },
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono cursor-pointer ${
                          selectedPatient.triage_metadata.acuity_level === 'GREEN'
                            ? 'bg-emerald-600 text-[#0B132B] shadow-sm'
                            : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                        }`}
                      >
                        GREEN
                      </button>
                    </div>
                  </div>
                </>
              )}

              {drawerTab === 'care' && (
                <>
                  {/* Original Raw Intake Audio/Transcript */}
                  {selectedPatient.transcription_raw && (
                    <div className="p-3.5 rounded-2xl bg-[#080E21] border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 block mb-1">
                        PATIENT VOICE TRANSCRIPT ({selectedPatient.triage_metadata.detected_language}):
                      </span>
                      <p className="text-slate-300 italic text-xs leading-relaxed">
                        "{selectedPatient.transcription_raw}"
                      </p>
                    </div>
                  )}

                  {/* CareContinuum Post-Discharge Recovery Preview */}
                  <div className="p-3.5 rounded-2xl bg-[#0c1630] border border-slate-800">
                    <span className="text-[10px] font-mono text-[#00F5D4] font-bold uppercase tracking-wider block mb-2">
                      CareContinuum Recovery Tasks ({selectedPatient.care_continuum_plan?.daily_recovery_tasks?.length || 0})
                    </span>
                    <ul className="space-y-1.5">
                      {selectedPatient.care_continuum_plan?.daily_recovery_tasks?.map((task, idx) => (
                        <li key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[#080E21] text-xs text-slate-300">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Medications */}
                  {selectedPatient.care_continuum_plan?.medications?.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#0c1630] border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                        Prescribed Discharge Medications
                      </span>
                      <div className="space-y-1.5">
                        {selectedPatient.care_continuum_plan.medications.map((med, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-[#080E21] flex items-center justify-between text-xs">
                            <span className="font-semibold text-white">{med.name}</span>
                            <span className="text-slate-400 font-mono text-[11px]">{med.dosage} • {med.frequency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {drawerTab === 'json' && (
                <div className="p-3.5 rounded-2xl bg-[#080E21] border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-slate-300">
                      Structured Clinical JSON Schema
                    </span>
                    <button
                      onClick={() => copyPatientJson(selectedPatient)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-[#030712] border border-slate-900 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-72">
                    {JSON.stringify(
                      {
                        triage_metadata: selectedPatient.triage_metadata,
                        clinical_summary: selectedPatient.clinical_summary,
                        nurse_pre_orders: selectedPatient.nurse_pre_orders,
                        care_continuum_plan: selectedPatient.care_continuum_plan,
                        guardrails: selectedPatient.guardrails,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>

            {/* Workstation Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-[#0F1C3F] flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate max-w-xs">{selectedPatient.guardrails.disclaimer}</span>
              </div>

              <div className="flex items-center gap-2">
                {selectedPatient.nurse_status !== 'APPROVED' && (
                  <button
                    onClick={() => onApproveTriage(selectedPatient.id)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve Triage</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onDischargePatient(selectedPatient.id);
                    onSelectPatientForCare(selectedPatient);
                    setSelectedPatient(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  <HeartPulse className="w-4 h-4" />
                  <span>Discharge to CareContinuum</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
