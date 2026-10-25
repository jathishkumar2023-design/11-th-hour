import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  ShieldCheck,
  Stethoscope,
  X,
  Languages,
  CheckCircle2,
  LogIn,
  UserPlus,
  Database,
  ArrowRight,
  Search,
  Building2,
  BadgeAlert,
} from 'lucide-react';
import { TriageRecord } from '../types/triage';

interface LoginModalProps {
  patients: TriageRecord[];
}

export const LoginModal: React.FC<LoginModalProps> = ({ patients }) => {
  const {
    isLoginModalOpen,
    closeLoginModal,
    loginAsPatient,
    loginAsNurse,
    isDbConnected,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'patient' | 'register' | 'nurse'>('patient');

  // Existing patient chart selection
  const [selectedPatientId, setSelectedPatientId] = useState(
    patients[0]?.triage_metadata?.patient_id || 'P-1082'
  );
  const [patientSearch, setPatientSearch] = useState('');

  // Registration state
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('42');
  const [regGender, setRegGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [regLanguage, setRegLanguage] = useState<'English' | 'Hindi' | 'Telugu'>('English');
  const [regComplaint, setRegComplaint] = useState('');

  // Nurse Lead state
  const [nurseName, setNurseName] = useState('RN Sarah Jenkins, BSN');
  const [nurseBadge, setNurseBadge] = useState('RN-4409');
  const [stationRole, setStationRole] = useState('Triage Charge Nurse (Pod A)');

  if (!isLoginModalOpen) return null;

  const handlePatientSignIn = () => {
    const p =
      patients.find((pat) => pat.triage_metadata.patient_id === selectedPatientId) ||
      patients[0];
    loginAsPatient(
      p.triage_metadata.patient_id,
      p.patient_name || 'Patient',
      p.age || 42,
      p.triage_metadata.detected_language
    );
  };

  const handleRegisterNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;
    const newPid = `P-${Math.floor(1000 + Math.random() * 9000)}`;
    loginAsPatient(newPid, regName.trim(), Number(regAge) || 42, regLanguage);
  };

  const handleNurseSignIn = () => {
    loginAsNurse(`${nurseName} — ${stationRole}`, nurseBadge);
  };

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase();
    return (
      p.triage_metadata.patient_id.toLowerCase().includes(q) ||
      (p.patient_name && p.patient_name.toLowerCase().includes(q)) ||
      p.clinical_summary.chief_complaint.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050A17]/85 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#0B142B] border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0E1B3D] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00F5D4]/15 border border-[#00F5D4]/40 flex items-center justify-center text-[#00F5D4] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Hospital Access &amp; Records Portal
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {isDbConnected ? 'Live Firestore' : 'Database Ready'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Trauma Center Clinical System · Patient Chart &amp; Nurse Desk
              </p>
            </div>
          </div>

          <button
            onClick={closeLoginModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-[#070D1F] px-4 pt-2 gap-1">
          <button
            onClick={() => setActiveTab('patient')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'patient'
                ? 'border-[#00F5D4] text-[#00F5D4]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Patient Chart Access
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'border-[#00F5D4] text-[#00F5D4]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            New Patient Admission
          </button>
          <button
            onClick={() => setActiveTab('nurse')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'nurse'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Clinical Staff (RN)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-4">
          {/* TAB 1: Existing Patient Record Lookup */}
          {activeTab === 'patient' && (
            <div className="space-y-3.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by Patient MRN, Name, or Condition..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#070D1F] border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F5D4]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1.5">
                  Select Active Hospital Patient Chart:
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {filteredPatients.map((p) => {
                    const isSelected = selectedPatientId === p.triage_metadata.patient_id;
                    const isRed = p.triage_metadata.acuity_level === 'RED';
                    const isAmber = p.triage_metadata.acuity_level === 'AMBER';

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPatientId(p.triage_metadata.patient_id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#00F5D4]/10 border-[#00F5D4] shadow-sm'
                            : 'bg-[#091124] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isSelected
                                ? 'bg-[#00F5D4] text-[#0B132B]'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">
                                {p.patient_name || 'Patient'}
                              </span>
                              <span className="text-[10px] font-mono text-cyan-300">
                                {p.triage_metadata.patient_id}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 max-w-[280px]">
                              {p.clinical_summary.chief_complaint}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isRed
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                                : isAmber
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                            }`}
                          >
                            ESI-{p.triage_metadata.acuity_level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handlePatientSignIn}
                className="w-full py-2.5 rounded-xl bg-[#00F5D4] hover:bg-[#00e0c2] text-[#0B132B] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-[#00F5D4]/20"
              >
                <span>Load Patient Chart &amp; CareContinuum</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 2: Register New Patient */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterNewPatient} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Full Legal Patient Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1F] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Age</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={regAge}
                    onChange={(e) => setRegAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1F] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Gender</label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1F] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Language</label>
                  <select
                    value={regLanguage}
                    onChange={(e) => setRegLanguage(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1F] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">हिंदी (Hindi)</option>
                    <option value="Telugu">తెలుగు (Telugu)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Presenting Complaint / Reason for Emergency Visit
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sudden severe headache and blurred vision"
                  value={regComplaint}
                  onChange={(e) => setRegComplaint(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070D1F] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-xl bg-[#00F5D4] hover:bg-[#00e0c2] text-[#0B132B] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-[#00F5D4]/20"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Hospital Profile &amp; Sign In</span>
              </button>
            </form>
          )}

          {/* TAB 3: Clinical Staff Access */}
          {activeTab === 'nurse' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-bold">
                  <Stethoscope className="w-4 h-4" />
                  <span>Clinical Lead Authentication</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Authorizes Emergency Department Registered Nurses (RN) and Attending Clinicians to review incoming voice triage cases, sign off on pre-orders, and manage admissions.
                </p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Clinician Name &amp; Title
                  </label>
                  <input
                    type="text"
                    value={nurseName}
                    onChange={(e) => setNurseName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070D1F] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Staff Badge ID
                    </label>
                    <input
                      type="text"
                      value={nurseBadge}
                      onChange={(e) => setNurseBadge(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1F] border border-slate-700/80 text-xs text-white font-mono focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Station Assignment
                    </label>
                    <input
                      type="text"
                      value={stationRole}
                      onChange={(e) => setStationRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#070D1F] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleNurseSignIn}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-500/20"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In as Active Triage Lead</span>
              </button>
            </div>
          )}

          {/* Security & HIPAA Compliance Notice */}
          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00F5D4]" />
              <span>HL7/FHIR Data Standard Compliant</span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">256-Bit TLS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
