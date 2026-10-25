import React, { useState, useRef, useEffect } from 'react';
import {
  TriageRecord,
  SupportedLanguage,
  MedicationItem,
  RecoveryTask,
  FollowUpSession,
} from '../types/triage';
import {
  Pill,
  Droplets,
  Bandage,
  Volume2,
  VolumeX,
  Mic,
  Send,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  HeartPulse,
  Activity,
  ShieldCheck,
  PhoneCall,
  RotateCcw,
  Languages,
  Check,
  Bell,
  BellRing,
  Smartphone,
  Download,
  MapPin,
  Stethoscope,
  ChevronRight,
  ExternalLink,
  Edit2,
  X,
  Sparkles,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { saveRecoveryLogToFirestore, updateFollowUpSessionInFirestore } from '../services/database';
import recoveryImg from '../assets/images/patient_recovery_setup_1792832880449.jpg';

interface CareContinuumViewProps {
  patients: TriageRecord[];
  activePatient: TriageRecord | null;
  onSelectPatient: (patient: TriageRecord) => void;
  soundEnabled: boolean;
}

export const CareContinuumView: React.FC<CareContinuumViewProps> = ({
  patients,
  activePatient,
  onSelectPatient,
  soundEnabled,
}) => {
  const currentPatient = activePatient || patients[0];

  const [language, setLanguage] = useState<SupportedLanguage>(
    currentPatient?.triage_metadata?.detected_language || 'English'
  );

  // Recovery Tasks & Medication status
  const [medications, setMedications] = useState<MedicationItem[]>(() => {
    const meds = currentPatient?.care_continuum_plan?.medications || [];
    return meds.map((m, idx) => ({
      id: `med-${idx}`,
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      timing: idx === 0 ? '08:00 AM (Breakfast)' : idx === 1 ? '02:00 PM (Lunch)' : '08:00 PM (Dinner)',
      takenToday: idx === 0,
      takenAt: idx === 0 ? '08:12 AM' : undefined,
      instructions: m.instructions || 'Take with food and full glass of water',
    }));
  });

  const [waterGlasses, setWaterGlasses] = useState(5);
  const [woundCleaned, setWoundCleaned] = useState(true);
  const [painLevel, setPainLevel] = useState(3);

  // Follow-Up Session & Alert System state
  const [followUp, setFollowUp] = useState<FollowUpSession>(() => {
    if (currentPatient?.follow_up_session) {
      return currentPatient.follow_up_session;
    }
    const isEye = /eye|vision|cornea|photophobia/i.test(currentPatient?.clinical_summary?.chief_complaint || '');
    const isCardiac = /chest|cardiac|heart|breath/i.test(currentPatient?.clinical_summary?.chief_complaint || '');

    return {
      id: `fs-${currentPatient?.triage_metadata?.patient_id || 'default'}`,
      department: isEye
        ? 'Emergency Ophthalmology & Cornea Specialty Clinic'
        : isCardiac
        ? 'Cardiology Post-ACS Specialty Clinic'
        : 'Outpatient Specialty Comprehensive Care Clinic',
      clinicianName: isEye
        ? 'Dr. Aris Thorne, MD (Ophthalmic Specialist)'
        : isCardiac
        ? 'Dr. Katherine Mehta, MD (Interventional Cardiology)'
        : 'Attending Staff Physician',
      scheduledDate: new Date(Date.now() + (isEye ? 1 : isCardiac ? 3 : 5) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      scheduledTime: isEye ? '09:30' : '10:30',
      location: isEye ? 'Ophthalmic Diagnostic Center - Suite 104' : 'Cardiovascular Tower - Suite 402',
      status: 'CONFIRMED',
      alertsEnabled: {
        sms: true,
        voiceCall: false,
        calendarSync: true,
        audioAlarm: true,
      },
      phoneNotification: currentPatient?.phone || '+1 (555) 749-2180',
      prerequisites: isEye
        ? [
            'Bring prescribed ophthalmic antibiotic drops and rigid eye shield',
            'Do not wear contact lenses or eye makeup prior to evaluation',
            'Arrange a designated driver for pupillary examination',
          ]
        : isCardiac
        ? [
            '10-hour fasting for repeat lipid & cardiac biomarker panel',
            'Bring 72-hour blood pressure & pulse tracking log',
            'Bring all discharge prescription bottles (Aspirin, Atorvastatin)',
          ]
        : [
            'Maintain twice-daily temperature log',
            'Light meal on morning of appointment',
            'Bring current surgical/wound dressing supplies',
          ],
      notes: 'Review clinical resolution and repeat examination.',
      lastAlertSentAt: 'Today at 08:30 AM (SMS Dispatched)',
    };
  });

  const [checkedPrereqs, setCheckedPrereqs] = useState<Record<number, boolean>>({
    0: true,
  });
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    date: followUp.scheduledDate,
    time: followUp.scheduledTime,
    department: followUp.department,
    clinicianName: followUp.clinicianName,
    phone: followUp.phoneNotification,
  });
  const [smsTestAlertToast, setSmsTestAlertToast] = useState<{
    visible: boolean;
    text: string;
    phone: string;
  } | null>(null);

  // Voice Care Assistant state
  const [assistantInput, setAssistantInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{
      sender: 'patient' | 'assistant';
      text: string;
      redFlag?: boolean;
      advice?: string;
      timestamp: string;
    }>
  >([
    {
      sender: 'assistant',
      text:
        language === 'Hindi'
          ? 'नमस्ते! मैं आपका 11th Hour CareContinuum रिकवरी असिस्टेंट हूँ। आप अपनी दवाओं, फॉलो-अप सेशन, घाव की देखभाल या किसी भी लक्षण के बारे में अपनी भाषा में पूछ सकते हैं।'
          : language === 'Telugu'
          ? 'నమస్కారం! నేను మీ 11th Hour CareContinuum రికవరీ అసిస్టెంట్‌ని. మీ మందులు, ఫాలో-అప్ అపాయింట్‌మెంట్ లేదా లక్షణాల గురించి తెలుగులో అడగవచ్చు.'
          : "Hello! I am your 11th Hour CareContinuum recovery assistant. You can ask me any question about your discharge medications, scheduled follow-up session, prerequisites, or symptoms.",
      timestamp: 'Just now',
    },
  ]);

  const speechRecognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAsking]);

  // Sync state if patient changes
  const handleSwitchPatient = (p: TriageRecord) => {
    onSelectPatient(p);
    setLanguage(p.triage_metadata.detected_language);
    const meds = p.care_continuum_plan?.medications || [];
    setMedications(
      meds.map((m, idx) => ({
        id: `med-${idx}`,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        timing: idx === 0 ? '08:00 AM' : idx === 1 ? '02:00 PM' : '08:00 PM',
        takenToday: false,
        instructions: m.instructions || 'Take with food and water',
      }))
    );

    if (p.follow_up_session) {
      setFollowUp(p.follow_up_session);
      setRescheduleForm({
        date: p.follow_up_session.scheduledDate,
        time: p.follow_up_session.scheduledTime,
        department: p.follow_up_session.department,
        clinicianName: p.follow_up_session.clinicianName,
        phone: p.follow_up_session.phoneNotification,
      });
    }
  };

  const toggleMedication = (id: string) => {
    setMedications((prev) => {
      const updated = prev.map((m) => {
        if (m.id === id) {
          const newState = !m.takenToday;
          if (newState && soundEnabled) soundFx.playSuccess();
          return {
            ...m,
            takenToday: newState,
            takenAt: newState ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          };
        }
        return m;
      });

      // Persist to Firestore
      if (currentPatient?.triage_metadata?.patient_id) {
        saveRecoveryLogToFirestore(currentPatient.triage_metadata.patient_id, {
          medicationsTaken: updated.filter((m) => m.takenToday).map((m) => m.name),
          waterGlasses,
          woundCleaned,
          painLevel,
          date: new Date().toISOString().split('T')[0],
        });
      }

      return updated;
    });
  };

  // Follow-Up Session Alert Toggles
  const handleToggleAlert = async (channel: 'sms' | 'voiceCall' | 'calendarSync' | 'audioAlarm') => {
    const updated = {
      ...followUp,
      alertsEnabled: {
        ...followUp.alertsEnabled,
        [channel]: !followUp.alertsEnabled[channel],
      },
    };
    setFollowUp(updated);
    if (soundEnabled) soundFx.playSuccess();

    if (currentPatient?.id) {
      try {
        await updateFollowUpSessionInFirestore(currentPatient.id, updated);
      } catch (err) {
        console.warn('Follow-up alert saved locally (Firestore offline)');
      }
    }
  };

  // Trigger test SMS alert simulation
  const handleSendTestSms = () => {
    if (soundEnabled) soundFx.playSuccess();
    const alertMsg = `[11TH HOUR HOSPITAL ALERT] Reminder: Follow-up appointment scheduled with ${followUp.clinicianName} at ${followUp.department} on ${followUp.scheduledDate} at ${followUp.scheduledTime}. Location: ${followUp.location}. Mandatory: ${followUp.prerequisites[0] || 'Bring ID'}. Reply STOP to opt out.`;
    setSmsTestAlertToast({
      visible: true,
      text: alertMsg,
      phone: followUp.phoneNotification,
    });
    setFollowUp((prev) => ({
      ...prev,
      lastAlertSentAt: `Dispatched to ${followUp.phoneNotification} just now`,
    }));
    setTimeout(() => {
      setSmsTestAlertToast(null);
    }, 7000);
  };

  // Generate and download standard .ics calendar file
  const handleDownloadIcs = () => {
    if (soundEnabled) soundFx.playSuccess();
    try {
      const [year, month, day] = followUp.scheduledDate.split('-').map(Number);
      const [hours, minutes] = followUp.scheduledTime.split(':').map(Number);
      const startDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
      const endDate = new Date(startDate.getTime() + 45 * 60 * 1000);

      const formatUtc = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//11th Hour Health//CareContinuum//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:followup-${followUp.id}@11thhour.health`,
        `DTSTAMP:${formatUtc(new Date())}`,
        `DTSTART:${formatUtc(startDate)}`,
        `DTEND:${formatUtc(endDate)}`,
        `SUMMARY:Hospital Follow-Up: ${followUp.department}`,
        `DESCRIPTION:Patient: ${currentPatient.patient_name}\\nAttending Clinician: ${followUp.clinicianName}\\nLocation: ${followUp.location}\\nPrerequisites: ${followUp.prerequisites.join('; ')}`,
        `LOCATION:${followUp.location}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT2H',
        'ACTION:DISPLAY',
        'DESCRIPTION:Hospital Follow-Up Reminder',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FollowUp-${followUp.id}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('ICS generation fallback', e);
    }
  };

  // Save rescheduled follow-up appointment
  const handleSaveReschedule = async () => {
    const updated: FollowUpSession = {
      ...followUp,
      scheduledDate: rescheduleForm.date,
      scheduledTime: rescheduleForm.time,
      department: rescheduleForm.department,
      clinicianName: rescheduleForm.clinicianName,
      phoneNotification: rescheduleForm.phone,
      status: 'RESCHEDULED',
      lastAlertSentAt: `Rescheduled to ${rescheduleForm.date} at ${rescheduleForm.time}`,
    };
    setFollowUp(updated);
    setIsRescheduling(false);
    if (soundEnabled) soundFx.playSuccess();

    if (currentPatient?.id) {
      try {
        await updateFollowUpSessionInFirestore(currentPatient.id, updated);
      } catch (e) {}
    }
  };

  const togglePrereq = (idx: number) => {
    setCheckedPrereqs((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
    if (soundEnabled) soundFx.playSuccess();
  };

  // Compute countdown string
  const getCountdownString = () => {
    try {
      const [year, month, day] = followUp.scheduledDate.split('-').map(Number);
      const [hours, minutes] = followUp.scheduledTime.split(':').map(Number);
      const targetTime = new Date(year, month - 1, day, hours, minutes).getTime();
      const now = Date.now();
      const diffMs = targetTime - now;

      if (diffMs <= 0) {
        return 'Today - Check-In Ready';
      }
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      const remHours = diffHours % 24;

      if (diffDays === 0) {
        return `Today in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
      }
      if (diffDays === 1) {
        return `Tomorrow at ${followUp.scheduledTime}`;
      }
      return `Scheduled in ${diffDays} days, ${remHours} hrs`;
    } catch (e) {
      return `Scheduled for ${followUp.scheduledDate}`;
    }
  };

  // Web Speech API / TTS playback
  const playSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (language === 'Hindi') utterance.lang = 'hi-IN';
      else if (language === 'Telugu') utterance.lang = 'te-IN';
      else utterance.lang = 'en-US';

      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Start Mic for asking question
  const startMicForAssistant = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your question.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      if (language === 'Hindi') recognition.lang = 'hi-IN';
      else if (language === 'Telugu') recognition.lang = 'te-IN';
      else recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningMic(true);
        if (soundEnabled) soundFx.playMicStart();
      };

      recognition.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setAssistantInput(text);
        setIsListeningMic(false);
        submitQuestion(text);
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setIsListeningMic(false);
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
  };

  // Ask question to server-side Gemini CareContinuum model
  const submitQuestion = async (overrideText?: string) => {
    const q = (overrideText || assistantInput).trim();
    if (!q) return;

    stopSpeech();
    setAssistantInput('');
    const newChat = [
      ...chatMessages,
      {
        sender: 'patient' as const,
        text: q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setChatMessages(newChat);
    setIsAsking(true);

    try {
      const response = await fetch('/api/care/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          language,
          patientContext: {
            patient_id: currentPatient?.triage_metadata?.patient_id,
            chief_complaint: currentPatient?.clinical_summary?.chief_complaint,
            medications: currentPatient?.care_continuum_plan?.medications,
            tasks: currentPatient?.care_continuum_plan?.daily_recovery_tasks,
            follow_up: followUp,
          },
        }),
      });

      const data = await response.json();
      if (data && data.success && data.answer) {
        const replyText = data.answer;
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: replyText,
            redFlag: data.redFlag,
            advice: data.adviceBullet,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        if (data.redFlag && soundEnabled) {
          soundFx.playCriticalAlert();
        }
        playSpeech(replyText);
      } else {
        const fallbackText =
          language === 'Hindi'
            ? 'अपनी निर्धारित दवाएं समय पर लें, अनुसूची के अनुसार आई शील्ड या आराम का ध्यान रखें और आगामी फॉलो-अप सत्र के लिए तैयार रहें।'
            : language === 'Telugu'
            ? 'మీ మందులను సమయానికి తీసుకోండి మరియు షెడ్యూల్ చేసిన ఫాలో-అప్ సెషన్ కోసం సిద్ధంగా ఉండండి.'
            : 'Please adhere to your discharge instructions, take your scheduled medications, and arrive prepared for your follow-up appointment.';

        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: fallbackText,
            redFlag: false,
            advice: 'Follow discharge and follow-up instructions.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        playSpeech(fallbackText);
      }
    } catch (err) {
      console.warn('Care assistant chat network issue, showing clinical guidance:', err);
      const fallbackText =
        language === 'Hindi'
          ? 'अपनी दवाएं भोजन और पानी के साथ लें। आराम करें और फॉलो-अप के लिए दिए गए निर्देशों का पालन करें।'
          : language === 'Telugu'
          ? 'మీ మందులను ఆహారం మరియు నీటితో తీసుకోండి. బాగా విశ్రాంతి తీసుకోండి.'
          : 'Take your medications as directed. Rest well and check your follow-up appointment prerequisites.';

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: fallbackText,
          redFlag: false,
          advice: 'Rest and prepare for follow-up.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      playSpeech(fallbackText);
    } finally {
      setIsAsking(false);
    }
  };

  const completedMedsCount = medications.filter((m) => m.takenToday).length;
  const completedPrereqCount = Object.values(checkedPrereqs).filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Visual Header */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-[#091124]">
        <img
          src={recoveryImg}
          alt="Recovery Care"
          className="w-full h-28 sm:h-36 object-cover object-center filter brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070D1F] via-[#070D1F]/70 to-transparent flex items-end p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between w-full gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1 text-xs text-slate-400">
                <span className="font-mono text-[#00F5D4] font-semibold">CARECONTINUUM</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-cyan-300">MRN: {currentPatient.triage_metadata.patient_id}</span>
                <span aria-hidden="true">·</span>
                <span>Post-Emergency Recovery &amp; Scheduled Follow-Up</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {currentPatient.patient_name || 'Recovery Patient'}
              </h2>
            </div>

            {/* Language Selector & Patient Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-1 rounded-xl bg-[#050A17]/90 border border-slate-800 backdrop-blur-md">
                {(['English', 'Hindi', 'Telugu'] as SupportedLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      language === lang
                        ? 'bg-[#00F5D4] text-[#050A17] font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'English' ? 'EN' : lang === 'Hindi' ? 'हिंदी' : 'తెలుగు'}
                  </button>
                ))}
              </div>

              <select
                value={currentPatient.id}
                onChange={(e) => {
                  const found = patients.find((p) => p.id === e.target.value);
                  if (found) handleSwitchPatient(found);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#070D1F] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-[#00F5D4] cursor-pointer"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.triage_metadata.patient_id} - {p.patient_name || 'Patient'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SMS Alert Toast Simulation */}
      {smsTestAlertToast && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-[#070D1F] border-2 border-emerald-500/60 shadow-2xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-emerald-300 font-mono">
                  SMS ALERT DISPATCHED
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Recipient: {smsTestAlertToast.phone}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-mono">
                {smsTestAlertToast.text}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSmsTestAlertToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SCHEDULED FOLLOW-UP SESSION & ACTIVE ALERT SYSTEM (PRIMARY MODULE) */}
      <div className="p-5 rounded-2xl bg-[#0A142E] border border-cyan-500/30 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Scheduled Follow-Up Consultation &amp; Alert System
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                  {followUp.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Automated clinical follow-up tracking with SMS notifications, countdown alerts &amp; calendar sync.
              </p>
            </div>
          </div>

          {/* Live Countdown Badge */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#060D1E] border border-slate-700/80 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-[#00F5D4]">
                {getCountdownString()}
              </span>
            </div>

            <button
              onClick={() => setIsRescheduling(!isRescheduling)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isRescheduling ? 'Close' : 'Reschedule'}</span>
            </button>
          </div>
        </div>

        {/* Reschedule Inline Editor */}
        {isRescheduling && (
          <div className="mb-5 p-4 rounded-xl bg-[#060D1E] border border-slate-700/80 space-y-3">
            <span className="text-xs font-bold text-[#00F5D4] block">
              Adjust Appointment Date, Time &amp; Specialty Department:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">APPOINTMENT DATE</label>
                <input
                  type="date"
                  value={rescheduleForm.date}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0A142E] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">APPOINTMENT TIME</label>
                <input
                  type="time"
                  value={rescheduleForm.time}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, time: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0A142E] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">CLINICAL DEPARTMENT</label>
                <select
                  value={rescheduleForm.department}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, department: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0A142E] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00F5D4] cursor-pointer"
                >
                  <option value="Emergency Ophthalmology & Cornea Specialty Clinic">Emergency Ophthalmology &amp; Cornea</option>
                  <option value="Cardiology Post-ACS Specialty Clinic">Cardiology Post-ACS Clinic</option>
                  <option value="Gastroenterology & General Surgery Clinic">Gastroenterology &amp; General Surgery</option>
                  <option value="Orthopedic & Sports Rehabilitation Clinic">Orthopedics &amp; Sports Rehab</option>
                  <option value="Comprehensive Outpatient Recovery Center">Comprehensive Outpatient Center</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">ALERT PHONE NUMBER</label>
                <input
                  type="tel"
                  value={rescheduleForm.phone}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, phone: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0A142E] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRescheduling(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReschedule}
                className="px-4 py-1.5 rounded-lg bg-[#00F5D4] text-[#050A17] font-bold text-xs cursor-pointer shadow-sm"
              >
                Save &amp; Update Alert System
              </button>
            </div>
          </div>
        )}

        {/* Appointment Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#060D1E] border border-slate-800">
            <span className="text-[10px] font-mono text-cyan-300 block mb-1">DATE &amp; TIME</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="font-bold text-white text-sm block">
                  {new Date(`${followUp.scheduledDate}T${followUp.scheduledTime}`).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="font-mono text-slate-400 text-xs">
                  {followUp.scheduledTime} (45 min consultation)
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#060D1E] border border-slate-800">
            <span className="text-[10px] font-mono text-cyan-300 block mb-1">CLINICIAN &amp; SPECIALTY</span>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="font-bold text-white block truncate">{followUp.clinicianName}</span>
                <span className="text-slate-400 text-[11px] block truncate">{followUp.department}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#060D1E] border border-slate-800">
            <span className="text-[10px] font-mono text-cyan-300 block mb-1">LOCATION &amp; FACILITY</span>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-200 block truncate">{followUp.location}</span>
                <span className="text-slate-400 text-[11px] block">Main Hospital Campus</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Alert Configuration System Bar */}
        <div className="p-4 rounded-xl bg-[#060D1E] border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-[#00F5D4]" />
                <span>Configured Patient Alert Channels:</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Last status: {followUp.lastAlertSentAt || 'Ready for scheduled triggers'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSendTestSms}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Simulate Instant SMS Alert</span>
              </button>

              <button
                onClick={handleDownloadIcs}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Download .ics event file to import into Google Calendar, Apple Calendar, or Outlook"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sync to Calendar (.ics)</span>
              </button>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80">
            <button
              onClick={() => handleToggleAlert('sms')}
              className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                followUp.alertsEnabled.sms
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold">SMS Text Alerts</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 block truncate">
                {followUp.phoneNotification}
              </span>
            </button>

            <button
              onClick={() => handleToggleAlert('voiceCall')}
              className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                followUp.alertsEnabled.voiceCall
                  ? 'bg-purple-950/40 border-purple-500/50 text-purple-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold">IVR Voice Call</span>
                <span className={`w-2 h-2 rounded-full ${followUp.alertsEnabled.voiceCall ? 'bg-purple-400' : 'bg-slate-600'}`} />
              </div>
              <span className="text-[10px] font-mono text-slate-400 block">
                {followUp.alertsEnabled.voiceCall ? '24h prior call ON' : 'Disabled'}
              </span>
            </button>

            <button
              onClick={() => handleToggleAlert('calendarSync')}
              className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                followUp.alertsEnabled.calendarSync
                  ? 'bg-sky-950/40 border-sky-500/50 text-sky-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold">Device Calendar</span>
                <span className={`w-2 h-2 rounded-full ${followUp.alertsEnabled.calendarSync ? 'bg-sky-400' : 'bg-slate-600'}`} />
              </div>
              <span className="text-[10px] font-mono text-slate-400 block">
                {followUp.alertsEnabled.calendarSync ? 'Active Sync (.ics)' : 'Disabled'}
              </span>
            </button>

            <button
              onClick={() => handleToggleAlert('audioAlarm')}
              className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                followUp.alertsEnabled.audioAlarm
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold">Audio Chime Alarm</span>
                <span className={`w-2 h-2 rounded-full ${followUp.alertsEnabled.audioAlarm ? 'bg-amber-400' : 'bg-slate-600'}`} />
              </div>
              <span className="text-[10px] font-mono text-slate-400 block">
                {followUp.alertsEnabled.audioAlarm ? 'In-App Hospital Chime' : 'Muted'}
              </span>
            </button>
          </div>
        </div>

        {/* Pre-Appointment Prerequisites & Clinical Preparation Checklist */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mandatory Consultation Prerequisites &amp; Preparation:</span>
            </span>
            <span className="text-[11px] font-mono text-cyan-300 font-semibold">
              {completedPrereqCount} of {followUp.prerequisites.length} completed
            </span>
          </div>

          <div className="space-y-1.5">
            {followUp.prerequisites.map((req, idx) => (
              <div
                key={idx}
                onClick={() => togglePrereq(idx)}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  checkedPrereqs[idx]
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-[#060D1E] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      checkedPrereqs[idx]
                        ? 'bg-emerald-500 border-emerald-400 text-[#070D1F]'
                        : 'border-slate-600 bg-slate-900'
                    }`}
                  >
                    {checkedPrereqs[idx] && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={checkedPrereqs[idx] ? 'line-through text-slate-400' : 'text-slate-200 font-medium'}>
                    {req}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {checkedPrereqs[idx] ? 'PREPARED' : 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Daily Patient Care Plan & Interactive Tasks */}
        <div className="lg:col-span-7 space-y-5">
          {/* Medication Schedule Card */}
          <div className="p-5 rounded-2xl bg-[#0B142B] border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Prescribed Medication Schedule</h3>
                  <p className="text-[11px] text-slate-400">
                    {completedMedsCount} of {medications.length} doses logged today
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-medium text-purple-300">
                {medications.length > 0 ? Math.round((completedMedsCount / medications.length) * 100) : 100}% Logged
              </span>
            </div>

            <div className="space-y-3">
              {medications.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">
                  No post-discharge oral medications prescribed.
                </div>
              ) : (
                medications.map((med) => (
                  <div
                    key={med.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      med.takenToday
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-[#070D1F] border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleMedication(med.id)}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                            med.takenToday
                              ? 'bg-emerald-500 border-emerald-400 text-[#070D1F]'
                              : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                          }`}
                          aria-label={`Mark ${med.name} as ${med.takenToday ? 'untaken' : 'taken'}`}
                        >
                          {med.takenToday && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{med.name}</span>
                            <span className="text-[11px] font-mono text-purple-300">{med.dosage}</span>
                            <span className="text-slate-600" aria-hidden="true">·</span>
                            <span className="text-[11px] text-slate-400">{med.frequency}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{med.instructions}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-1">
                            <Clock className="w-3 h-3" />
                            <span>Scheduled: {med.timing}</span>
                          </div>
                        </div>
                      </div>

                      {med.takenToday && med.takenAt && (
                        <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                          Logged at {med.takenAt}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Hydration & Wound Care Checkers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hydration Tracker */}
            <div className="p-5 rounded-2xl bg-[#0B142B] border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Daily Hydration</h4>
                      <span className="text-[11px] text-slate-400">Target: 2.5L (10 glasses)</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {(waterGlasses * 0.25).toFixed(2)}L
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 my-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setWaterGlasses(i + 1)}
                      className={`h-8 rounded-md border flex items-center justify-center text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        i < waterGlasses
                          ? 'bg-sky-500/30 border-sky-400 text-sky-200'
                          : 'bg-[#070D1F] border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                <button
                  onClick={() => setWaterGlasses(Math.max(0, waterGlasses - 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  − Glass
                </button>
                <span className="text-slate-400 font-mono text-[10px]">
                  {waterGlasses >= 10 ? 'Goal Met' : `${10 - waterGlasses} left`}
                </span>
                <button
                  onClick={() => setWaterGlasses(Math.min(10, waterGlasses + 1))}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                >
                  + Glass
                </button>
              </div>
            </div>

            {/* Wound Care & Dressing Tracker */}
            <div className="p-5 rounded-2xl bg-[#0B142B] border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Bandage className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Wound / Dressing Check</h4>
                      <span className="text-[11px] text-slate-400">Daily skin inspection</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      woundCleaned ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/80 text-rose-300'
                    }`}
                  >
                    {woundCleaned ? 'CLEANED' : 'PENDING'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#070D1F] border border-slate-800 mb-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Cleaned &amp; redressed today:</span>
                    <button
                      onClick={() => setWoundCleaned(!woundCleaned)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        woundCleaned
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {woundCleaned ? 'Logged' : 'Mark Done'}
                    </button>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Reported Discomfort Score:</span>
                      <span className="font-mono font-bold text-white">{painLevel} / 10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={painLevel}
                      onChange={(e) => setPainLevel(Number(e.target.value))}
                      className="w-full accent-[#00F5D4] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800">
                Notice redness, oozing, or warmth? Ask the voice assistant below.
              </div>
            </div>
          </div>

          {/* Daily Recovery Tasks */}
          {currentPatient.care_continuum_plan?.daily_recovery_tasks && (
            <div className="p-5 rounded-2xl bg-[#0B142B] border border-slate-800 shadow-xl">
              <h4 className="text-xs font-bold text-slate-300 mb-3">
                Actionable Daily Recovery Tasks
              </h4>
              <div className="space-y-2">
                {currentPatient.care_continuum_plan.daily_recovery_tasks.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#070D1F] border border-slate-800 text-xs text-slate-200">
                    <span className="w-5 h-5 rounded-md bg-[#00F5D4]/15 text-[#00F5D4] text-[10px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Voice & Text Care Assistant */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl bg-[#0B142B] border border-slate-800 shadow-xl p-5 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00F5D4]/15 border border-[#00F5D4]/30 flex items-center justify-center text-[#00F5D4]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">Voice Care Assistant</h3>
                  <span className="text-[10px] font-mono text-cyan-300">({language})</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ask recovery, follow-up, or medication questions
                </p>
              </div>
            </div>

            {isPlayingAudio && (
              <button
                onClick={stopSpeech}
                className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-800/40 hover:bg-rose-900 cursor-pointer transition-colors"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            )}
          </div>

          {/* Quick Questions */}
          <div className="mb-3">
            <span className="text-[10px] font-medium text-slate-400 block mb-1.5">
              Frequent Patient Questions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(language === 'Hindi'
                ? [
                    { label: 'फॉलो-अप तैयारी?', q: 'मेरे फॉलो-अप सत्र के लिए क्या तैयारियां जरूरी हैं?' },
                    { label: 'दवा व भोजन?', q: 'क्या मैं अपनी दवाएं खाली पेट ले सकता हूँ?' },
                    { label: 'आँख की देखभाल?', q: 'आँख में दर्द और रोशनी से परेशानी में क्या करूँ?' },
                    { label: 'आपातकालीन अलर्ट', q: 'मुझे अचानक सीने में तेज दर्द और सांस लेने में कठिनाई हो रही है।' },
                  ]
                : language === 'Telugu'
                ? [
                    { label: 'ఫాలో-అప్ వివరాలు?', q: 'నా తదుపరి ఫాలో-అప్ కోసం నేను ఏమి తీసుకురావాలి?' },
                    { label: 'ఆహారం & మందులు?', q: 'మందులు ఖాళీ కడుపుతో తీసుకోవచ్చా?' },
                    { label: 'కంటి సంరక్షణ?', q: 'కంటిలో చుక్కల మందు వేసుకునేటప్పుడు తీసుకోవలసిన జాగ్రత్తలు ఏమిటి?' },
                    { label: 'ఎమర్జెన్సీ హెచ్చరిక', q: 'నాకు తీవ్రమైన ఛాతీ నొప్పి మరియు ఊపిరాడటం లేదు.' },
                  ]
                : [
                    { label: 'Follow-up Prep?', q: 'What do I need to prepare before my scheduled follow-up session?' },
                    { label: 'Meds with Food?', q: 'Should I take my prescribed medications with food or milk?' },
                    { label: 'Eye Care / Shield?', q: 'How should I apply my eye drops and when should I wear the shield?' },
                    { label: 'Red-Flag Alert', q: 'I have sudden crushing chest pain and shortness of breath.' },
                  ]
              ).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setAssistantInput(item.q);
                    submitQuestion(item.q);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#070D1F] hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white cursor-pointer transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto space-y-3 p-3 rounded-xl bg-[#060D1E] border border-slate-800 mb-3 text-xs">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === 'patient' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-xl ${
                    msg.sender === 'patient'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : msg.redFlag
                      ? 'bg-rose-950/80 border border-rose-500/50 text-rose-100 rounded-bl-none'
                      : 'bg-[#0B142B] border border-slate-700 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.redFlag && (
                    <div className="flex items-center gap-1.5 text-rose-300 font-bold mb-1 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>CRITICAL EMERGENCY ALERT</span>
                    </div>
                  )}
                  <p className="leading-relaxed">{msg.text}</p>
                  {msg.advice && (
                    <p className="text-[10px] text-cyan-300 font-mono mt-1 pt-1 border-t border-slate-700/60">
                      Recommendation: {msg.advice}
                    </p>
                  )}
                  <span className="text-[9px] text-slate-400 mt-1 block text-right font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isAsking && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0B142B] border border-slate-700 text-xs text-slate-400">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-[#00F5D4] border-t-transparent animate-spin" />
                <span>Assistant is evaluating clinical protocol...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Voice & Text Chat Input */}
          <div className="mt-auto">
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#060D1E] border border-slate-700/80">
              <button
                onClick={startMicForAssistant}
                disabled={isAsking}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  isListeningMic
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-[#00F5D4]'
                }`}
                title="Tap to ask using microphone"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={
                  isListeningMic
                    ? `Listening in ${language}...`
                    : `Ask in ${language} (e.g., Can I take ibuprofen with my eye drops?)...`
                }
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitQuestion();
                }}
                className="flex-1 bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none px-2"
              />

              <button
                onClick={() => submitQuestion()}
                disabled={!assistantInput.trim() || isAsking}
                className="p-2 rounded-lg bg-[#00F5D4] hover:bg-[#00e0c2] text-[#050A17] font-bold transition-colors cursor-pointer disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {isListeningMic && (
              <p className="text-[10px] text-[#00F5D4] font-mono mt-1 text-center">
                Listening... Pause speaking to submit automatically.
              </p>
            )}
          </div>

          {/* When to return to ED Emergency Box */}
          <div className="mt-4 p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-rose-300 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>WHEN TO RETURN TO EMERGENCY ROOM IMMEDIATELY:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[10px]">
              {currentPatient.care_continuum_plan?.warning_signs?.map((sign, i) => (
                <li key={i}>{sign}</li>
              )) || (
                <>
                  <li>Sudden loss of vision, severe colored halos, or chemical exposure</li>
                  <li>Severe crushing chest pain, dizziness, or shortness of breath</li>
                  <li>High fever (&gt;101.5°F) unresponsive to medications</li>
                  <li>Uncontrolled bleeding or spreading erythema around wound</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
