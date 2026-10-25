import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { PatientIntakeView } from './components/PatientIntakeView';
import { NurseDashboardView } from './components/NurseDashboardView';
import { CareContinuumView } from './components/CareContinuumView';
import { PurposeCard } from './components/PurposeCard';
import { LoginModal } from './components/LoginModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileQrModal } from './components/MobileQrModal';
import { INITIAL_PATIENTS } from './data/initialData';
import { TriageRecord, AcuityLevel } from './types/triage';
import { soundFx } from './utils/audio';
import {
  subscribeToTriageRecords,
  saveTriageRecordToFirestore,
  updateTriageStatusInFirestore,
} from './services/database';
import {
  Activity,
  ShieldAlert,
  Clock,
  Sparkles,
  HeartHandshake,
  CheckCircle,
  HelpCircle,
  Zap,
  HeartPulse,
  ArrowRight,
  X,
  Languages,
  User,
  Database,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

function MainAppContent() {
  const { currentUser, isDbConnected, openLoginModal } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('intake');
  const [patients, setPatients] = useState<TriageRecord[]>(INITIAL_PATIENTS);
  const [activeCarePatient, setActiveCarePatient] = useState<TriageRecord | null>(INITIAL_PATIENTS[1]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPurposeOpen, setIsPurposeOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [showPurposeBanner, setShowPurposeBanner] = useState(false); // default collapsed so signed-in view takes center stage

  // Real-time Firestore sync
  useEffect(() => {
    const unsubscribe = subscribeToTriageRecords(
      (records) => {
        if (records && records.length > 0) {
          setPatients(records);
        }
      },
      (err) => {
        console.warn('Firestore subscription fallback:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // When patient logs in, find and set their active record
  useEffect(() => {
    if (currentUser?.patientId) {
      const match = patients.find((p) => p.triage_metadata?.patient_id === currentUser.patientId);
      if (match) {
        setActiveCarePatient(match);
      }
    }
  }, [currentUser, patients]);

  // Compute live queue counts
  const redCount = patients.filter((p) => p.triage_metadata.acuity_level === 'RED' && p.nurse_status !== 'DISCHARGED').length;
  const amberCount = patients.filter((p) => p.triage_metadata.acuity_level === 'AMBER' && p.nurse_status !== 'DISCHARGED').length;
  const greenCount = patients.filter((p) => p.triage_metadata.acuity_level === 'GREEN' && p.nurse_status !== 'DISCHARGED').length;

  const handleIntakeCompleted = async (newRecord: TriageRecord) => {
    // If logged in as patient, associate with their account
    if (currentUser?.patientId) {
      newRecord.triage_metadata.patient_id = currentUser.patientId;
      newRecord.patient_name = currentUser.displayName || newRecord.patient_name;
    }

    setPatients((prev) => [newRecord, ...prev.filter((p) => p.id !== newRecord.id)]);
    setActiveCarePatient(newRecord);

    try {
      await saveTriageRecordToFirestore(newRecord);
    } catch (err) {
      console.warn('Saved to state (offline Firestore fallback)');
    }
  };

  const handleApproveTriage = async (id: string) => {
    if (soundEnabled) soundFx.playSuccess();
    const updates: Partial<TriageRecord> = {
      nurse_status: 'APPROVED',
      nurse_assigned: currentUser?.role === 'nurse' ? currentUser.displayName : 'RN Staff Clinical Lead',
      approval_timestamp: new Date().toISOString(),
    };

    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    try {
      await updateTriageStatusInFirestore(id, updates);
    } catch (e) {}
  };

  const handleEscalateTriage = async (id: string) => {
    if (soundEnabled) soundFx.playCriticalAlert();
    const updates: Partial<TriageRecord> = {
      nurse_status: 'ESCALATED',
      triage_metadata: {
        ...(patients.find((p) => p.id === id)?.triage_metadata as any),
        acuity_level: 'RED',
        esi_category: 'Emergent',
      },
    };

    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    try {
      await updateTriageStatusInFirestore(id, updates);
    } catch (e) {}
  };

  const handleOverrideAcuity = async (id: string, newAcuity: AcuityLevel) => {
    const categoryMap = {
      RED: 'Emergent' as const,
      AMBER: 'Urgent' as const,
      GREEN: 'Non-Urgent' as const,
    };

    const target = patients.find((p) => p.id === id);
    if (!target) return;

    const updates: Partial<TriageRecord> = {
      triage_metadata: {
        ...target.triage_metadata,
        acuity_level: newAcuity,
        esi_category: categoryMap[newAcuity],
      },
    };

    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    try {
      await updateTriageStatusInFirestore(id, updates);
    } catch (e) {}
  };

  const handleDischargePatient = async (id: string) => {
    const updates: Partial<TriageRecord> = {
      nurse_status: 'DISCHARGED',
    };

    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    try {
      await updateTriageStatusInFirestore(id, updates);
    } catch (e) {}
  };

  const handleSelectPatientForCare = (patient: TriageRecord) => {
    setActiveCarePatient(patient);
    setActiveTab('care');
  };

  // Find signed-in patient's active clinical record
  const signedInPatientRecord = currentUser?.patientId
    ? patients.find((p) => p.triage_metadata?.patient_id === currentUser.patientId)
    : null;

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col font-sans selection:bg-[#00F5D4]/20 selection:text-[#00F5D4]">
      {/* Top Navbar with Auth Integration */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        redCount={redCount}
        amberCount={amberCount}
        greenCount={greenCount}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onOpenPurpose={() => setIsPurposeOpen(true)}
        onOpenQr={() => setIsQrModalOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 pb-24 sm:pb-12">
        {/* SIGNED-IN PATIENT LIVE STATUS BANNER */}
        {currentUser && currentUser.role === 'patient' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#091226] border border-slate-700/80 shadow-lg relative">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#00F5D4]/15 border border-[#00F5D4]/40 flex items-center justify-center shrink-0 text-[#00F5D4]">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">
                        {currentUser.displayName}
                      </span>
                      <span className="text-xs font-mono text-cyan-300">
                        MRN: {currentUser.patientId}
                      </span>
                      <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
                      <span className="text-[11px] text-slate-400">
                        {currentUser.preferredLanguage || 'English'}
                      </span>
                    </div>

                    {signedInPatientRecord ? (
                      <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          <strong className="text-slate-400 font-medium">Chief Complaint:</strong>{' '}
                          {signedInPatientRecord.clinical_summary.chief_complaint}
                        </span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span>
                          <strong className="text-slate-400 font-medium">Acuity:</strong>{' '}
                          <span
                            className={`font-mono font-bold ${
                              signedInPatientRecord.triage_metadata.acuity_level === 'RED'
                                ? 'text-rose-400'
                                : signedInPatientRecord.triage_metadata.acuity_level === 'AMBER'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            ESI-{signedInPatientRecord.triage_metadata.acuity_level} (
                            {signedInPatientRecord.triage_metadata.esi_category})
                          </span>
                        </span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span>
                          <strong className="text-slate-400 font-medium">Status:</strong>{' '}
                          <span className="text-cyan-300 font-mono text-[11px]">
                            {signedInPatientRecord.nurse_status}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        No active intake visit recorded for this session yet. Tap below to begin voice intake.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                  <button
                    onClick={() => {
                      if (signedInPatientRecord) {
                        setActiveCarePatient(signedInPatientRecord);
                      }
                      setActiveTab('care');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                  >
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>Recovery Plan</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('intake')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>New Intake</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Purpose Card Banner */}
        {showPurposeBanner && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#0C1A3A] via-[#09142E] to-[#0E1E45] border-2 border-[#1E3770] shadow-xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#00F5D4]/20 border border-[#00F5D4] flex items-center justify-center shrink-0 text-[#00F5D4]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded bg-cyan-950 text-[#00F5D4] border border-[#00F5D4]/40">
                        PURPOSE
                      </span>
                      <span className="text-xs font-bold text-white">
                        Emergency Voice Triage (&lt;30s) &amp; Post-Discharge CareContinuum
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Eliminates triage intake delay via voice (EN/HI/TE) and automates home recovery checklists.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                  <button
                    onClick={() => setIsPurposeOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#00F5D4] hover:bg-[#00c9ae] text-[#0B132B] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <span>View Mission Blueprint</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowPurposeBanner(false)}
                    title="Dismiss Banner"
                    className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Switcher Output */}
        {activeTab === 'intake' && (
          <PatientIntakeView
            onIntakeCompleted={handleIntakeCompleted}
            onNavigateToNurse={() => setActiveTab('nurse')}
            soundEnabled={soundEnabled}
          />
        )}

        {activeTab === 'nurse' && (
          <NurseDashboardView
            patients={patients}
            onApproveTriage={handleApproveTriage}
            onEscalateTriage={handleEscalateTriage}
            onOverrideAcuity={handleOverrideAcuity}
            onDischargePatient={handleDischargePatient}
            onSelectPatientForCare={handleSelectPatientForCare}
          />
        )}

        {activeTab === 'care' && (
          <CareContinuumView
            patients={patients}
            activePatient={activeCarePatient}
            onSelectPatient={setActiveCarePatient}
            soundEnabled={soundEnabled}
          />
        )}
      </main>

      {/* Purpose Modal */}
      <PurposeCard
        isOpen={isPurposeOpen}
        onClose={() => setIsPurposeOpen(false)}
        onNavigateToView={(view) => {
          setActiveTab(view);
          setIsPurposeOpen(false);
        }}
      />

      {/* Patient & Staff Login Modal */}
      <LoginModal patients={patients} />

      {/* Hospital Network Clinical System Footer */}
      <footer className="border-t border-slate-800 bg-[#060C1B] py-6 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00F5D4]/10 border border-[#00F5D4]/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#00F5D4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white tracking-wider">
                  11TH HOUR <span className="text-[#00F5D4]">TRIAGE</span>
                </span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {isDbConnected ? 'Firestore Connected' : 'Database Ready'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Seconds decide outcomes. Multilingual voice emergency triage &amp; CareContinuum.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px]">
            {!currentUser && (
              <button
                onClick={openLoginModal}
                className="text-[#00F5D4] hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Patient / Staff Portal</span>
              </button>
            )}
            <button
              onClick={() => setIsPurposeOpen(true)}
              className="text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#00F5D4]" />
              <span>Mission Guide</span>
            </button>
            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>ESI Protocol Compliant</span>
            </span>
            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">·</span>
            <span className="text-rose-300 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Clinician Sign-off Required</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Mobile Floating Bottom Bar for Phone Users */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        redCount={redCount}
        onOpenQr={() => setIsQrModalOpen(true)}
      />

      {/* QR Code Modal to open the app directly on any smartphone */}
      <MobileQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
