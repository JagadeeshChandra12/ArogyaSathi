import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs/promises';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'health-passport-store.json');
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;

let store = {
  patients: {},
  tokens: {},
  reports: {},
  summaries: {},
  otpSessions: {}
};

const s3Bucket = process.env.AWS_S3_BUCKET || '';
const s3Region = process.env.AWS_REGION || '';
const s3Client =
  s3Bucket && s3Region
    ? new S3Client({
        region: s3Region,
        credentials:
          process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
              }
            : undefined
      })
    : null;

async function ensureStoreLoaded() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    store = { ...store, ...JSON.parse(raw) };
  } catch {
    await saveStore();
  }
}

async function saveStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function secureToken() {
  return crypto.randomBytes(32).toString('hex');
}

function uniquePatientId(seed = '') {
  const prefix = 'AS';
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  const shortSeed = seed ? seed.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() : 'PT';
  return `${prefix}-${shortSeed}-${random}`;
}

function upsertPatientProfile(patientId, profile = {}) {
  const current = store.patients[patientId] || {};
  store.patients[patientId] = {
    ...current,
    ...profile,
    patient_id: current.patient_id || profile.patient_id || uniquePatientId(patientId),
    lastUpdated: new Date().toISOString()
  };
  if (!store.reports[patientId]) store.reports[patientId] = [];
}

function makeSimplePdfBuffer({ title, lines }) {
  const safeLines = [title, ...lines].map((line) => String(line || '').replace(/[()]/g, ''));
  const content = `BT /F1 12 Tf 50 780 Td (${safeLines.join(' \\n ')}) Tj ET`;
  const header = '%PDF-1.1\n';
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj\n`
  ];
  let offset = header.length;
  const xref = ['xref\n0 6\n0000000000 65535 f \n'];
  const body = objects
    .map((obj) => {
      const line = `${String(offset).padStart(10, '0')} 00000 n \n`;
      xref.push(line);
      offset += obj.length;
      return obj;
    })
    .join('');
  const trailer = `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;
  return Buffer.from(`${header}${body}${xref.join('')}${trailer}`);
}

async function uploadSummaryPdf(patientId, pdfBuffer) {
  const key = `summaries/${patientId}/summary-${Date.now()}.pdf`;
  if (!s3Client || !s3Bucket) {
    const outDir = path.join(DATA_DIR, 'summaries', patientId);
    await fs.mkdir(outDir, { recursive: true });
    const filePath = path.join(outDir, `summary-${Date.now()}.pdf`);
    await fs.writeFile(filePath, pdfBuffer);
    return {
      summary_pdf_url: `${API_BASE_URL}/api/internal-file?file=${encodeURIComponent(filePath)}`,
      s3_key: null
    };
  }
  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
    })
  );
  return {
    summary_pdf_url: `s3://${s3Bucket}/${key}`,
    s3_key: key
  };
}

async function createSummaryForPatient(patientId) {
  const patient = store.patients[patientId] || {};
  const reports = store.reports[patientId] || [];
  const allergies = patient.allergies || [];
  const diseases = patient.diseases || [];
  const medications = patient.medications || [];
  const lines = [
    `Patient: ${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
    `Blood Group: ${patient.bloodGroup || 'N/A'}`,
    `Emergency Contact: ${patient.emergencyContact || patient.phone || 'N/A'}`,
    `Diseases: ${Array.isArray(diseases) ? diseases.join(', ') : 'N/A'}`,
    `Medications: ${Array.isArray(medications) ? medications.join(', ') : 'N/A'}`,
    `Allergies: ${Array.isArray(allergies) ? allergies.join(', ') : 'N/A'}`,
    `Reports Available: ${reports.length}`,
    `Generated At: ${new Date().toISOString()}`
  ];
  const pdfBuffer = makeSimplePdfBuffer({ title: 'Arogya Saathi Health Summary', lines });
  const uploaded = await uploadSummaryPdf(patientId, pdfBuffer);
  store.summaries[patientId] = {
    patient_id: patientId,
    summary_pdf_url: uploaded.summary_pdf_url,
    s3_key: uploaded.s3_key,
    last_updated: new Date().toISOString()
  };
  await saveStore();
  return store.summaries[patientId];
}

app.get('/api/local-ip', (req, res) => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return res.json({ ip: iface.address });
      }
    }
  }
  res.json({ ip: 'localhost' });
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function geminiModelCandidates() {
  const primary = GEMINI_MODEL;
  const fromEnv = (process.env.GEMINI_MODEL_FALLBACKS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const defaults = ['gemini-2.0-flash-001', 'gemini-2.0-flash', 'gemini-2.5-flash'];
  return [...new Set([primary, ...fromEnv, ...defaults].filter(Boolean))];
}

function safeJsonStringify(value) {
  try {
    return JSON.stringify(value && typeof value === 'object' ? value : {});
  } catch {
    return '{}';
  }
}

/** @param {{ systemInstruction?: string, userParts: Array<{ text?: string, inlineData?: { mimeType: string, data: string } }> }} opts */
async function geminiGenerateContent(opts) {
  if (!GEMINI_API_KEY) return null;
  const body = {
    contents: [{ role: 'user', parts: opts.userParts }],
    generationConfig: { temperature: 0.55, maxOutputTokens: 4096 }
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  const payload = JSON.stringify(body);

  for (const model of geminiModelCandidates()) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 401 || res.status === 403) {
          console.error('Gemini API auth error:', res.status, errText.slice(0, 400));
          return null;
        }
        if (res.status === 429 || res.status === 503) {
          console.warn(`Gemini model "${model}" unavailable (${res.status}); trying fallback…`);
          continue;
        }
        if (res.status === 404) {
          console.warn(`Gemini model "${model}" not found; trying fallback…`);
          continue;
        }
        console.error('Gemini API error:', model, res.status, errText.slice(0, 500));
        continue;
      }
      const data = await res.json();
      if (data.promptFeedback?.blockReason) {
        console.warn('Gemini prompt blocked:', data.promptFeedback.blockReason);
        return null;
      }
      const parts = data.candidates?.[0]?.content?.parts;
      if (!parts?.length) continue;
      const text = parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('').trim();
      if (text) {
        if (model !== GEMINI_MODEL) {
          console.log(`Gemini reply via fallback model: ${model}`);
        }
        return text;
      }
    } catch (e) {
      console.error(`Gemini request failed (${model}):`, e?.message || e);
    }
  }
  return null;
}

async function geminiMedicalReply(message, language, userProfile, conversationStage = 'chat') {
  const lang = language === 'hindi' ? 'Hindi' : language === 'telugu' ? 'Telugu' : 'English';
  const stageGuide = {
    welcome:
      'First message: one short warm line, then jump into useful content or targeted questions. Do not repeat a long self-introduction.',
    profile:
      'Ask for missing age/weight in a natural way, or acknowledge if already given.',
    problem:
      'Help them expand on symptoms with specific, answerable questions.',
    chat: 'Give a full helpful reply about their concern.'
  }[conversationStage] || 'Answer their message helpfully.';

  const system = `You are Sathi, the health assistant for Arogya Sathi. Write in ${lang} only.

SCOPE (strict — medical / wellness only):
- ONLY answer about: symptoms, illnesses (general education), medicines (how they are usually used — not personal dosing), diet, nutrition, hydration, sleep, exercise, preventive care, mental wellbeing as it relates to health, pregnancy/child basics at an educational level, first-aid style guidance, chronic conditions (general education).
- Do NOT answer general knowledge unrelated to health: history, geography, sports, celebrities, movies, coding, math homework, politics, etc. If the user asks those, reply in ONE short sentence that Arogya Sathi is only for health, then ask ONE concrete health question (e.g. any symptoms today).
- Do NOT paste encyclopedia-style unrelated facts. Stay on the user's health intent.

STYLE (strict):
- Do NOT open with filler like "Hello! I'm Sathi" plus a long disclaimer. At most one short sentence of greeting, then substance.
- Do NOT write phrases like "I'm not a doctor", "I cannot diagnose", or "general health information only" unless the user asks about diagnosis explicitly—and even then, keep it to one brief sentence at the end, not the whole reply.
- Give direct, practical guidance: what the symptom might mean in plain terms, self-care, red flags, and what to watch for.

FOLLOW-UPS (required):
- After your main answer, add a separate short section with a heading line exactly:
  ${language === 'hindi' ? 'अधिक समझने के लिए:' : language === 'telugu' ? 'మరింత తెలుసుకోవడానికి:' : 'To understand better:'}
- Under that heading, write exactly 3–4 numbered follow-up questions that are SPECIFIC to their message (e.g. duration, severity, fever, breathing, pain location, medicines tried)—not generic "tell me more" or "any questions".

SAFETY:
- Only urge emergency or urgent clinic care if symptoms clearly warrant it.

Flow stage: ${conversationStage}. ${stageGuide}
User profile (may be incomplete): ${safeJsonStringify(userProfile)}.`;
  return geminiGenerateContent({
    systemInstruction: system,
    userParts: [{ text: String(message) }]
  });
}

function tryParseJsonObject(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and document files are allowed!'));
    }
  }
});

// Enhanced medical knowledge base with real-time data
const medicalKnowledgeBase = {
  symptoms: {
    fever: {
      hindi: 'बुखार',
      telugu: 'జ్వరం',
      english: 'Fever',
      severity: 'medium',
      causes: ['Viral infection', 'Bacterial infection', 'Inflammation', 'Heat exposure'],
      recommendations: [
        'Monitor temperature regularly',
        'Stay hydrated with plenty of fluids',
        'Rest and avoid physical exertion',
        'Take acetaminophen or ibuprofen if needed',
        'Seek medical attention if fever persists for more than 3 days or exceeds 103°F'
      ],
      emergency: false,
      webInfo: 'Fever is a common symptom that indicates the body is fighting an infection. Normal body temperature is around 98.6°F (37°C).'
    },
    headache: {
      hindi: 'सिरदर्द',
      telugu: 'తలనొప్పి',
      english: 'Headache',
      severity: 'low',
      causes: ['Stress', 'Dehydration', 'Eye strain', 'Sinus pressure', 'Tension'],
      recommendations: [
        'Rest in a quiet, dark room',
        'Stay hydrated',
        'Practice relaxation techniques',
        'Take over-the-counter pain relievers',
        'Avoid triggers like bright lights or loud noises'
      ],
      emergency: false,
      webInfo: 'Headaches are one of the most common medical complaints. Most are not serious and can be treated with rest and pain relievers.'
    },
    chest_pain: {
      hindi: 'छाती में दर्द',
      telugu: 'ఛాతీ నొప్పి',
      english: 'Chest Pain',
      severity: 'high',
      causes: ['Heart attack', 'Angina', 'Pneumonia', 'Costochondritis', 'Anxiety'],
      recommendations: [
        'Seek immediate medical attention',
        'Call emergency services if severe',
        'Do not ignore chest pain',
        'Monitor for shortness of breath',
        'Avoid physical activity until evaluated'
      ],
      emergency: true,
      webInfo: 'Chest pain can be a sign of serious conditions like heart attack. Immediate medical evaluation is crucial.'
    },
    cough: {
      hindi: 'खांसी',
      telugu: 'దగ్గు',
      english: 'Cough',
      severity: 'low',
      causes: ['Common cold', 'Flu', 'Allergies', 'Smoking', 'Post-nasal drip'],
      recommendations: [
        'Stay hydrated with warm liquids',
        'Use honey for natural relief',
        'Avoid smoking and secondhand smoke',
        'Use a humidifier',
        'Consider over-the-counter cough suppressants'
      ],
      emergency: false,
      webInfo: 'Coughing is a reflex that helps clear airways. Most coughs are caused by viral infections and resolve within 1-2 weeks.'
    },
    cold_common: {
      hindi: 'सर्दी',
      telugu: 'జలుబు',
      english: 'Common cold',
      severity: 'low',
      causes: ['Rhinovirus', 'Other respiratory viruses', 'Close contact with infected people'],
      recommendations: [
        'Rest and drink plenty of water or warm fluids',
        'Saline nasal drops or steam inhalation for a stuffy or runny nose',
        'Honey (for adults/older children) or warm soups for throat comfort',
        'Over-the-counter pain relievers only if needed for aches or fever — follow pack instructions',
        'See a clinician if high fever, trouble breathing, severe ear pain, or symptoms last more than ~10 days or worsen'
      ],
      emergency: false,
      webInfo:
        'A common cold is a mild viral infection of the nose and throat. It usually improves in about a week with rest, fluids, and simple symptom care — not the same as the flu, which tends to hit harder and faster.'
    }
  },
  conditions: {
    diabetes: {
      hindi: 'मधुमेह',
      telugu: 'మధుమేహం',
      english: 'Diabetes',
      severity: 'high',
      types: ['Type 1', 'Type 2', 'Gestational'],
      symptoms: ['Frequent urination', 'Excessive thirst', 'Fatigue', 'Blurred vision', 'Slow healing'],
      management: [
        'Monitor blood sugar regularly',
        'Follow a balanced diet',
        'Exercise regularly',
        'Take prescribed medications',
        'Regular medical check-ups'
      ],
      webInfo: 'Diabetes affects how your body processes glucose. Proper management is crucial to prevent complications.'
    },
    hypertension: {
      hindi: 'उच्च रक्तचाप',
      telugu: 'అధిక రక్తపోటు',
      english: 'Hypertension',
      severity: 'high',
      symptoms: ['Often asymptomatic', 'Headaches', 'Shortness of breath', 'Nosebleeds'],
      management: [
        'Reduce salt intake',
        'Exercise regularly',
        'Maintain healthy weight',
        'Limit alcohol consumption',
        'Take prescribed medications'
      ],
      webInfo: 'High blood pressure is a major risk factor for heart disease and stroke. Lifestyle changes and medication can help control it.'
    },
    covid19: {
      hindi: 'कोविड-19',
      telugu: 'కోవిడ్-19',
      english: 'COVID-19',
      severity: 'variable',
      symptoms: ['Fever', 'Cough', 'Fatigue', 'Loss of taste/smell', 'Shortness of breath'],
      prevention: [
        'Get vaccinated',
        'Wear masks in crowded places',
        'Practice good hygiene',
        'Maintain social distance',
        'Stay home when sick'
      ],
      webInfo: 'COVID-19 is a respiratory illness caused by SARS-CoV-2. Vaccination and preventive measures are key to protection.'
    }
  },
  medications: {
    paracetamol: {
      hindi: 'पैरासिटामोल',
      telugu: 'పారాసిటమోల్',
      english: 'Paracetamol/Acetaminophen',
      uses: ['Fever', 'Pain relief'],
      dosage: '500-1000mg every 4-6 hours',
      sideEffects: ['Liver damage in high doses', 'Allergic reactions'],
      webInfo: 'Paracetamol is a common pain reliever and fever reducer. Safe when used as directed.'
    },
    ibuprofen: {
      hindi: 'इबुप्रोफेन',
      telugu: 'ఐబుప్రోఫెన్',
      english: 'Ibuprofen',
      uses: ['Pain', 'Inflammation', 'Fever'],
      dosage: '200-400mg every 4-6 hours',
      sideEffects: ['Stomach upset', 'Kidney problems with long-term use'],
      webInfo: 'Ibuprofen is an NSAID that reduces pain and inflammation. Take with food to minimize stomach upset.'
    }
  }
};

/** Greetings / identity — never send these to Wikipedia (avoids "Hello" disambiguation pages, album articles, etc.). */
function conversationalHealthReply(message, messageLower, language) {
  const t = messageLower.trim();
  if (!t) return '';

  const identity =
    /^(who are you|what are you|what's your name|whats your name|your name\??|tell me about yourself|introduce yourself)/i.test(
      t
    ) ||
    /\bwho are you\b|\bwhat are you\b|\bतूम कौन हो\b/.test(t);
  if (identity) {
    return language === 'hindi'
      ? 'मैं साथी हूँ — स्वास्थ्य सहायक एआई। मैं डॉक्टर नहीं हूँ, लेकिन लक्षण, सामान्य देखभाल, आहार, और नींद के बारे में स्पष्ट जानकारी देता हूँ।\n\nअधिक समझने के लिए:\n1) आज आपको कौन से लक्षण हैं?\n2) कितने समय से है?\n3) क्या बुखार या खांसी है?\n4) आप कौन सी दवाएं ले रहे हैं?'
      : language === 'telugu'
        ? 'నేను సాతి — ఆరోగ్య సహాయక AI. నేను డాక్టర్ కాదు, కానీ లక్షణాలు, సాధారణ సంరక్షణ, ఆహారం, నిద్ర గురించి స్పష్టంగా వివరిస్తాను.\n\nమరింత తెలుసుకోవడానికి:\n1) ఈ రోజు మీకు ఏ లక్షణం ఉంది?\n2) ఎంత కాలంగా?\n3) జ్వరం లేదా దగ్గు ఉన్నాయా?\n4) ఏ మందులు వాడుతున్నారు?'
        : "I'm Sathi, your Arogya Sathi health assistant. I'm not a doctor, but I explain symptoms, self-care, diet, and sleep in plain language and ask follow-ups.\n\nTo understand better:\n1) What symptom or worry do you have today?\n2) How long has it lasted?\n3) Any fever or cough?\n4) Any medicines or conditions I should know about?";
  }

  if (/^thank(s| you)\b|^thanks\b|^ధన్యవాదాలు/.test(t)) {
    return language === 'telugu'
      ? 'మీకు స్వాగతం. మరొక ఆరోగ్య ప్రశ్న ఉంటే అడగండి.'
      : "You're welcome. If you have another health question, ask anytime.";
  }

  if (/^(bye|goodbye|see you|later)(\s|!|$)/i.test(t)) {
    return language === 'telugu'
      ? 'మళ్లీ కలుద్దాం. మీ ఆరోగ్యం జాగ్రత్త.'
      : 'Take care — come back anytime you have health questions.';
  }

  const greeting =
    /^(hi|hello|hey|yo|hiya|sup|good morning|good evening|good afternoon|namaste)(\s|!|,|$)/i.test(t) ||
    /^(hi|hello|hey)\b/.test(t) ||
    /\bhow are you\b|\bhow r u\b|\bwhat's up\b|\bwhats up\b/.test(t) ||
    /^నమస్కారం|^హలో\b/.test(message.trim()) ||
    /మీరు ఎలా ఉన్నారు|ఎలా ఉన్నావు/.test(message);

  if (greeting) {
    return language === 'telugu'
      ? 'నేను బాగున్నాను, ధన్యవాదాలు. మీరు ఎలా అనుభవిస్తున్నారు? ఏ లక్షణం లేదా ఆరోగ్య ప్రశ్న ఉంటే చెప్పండి.\n\nమరింత తెలుసుకోవడానికి:\n1) ఈ రోజు మీకు ఏమి బాగోలేదు?\n2) ఎంత కాలంగా ఉంది?\n3) మీ వయస్సు సుమారుగా ఎంత?\n4) ఇప్పటికే ఏ మందులు వాడుతున్నారు?'
      : "I'm doing well, thanks. How are you feeling?\n\nTell me a symptom or topic (cold, fever, sleep, diet, etc.).\n\nTo understand better:\n1) What's bothering you today?\n2) How long has it lasted?\n3) Roughly how old are you?\n4) Any medicines or conditions to mention?";
  }

  return '';
}

/** Match phrases that don't appear as symptom.english (e.g. "cold" vs encyclopedia "Cold"). */
function collectExtraSymptomMatches(messageLower) {
  const out = [];
  if (
    /\b(cold|common cold|runny nose|stuffy nose|blocked nose|sniffles|nasal congestion)\b/.test(messageLower) ||
    /\bhave cold\b|\bgot cold\b|\bi'?m cold\b/i.test(messageLower)
  ) {
    out.push(medicalKnowledgeBase.symptoms.cold_common);
  }
  return out;
}

// Web Search API for real-time information
app.post('/api/web-search', async (req, res) => {
  try {
    const { query, language = 'english' } = req.body;
    
    console.log('Web search request:', { query, language });
    
    // Determine language code for Wikipedia API
    const langCode = language === 'telugu' ? 'te' : 'en';
    
    // Clean and encode the query
    const cleanQuery = query.trim().replace(/\s+/g, '_');
    const encodedQuery = encodeURIComponent(cleanQuery);
    
    // Wikipedia API URL
    const wikiUrl = `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`;
    
    console.log('Fetching from:', wikiUrl);
    
    const response = await fetch(wikiUrl);
    
    if (!response.ok) {
      // If Wikipedia doesn't have the page, try a search
      const searchUrl = `https://${langCode}.wikipedia.org/api/rest_v1/page/search/${encodedQuery}`;
      const searchResponse = await fetch(searchUrl);
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.pages && searchData.pages.length > 0) {
          // Get the first search result
          const firstResult = searchData.pages[0];
          const pageUrl = `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title)}`;
          const pageResponse = await fetch(pageUrl);
          
          if (pageResponse.ok) {
            const pageData = await pageResponse.json();
            return res.json({
              success: true,
              title: pageData.title,
              summary: pageData.extract,
              url: pageData.content_urls?.desktop?.page || pageData.content_urls?.mobile?.page,
              language: language,
              source: 'wikipedia'
            });
          }
        }
      }
      
      // Fallback response
      const fallbackResponse = language === 'telugu' 
        ? `"${query}" గురించి సమాచారం కనుగొనబడలేదు. దయచేసి వేరే పదాలతో ప్రయత్నించండి.`
        : `Information about "${query}" not found. Please try with different keywords.`;
      
      return res.json({
        success: false,
        summary: fallbackResponse,
        language: language,
        source: 'fallback'
      });
    }
    
    const data = await response.json();
    
    // Format the response
    const summary = data.extract || (language === 'telugu' 
      ? 'సమాచారం లభించలేదు.'
      : 'No information available.');
    
    res.json({
      success: true,
      title: data.title,
      summary: summary,
      url: data.content_urls?.desktop?.page || data.content_urls?.mobile?.page,
      language: language,
      source: 'wikipedia',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Web search error:', error);
    
    const errorResponse = req.body.language === 'hindi'
      ? 'वेब सर्च के दौरान एक त्रुटि हुई। कृपया पुनः प्रयास करें।'
      : req.body.language === 'telugu'
        ? 'వెబ్ సెర్చ్ సమయంలో సమస్య జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.'
        : 'An error occurred during web search. Please try again.';
    
    res.status(500).json({
      success: false,
      summary: errorResponse,
      language: req.body.language || 'english',
      source: 'error',
      error: error.message
    });
  }
});

// Enhanced medical chat with web search integration
app.post('/api/medical-chat', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rawMessage = body.message;
    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : rawMessage != null
          ? String(rawMessage)
          : '';
    const userProfile = body.userProfile;
    const conversationStage = body.conversationStage;
    const language =
      ['telugu', 'hindi', 'english'].includes(body.language) ? body.language : 'english';

    if (!message.trim()) {
      return res.status(400).json({
        response:
          language === 'hindi'
            ? 'कृपया भेजने के लिए एक संदेश टाइप करें।'
            : language === 'telugu'
              ? 'దయచేసి సందేశాన్ని టైప్ చేసి పంపండి.'
              : 'Please type a message to send.',
        suggestions: [],
        severity: 'low',
        doctorRecommendation: false,
        timestamp: new Date().toISOString()
      });
    }

    console.log('Medical chat request:', { message: message.slice(0, 200), conversationStage, language });

    // Enhanced response generation with real-time data
    let response = '';
    let suggestions = [];
    let severity = 'low';
    let doctorRecommendation = false;

    const messageLower = message.toLowerCase();
    
    // Check for emergency symptoms
    const emergencySymptoms = ['chest pain', 'ఛాతీ నొప్పి', 'छाती में दर्द', 'heart attack', 'stroke', 'unconscious'];
    const hasEmergency = emergencySymptoms.some(symptom => messageLower.includes(symptom));
    
    if (hasEmergency) {
      response = language === 'hindi'
        ? '🚨 आपातकाल! यदि आपको छाती में दर्द है तो तुरंत चिकित्सीय सहायता लें। यह दिल के दौरे का संकेत हो सकता है।'
        : language === 'telugu' 
          ? '🚨 అత్యవసరం! మీకు ఛాతీ నొప్పి ఉంటే వెంటనే డాక్టర్ సలహా తీసుకోండి. ఇది గుండెపోటు లక్షణం కావచ్చు.'
          : '🚨 EMERGENCY! If you have chest pain, seek immediate medical attention. This could be a sign of heart attack.';
      severity = 'high';
      doctorRecommendation = true;
      suggestions = ['Call emergency services immediately', 'Do not drive yourself to hospital'];
    } else {
      let geminiHandled = false;
      if (GEMINI_API_KEY) {
        try {
          const aiText = await geminiMedicalReply(message, language, userProfile, 'chat');
          if (aiText) {
            response = aiText;
            suggestions =
              language === 'telugu'
                ? ['మరింత వివరాలు అడగండి', 'తీవ్ర లక్షణాలుంటే వెంటనే వైద్యుడిని సంప్రదించండి']
                : ['Ask follow-up questions', 'Seek urgent care if symptoms are severe'];
            geminiHandled = true;
          } else {
            console.warn('Gemini returned empty; falling back to local health knowledge only.');
          }
        } catch (geminiErr) {
          console.error('Gemini medical chat error:', geminiErr.message);
        }
      }

      if (!geminiHandled) {
        // Health-only: small-talk / identity → local knowledge (symptoms, conditions, medicines) → themed prompt (no Wikipedia / no random general facts)
        response = '';
        suggestions = [];

        response = conversationalHealthReply(message, messageLower, language);
        if (response) {
          suggestions =
            language === 'telugu'
              ? ['జ్వరం / జలుబు ఉందా?', 'ఎంత రోజుల నుంచి?', 'మందులు వాడుతున్నారా?']
              : ['Any fever or cold?', 'How many days?', 'Taking any medicines?'];
        }

        if (!response) {
          const detectedSymptoms = [...collectExtraSymptomMatches(messageLower)];
          const detectedConditions = [];
          const detectedMedications = [];

          Object.entries(medicalKnowledgeBase.symptoms).forEach(([key, symptom]) => {
            if (
              (symptom.hindi && messageLower.includes(symptom.hindi.toLowerCase())) ||
              messageLower.includes(symptom.telugu.toLowerCase()) ||
              messageLower.includes(symptom.english.toLowerCase())
            ) {
              if (!detectedSymptoms.includes(symptom)) detectedSymptoms.push(symptom);
            }
          });

          Object.entries(medicalKnowledgeBase.conditions).forEach(([key, condition]) => {
            if (
              (condition.hindi && messageLower.includes(condition.hindi.toLowerCase())) ||
              messageLower.includes(condition.telugu.toLowerCase()) ||
              messageLower.includes(condition.english.toLowerCase())
            ) {
              detectedConditions.push(condition);
            }
          });

          Object.entries(medicalKnowledgeBase.medications).forEach(([key, med]) => {
            const te = med.telugu.toLowerCase();
            const enParts = med.english
              .toLowerCase()
              .split(/[/,]/)
              .map((s) => s.trim())
              .filter(Boolean);
            const medMatch =
              messageLower.includes(te) || enParts.some((p) => p.length > 2 && messageLower.includes(p));
            if (medMatch) detectedMedications.push(med);
          });

          if (detectedMedications.length > 0) {
            const med = detectedMedications[0];
            if (language === 'telugu') {
              response = `${med.telugu} గురించి (సాధారణ సమాచారం మాత్రమే):\n\n${med.webInfo}\n\nవాడకం: ${med.uses.join(', ')}\nసాధారణ మోతాదు (సూచన మాత్రమే): ${med.dosage}\nపార్శ్వ ప్రభావాలు: ${med.sideEffects.join(', ')}\n\nమీ వ్యక్తిగత మోతాదు కోసం డాక్టర్ లేదా ఫార్మసిస్ట్ సలహా తీసుకోండి.`;
            } else {
              response = `About ${med.english} (general education only):\n\n${med.webInfo}\n\nUses: ${med.uses.join(', ')}\nTypical dosing (reference only — not personal advice): ${med.dosage}\nSide effects: ${med.sideEffects.join(', ')}\n\nAsk your clinician or pharmacist what is right for you.`;
            }
            suggestions =
              language === 'telugu'
                ? ['ఇతర మందులు వాడుతున్నారా?', 'కాలేయం / కిడ్నీ సమస్య ఉందా?', 'డాక్టర్ సలహా తీసుకున్నారా?']
                : ['Any other medicines?', 'Liver or kidney problems?', 'Seen a clinician for this?'];
          } else if (detectedSymptoms.length > 0 || detectedConditions.length > 0) {
            const items = [...detectedSymptoms, ...detectedConditions];
            const item = items[0];

            if (language === 'telugu') {
              response = `${item.telugu} గురించి సమాచారం:\n\n`;
              response += `${item.webInfo}\n\n`;
              response += `లక్షణాలు: ${item.symptoms ? item.symptoms.join(', ') : 'లేవు'}\n`;
              response += `సూచనలు: ${item.recommendations ? item.recommendations.join(', ') : item.management ? item.management.join(', ') : 'లేవు'}`;
            } else {
              response = `Information about ${item.english}:\n\n`;
              response += `${item.webInfo}\n\n`;
              response += `Symptoms: ${item.symptoms ? item.symptoms.join(', ') : 'None'}\n`;
              response += `Recommendations: ${item.recommendations ? item.recommendations.join(', ') : item.management ? item.management.join(', ') : 'None'}`;
            }

            severity = item.severity;
            doctorRecommendation = item.emergency || severity === 'high';
            suggestions = item.recommendations || item.management || [];
          }
        }

        if (!response) {
          response =
            language === 'hindi'
              ? 'आरोग्य साथी केवल स्वास्थ्य और कल्याण विषयों पर उत्तर देता है — लक्षण, सामान्य स्पष्टीकरण, आहार, नींद, व्यायाम। क्या आप मुझे बता सकते हैं कि आपको क्या महसूस हो रहा है?'
              : language === 'telugu'
                ? 'ఆరోగ्य సాథి కేవలం ఆరోగ్యం గురించే సహాయం చేస్తుంది — లక్షణాలు, జబ్బుల సాధారణ వివరణ, ఆహారం, నిద్ర, వ్యాయామం, మందుల సాధారణ సమాచారం (వ్యక్తిగత నిర్ధారణ కాదు).\n\nవికీపీడియా లేదా సాధారణ విషయాలు కాదు. దయచేసి మీ శరీరంలో ఏమి జరుగుతోందో చెప్పండి — ఉదా: జ్వరం, దగ్గు, తలనొప్పి, మధుమేహం, రక్తపోటు.\n\nమరింత తెలుసుకోవడానికి:\n1) ప్రధాన లక్షణం ఏమిటి?\n2) ఎన్ని రోజుల నుంచి?\n3) మీ వయస్సు సుమారుగా?\n4) ఇప్పటికే ఏ మందులు వాడుతున్నారు?'
                : 'Arogya Sathi answers only health and wellness topics — symptoms, general explanations, diet, sleep, exercise, and general medicine education (not a personal diagnosis).\n\nWe do not use encyclopedia summaries or non-medical trivia. Please describe what you feel or ask a clear health question — e.g. fever, cough, headache, diabetes, blood pressure.\n\nTo understand better:\n1) What is the main symptom or concern?\n2) How many days has it lasted?\n3) Roughly how old are you?\n4) Any medicines or conditions you already have?';
          suggestions =
            language === 'hindi'
              ? ['क्या बुखार है?', 'खांसी या गले में खराश?', 'क्या आप कोई दवा ले रहे हैं?']
              : language === 'telugu'
                ? ['జ్వరం ఉందా?', 'దగ్గు / గొంతు నొప్పి?', 'మందులు వాడుతున్నారా?']
                : ['Any fever?', 'Cough or sore throat?', 'Taking any medicines?'];
        }
      }
    }
    
    if (!response || typeof response !== 'string') {
      response =
        language === 'telugu'
          ? 'సమాధానం తయారు చేయలేకపోయాను. దయచేసి మళ్లీ ప్రయత్నించండి.'
          : 'I could not prepare a reply. Please try again.';
    }

    res.json({
      response,
      suggestions,
      severity,
      doctorRecommendation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Medical chat error:', error);
    const lang =
      req.body && req.body.language === 'telugu' ? 'telugu' : 'english';
    res.status(200).json({
      response:
        lang === 'telugu'
          ? 'క్షమించండి, లోపం జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి లేదా సర్వర్ నడుస్తోందో చూడండి.'
          : 'Sorry, something went wrong on the server. Please try again and make sure the API is running on port 3001.',
      suggestions: [],
      severity: 'low',
      doctorRecommendation: false,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced image analysis with more detailed responses
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    const image = req.file;
    const symptoms = req.body.symptoms ? JSON.parse(req.body.symptoms) : [];
    const language = req.body.language || 'english';
    const langOutput = language === 'hindi' ? 'Hindi' : language === 'telugu' ? 'Telugu' : 'English';
    
    console.log('Image analysis request:', { 
      filename: image?.originalname, 
      size: image?.size,
      symptoms,
      language
    });

    if (!image?.buffer) {
      return res.status(400).json({
        analysis: 'No image uploaded.',
        confidence: 0,
        conditions: [],
        recommendations: [],
        timestamp: new Date().toISOString()
      });
    }

    if (GEMINI_API_KEY) {
      const mime = image.mimetype || 'image/jpeg';
      const b64 = image.buffer.toString('base64');
      const symText = Array.isArray(symptoms) && symptoms.length ? symptoms.join(', ') : 'none listed';
      const prompt =
        `You assist with general health education only (not a diagnosis). Analyze this medical or skin-related image briefly.\n` +
        `User-listed symptoms/context: ${symText}\n` +
        `Respond with JSON only, no markdown:\n` +
        `{"analysis":"strictly output your explanation in ${langOutput} language","confidence":0-1,"conditions":[],"recommendations":[]}`;
      const raw = await geminiGenerateContent({
        userParts: [{ text: prompt }, { inlineData: { mimeType: mime, data: b64 } }]
      });
      const parsed = tryParseJsonObject(raw || '');
      if (parsed && typeof parsed.analysis === 'string') {
        return res.json({
          analysis: parsed.analysis,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
          conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          timestamp: new Date().toISOString()
        });
      }
      if (raw) {
        return res.json({
          analysis: raw,
          confidence: 0.85,
          conditions: [],
          recommendations: [],
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Simulate AI image analysis with enhanced responses
    const fileName = image?.originalname?.toLowerCase() || '';
    let analysis = '';
    let confidence = 0.85;
    let conditions = [];
    let recommendations = [];
    
    // Enhanced image analysis based on filename and content
    if (fileName.includes('rash') || fileName.includes('skin') || fileName.includes('dermatitis')) {
      analysis = 'చర్మం మీద ఎరుపు మచ్చలు మరియు వాపు కనిపిస్తున్నాయి. ఇది అలెర్జీ, ఇన్ఫెక్షన్, లేదా డెర్మటైటిస్ కావచ్చు.';
      conditions = ['చర్మ అలెర్జీ', 'ఇన్ఫెక్షన్', 'డెర్మటైటిస్'];
      recommendations = [
        'చర్మ డాక్టర్ సలహా తీసుకోండి',
        'అంటు మందులు వాడవద్దు',
        'చర్మాన్ని శుభ్రంగా ఉంచండి',
        'అలెర్జీ ట్రిగ్గర్లను నివారించండి'
      ];
    } else if (fileName.includes('wound') || fileName.includes('cut') || fileName.includes('injury')) {
      analysis = 'గాయం కనిపిస్తోంది. గాయం యొక్క లోతు మరియు పరిధిని అంచనా వేయడానికి మరింత వివరాలు అవసరం.';
      conditions = ['గాయం', 'కట్'];
      recommendations = [
        'గాయాన్ని శుభ్రంగా ఉంచండి',
        'ఆంటిసెప్టిక్ వాడండి',
        'గాయం పరిధి మరియు లోతును పర్యవేక్షించండి',
        'ఇన్ఫెక్షన్ సంకేతాలను చూసుకోండి'
      ];
    } else if (fileName.includes('eye') || fileName.includes('vision') || fileName.includes('conjunctivitis')) {
      analysis = 'కంటి సమస్య కనిపిస్తోంది. కంటి ఎరుపు, వాపు, లేదా డిస్చార్జ్ ఉందా?';
      conditions = ['కంటి సమస్య', 'కంజంక్టివైటిస్'];
      recommendations = [
        'కంటి డాక్టర్ సలహా తీసుకోండి',
        'కంటి రుద్దవద్దు',
        'కంటి డ్రాప్స్ వాడవచ్చు',
        'కంటి హైజీన్ జాగ్రత్తగా పాటించండి'
      ];
    } else if (fileName.includes('xray') || fileName.includes('chest') || fileName.includes('lung')) {
      analysis = 'ఛాతీ ఎక్స్-రే చిత్రం. ఊపిరితిత్తుల స్థితిని అంచనా వేయడానికి మరింత విశ్లేషణ అవసరం.';
      conditions = ['ఛాతీ ఎక్స్-రే'];
      recommendations = [
        'రేడియాలజిస్ట్ సలహా తీసుకోండి',
        'మరింత పరీక్షలు చేయించవచ్చు',
        'లక్షణాలను పర్యవేక్షించండి'
      ];
    } else {
      analysis = 'చిత్రం విశ్లేషణ పూర్తయింది. మీరు ఏమి చూపించాలనుకుంటున్నారు? మరింత వివరాలు అవసరం.';
      recommendations = [
        'మరింత వివరాలు చెప్పండి',
        'ఇతర లక్షణాలు ఉన్నాయా?',
        'చిత్రం యొక్క నిర్దిష్ట ప్రాంతాన్ని సూచించండి'
      ];
    }
    
    res.json({
      analysis,
      confidence,
      conditions,
      recommendations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({
      analysis: req.body.language === 'hindi' ? 'छवि विश्लेषण के दौरान एक त्रुटि हुई।' : 'చిత్రం విశ్లేషణలో సమస్య జరిగింది. మళ్లీ ప్రయత్నించండి.',
      error: error.message
    });
  }
});

// Enhanced report analysis with more accurate medical insights
app.post('/api/analyze-report', upload.single('report'), async (req, res) => {
  try {
    const report = req.file;
    const reportType = req.body.reportType;
    const language = req.body.language || 'english';
    const langOutput = language === 'hindi' ? 'Hindi' : language === 'telugu' ? 'Telugu' : 'English';
    
    console.log('Report analysis request:', { 
      filename: report?.originalname, 
      type: reportType,
      language
    });

    if (GEMINI_API_KEY && report?.buffer) {
      const mime = report.mimetype || 'application/pdf';
      const allowed = /^image\/(jpeg|jpg|png|webp|gif)$|^application\/pdf$/i.test(mime);
      if (allowed) {
        const b64 = report.buffer.toString('base64');
        const prompt =
          `You help users understand lab/imaging reports (not a doctor). Report type: ${reportType}.\n` +
          `Extract key points, possible abnormal values if visible, and sensible next steps. Encourage seeing a clinician for interpretation.\n` +
          `Respond with JSON only, no markdown:\n` +
          `{"analysis":"string","abnormalities":[],"severity":"normal|mild|moderate|severe","recommendations":[],"doctorVisit":true|false,"urgency":"routine|soon|immediate"}`;
        const raw = await geminiGenerateContent({
          userParts: [{ text: prompt }, { inlineData: { mimeType: mime, data: b64 } }]
        });
        const parsed = tryParseJsonObject(raw || '');
        if (parsed && typeof parsed.analysis === 'string') {
          return res.json({
            analysis: parsed.analysis,
            abnormalities: Array.isArray(parsed.abnormalities) ? parsed.abnormalities : [],
            severity: ['normal', 'mild', 'moderate', 'severe'].includes(parsed.severity)
              ? parsed.severity
              : 'normal',
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            doctorVisit: Boolean(parsed.doctorVisit),
            urgency: ['routine', 'soon', 'immediate'].includes(parsed.urgency) ? parsed.urgency : 'routine',
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    // Simulate comprehensive report analysis
    let analysis = '';
    let abnormalities = [];
    let severity = 'normal';
    let recommendations = [];
    let doctorVisit = false;
    let urgency = 'routine';
    
    // Enhanced analysis based on report type
    switch (reportType) {
      case 'blood':
        const bloodAnalysis = generateBloodReportAnalysis();
        analysis = bloodAnalysis.analysis;
        abnormalities = bloodAnalysis.abnormalities;
        severity = bloodAnalysis.severity;
        recommendations = bloodAnalysis.recommendations;
        doctorVisit = bloodAnalysis.doctorVisit;
        urgency = bloodAnalysis.urgency;
        break;
        
      case 'urine':
        analysis = 'మూత్రపు పరీక్షలు సరైనవి. మీ మూత్రపు పరీక్షలో ఏమైనా అసాధారణతలు లేవు.';
        recommendations = ['ఎక్కువ నీరు త్రాగండి', 'నిరంతరం ఈ విధంగా ఉంచుకోండి'];
        break;
        
      case 'xray':
        analysis = 'ఎక్స్-రే చిత్రం సరైనది. ఏమైనా సమస్యలు లేవు. ఊపిరితిత్తులు మరియు హృదయం సరైనవి.';
        recommendations = ['నిరంతరం ఈ విధంగా ఉంచుకోండి', 'వ్యాయామం కొనసాగించండి'];
        break;
        
      case 'ecg':
        analysis = 'ECG ఫలితాలు సరైనవి. హృదయ స్పందన సరైనది. ఏమైనా అసాధారణతలు లేవు.';
        recommendations = ['హృదయ ఆరోగ్యాన్ని కొనసాగించండి', 'వ్యాయామం చేయండి'];
        break;
        
      default:
        analysis = 'పరీక్ష విశ్లేషణ పూర్తయింది. మీ డాక్టర్ సలహా తీసుకోండి.';
        recommendations = ['మీ డాక్టర్ సలహా తీసుకోండి', 'నిరంతరం పర్యవేక్షణ చేయండి'];
        break;
    }
    
    res.json({
      analysis,
      abnormalities,
      severity,
      recommendations,
      doctorVisit,
      urgency,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Report analysis error:', error);
    res.status(500).json({
      analysis: req.body.language === 'hindi' ? 'रिपोर्ट विश्लेषण के दौरान एक त्रुटि हुई।' : 'పరీక్ష విశ్లేషణలో సమస్య జరిగింది. మళ్లీ ప్రయత్నించండి.',
      error: error.message
    });
  }
});

// Enhanced health data analysis
app.post('/api/analyze-health-data', async (req, res) => {
  try {
    const healthData = req.body;
    
    console.log('Health data analysis request:', healthData);
    
    // Simulate comprehensive health data analysis
    const trends = 'మీ ఆరోగ్యం మెరుగుపడుతోంది. రక్తపు పోటు మరియు హృదయ స్పందన సరైనవి.';
    const recommendations = [
      'వ్యాయామం కొనసాగించండి',
      'ఆహారం జాగ్రత్తగా తీసుకోండి',
      'నిద్ర తగినంత తీసుకోండి',
      'ఒత్తిడిని నిర్వహించండి'
    ];
    const riskFactors = ['తక్కువ వ్యాయామం', 'అధిక ఒత్తిడి'];
    const improvements = ['రక్తపు పోటు తగ్గింది', 'హృదయ స్పందన మెరుగైంది'];
    
    res.json({
      trends,
      recommendations,
      riskFactors,
      improvements,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Health data analysis error:', error);
    res.status(500).json({
      trends: 'ఆరోగ్య డేటా విశ్లేషణలో సమస్య జరిగింది.',
      error: error.message
    });
  }
});

// Helper function to generate realistic blood report analysis
function generateBloodReportAnalysis() {
  const random = Math.random();
  
  if (random > 0.85) {
    return {
      analysis: 'రక్తపు పరీక్షలో కొన్ని విలువలు అసాధారణంగా ఉన్నాయి. మీ డాక్టర్ సలహా తీసుకోవాలి.',
      abnormalities: ['అధిక రక్తపు చక్కెర', 'అధిక కొలెస్ట్రాల్', 'తక్కువ హిమోగ్లోబిన్'],
      severity: 'moderate',
      recommendations: [
        'ఆహారం జాగ్రత్తగా తీసుకోండి',
        'వ్యాయామం చేయండి',
        'డాక్టర్ సలహా తీసుకోండి',
        'మళ్లీ పరీక్ష చేయించండి'
      ],
      doctorVisit: true,
      urgency: 'soon'
    };
  } else if (random > 0.7) {
    return {
      analysis: 'రక్తపు పరీక్షలో కొన్ని విలువలు సరిగ్గా లేవు. జాగ్రత్తగా పర్యవేక్షణ చేయాలి.',
      abnormalities: ['తక్కువ హిమోగ్లోబిన్', 'అధిక WBC'],
      severity: 'mild',
      recommendations: [
        'ఇనుము ఉండే ఆహారాలు తీసుకోండి',
        'విటమిన్ సప్లిమెంట్స్ తీసుకోవచ్చు',
        'మళ్లీ పరీక్ష చేయించండి'
      ],
      doctorVisit: true,
      urgency: 'routine'
    };
  } else {
    return {
      analysis: 'రక్తపు పరీక్షలు సరైనవి. మీ ఆరోగ్యం మంచిది.',
      abnormalities: [],
      severity: 'normal',
      recommendations: ['నిరంతరం ఈ విధంగా ఉంచుకోండి', 'వ్యాయామం కొనసాగించండి'],
      doctorVisit: false,
      urgency: 'routine'
    };
  }
}

// Digital Health Identity verification and retrieval
app.get('/api/identity/verify/:patentId', async (req, res) => {
  try {
    const { patentId } = req.params;
    // In production, verify staff authentication token from header
    // const authHeader = req.headers.authorization;
    
    console.log(`[Identity] Verifying token for patient: ${patentId}`);
    
    // Simulate finding patient in DB
    const patientData = {
      id: patentId,
      firstName: 'John',
      lastName: 'Doe',
      bloodGroup: 'O+',
      age: 45,
      gender: 'Male',
      emergencyContact: '9876543210',
      lastUpdate: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: patientData,
      auditLogId: 'AUDIT_' + Date.now().toString(36)
    });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Medical Identity not found' });
  }
});

app.get('/api/internal-file', async (req, res) => {
  try {
    const filePath = String(req.query.file || '');
    if (!filePath || !filePath.startsWith(DATA_DIR)) {
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }
    res.download(filePath);
  } catch (error) {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});

app.post('/api/generate-qr', async (req, res) => {
  try {
    const { patientId, profile = {} } = req.body || {};
    if (!patientId) return res.status(400).json({ success: false, message: 'patientId is required' });
    upsertPatientProfile(patientId, profile);
    const current = store.tokens[patientId];
    const token = current?.revoked ? secureToken() : current?.token || secureToken();
    store.tokens[patientId] = {
      token,
      revoked: false,
      created_at: current?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await saveStore();
    res.json({
      success: true,
      patient_id: store.patients[patientId].patient_id,
      token,
      health_passport_url: `${PUBLIC_BASE_URL}/health-passport/${token}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate QR token' });
  }
});

app.post('/api/revoke-qr/:patientId', async (req, res) => {
  const { patientId } = req.params;
  const existing = store.tokens[patientId];
  if (!existing) return res.status(404).json({ success: false, message: 'Token not found' });
  store.tokens[patientId] = { ...existing, revoked: true, updated_at: new Date().toISOString() };
  await saveStore();
  res.json({ success: true, message: 'QR token revoked' });
});

app.post('/api/reports/register', async (req, res) => {
  try {
    const { patientId, report } = req.body || {};
    if (!patientId || !report?.s3_url) {
      return res.status(400).json({ success: false, message: 'patientId and report.s3_url are required' });
    }
    upsertPatientProfile(patientId, report.profile || {});
    const list = store.reports[patientId] || [];
    list.push({
      report_id: report.report_id || crypto.randomUUID(),
      patient_id: patientId,
      s3_url: report.s3_url,
      file_name: report.file_name || 'report',
      created_at: new Date().toISOString()
    });
    store.reports[patientId] = list;
    await saveStore();
    await createSummaryForPatient(patientId);
    res.json({ success: true, reports_count: list.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not register report' });
  }
});

app.post('/api/summary/regenerate/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    upsertPatientProfile(patientId, req.body?.profile || {});
    const summary = await createSummaryForPatient(patientId);
    res.json({ success: true, summary });
  } catch (error) {
    console.error('summary regenerate', error);
    res.status(500).json({ success: false, message: 'Failed to regenerate summary' });
  }
});

function resolveToken(token) {
  const entry = Object.entries(store.tokens).find(([, value]) => value?.token === token);
  if (!entry) return null;
  const [patientId, tokenData] = entry;
  if (tokenData.revoked) return { error: 'revoked' };
  return { patientId, tokenData };
}

app.get('/api/health-passport/:token', async (req, res) => {
  const tokenMeta = resolveToken(req.params.token);
  if (!tokenMeta) return res.status(404).json({ success: false, message: 'Invalid token' });
  if (tokenMeta.error === 'revoked') return res.status(410).json({ success: false, message: 'Token revoked' });
  const patient = store.patients[tokenMeta.patientId] || {};
  const summary = store.summaries[tokenMeta.patientId] || null;
  const reports = store.reports[tokenMeta.patientId] || [];
  res.json({
    success: true,
    patient: {
      id: tokenMeta.patientId,
      patient_id: patient.patient_id,
      name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
      bloodGroup: patient.bloodGroup || 'N/A',
      emergencyContact: patient.emergencyContact || patient.phone || 'N/A',
      diseases: patient.diseases || [],
      medications: patient.medications || [],
      allergies: patient.allergies || []
    },
    summary,
    reports
  });
});

app.get('/api/emergency-passport/:token', async (req, res) => {
  const tokenMeta = resolveToken(req.params.token);
  if (!tokenMeta || tokenMeta.error) return res.status(404).json({ success: false, message: 'Invalid token' });
  const patient = store.patients[tokenMeta.patientId] || {};
  res.json({
    success: true,
    emergency: {
      bloodGroup: patient.bloodGroup || 'N/A',
      allergies: patient.allergies || [],
      emergencyContact: patient.emergencyContact || patient.phone || 'N/A'
    }
  });
});

app.post('/api/access/request-otp', async (req, res) => {
  const { token } = req.body || {};
  const tokenMeta = resolveToken(token);
  if (!tokenMeta || tokenMeta.error) return res.status(404).json({ success: false, message: 'Invalid token' });
  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
  store.otpSessions[token] = { otp, expires_at: Date.now() + 5 * 60 * 1000 };
  await saveStore();
  res.json({ success: true, otp_hint: `OTP sent (dev): ${otp}` });
});

app.post('/api/access/verify-otp', async (req, res) => {
  const { token, otp } = req.body || {};
  const row = store.otpSessions[token];
  if (!row) return res.status(404).json({ success: false, message: 'OTP session missing' });
  if (Date.now() > row.expires_at) return res.status(410).json({ success: false, message: 'OTP expired' });
  if (String(otp) !== String(row.otp)) return res.status(401).json({ success: false, message: 'Invalid OTP' });
  res.json({ success: true, access_granted: true });
});

app.get('/download-summary/:patientId', async (req, res) => {
  const { patientId } = req.params;
  const { otpVerified, doctorAuthorized } = req.query;
  if (!['true', true].includes(otpVerified) && !['true', true].includes(doctorAuthorized)) {
    return res.status(403).json({ success: false, message: 'Access verification required' });
  }
  const summary = store.summaries[patientId];
  if (!summary) return res.status(404).json({ success: false, message: 'Summary missing' });
  if (summary.s3_key && s3Client && s3Bucket) {
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: s3Bucket, Key: summary.s3_key }),
      { expiresIn: 300 }
    );
    return res.json({ success: true, download_url: url });
  }
  return res.redirect(summary.summary_pdf_url);
});

app.get('/download-reports/:patientId', async (req, res) => {
  const { patientId } = req.params;
  const { otpVerified, doctorAuthorized } = req.query;
  if (!['true', true].includes(otpVerified) && !['true', true].includes(doctorAuthorized)) {
    return res.status(403).json({ success: false, message: 'Access verification required' });
  }
  const reports = store.reports[patientId] || [];
  if (!reports.length) return res.status(404).json({ success: false, message: 'No reports found' });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="reports-${patientId}.zip"`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', () => res.status(500).end());
  archive.pipe(res);
  reports.forEach((r, index) => {
    archive.append(`Source URL: ${r.s3_url}\n`, { name: `${index + 1}-${r.file_name}.txt` });
  });
  await archive.finalize();
});

app.get('/api/identity/summary/:patentId', async (req, res) => {
  try {
    const { patentId } = req.params;
    // Mock health summary data
    const summary = [
      { timestamp: Date.now() - 2592000000, healthScore: 78, note: 'Normal checkup' },
      { timestamp: Date.now() - 1296000000, healthScore: 82, note: 'Improved vitals' },
      { timestamp: Date.now(), healthScore: 85, note: 'Today\'s assessment' }
    ];
    
    res.json({ success: true, history: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve health history' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: [
      'Enhanced medical chat with real-time data',
      'Comprehensive image analysis',
      'Detailed report analysis',
      'Health data insights',
      'Emergency symptom detection'
    ]
  });
});

// Serve static files from React build directory
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Wildcard Route: serve index.html for any other request to support React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

await ensureStoreLoaded();

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Arogya Sathi API Server running on port ${PORT}`);
  if (GEMINI_API_KEY) {
    console.log(`🤖 Gemini: enabled (model ${GEMINI_MODEL})`);
  } else {
    console.warn('⚠️  GEMINI_API_KEY not set — chat uses scripted replies + Wikipedia. Add .env and restart.');
  }
  console.log(`📡 Medical Chat API: http://localhost:${PORT}/api/medical-chat`);
  console.log(`🖼️  Image Analysis API: http://localhost:${PORT}/api/analyze-image`);
  console.log(`📊 Report Analysis API: http://localhost:${PORT}/api/analyze-report`);
  console.log(`💊 Health Data API: http://localhost:${PORT}/api/analyze-health-data`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is already in use — an API server is probably already running.`);
    console.error('   You usually do NOT need a second terminal with npm run server.');
    console.error('   To free the port (Windows): netstat -ano | findstr :' + PORT);
    console.error('   Then: taskkill /PID <number_from_LISTENING> /F\n');
    process.exit(1);
  }
  throw err;
});

export default app; 