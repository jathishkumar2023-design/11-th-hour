export type AcuityLevel = 'RED' | 'AMBER' | 'GREEN';
export type ESICategory = 'Emergent' | 'Urgent' | 'Non-Urgent';
export type SupportedLanguage = 'English' | 'Hindi' | 'Telugu';

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing?: string;
  takenToday?: boolean;
  takenAt?: string;
  instructions?: string;
}

export interface RecoveryTask {
  id: string;
  title: string;
  category: 'medication' | 'hydration' | 'wound' | 'vitals' | 'activity';
  completed: boolean;
  target?: string;
  progress?: number;
  timeLabel?: string;
}

export interface VitalSignRecommendation {
  parameter: string;
  expectedRange: string;
  priority: 'CRITICAL' | 'MONITOR' | 'ROUTINE';
}

export interface FollowUpSession {
  id: string;
  department: string;
  clinicianName: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  location: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'RESCHEDULED' | 'COMPLETED';
  alertsEnabled: {
    sms: boolean;
    voiceCall: boolean;
    calendarSync: boolean;
    audioAlarm: boolean;
  };
  phoneNotification: string;
  prerequisites: string[];
  notes?: string;
  lastAlertSentAt?: string;
}

export interface TriageRecord {
  id: string;
  patient_name?: string;
  age?: number;
  gender?: string;
  phone?: string;
  transcription_raw?: string;
  triage_metadata: {
    patient_id: string;
    timestamp: string;
    detected_language: SupportedLanguage;
    acuity_level: AcuityLevel;
    esi_category: ESICategory;
  };
  clinical_summary: {
    chief_complaint: string;
    chief_complaint_original?: string;
    symptom_onset_duration: string;
    reported_symptoms: string[];
    risk_factors?: string[];
  };
  nurse_pre_orders: string[];
  suggested_vitals?: VitalSignRecommendation[];
  care_continuum_plan: {
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      instructions?: string;
    }>;
    daily_recovery_tasks: string[];
    warning_signs?: string[];
  };
  follow_up_session?: FollowUpSession;
  guardrails: {
    status: string;
    requires_nurse_approval: boolean;
    disclaimer: string;
  };
  nurse_status: 'PENDING_REVIEW' | 'APPROVED' | 'ESCALATED' | 'DISCHARGED';
  nurse_assigned?: string;
  approval_timestamp?: string;
  intake_duration_seconds?: number;
}

