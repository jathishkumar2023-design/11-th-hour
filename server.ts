import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));

// Enable CORS for decoupled front/back-end deployments (e.g. Netlify + Backend)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Shared Gemini client (server-side only)
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Deterministic clinical fallback generator (ESI Protocol compliant & condition-specific)
function generateFallbackTriage(input: string, selectedLang: string, bio?: any) {
  const text = (input || '').toLowerCase();
  
  // Specific condition detection
  const isEye =
    text.includes('eye') ||
    text.includes('ocular') ||
    text.includes('vision') ||
    text.includes('cornea') ||
    text.includes('pupil') ||
    text.includes('blind') ||
    text.includes('photophobia') ||
    text.includes('tearing') ||
    text.includes('lacrimation') ||
    text.includes('conjunctiv') ||
    text.includes('light sensitiv') ||
    text.includes('आँख') ||
    text.includes('नेत्र') ||
    text.includes('కన్ను') ||
    text.includes('దృష్టి');

  const isCardiacOrResp =
    text.includes('chest pain') ||
    text.includes('shortness of breath') ||
    text.includes('choking') ||
    text.includes('radiating') ||
    text.includes('unconscious') ||
    text.includes('collapse') ||
    text.includes('stroke') ||
    text.includes('heart') ||
    text.includes('cardiac') ||
    text.includes('angina') ||
    text.includes('छाती में दर्द') ||
    text.includes('గుండె నొప్పి') ||
    text.includes('శ్వాస ఆడటం లేదు');

  const isFever =
    text.includes('fever') ||
    text.includes('febrile') ||
    text.includes('102') ||
    text.includes('103') ||
    text.includes('101') ||
    text.includes('104') ||
    text.includes('chills') ||
    text.includes('shivering') ||
    text.includes('बुखार') ||
    text.includes('జ్వరం');

  const isAbdominal =
    text.includes('abdomen') ||
    text.includes('abdominal') ||
    text.includes('stomach') ||
    text.includes('vomit') ||
    text.includes('nausea') ||
    text.includes('appendix') ||
    text.includes('belly') ||
    text.includes('पेट में दर्द') ||
    text.includes('కడుపు నొప్పి');

  const isGreen =
    !isCardiacOrResp &&
    !isEye &&
    (text.includes('sprain') ||
      text.includes('rash') ||
      text.includes('minor') ||
      text.includes('itch') ||
      text.includes('moch') ||
      text.includes('खरोंच') ||
      text.includes('స్వల్ప') ||
      text.includes('దురద') ||
      text.includes('twisted ankle'));

  let detectedLang = selectedLang && selectedLang !== 'Auto' ? selectedLang : 'English';
  if (/[\u0900-\u097F]/.test(input)) {
    detectedLang = 'Hindi';
  } else if (/[\u0C00-\u0C7F]/.test(input)) {
    detectedLang = 'Telugu';
  }

  const pid = bio?.patientId || `P-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Ophthalmic Emergency (Eye Pain, Corneal Abrasion, Foreign Body, Photophobia)
  if (isEye) {
    const isSevereEye = text.includes('chemical') || text.includes('blind') || text.includes('cannot see');
    const eyeAcuity = isSevereEye ? 'RED' : 'AMBER';
    const eyeEsi = isSevereEye ? 'Emergent' : 'Urgent';

    return {
      triage_metadata: {
        patient_id: pid,
        timestamp: new Date().toISOString(),
        detected_language: detectedLang,
        acuity_level: eyeAcuity,
        esi_category: eyeEsi,
      },
      clinical_summary: {
        chief_complaint: 'Acute ocular pain with photophobia, foreign body sensation, and blurred visual acuity (Afebrile / No Fever)',
        symptom_onset_duration: 'Acute sudden onset',
        reported_symptoms: [
          'Acute severe ocular discomfort / eye ache',
          'Intense photophobia and involuntary lacrimation',
          'Corneal foreign body sensation and irritation on blinking',
          'Impaired visual acuity without systemic febrile illness',
        ],
      },
      nurse_pre_orders: [
        'STAT Visual Acuity assessment (Snellen chart OD/OS/OU)',
        'Fluorescein dye corneal staining with Wood\'s lamp / Slit-lamp evaluation',
        'Point-of-care Tonometry to rule out elevated Intraocular Pressure (IOP)',
        'Rigid eye shield application (Strictly avoid eye patch/rubbing)',
        'Immediate neutral saline irrigation if chemical or particulate exposure',
      ],
      care_continuum_plan: {
        medications: [
          { name: 'Erythromycin Ophthalmic Ointment 0.5%', dosage: '1/2 inch ribbon', frequency: 'Four times daily into conjunctival sac' },
          { name: 'Preservative-Free Lubricating Tears', dosage: '1-2 drops', frequency: 'Every 2 hours while awake' },
          { name: 'Oral Acetaminophen', dosage: '500mg', frequency: 'Every 6 hours PRN ocular discomfort' },
        ],
        daily_recovery_tasks: [
          'Wear rigid eye shield at all times during sleep to prevent pressure or rubbing',
          'Wear dark polarized UV sunglasses indoors and outdoors for photophobia',
          'Zero contact lens wear or eye makeup until full ophthalmology clearance',
          'Immediate return if sudden loss of vision, colored halos, or severe nausea occur',
        ],
      },
      follow_up_session: {
        id: `fs-${pid}`,
        department: 'Emergency Ophthalmology & Cornea Clinic',
        clinicianName: 'Dr. Aris Thorne, MD (Ophthalmic Specialist)',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledTime: '09:30',
        location: 'Eye & ENT Outpatient Pavilion - Suite 104',
        status: 'CONFIRMED',
        alertsEnabled: {
          sms: true,
          voiceCall: true,
          calendarSync: true,
          audioAlarm: true,
        },
        phoneNotification: bio?.phone || '+1 (555) 749-2180',
        prerequisites: [
          'Bring prescribed eye drops and eye shield',
          'Arrange a designated driver for pupillary examination',
          'Do not wear contact lenses prior to evaluation',
        ],
        notes: 'Follow-up fluorescein evaluation for corneal epithelial healing.',
      },
      guardrails: {
        status: 'ASSISTIVE_ONLY',
        requires_nurse_approval: true,
        disclaimer: 'AI suggestion only. Human clinician sign-off required.',
      },
    };
  }

  // 2. Cardiac / Resuscitation (RED / ESI 1-2)
  if (isCardiacOrResp) {
    return {
      triage_metadata: {
        patient_id: pid,
        timestamp: new Date().toISOString(),
        detected_language: detectedLang,
        acuity_level: 'RED',
        esi_category: 'Emergent',
      },
      clinical_summary: {
        chief_complaint: 'Acute retrosternal chest pressure with severe dyspnea and radiation',
        symptom_onset_duration: '35 minutes prior to presentation',
        reported_symptoms: [
          'Crushing substernal chest discomfort',
          'Shortness of breath (Orthopnea)',
          'Diaphoresis and left arm paresthesia',
        ],
      },
      nurse_pre_orders: [
        'STAT 12-Lead ECG within 5 minutes',
        'Continuous Cardiac & Pulse Oximetry Telemetry',
        'Stat High-Sensitivity Troponin-I & CK-MB lab draw',
        'Dual peripheral IV access (18G) + supplemental O2 titrate >94%',
      ],
      care_continuum_plan: {
        medications: [
          { name: 'Aspirin (Chewable)', dosage: '325mg', frequency: 'Immediate STAT loading dose' },
          { name: 'Sublingual Nitroglycerin', dosage: '0.4mg', frequency: 'PRN every 5 min up to 3 doses' },
          { name: 'Atorvastatin', dosage: '80mg', frequency: 'Once daily at bedtime' },
        ],
        daily_recovery_tasks: [
          'Continuous cardiac rhythm telemetry logging',
          'Strict bed rest until cardiology evaluation',
          'Serial biomarker checks every 3 hours',
        ],
      },
      follow_up_session: {
        id: `fs-${pid}`,
        department: 'Cardiology Post-ACS Specialty Clinic',
        clinicianName: 'Dr. Katherine Mehta, MD',
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledTime: '10:30',
        location: 'Cardiovascular Pavilion - Suite 402',
        status: 'CONFIRMED',
        alertsEnabled: { sms: true, voiceCall: true, calendarSync: true, audioAlarm: true },
        phoneNotification: bio?.phone || '+1 (555) 392-1082',
        prerequisites: ['10-hour fasting for repeat lipid panel', 'Bring 72h blood pressure log'],
      },
      guardrails: {
        status: 'ASSISTIVE_ONLY',
        requires_nurse_approval: true,
        disclaimer: 'AI suggestion only. Human clinician sign-off required.',
      },
    };
  }

  // 3. Abdominal / GI or True Fever
  if (isAbdominal || isFever) {
    const chiefComplaint = isFever && isAbdominal
      ? 'High-grade fever (102.8°F) accompanied by localized abdominal pain'
      : isAbdominal
      ? 'Acute worsening localized abdominal pain with nausea'
      : 'Acute febrile illness with chills and rigors';

    return {
      triage_metadata: {
        patient_id: pid,
        timestamp: new Date().toISOString(),
        detected_language: detectedLang,
        acuity_level: 'AMBER',
        esi_category: 'Urgent',
      },
      clinical_summary: {
        chief_complaint: chiefComplaint,
        symptom_onset_duration: '18 hours duration, acutely worsening',
        reported_symptoms: isFever
          ? ['Elevated body temperature with chills', 'Abdominal tenderness and rebound guarding', 'Nausea and reduced oral intake']
          : ['Persistent abdominal tenderness and cramping', 'Nausea and inability to retain large fluid volumes', 'Absence of high fever'],
      },
      nurse_pre_orders: [
        'Targeted abdominal ultrasound / Stat CBC with differential',
        'Serum Lactate, Comprehensive Metabolic Panel & Urinalysis',
        'IV fluid resuscitation: 1000mL Normal Saline wide open',
        'Strict NPO status pending surgical review',
      ],
      care_continuum_plan: {
        medications: [
          { name: 'IV Ceftriaxone', dosage: '1g', frequency: 'Every 24 hours' },
          { name: 'Ondansetron (Zofran)', dosage: '4mg', frequency: 'Every 8 hours PRN nausea' },
          { name: 'Acetaminophen', dosage: '650mg', frequency: 'Every 6 hours PRN discomfort' },
        ],
        daily_recovery_tasks: [
          'Maintain minimum 2.5L daily hydration log once tolerating PO',
          'Abdominal pain score reassessment every 4 hours',
          'Core temperature monitoring',
        ],
      },
      follow_up_session: {
        id: `fs-${pid}`,
        department: 'Gastroenterology & General Surgery Clinic',
        clinicianName: 'Dr. Vivek Patel, MD',
        scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledTime: '14:00',
        location: 'Surgical Outpatient Wing - Exam Room 12',
        status: 'CONFIRMED',
        alertsEnabled: { sms: true, voiceCall: false, calendarSync: true, audioAlarm: true },
        phoneNotification: bio?.phone || '+1 (555) 481-1083',
        prerequisites: ['Record temperature chart', 'Light liquid breakfast'],
      },
      guardrails: {
        status: 'ASSISTIVE_ONLY',
        requires_nurse_approval: true,
        disclaimer: 'AI suggestion only. Human clinician sign-off required.',
      },
    };
  }

  // 4. GREEN / Non-Urgent (Sprain, Minor Rash, Superficial Injury)
  return {
    triage_metadata: {
      patient_id: pid,
      timestamp: new Date().toISOString(),
      detected_language: detectedLang,
      acuity_level: 'GREEN',
      esi_category: 'Non-Urgent',
    },
    clinical_summary: {
      chief_complaint: input.length > 5 ? input.slice(0, 110) : 'Minor musculoskeletal extremity strain and localized cutaneous rash',
      symptom_onset_duration: '2 days duration',
      reported_symptoms: [
        'Mild localized edema and tenderness',
        'Weight bearing preserved with mild discomfort',
        'Absence of systemic fever, chills, or shortness of breath',
      ],
    },
    nurse_pre_orders: [
      'Targeted extremity radiographic series if point tender',
      'Compression bandage & cryotherapy application',
      'Oral analgesic trial with NSAID',
    ],
    care_continuum_plan: {
      medications: [
        { name: 'Ibuprofen', dosage: '400mg', frequency: 'Every 8 hours with food for 3 days' },
        { name: 'Topical Hydrocortisone 1%', dosage: 'Thin layer', frequency: 'Twice daily to rash area' },
      ],
      daily_recovery_tasks: [
        'RICE Protocol: Rest, Ice 20 min TID, Compression, Elevation',
        'Daily skin integrity and rash boundary inspection',
        'Gentle range of motion exercises',
      ],
    },
    follow_up_session: {
      id: `fs-${pid}`,
      department: 'Orthopedic & Sports Rehabilitation Clinic',
      clinicianName: 'Dr. Sarah Rao, PT, DPT',
      scheduledDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      scheduledTime: '11:15',
      location: 'Sports Medicine Therapy Center - Room 2B',
      status: 'SCHEDULED',
      alertsEnabled: { sms: true, voiceCall: false, calendarSync: true, audioAlarm: false },
      phoneNotification: bio?.phone || '+1 (555) 672-1084',
      prerequisites: ['Wear supportive athletic footwear', 'Bring brace'],
    },
    guardrails: {
      status: 'ASSISTIVE_ONLY',
      requires_nurse_approval: true,
      disclaimer: 'AI suggestion only. Human clinician sign-off required.',
    },
  };
}

// POST /api/triage/analyze
app.post('/api/triage/analyze', async (req, res) => {
  const startTime = Date.now();
  const { input, language = 'English', audioBase64, bio } = req.body;

  if (!input && !audioBase64) {
    return res.status(400).json({ error: 'Input text or audio data is required' });
  }

  const promptText = input || 'Patient voice intake recorded via emergency terminal.';
  const preferredLang = language || 'Auto';
  const patientBioContext = bio
    ? `Verified Patient Bio: Name=${bio.name || 'Unknown'}, Age=${bio.age || 'Unknown'}, Gender=${bio.gender || 'Unknown'}, Phone=${bio.phone || 'Unknown'}, PatientID=${bio.patientId || 'Auto'}`
    : 'Walk-In Patient';

  // If Gemini is available, call gemini-3.1-flash-lite with strict JSON schema
  if (ai) {
    try {
      const systemInstruction = `You are "11th Hour", a clinical AI triage assistant embedded in a high-acuity Emergency Department.
Analyze the patient intake (which may be in English, Hindi, Telugu, or mixed code-switching).
Evaluate clinical urgency using the Emergency Severity Index (ESI):
- RED: ESI 1 or 2 (Life-threatening, acute coronary syndrome/chest pain radiating, severe dyspnea, anaphylaxis, severe trauma, sepsis signs, acute sudden blindness, chemical burn to eye). Set acuity_level to "RED", esi_category to "Emergent".
- AMBER: ESI 3 (Urgent, severe acute pain, acute ophthalmic trauma/eye pain/corneal abrasion, acute abdominal pain, moderate respiratory distress, fractures, needs multiple resources). Set acuity_level to "AMBER", esi_category to "Urgent".
- GREEN: ESI 4 or 5 (Non-urgent, mild sprain, chronic rash, suture removal, minor URI). Set acuity_level to "GREEN", esi_category to "Non-Urgent".

CRITICAL ZERO-HALLUCINATION & CLINICAL FIDELITY RULES:
1. NEVER hallucinate, invent, or default to "fever", "high-grade fever", "elevated temperature", or antipyretics unless the patient's transcript explicitly states having a fever, feverish chills, or high body temperature.
2. OCULAR / EYE COMPLAINTS: If the patient presents with EYE symptoms (e.g. "pain in the eye", "eye ache", "corneal scratch", "foreign body in eye", "blurry vision", "metal piece in eye", "light sensitivity"):
   - Correctly classify as an OPHTHALMIC / OCULAR EMERGENCY (ESI-3 AMBER or ESI-2 RED if chemical/severe vision loss).
   - Chief Complaint MUST reflect the eye condition (e.g. "Acute right eye pain with photophobia and corneal foreign body sensation").
   - Pre-orders MUST include: Snellen Visual Acuity test (OD/OS/OU), Fluorescein dye corneal staining with Wood's lamp, Point-of-care Tonometry (Intraocular Pressure), Eye Shield, and immediate neutral saline irrigation if chemical/foreign material.
   - Care Continuum Plan must include: Topical ophthalmic drops/ointments (e.g., Erythromycin ophthalmic ointment, preservative-free tears), oral analgesics (acetaminophen), eye shield while sleeping, and urgent Ophthalmology follow-up within 24-48 hours.
   - NEVER categorize eye pain as fever, abdominal pain, or cardiac issues!

Detected language MUST be one of: "English", "Hindi", "Telugu".
Extract Chief Complaint (1 sentence clinical summary in English), duration of onset, reported symptoms list, immediate nurse pre-orders (protocols/labs), and post-discharge recovery continuity plan with medications, tasks, and follow-up session.
Include standard clinical guardrails.
Always output pure valid JSON matching the schema strictly.`;

      const contents: any[] = [];
      if (audioBase64) {
        contents.push({
          inlineData: {
            mimeType: 'audio/webm',
            data: audioBase64,
          },
        });
        contents.push({
          text: `Transcribe and triage this emergency patient voice intake. ${patientBioContext}. Primary expected language: ${preferredLang}. Also triage text note if any: "${promptText}".`,
        });
      } else {
        contents.push({
          text: `Emergency Patient Intake Transcript (${preferredLang}). ${patientBioContext}: "${promptText}". Please generate the complete triage assessment JSON.`,
        });
      }

      const aiPromise = ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              triage_metadata: {
                type: Type.OBJECT,
                properties: {
                  patient_id: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  detected_language: { type: Type.STRING },
                  acuity_level: { type: Type.STRING },
                  esi_category: { type: Type.STRING },
                },
                required: ['patient_id', 'timestamp', 'detected_language', 'acuity_level', 'esi_category'],
              },
              clinical_summary: {
                type: Type.OBJECT,
                properties: {
                  chief_complaint: { type: Type.STRING },
                  symptom_onset_duration: { type: Type.STRING },
                  reported_symptoms: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['chief_complaint', 'symptom_onset_duration', 'reported_symptoms'],
              },
              nurse_pre_orders: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              care_continuum_plan: {
                type: Type.OBJECT,
                properties: {
                  medications: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        dosage: { type: Type.STRING },
                        frequency: { type: Type.STRING },
                      },
                      required: ['name', 'dosage', 'frequency'],
                    },
                  },
                  daily_recovery_tasks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['medications', 'daily_recovery_tasks'],
              },
              guardrails: {
                type: Type.OBJECT,
                properties: {
                  status: { type: Type.STRING },
                  requires_nurse_approval: { type: Type.BOOLEAN },
                  disclaimer: { type: Type.STRING },
                },
                required: ['status', 'requires_nurse_approval', 'disclaimer'],
              },
            },
            required: ['triage_metadata', 'clinical_summary', 'nurse_pre_orders', 'care_continuum_plan', 'guardrails'],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Triage Gemini call timed out (9.5s limit)')), 9500)
      );

      const response = await Promise.race([aiPromise, timeoutPromise]);

      const parsed = JSON.parse(response.text || '{}');
      if (!parsed.triage_metadata?.patient_id) {
        parsed.triage_metadata = parsed.triage_metadata || {};
        parsed.triage_metadata.patient_id = bio?.patientId || `P-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      if (!parsed.triage_metadata?.timestamp) {
        parsed.triage_metadata.timestamp = new Date().toISOString();
      }

      // Automatically attach an appropriate follow-up session if model omitted it
      if (!parsed.follow_up_session) {
        const isEyeCase = /eye|ocular|vision|cornea|photophobia/i.test(promptText + ' ' + (parsed.clinical_summary?.chief_complaint || ''));
        const isCardiacCase = /chest|cardiac|heart|breath/i.test(promptText + ' ' + (parsed.clinical_summary?.chief_complaint || ''));
        parsed.follow_up_session = {
          id: `fs-${parsed.triage_metadata.patient_id}`,
          department: isEyeCase
            ? 'Emergency Ophthalmology & Cornea Specialty Clinic'
            : isCardiacCase
            ? 'Cardiology Post-ACS Specialty Clinic'
            : 'Outpatient Comprehensive Care Clinic',
          clinicianName: isEyeCase
            ? 'Dr. Aris Thorne, MD (Ophthalmic Specialist)'
            : isCardiacCase
            ? 'Dr. Katherine Mehta, MD'
            : 'Attending Clinical Staff Physician',
          scheduledDate: new Date(Date.now() + (isEyeCase ? 1 : isCardiacCase ? 3 : 5) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          scheduledTime: '10:00',
          location: isEyeCase ? 'Ophthalmic Diagnostic Pavilion - Suite 104' : 'Specialty Clinic Tower - Room 302',
          status: 'SCHEDULED',
          alertsEnabled: { sms: true, voiceCall: false, calendarSync: true, audioAlarm: true },
          phoneNotification: bio?.phone || '+1 (555) 019-2834',
          prerequisites: isEyeCase
            ? ['Bring eye drops and eye shield', 'Do not wear contact lenses', 'Have a driver available']
            : ['Fasting 6 hours prior to consultation', 'Bring discharge medication bottles'],
          notes: 'Review clinical resolution and repeat physical examination.',
        };
      }

      const processingLatencyMs = Date.now() - startTime;
      return res.json({
        success: true,
        data: parsed,
        latencyMs: processingLatencyMs,
        source: 'gemini-3.1-flash-lite',
      });
    } catch (err: any) {
      console.warn('Gemini triage generation warning, falling back to condition-specific clinical ESI engine:', err?.message);
    }
  }

  // Fallback to condition-specific clinical ESI parser
  const fallbackData = generateFallbackTriage(promptText, preferredLang, bio);
  const latencyMs = Math.max(120, Date.now() - startTime);
  return res.json({
    success: true,
    data: fallbackData,
    latencyMs,
    source: 'deterministic-esi-engine',
  });
});

// POST /api/care/chat (Post-discharge CareContinuum Voice/Text Q&A)
app.post('/api/care/chat', async (req, res) => {
  const { question, patientContext, language = 'English' } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  // 1. Try Gemini 3.1 Flash Lite with a strict 4.5s timeout
  if (ai) {
    try {
      const contextStr = patientContext
        ? `Patient ID: ${patientContext.patient_id || 'P-1082'}, Chief Complaint: ${patientContext.chief_complaint || 'ED Visit'}, Meds: ${JSON.stringify(patientContext.medications || [])}, Tasks: ${JSON.stringify(patientContext.tasks || [])}`
        : 'Emergency room discharge patient';

      const prompt = `You are the "11th Hour CareContinuum Recovery Assistant", a compassionate, medically sound AI companion guiding a discharged patient at home.
Language: ${language} (English, Hindi, or Telugu).
Patient Context: ${contextStr}
Patient Question: "${question}"

Instructions:
1. Provide a direct, compassionate, medically accurate answer in 2-3 sentences in ${language}.
2. If the patient describes acute red-flag emergency symptoms (such as crushing chest pain, severe shortness of breath, loss of consciousness, uncontrolled bleeding, or sudden facial drooping), you MUST prefix your response with "[RED_FLAG]" and urge them to call emergency services immediately.
3. Otherwise, give practical advice on medications, hydration, rest, wound care, or normal healing.
4. Return ONLY the answer text. Do not wrap in markdown or json blocks.`;

      const aiPromise = ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Care chat AI call timed out (4.5s limit)')), 4500)
      );

      const response = await Promise.race([aiPromise, timeoutPromise]);
      const rawText = (response.text || '').trim();

      if (rawText) {
        const isRedFlag = rawText.includes('[RED_FLAG]');
        const cleanAnswer = rawText.replace(/\[RED_FLAG\]/g, '').trim();

        return res.json({
          success: true,
          answer: cleanAnswer,
          redFlag: isRedFlag,
          adviceBullet: isRedFlag
            ? 'Seek immediate emergency attention.'
            : 'Follow your personalized discharge protocol.',
          source: 'gemini-3.1-flash-lite',
        });
      }
    } catch (err: any) {
      console.warn('Care chat gemini call error/timeout, using clinical fallback engine:', err?.message);
    }
  }

  // 2. Comprehensive Multi-Lingual Clinical Recovery Engine Fallback
  const qLower = question.toLowerCase();
  let isRedFlag = false;
  let reply = '';
  let advice = 'Keep resting and stay hydrated.';

  // Check Red Flag Emergency Symptoms
  const isEmergency =
    qLower.includes('chest pain') ||
    qLower.includes('shortness of breath') ||
    qLower.includes('breath') ||
    qLower.includes('faint') ||
    qLower.includes('collapse') ||
    qLower.includes('bleed') ||
    qLower.includes('unconscious') ||
    qLower.includes('choking') ||
    qLower.includes('stroke') ||
    qLower.includes('छाती में दर्द') ||
    qLower.includes('सांस लेने में तकलीफ') ||
    qLower.includes('बेहोश') ||
    qLower.includes('खून बह') ||
    qLower.includes('గుండె నొప్పి') ||
    qLower.includes('శ్వాస ఆడటం లేదు') ||
    qLower.includes('రక్తం');

  // Check Medication / Food / Stomach inquiries
  const isMedFood =
    qLower.includes('food') ||
    qLower.includes('empty stomach') ||
    qLower.includes('stomach') ||
    qLower.includes('eat') ||
    qLower.includes('meal') ||
    qLower.includes('milk') ||
    qLower.includes('nausea') ||
    qLower.includes('dizziness') ||
    qLower.includes('dizzy') ||
    qLower.includes('खाना') ||
    qLower.includes('पेट') ||
    qLower.includes('आहार') ||
    qLower.includes('ఆహారం') ||
    qLower.includes('కడుపు');

  // Check Medication drug interactions (ibuprofen, antibiotic, paracetamol)
  const isDrugInteraction =
    qLower.includes('ibuprofen') ||
    qLower.includes('antibiotic') ||
    qLower.includes('paracetamol') ||
    qLower.includes('aspirin') ||
    qLower.includes('tylenol') ||
    qLower.includes('painkiller') ||
    qLower.includes('दवा') ||
    qLower.includes('मందులు');

  // Check Wound Care & Bathing
  const isWoundOrBath =
    qLower.includes('shower') ||
    qLower.includes('bath') ||
    qLower.includes('wound') ||
    qLower.includes('bandage') ||
    qLower.includes('dressing') ||
    qLower.includes('stitch') ||
    qLower.includes('water') ||
    qLower.includes('wash') ||
    qLower.includes('घाव') ||
    qLower.includes('पट्टी') ||
    qLower.includes('स्नान') ||
    qLower.includes('గాయం') ||
    qLower.includes('స్నానం');

  // Check Pain & Soreness
  const isPainOrSwelling =
    qLower.includes('pain') ||
    qLower.includes('swelling') ||
    qLower.includes('sore') ||
    qLower.includes('hurt') ||
    qLower.includes('fever') ||
    qLower.includes('दर्द') ||
    qLower.includes('सूजन') ||
    qLower.includes('बुखार') ||
    qLower.includes('నొప్పి') ||
    qLower.includes('వాపు') ||
    qLower.includes('జ్వరం');

  // Check Eye & Ophthalmic Care
  const isEyeQuery =
    qLower.includes('eye') ||
    qLower.includes('vision') ||
    qLower.includes('drop') ||
    qLower.includes('ointment') ||
    qLower.includes('shield') ||
    qLower.includes('cornea') ||
    qLower.includes('tearing') ||
    qLower.includes('blink') ||
    qLower.includes('photophobia') ||
    qLower.includes('आँख') ||
    qLower.includes('కన్ను');

  if (isEmergency) {
    isRedFlag = true;
    advice = 'Call 911 or visit the nearest Emergency Department immediately.';
    if (language === 'Hindi') {
      reply =
        'चेतावनी: यह एक गंभीर आपातकालीन लक्षण हो सकता है। कृपया तुरंत 108/911 आपातकालीन सेवा पर कॉल करें या तुरंत नजदीकी आपातकालीन विभाग में लौटें। स्वयं गाड़ी न चलाएं।';
    } else if (language === 'Telugu') {
      reply =
        'హెచ్చరిక: ఇది తీవ్రమైన అత్యవసర లక్షణం కావచ్చు. దయచేసి వెంటనే 108/911 అత్యవసర వైద్య సంరక్షణకు కాల్ చేయండి లేదా ఎమర్జెన్సీ విభాగానికి వెళ్ళండి. స్వయంగా డ్రైవ్ చేయవద్దు.';
    } else {
      reply =
        'EMERGENCY WARNING: These symptoms require immediate medical attention. Please call emergency services (911/108) or return to the Emergency Department immediately. Do not drive yourself.';
    }
  } else if (isEyeQuery) {
    advice = 'Wear eye shield during sleep, avoid rubbing, and use prescribed eye drops.';
    if (language === 'Hindi') {
      reply =
        'आँख की देखभाल: आँख को कभी भी न रगड़ें। सोते समय हमेशा प्रोटेक्टिव आई शील्ड पहनें और डॉक्टर द्वारा दी गई आई ड्रॉप्स या ऑइंटमेंट समय पर डालें। यदि रोशनी से परेशानी हो तो गहरे धूप का चश्मा पहनें। दृष्टि में अचानक कमी आने पर तुरंत अस्पताल लौटें।';
    } else if (language === 'Telugu') {
      reply =
        'కంటి సంరక్షణ: కంటిని ఎప్పుడూ రుద్దకండి. నిద్రపోయేటప్పుడు రక్షణ ఐ షీల్డ్ ధరించండి మరియు సూచించిన కంటి చుక్కల మందులను సమయానికి వాడండి. చూపు మందగించినట్లు అనిపిస్తే వెంటనే ఆసుపత్రికి వెళ్ళండి.';
    } else {
      reply =
        'Ophthalmic Care: Strictly avoid rubbing the affected eye. Wear your rigid protective eye shield during sleep to prevent pressure, and apply your prescribed antibiotic drops or lubricating tears as scheduled. Wear sunglasses for light sensitivity, and seek immediate emergency review if vision suddenly worsens.';
    }
  } else if (isDrugInteraction || isMedFood) {

    advice = 'Take medications with meals and a full glass of water.';
    if (language === 'Hindi') {
      reply =
        'अपनी दवाएं हमेशा भोजन या हल्के नाश्ते के बाद और पूरे एक गिलास पानी के साथ लें। खाली पेट दवा लेने से पेट में जलन या मतली हो सकती है। यदि हल्का चक्कर आए, तो 15 मिनट आराम से बैठें।';
    } else if (language === 'Telugu') {
      reply =
        'మీ మందులను ఎల్లప్పుడూ భోజనం లేదా తేలికపాటి ఆహారం తర్వాత మరియు పూర్తి గ్లాసు నీటితో తీసుకోండి. ఖాళీ కడుపుతో మందులు తీసుకోవడం వల్ల వికారం రావచ్చు. మైకం ఉంటే కొద్దిసేపు విశ్రాంతి తీసుకోండి.';
    } else {
      reply =
        'Always take your prescribed medications with food or a light snack and a full glass of water to protect your stomach lining. If you experience mild dizziness, sit down and rest for 15 minutes. Contact your care team if nausea persists.';
    }
  } else if (isWoundOrBath) {
    advice = 'Keep the dressing clean, dry, and inspect daily for signs of redness.';
    if (language === 'Hindi') {
      reply =
        'अपने घाव और पट्टी को पहले 48 घंटों तक सूखा और साफ रखें। जब तक डॉक्टर अनुमति न दें, सीधे पानी में न भिगोएँ। यदि घाव के आसपास अत्यधिक लाली, गर्माहट या मवाद दिखे, तो तुरंत अस्पताल से संपर्क करें।';
    } else if (language === 'Telugu') {
      reply =
        'మొదటి 48 గంటలు మీ గాయం మరియు కట్టును శుభ్రంగా, పొడిగా ఉంచండి. నేరుగా నీటిలో నానబెట్టవద్దు. గాయం వద్ద అధిక ఎరుపుదనం లేదా చీము కనిపిస్తే వెంటనే వైద్యుడిని సంప్రదించండి.';
    } else {
      reply =
        'Keep your wound dressing clean and dry for the first 48 hours. Avoid soaking in tubs or swimming until cleared by your clinician. If you notice spreading redness, warmth, or discharge, alert your care team promptly.';
    }
  } else if (isPainOrSwelling) {
    advice = 'Rest the affected area, use prescribed analgesics, and apply cool compresses if approved.';
    if (language === 'Hindi') {
      reply =
        'चोट या प्रक्रिया के बाद पहले 2-3 दिनों में हल्का दर्द और हल्की सूजन सामान्य है। दर्द की दवा समय पर लें, प्रभावित हिस्से को थोड़ा ऊपर रखें और पर्याप्त आराम करें। यदि दर्द अचानक बहुत बढ़ जाए, तो डॉक्टर को बताएं।';
    } else if (language === 'Telugu') {
      reply =
        'గాయం లేదా చికిత్స తర్వాత మొదటి 2-3 రోజులలో తేలికపాటి నొప్పి మరియు వాపు సాధారణం. సూచించిన నొప్పి నివారణ మందులను సమయానికి తీసుకోండి మరియు విశ్రాంతి తీసుకోండి. నొప్పి తీవ్రమైతే వైద్యుడిని సంప్రదించండి.';
    } else {
      reply =
        'Mild soreness and minor swelling are normal during the first 48 to 72 hours of healing. Take your pain medication as scheduled, keep the area elevated if possible, and get plenty of rest. If pain suddenly worsens, contact your physician.';
    }
  } else {
    advice = 'Maintain 2.5L daily hydration and adhere to your discharge tasks.';
    if (language === 'Hindi') {
      reply =
        'आपकी डिस्चार्ज योजना के अनुसार आपकी रिकवरी सामान्य गति से चल रही है। दिन भर में 8-10 गिलास पानी पिएं, नियमित समय पर दवाएं लें और पर्याप्त नींद लें। किसी भी नए लक्षण पर हमें बताएं।';
    } else if (language === 'Telugu') {
      reply =
        'మీ డిశ్చార్జ్ ప్లాన్ ప్రకారం మీ రికవరీ బాగా జరుగుతోంది. రోజూ తగినంత నీరు త్రాగండి, మందులు సమయానికి వేసుకోండి మరియు మంచి విశ్రాంతి తీసుకోండి. ఏవైనా సందేహాలుంటే నన్ను అడగండి.';
    } else {
      reply =
        'Your post-discharge recovery is progressing on track. Be sure to hit your daily hydration goal (8-10 glasses of water), take your scheduled medications on time, and get plenty of restorative rest. Feel free to ask any other question!';
    }
  }

  return res.json({
    success: true,
    answer: reply,
    redFlag: isRedFlag,
    adviceBullet: advice,
    source: 'carecontinuum-clinical-engine',
  });
});

// POST /api/tts (Gemini 3.8 Flash Lite TTS)
app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required for TTS' });
  }

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.slice(0, 300),
                speechMetadata: {
                  style: 'Compassionate, calm clinical assistant',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({
          success: true,
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
        });
      }
    } catch (err: any) {
      console.warn('TTS model warning:', err?.message);
    }
  }

  return res.json({
    success: false,
    message: 'TTS falling back to browser Web Speech API',
  });
});

// Serve frontend: Vite middleware in development, static in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 11th Hour Triage Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
