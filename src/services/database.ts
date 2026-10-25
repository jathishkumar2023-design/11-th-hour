import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { TriageRecord } from '../types/triage';
import { INITIAL_PATIENTS } from '../data/initialData';

const TRIAGE_COLLECTION = 'triage_records';
const PATIENTS_COLLECTION = 'patients';
const RECOVERY_LOGS_COLLECTION = 'recovery_logs';
const USERS_COLLECTION = 'users';

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  role: 'patient' | 'nurse' | 'doctor';
  patientId?: string;
  age?: number;
  gender?: string;
  preferredLanguage?: 'English' | 'Hindi' | 'Telugu';
  createdAt: string;
}

// Seed initial hospital patient database if Firestore is currently empty
export async function seedInitialDatabaseIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, TRIAGE_COLLECTION));
    if (snap.empty) {
      console.log('Seeding initial clinical triage database to Firestore...');
      for (const p of INITIAL_PATIENTS) {
        await setDoc(doc(db, TRIAGE_COLLECTION, p.id), {
          ...p,
          syncedAt: new Date().toISOString(),
        });

        // Also seed patient profile
        await setDoc(doc(db, PATIENTS_COLLECTION, p.triage_metadata.patient_id), {
          patientId: p.triage_metadata.patient_id,
          name: p.patient_name || 'Emergency Patient',
          age: p.age || 45,
          gender: p.gender || 'Not specified',
          preferredLanguage: p.triage_metadata.detected_language,
          activeAcuity: p.triage_metadata.acuity_level,
          registeredAt: p.triage_metadata.timestamp,
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, TRIAGE_COLLECTION);
  }
}

// Real-time listener for all emergency triage records
export function subscribeToTriageRecords(
  onUpdate: (records: TriageRecord[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, TRIAGE_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const records: TriageRecord[] = [];
      snapshot.forEach((d) => {
        records.push(d.data() as TriageRecord);
      });
      // Sort newest first
      records.sort(
        (a, b) =>
          new Date(b.triage_metadata?.timestamp || 0).getTime() -
          new Date(a.triage_metadata?.timestamp || 0).getTime()
      );
      onUpdate(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, TRIAGE_COLLECTION);
      if (onError) onError(error);
    }
  );
}

// Save or update an emergency triage record
export async function saveTriageRecordToFirestore(record: TriageRecord): Promise<void> {
  try {
    await setDoc(doc(db, TRIAGE_COLLECTION, record.id), {
      ...record,
      updatedAt: new Date().toISOString(),
    });

    // Also update patient profile registry
    if (record.triage_metadata?.patient_id) {
      await setDoc(
        doc(db, PATIENTS_COLLECTION, record.triage_metadata.patient_id),
        {
          patientId: record.triage_metadata.patient_id,
          name: record.patient_name || 'Patient',
          age: record.age || 40,
          gender: record.gender || 'Not specified',
          preferredLanguage: record.triage_metadata.detected_language,
          activeAcuity: record.triage_metadata.acuity_level,
          lastTriageId: record.id,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${TRIAGE_COLLECTION}/${record.id}`);
    throw err;
  }
}

// Update nurse triage status (Approve, Escalate, Discharge)
export async function updateTriageStatusInFirestore(
  recordId: string,
  updates: Partial<TriageRecord>
): Promise<void> {
  try {
    await updateDoc(doc(db, TRIAGE_COLLECTION, recordId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${TRIAGE_COLLECTION}/${recordId}`);
    throw err;
  }
}

// Update follow-up session date & alerts in Firestore
export async function updateFollowUpSessionInFirestore(
  recordId: string,
  followUp: import('../types/triage').FollowUpSession
): Promise<void> {
  try {
    await updateDoc(doc(db, TRIAGE_COLLECTION, recordId), {
      follow_up_session: followUp,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${TRIAGE_COLLECTION}/${recordId}`);
    throw err;
  }
}


// Save patient daily recovery log (medications, water, wound, pain score)
export async function saveRecoveryLogToFirestore(
  patientId: string,
  logData: {
    medicationsTaken: string[];
    waterGlasses: number;
    woundCleaned: boolean;
    painLevel: number;
    date: string;
  }
): Promise<void> {
  try {
    const logDocId = `${patientId}_${logData.date}`;
    await setDoc(
      doc(db, RECOVERY_LOGS_COLLECTION, logDocId),
      {
        patientId,
        ...logData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${RECOVERY_LOGS_COLLECTION}/${patientId}`);
  }
}

// Load patient recovery log
export async function getRecoveryLogFromFirestore(
  patientId: string,
  date: string
): Promise<any | null> {
  try {
    const logDocId = `${patientId}_${date}`;
    const snap = await getDoc(doc(db, RECOVERY_LOGS_COLLECTION, logDocId));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${RECOVERY_LOGS_COLLECTION}/${patientId}`);
    return null;
  }
}

// Save user profile upon login
export async function saveUserProfileToFirestore(profile: UserProfile): Promise<void> {
  try {
    await setDoc(
      doc(db, USERS_COLLECTION, profile.uid),
      {
        ...profile,
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${USERS_COLLECTION}/${profile.uid}`);
  }
}
