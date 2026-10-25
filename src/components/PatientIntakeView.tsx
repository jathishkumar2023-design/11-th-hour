import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  CheckCircle2,
  ArrowRight,
  Send,
  RotateCcw,
  Languages,
  Activity,
  HeartCrack,
  Thermometer,
  Bandage,
  Eye,
  Sparkles,
  Clock,
  ShieldAlert,
  User,
  Phone,
  Calendar,
  Lock,
  Unlock,
  Edit3,
  Check,
  AlertCircle,
} from 'lucide-react';
import { AudioWaveform } from './AudioWaveform';
import { SupportedLanguage, TriageRecord } from '../types/triage';
import { soundFx } from '../utils/audio';
import { useAuth } from '../context/AuthContext';

import triageDeskImg from '../assets/images/emergency_triage_desk_1792832863475.jpg';

interface PatientIntakeViewProps {
  onIntakeCompleted: (record: TriageRecord) => void;
  onNavigateToNurse: () => void;
  soundEnabled: boolean;
}

export interface PatientBioData {
  name: string;
  age: number | string;
  gender: string;
  mrn: string;
  phone: string;
  language: SupportedLanguage;
  notes?: string;
}

export const PatientIntakeView: React.FC<PatientIntakeViewProps> = ({
  onIntakeCompleted,
  onNavigateToNurse,
  soundEnabled,
}) => {
  const { currentUser } = useAuth();

  // Patient Bio Identity Gate State
  const [bio, setBio] = useState<PatientBioData>(() => {
    return {
      name: currentUser?.displayName || '',
      age: currentUser?.age || 34,
      gender: currentUser?.gender || 'Female',
      mrn: currentUser?.patientId || `P-${Math.floor(1000 + Math.random() * 9000)}`,
      phone: '+1 (555) 749-2180',
      language: currentUser?.preferredLanguage || 'English',
      notes: '',
    };
  });

  // Track if patient bio has been verified and confirmed
  const [isBioVerified, setIsBioVerified] = useState<boolean>(() => {
    // If logged in as patient with MRN, consider pre-verified
    return !!(currentUser && currentUser.role === 'patient' && currentUser.displayName);
  });

  const [bioError, setBioError] = useState<string | null>(null);

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    currentUser?.preferredLanguage || 'English'
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [completedRecord, setCompletedRecord] = useState<TriageRecord | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const bioCardRef = useRef<HTMLDivElement | null>(null);

  // Sync auth updates if user changes
  useEffect(() => {
    if (currentUser?.displayName) {
      setBio((prev) => ({
        ...prev,
        name: currentUser.displayName || prev.name,
        mrn: currentUser.patientId || prev.mrn,
        age: currentUser.age || prev.age,
        gender: currentUser.gender || prev.gender,
        language: currentUser.preferredLanguage || prev.language,
      }));
      if (currentUser.role === 'patient') {
        setIsBioVerified(true);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const stopMediaStream = () => {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }
  };

  const handleConfirmBio = () => {
    if (!bio.name.trim()) {
      setBioError('Patient Full Name is required before beginning intake.');
      return;
    }
    if (!bio.age || Number(bio.age) <= 0) {
      setBioError('Please enter a valid age.');
      return;
    }
    setBioError(null);
    setIsBioVerified(true);
    if (soundEnabled) soundFx.playSuccess();
  };

  const handleEditBio = () => {
    setIsBioVerified(false);
  };

  const handleGenerateNewMrn = () => {
    setBio((prev) => ({
      ...prev,
      mrn: `P-${Math.floor(1000 + Math.random() * 9000)}`,
    }));
  };

  const startVoiceIntake = async () => {
    if (!isBioVerified) {
      setBioError('Please verify and confirm patient bio details above before activating voice intake.');
      bioCardRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setCompletedRecord(null);
    setTranscript('');
    audioChunksRef.current = [];

    if (soundEnabled) soundFx.playMicStart();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        if (selectedLanguage === 'Hindi') recognition.lang = 'hi-IN';
        else if (selectedLanguage === 'Telugu') recognition.lang = 'te-IN';
        else recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          setTranscript(currentTranscript.trim());
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {}
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);

        try {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
        } catch (err) {}
      }
    } catch (micErr) {}

    setIsRecording(true);
  };

  const stopVoiceIntakeAndProcess = async (textOverride?: string) => {
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    stopMediaStream();

    const inputText = textOverride || transcript || manualText;
    if (!inputText.trim()) return;

    await processTriageIntake(inputText);
  };

  const processTriageIntake = async (inputText: string) => {
    setIsAnalyzing(true);
    const startTimestamp = performance.now();

    try {
      const response = await fetch('/api/triage/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: inputText,
          language: selectedLanguage,
          bio: {
            name: bio.name,
            age: Number(bio.age),
            gender: bio.gender,
            phone: bio.phone,
            patientId: bio.mrn,
          },
        }),
      });

      const result = await response.json();
      const elapsedMs = Math.round(performance.now() - startTimestamp);
      setLastLatencyMs(elapsedMs);

      if (result.success && result.data) {
        const triageData = result.data;
        const newRecord: TriageRecord = {
          id: `rec-${Date.now()}`,
          patient_name: bio.name || `Patient ${triageData.triage_metadata?.patient_id || 'Walk-In'}`,
          age: Number(bio.age) || 35,
          gender: bio.gender || 'Not specified',
          phone: bio.phone || '+1 (555) 749-2180',
          transcription_raw: inputText,
          triage_metadata: triageData.triage_metadata,
          clinical_summary: triageData.clinical_summary,
          nurse_pre_orders: triageData.nurse_pre_orders || [],
          care_continuum_plan: triageData.care_continuum_plan || { medications: [], daily_recovery_tasks: [] },
          follow_up_session: triageData.follow_up_session || {
            id: `fs-${triageData.triage_metadata?.patient_id || 'auto'}`,
            department: /eye|ocular|vision/i.test(inputText)
              ? 'Emergency Ophthalmology & Cornea Specialty Clinic'
              : 'Specialty Outpatient Care Clinic',
            clinicianName: /eye|ocular|vision/i.test(inputText)
              ? 'Dr. Aris Thorne, MD (Ophthalmic Specialist)'
              : 'Staff Attending Physician',
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            scheduledTime: '10:00',
            location: 'Pavilion Suite 104',
            status: 'SCHEDULED',
            alertsEnabled: { sms: true, voiceCall: false, calendarSync: true, audioAlarm: true },
            phoneNotification: bio.phone,
            prerequisites: ['Bring discharge medications', 'Keep eye shield on if prescribed'],
          },
          guardrails: triageData.guardrails || {
            status: 'ASSISTIVE_ONLY',
            requires_nurse_approval: true,
            disclaimer: 'AI suggestion only. Human clinician sign-off required.',
          },
          nurse_status: 'PENDING_REVIEW',
        };

        setCompletedRecord(newRecord);
        onIntakeCompleted(newRecord);
        if (soundEnabled) {
          if (newRecord.triage_metadata.acuity_level === 'RED') {
            soundFx.playCriticalAlert();
          } else {
            soundFx.playSuccess();
          }
        }
      } else {
        // Fallback condition-aware record
        const fallbackId = bio.mrn || `P-${Math.floor(1000 + Math.random() * 9000)}`;
        const isEye = /eye|vision|cornea|photophobia|ocular|tear|blink|आँख|కన్ను/i.test(inputText);
        const isChest = /chest|cardiac|heart|breath|shortness|दिल|छाती|గుండె/i.test(inputText);

        const fallbackRecord: TriageRecord = {
          id: `rec-${Date.now()}`,
          patient_name: bio.name || `Patient ${fallbackId}`,
          age: Number(bio.age) || 35,
          gender: bio.gender || 'Not specified',
          phone: bio.phone || '+1 (555) 749-2180',
          transcription_raw: inputText,
          triage_metadata: {
            patient_id: fallbackId,
            detected_language: selectedLanguage,
            acuity_level: isChest ? 'RED' : isEye ? 'AMBER' : 'AMBER',
            esi_category: isChest ? 'Emergent' : 'Urgent',
            timestamp: new Date().toISOString(),
          },
          clinical_summary: {
            chief_complaint: isEye
              ? 'Acute severe ocular pain with photophobia, foreign body sensation, and blurred visual acuity (Afebrile / No Fever)'
              : isChest
              ? 'Acute substernal chest discomfort with dyspnea'
              : inputText.slice(0, 120),
            symptom_onset_duration: 'Acute sudden onset',
            reported_symptoms: isEye
              ? [
                  'Severe ocular pain / eye ache',
                  'Photophobia and lacrimation',
                  'Corneal foreign body sensation on blinking',
                  'No fever, afebrile',
                ]
              : ['Reported during emergency voice intake'],
          },
          nurse_pre_orders: isEye
            ? [
                'STAT Visual Acuity assessment (Snellen OD/OS/OU)',
                'Fluorescein dye corneal staining with Wood\'s lamp inspection',
                'Point-of-care Tonometry to rule out elevated Intraocular Pressure',
                'Rigid protective eye shield application',
                'Morgan Lens neutral saline irrigation if particulate debris',
              ]
            : [
                'Stat 12-Lead Electrocardiogram',
                'Peripheral IV Access (18G)',
              ],
          care_continuum_plan: {
            medications: isEye
              ? [
                  { name: 'Erythromycin Ophthalmic Ointment 0.5%', dosage: '1/2 inch ribbon', frequency: 'Four times daily into lower conjunctival sac' },
                  { name: 'Preservative-Free Lubricating Tears', dosage: '1-2 drops', frequency: 'Every 2 hours while awake' },
                  { name: 'Oral Acetaminophen', dosage: '500mg', frequency: 'Every 6 hours PRN ocular ache' },
                ]
              : [],
            daily_recovery_tasks: isEye
              ? [
                  'Wear protective eye shield at all times during sleep',
                  'Wear UV sunglasses indoors and outdoors for photophobia',
                  'Strictly avoid eye rubbing or wearing contact lenses',
                ]
              : ['Complete triage nurse intake assessment'],
          },
          follow_up_session: {
            id: `fs-${fallbackId}`,
            department: isEye
              ? 'Emergency Ophthalmology & Cornea Specialty Clinic'
              : 'Cardiology Outpatient Clinic',
            clinicianName: isEye
              ? 'Dr. Aris Thorne, MD (Ophthalmic Specialist)'
              : 'Attending Staff Physician',
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            scheduledTime: '09:30',
            location: 'Pavilion Suite 104',
            status: 'SCHEDULED',
            alertsEnabled: { sms: true, voiceCall: false, calendarSync: true, audioAlarm: true },
            phoneNotification: bio.phone,
            prerequisites: ['Bring eye drops and shield', 'Do not wear contact lenses'],
          },
          guardrails: {
            status: 'ASSISTIVE_ONLY',
            requires_nurse_approval: true,
            disclaimer: 'Assistive triage intelligence. Licensed clinician sign-off mandatory.',
          },
          nurse_status: 'PENDING_REVIEW',
        };

        setCompletedRecord(fallbackRecord);
        onIntakeCompleted(fallbackRecord);
      }
    } catch (err) {
      console.error('Triage intake failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerDemoPreset = (type: 'RED' | 'AMBER_ABDOMEN' | 'AMBER_EYE' | 'GREEN') => {
    setCompletedRecord(null);

    // Auto-fill realistic bio if not confirmed or switching preset
    if (type === 'AMBER_EYE') {
      setBio({
        name: 'Ananya Roy',
        age: 29,
        gender: 'Female',
        mrn: 'P-1085',
        phone: '+1 (555) 749-2180',
        language: selectedLanguage,
      });
      setIsBioVerified(true);
      setBioError(null);
    } else if (type === 'RED') {
      setBio({
        name: 'Rajesh Varma',
        age: 58,
        gender: 'Male',
        mrn: 'P-1082',
        phone: '+1 (555) 392-1082',
        language: selectedLanguage,
      });
      setIsBioVerified(true);
      setBioError(null);
    } else if (type === 'AMBER_ABDOMEN') {
      setBio({
        name: 'Lakshmi Narayana',
        age: 42,
        gender: 'Female',
        mrn: 'P-1083',
        phone: '+1 (555) 481-1083',
        language: selectedLanguage,
      });
      setIsBioVerified(true);
      setBioError(null);
    } else {
      setBio({
        name: 'David Miller',
        age: 26,
        gender: 'Male',
        mrn: 'P-1084',
        phone: '+1 (555) 672-1084',
        language: selectedLanguage,
      });
      setIsBioVerified(true);
      setBioError(null);
    }

    let sample = '';
    if (type === 'RED') {
      sample =
        selectedLanguage === 'Hindi'
          ? 'छाती में बहुत तेज दर्द हो रहा है, बायां हाथ सुन्न पड़ रहा है और सांस लेने में भारी तकलीफ है।'
          : selectedLanguage === 'Telugu'
          ? 'గుండెల్లో తీవ్రమైన నొప్పి, ఎడమ చెయ్యి లాగుతోంది మరియు శ్వాస ఆడటం లేదు.'
          : 'Crushing central chest pain radiating to left arm with acute shortness of breath and diaphoresis.';
    } else if (type === 'AMBER_EYE') {
      sample =
        selectedLanguage === 'Hindi'
          ? 'मेरी दाहिनी आँख में बहुत तेज चुभन और असहनीय दर्द हो रहा है। रोशनी बिल्कुल बर्दाश्त नहीं हो रही और लगातार पानी बह रहा है। कोई बुखार नहीं है।'
          : selectedLanguage === 'Telugu'
          ? 'నా కుడి కంటిలో విపరీతమైన నొప్పి, వెలుతురు చూడలేకపోతున్నాను, కన్నీళ్లు కారుతున్నాయి. చూపు మసకబారింది. జ్వరం ఏమీ లేదు.'
          : 'Intense burning pain in my right eye with extreme light sensitivity and tearing after metal grinding without goggles. Vision is blurry and it hurts to blink. No fever.';
    } else if (type === 'AMBER_ABDOMEN') {
      sample =
        selectedLanguage === 'Hindi'
          ? '102 डिग्री का तेज बुखार है और पेट के दाहिने हिस्से में असहनीय दर्द हो रहा है। लगातार उल्टियां हो रही हैं।'
          : selectedLanguage === 'Telugu'
          ? 'తీవ్రమైన కడుపు నొప్పి మరియు 102 డిగ్రీల జ్వరం, వాంతులు అవుతున్నాయి.'
          : 'High fever 102.8°F with severe worsening right lower quadrant abdominal pain and nausea.';
    } else {
      sample =
        selectedLanguage === 'Hindi'
          ? 'कल शाम पैर मुड़ गया था। टखने में सूजन है और चलने में हल्का दर्द है।'
          : selectedLanguage === 'Telugu'
          ? 'నిన్న కాలు బెణికింది, వాపు వచ్చింది కానీ మెల్లగా నడవగలుగుతున్నాను.'
          : 'Twisted right ankle yesterday. Swollen and bruised, bearing weight. Itchy rash on calf.';
    }

    setTranscript(sample);
    setManualText(sample);
    processTriageIntake(sample);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-4">
      {/* Visual Header: Hospital Triage Workstation */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-[#091124]">
        <img
          src={triageDeskImg}
          alt="Emergency Triage Station"
          className="w-full h-28 sm:h-36 object-cover object-center filter brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070D1F] via-[#070D1F]/70 to-transparent flex items-end p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between w-full gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-baseline">
                  <span className="font-mono text-2xl font-black text-[#00F5D4]">11</span>
                  <span className="text-[10px] font-mono font-bold text-[#00F5D4] ml-0.5 -translate-y-1.5 inline-block">
                    TH
                  </span>
                  <span className="text-xl font-black tracking-[0.2em] text-white uppercase ml-1.5 font-sans">
                    HOUR
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/80 font-semibold">
                  RAPID TRIAGE
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-300">
                Seconds decide outcomes. Multilingual voice triage in &lt;30s.
              </p>
            </div>

            {/* Language Selector */}
            <div className="flex items-center p-1 rounded-xl bg-[#050A17]/90 border border-slate-800 backdrop-blur-md">
              {(['English', 'Hindi', 'Telugu'] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setSelectedLanguage(lang);
                    setBio((prev) => ({ ...prev, language: lang }));
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedLanguage === lang
                      ? 'bg-[#00F5D4] text-[#050A17] font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'English' ? 'English' : lang === 'Hindi' ? 'हिंदी' : 'తెలుగు'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STAGE 1: PATIENT IDENTIFICATION & BIO LOGIN GATE (MANDATORY BEFORE LISTENING) */}
      <div
        ref={bioCardRef}
        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isBioVerified
            ? 'bg-[#0A1630] border-emerald-500/40 shadow-lg'
            : 'bg-[#0B142B] border-slate-700/80 shadow-xl'
        }`}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                isBioVerified
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {isBioVerified ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                  Stage 1: Patient Bio Login &amp; Clinical Check-In
                </span>
                {isBioVerified ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                    VERIFIED &amp; UNLOCKED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/50">
                    REQUIRED BEFORE VOICE RECORDING
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isBioVerified
                  ? 'Patient identity locked and linked to upcoming triage dictation & follow-up alert records.'
                  : 'Enter patient identification details below to authorize voice intake.'}
              </p>
            </div>
          </div>

          {isBioVerified && (
            <button
              onClick={handleEditBio}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Bio</span>
            </button>
          )}
        </div>

        {bioError && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{bioError}</span>
          </div>
        )}

        {isBioVerified ? (
          /* Locked Verified Patient Status Bar */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-[#060D1E] border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block mb-0.5">FULL NAME</span>
              <span className="font-bold text-white text-sm">{bio.name}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#060D1E] border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block mb-0.5">AGE &amp; SEX</span>
              <span className="font-semibold text-slate-200">
                {bio.age} yrs · {bio.gender}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#060D1E] border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block mb-0.5">HOSPITAL MRN</span>
              <span className="font-mono font-bold text-cyan-300">{bio.mrn}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#060D1E] border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block mb-0.5">ALERT PHONE</span>
              <span className="font-mono text-emerald-300">{bio.phone}</span>
            </div>
          </div>
        ) : (
          /* Editable Bio Form */
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Patient Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={bio.name}
                  onChange={(e) => setBio({ ...bio, name: e.target.value })}
                  placeholder="e.g., Ananya Roy or John Doe"
                  className="w-full px-3 py-2 rounded-xl bg-[#060D1E] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Age <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={bio.age}
                  onChange={(e) => setBio({ ...bio, age: e.target.value })}
                  placeholder="Age"
                  className="w-full px-3 py-2 rounded-xl bg-[#060D1E] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Biological Sex
                </label>
                <select
                  value={bio.gender}
                  onChange={(e) => setBio({ ...bio, gender: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#060D1E] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-[#00F5D4] cursor-pointer"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other / Non-binary</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-300">MRN / Patient ID</label>
                  <button
                    type="button"
                    onClick={handleGenerateNewMrn}
                    className="text-[10px] font-mono text-[#00F5D4] hover:underline cursor-pointer"
                  >
                    Generate New
                  </button>
                </div>
                <input
                  type="text"
                  value={bio.mrn}
                  onChange={(e) => setBio({ ...bio, mrn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#060D1E] border border-slate-700/80 text-xs font-mono text-cyan-300 focus:outline-none focus:border-[#00F5D4]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Follow-Up Alert Phone
                </label>
                <input
                  type="tel"
                  value={bio.phone}
                  onChange={(e) => setBio({ ...bio, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 rounded-xl bg-[#060D1E] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Mandatory clinical identity authentication prior to speech capture.
              </span>
              <button
                type="button"
                onClick={handleConfirmBio}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#00F5D4] hover:bg-[#00d8bc] text-[#050A17] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Verify Bio &amp; Unlock Voice Dictation</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Benchmark Simulation Scenarios (Including Ocular / Eye Pain) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">
            Emergency Clinical Simulation Presets:
          </span>
          <span className="text-[11px] text-slate-400">
            1-click multi-condition test in {selectedLanguage}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* RED / ESI-1 Cardiac */}
          <button
            onClick={() => triggerDemoPreset('RED')}
            disabled={isRecording || isAnalyzing}
            className="p-3 rounded-xl bg-[#0C152E] border border-rose-600/40 hover:border-rose-500 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-rose-950/70 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-400">
                <HeartCrack className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-rose-300 block">ESI-1 (RED)</span>
                <p className="text-[10px] text-slate-400 truncate">Chest Pain &amp; Dyspnea</p>
              </div>
            </div>
          </button>

          {/* AMBER / ESI-2 Eye Pain (Ophthalmic Emergency) */}
          <button
            onClick={() => triggerDemoPreset('AMBER_EYE')}
            disabled={isRecording || isAnalyzing}
            className="p-3 rounded-xl bg-[#0C152E] border border-cyan-500/40 hover:border-cyan-400 text-left transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-300">
                <Eye className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-cyan-300 block">ESI-2/3 (AMBER)</span>
                <p className="text-[10px] text-slate-300 truncate font-medium">Eye Pain &amp; Photophobia</p>
              </div>
            </div>
          </button>

          {/* AMBER / ESI-2 Acute Abdomen */}
          <button
            onClick={() => triggerDemoPreset('AMBER_ABDOMEN')}
            disabled={isRecording || isAnalyzing}
            className="p-3 rounded-xl bg-[#0C152E] border border-amber-500/40 hover:border-amber-400 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-950/70 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                <Thermometer className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-amber-300 block">ESI-2 (AMBER)</span>
                <p className="text-[10px] text-slate-400 truncate">Abdomen &amp; Fever</p>
              </div>
            </div>
          </button>

          {/* GREEN / ESI-3 Sprain */}
          <button
            onClick={() => triggerDemoPreset('GREEN')}
            disabled={isRecording || isAnalyzing}
            className="p-3 rounded-xl bg-[#0C152E] border border-emerald-500/40 hover:border-emerald-400 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
                <Bandage className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-emerald-300 block">ESI-3 (GREEN)</span>
                <p className="text-[10px] text-slate-400 truncate">Ankle Sprain &amp; Rash</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Voice Dictation Console (Gated by Patient Bio Login) */}
      <div className={`p-6 rounded-2xl bg-[#0B142B] border shadow-xl relative ${
        isBioVerified ? 'border-slate-800' : 'border-slate-800/80 opacity-90'
      }`}>
        {!isBioVerified && (
          <div className="absolute inset-0 bg-[#070D1F]/80 backdrop-blur-xs rounded-2xl z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">
              Voice Dictation Locked
            </h4>
            <p className="text-xs text-slate-300 max-w-sm mb-4">
              Please enter and confirm the patient's basic bio details above before activating microphone intake.
            </p>
            <button
              onClick={() => {
                if (!bio.name.trim()) {
                  setBio((prev) => ({ ...prev, name: 'Ananya Roy', age: 29 }));
                }
                setIsBioVerified(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#00F5D4] text-[#050A17] font-bold text-xs cursor-pointer shadow-md"
            >
              Quick Unlock with Patient Bio
            </button>
          </div>
        )}

        <div className="flex flex-col items-center justify-center my-2">
          <button
            onClick={isRecording ? () => stopVoiceIntakeAndProcess() : startVoiceIntake}
            disabled={isAnalyzing}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${
              isRecording
                ? 'bg-rose-600 text-white shadow-rose-900/50 animate-pulse'
                : 'bg-[#00F5D4] hover:bg-[#00e0c2] text-[#050A17] shadow-[#00F5D4]/20'
            } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={isRecording ? 'Stop recording voice intake' : 'Start voice intake recording'}
          >
            {isRecording ? (
              <>
                <MicOff className="w-7 h-7 mb-1" />
                <span className="text-xs font-bold font-mono">STOP INTAKE</span>
                <span className="text-[11px] font-mono tabular-nums">
                  00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                </span>
              </>
            ) : (
              <>
                <Mic className="w-7 h-7 mb-1" />
                <span className="text-xs font-black font-mono tracking-wider">TAP TO SPEAK</span>
                <span className="text-[10px] font-semibold text-slate-800">
                  {selectedLanguage.toUpperCase()}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Real-time Audio Waveform */}
        <div className="my-3">
          <AudioWaveform isRecording={isRecording} audioStream={audioStream} color="#00F5D4" />
        </div>

        {/* Real-time Speech Transcript */}
        {(transcript || isRecording) && (
          <div className="p-3.5 rounded-xl bg-[#070D1F] border border-slate-800 text-xs">
            <span className="text-[#00F5D4] font-mono text-[10px] font-semibold block mb-1">
              LIVE SPEECH TRANSCRIPTION ({selectedLanguage.toUpperCase()}):
            </span>
            <p className="text-slate-200 leading-relaxed">
              "{transcript || 'Listening to clinical symptom description...'}"
            </p>
          </div>
        )}

        {/* Manual Keyboard Notes Toggle */}
        <div className="mt-4 flex justify-between items-center text-xs pt-3 border-t border-slate-800/80">
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-[11px] font-mono text-slate-400 hover:text-[#00F5D4] cursor-pointer"
          >
            {showManualInput ? '− Hide Text Box' : '+ Enter Written Notes Instead'}
          </button>
          {showManualInput && (
            <button
              onClick={() => stopVoiceIntakeAndProcess(manualText)}
              disabled={!manualText.trim() || isAnalyzing}
              className="px-3 py-1.5 rounded-lg bg-[#00F5D4] text-[#050A17] text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Analyze Symptoms</span>
            </button>
          )}
        </div>

        {showManualInput && (
          <div className="mt-2.5">
            <textarea
              rows={2}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Type patient symptoms in English, Hindi, or Telugu..."
              className="w-full px-3 py-2 rounded-xl bg-[#070D1F] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
            />
          </div>
        )}

        {/* Real-time Engine Processing Status */}
        {isAnalyzing && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center gap-3 text-xs text-[#00F5D4] font-mono font-medium">
            <div className="w-4 h-4 rounded-full border-2 border-[#00F5D4] border-t-transparent animate-spin" />
            <span>Analyzing clinical urgency &amp; structuring ESI triage...</span>
          </div>
        )}

        {/* Structured Clinical Intake Result Card */}
        {completedRecord && !isAnalyzing && (
          <div className="mt-4 p-4 rounded-xl bg-[#081226] border border-slate-700/80 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Structured Triage Record Generated
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300">
                      ID: {completedRecord.triage_metadata.patient_id}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Patient: {completedRecord.patient_name} · Transmitted to Nurse Desk · {lastLatencyMs}ms
                  </span>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                  completedRecord.triage_metadata.acuity_level === 'RED'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                    : completedRecord.triage_metadata.acuity_level === 'AMBER'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                }`}
              >
                ESI-{completedRecord.triage_metadata.acuity_level} · {completedRecord.triage_metadata.esi_category}
              </span>
            </div>

            <div className="py-3 text-xs space-y-1.5">
              <p className="text-slate-200">
                <strong className="text-slate-400 font-medium">Chief Complaint:</strong>{' '}
                {completedRecord.clinical_summary.chief_complaint}
              </p>
              <p className="text-slate-400 text-[11px]">
                <strong className="text-slate-400 font-medium">Pre-Orders Staged:</strong>{' '}
                {completedRecord.nurse_pre_orders.length} diagnostic &amp; nursing actions awaiting RN sign-off.
              </p>
              {completedRecord.follow_up_session && (
                <p className="text-cyan-300 text-[11px] font-mono">
                  <strong>Follow-up Scheduled:</strong> {completedRecord.follow_up_session.department} on {completedRecord.follow_up_session.scheduledDate} at {completedRecord.follow_up_session.scheduledTime}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setCompletedRecord(null);
                  setTranscript('');
                  setManualText('');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Voice Intake</span>
              </button>
              <button
                onClick={onNavigateToNurse}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <span>Open in Nurse Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
