const hospitalsData = require('../data/hospitals.json');

// Symptom-to-condition knowledge base
const symptomDatabase = {
  // === RESPIRATORY ===
  'cough': { conditions: ['Common Cold', 'Bronchitis', 'Asthma', 'Pneumonia', 'COVID-19'], weight: 1 },
  'dry cough': { conditions: ['COVID-19', 'Asthma', 'GERD', 'ACE Inhibitor Side Effect'], weight: 1.5 },
  'persistent cough': { conditions: ['Bronchitis', 'Pneumonia', 'Tuberculosis', 'Lung Cancer'], weight: 2 },
  'shortness of breath': { conditions: ['Asthma', 'Pneumonia', 'Heart Failure', 'Anxiety', 'COVID-19', 'Anemia'], weight: 2.5 },
  'wheezing': { conditions: ['Asthma', 'COPD', 'Bronchitis', 'Allergic Reaction'], weight: 2 },
  'sore throat': { conditions: ['Common Cold', 'Strep Throat', 'Tonsillitis', 'Flu'], weight: 1 },
  'runny nose': { conditions: ['Common Cold', 'Allergic Rhinitis', 'Sinusitis', 'Flu'], weight: 0.5 },
  'congestion': { conditions: ['Common Cold', 'Sinusitis', 'Allergic Rhinitis'], weight: 0.5 },
  'sneezing': { conditions: ['Allergic Rhinitis', 'Common Cold'], weight: 0.5 },

  // === PAIN ===
  'headache': { conditions: ['Tension Headache', 'Migraine', 'Sinusitis', 'Hypertension', 'Dehydration'], weight: 1 },
  'severe headache': { conditions: ['Migraine', 'Meningitis', 'Stroke', 'Brain Tumor', 'Subarachnoid Hemorrhage'], weight: 3 },
  'chest pain': { conditions: ['Heart Attack', 'Angina', 'GERD', 'Costochondritis', 'Pulmonary Embolism'], weight: 3.5 },
  'abdominal pain': { conditions: ['Gastritis', 'Appendicitis', 'IBS', 'Peptic Ulcer', 'Gallstones'], weight: 2 },
  'back pain': { conditions: ['Muscle Strain', 'Herniated Disc', 'Kidney Stones', 'Sciatica', 'Osteoarthritis'], weight: 1.5 },
  'joint pain': { conditions: ['Arthritis', 'Gout', 'Rheumatoid Arthritis', 'Lupus', 'Sprains'], weight: 1.5 },
  'muscle pain': { conditions: ['Muscle Strain', 'Fibromyalgia', 'Flu', 'Overexertion'], weight: 1 },
  'neck pain': { conditions: ['Cervical Spondylosis', 'Muscle Strain', 'Meningitis', 'Whiplash'], weight: 1.5 },
  'stomach pain': { conditions: ['Gastritis', 'Food Poisoning', 'Peptic Ulcer', 'IBS', 'Appendicitis'], weight: 1.5 },
  'body aches': { conditions: ['Flu', 'COVID-19', 'Dengue', 'Fibromyalgia', 'Viral Fever'], weight: 1.5 },

  // === GASTROINTESTINAL ===
  'nausea': { conditions: ['Food Poisoning', 'Gastritis', 'Pregnancy', 'Migraine', 'Vertigo'], weight: 1 },
  'vomiting': { conditions: ['Food Poisoning', 'Gastroenteritis', 'Appendicitis', 'Migraine', 'Pregnancy'], weight: 1.5 },
  'diarrhea': { conditions: ['Food Poisoning', 'Gastroenteritis', 'IBS', 'Celiac Disease', 'Cholera'], weight: 1.5 },
  'constipation': { conditions: ['IBS', 'Hypothyroidism', 'Dehydration', 'Bowel Obstruction'], weight: 1 },
  'bloating': { conditions: ['IBS', 'Lactose Intolerance', 'Celiac Disease', 'Gastritis'], weight: 0.5 },
  'loss of appetite': { conditions: ['Depression', 'Hepatitis', 'Cancer', 'Tuberculosis', 'Viral Infection'], weight: 1.5 },
  'heartburn': { conditions: ['GERD', 'Peptic Ulcer', 'Gastritis'], weight: 1 },
  'blood in stool': { conditions: ['Hemorrhoids', 'Colorectal Cancer', 'IBD', 'Peptic Ulcer'], weight: 3 },

  // === FEVER & SYSTEMIC ===
  'fever': { conditions: ['Viral Infection', 'Flu', 'COVID-19', 'Malaria', 'Dengue', 'Typhoid', 'UTI'], weight: 1.5 },
  'high fever': { conditions: ['Malaria', 'Dengue', 'Typhoid', 'Pneumonia', 'Meningitis'], weight: 2.5 },
  'chills': { conditions: ['Flu', 'Malaria', 'Pneumonia', 'UTI', 'Sepsis'], weight: 1.5 },
  'fatigue': { conditions: ['Anemia', 'Hypothyroidism', 'Diabetes', 'Depression', 'Chronic Fatigue Syndrome', 'COVID-19'], weight: 1 },
  'weakness': { conditions: ['Anemia', 'Dehydration', 'Diabetes', 'Heart Failure', 'Malnutrition'], weight: 1.5 },
  'weight loss': { conditions: ['Diabetes', 'Hyperthyroidism', 'Cancer', 'Tuberculosis', 'HIV/AIDS'], weight: 2 },
  'night sweats': { conditions: ['Tuberculosis', 'Lymphoma', 'Menopause', 'Hyperthyroidism', 'Infection'], weight: 2 },
  'swollen lymph nodes': { conditions: ['Infection', 'Lymphoma', 'Mononucleosis', 'HIV', 'Tuberculosis'], weight: 2 },

  // === NEUROLOGICAL ===
  'dizziness': { conditions: ['Vertigo', 'Anemia', 'Dehydration', 'Low Blood Pressure', 'Inner Ear Infection'], weight: 1.5 },
  'confusion': { conditions: ['Stroke', 'Hypoglycemia', 'Meningitis', 'Dementia', 'Drug Interaction'], weight: 3 },
  'numbness': { conditions: ['Stroke', 'Peripheral Neuropathy', 'Carpal Tunnel', 'Multiple Sclerosis', 'Diabetes'], weight: 2 },
  'tingling': { conditions: ['Peripheral Neuropathy', 'Carpal Tunnel', 'Vitamin B12 Deficiency', 'Anxiety'], weight: 1.5 },
  'seizure': { conditions: ['Epilepsy', 'Brain Tumor', 'Meningitis', 'Hypoglycemia', 'Drug Withdrawal'], weight: 3.5 },
  'vision changes': { conditions: ['Migraine', 'Stroke', 'Glaucoma', 'Diabetic Retinopathy', 'Macular Degeneration'], weight: 2.5 },
  'memory loss': { conditions: ['Dementia', 'Alzheimer Disease', 'Vitamin B12 Deficiency', 'Depression'], weight: 2 },

  // === SKIN ===
  'rash': { conditions: ['Allergic Reaction', 'Eczema', 'Dermatitis', 'Measles', 'Psoriasis', 'Dengue'], weight: 1 },
  'itching': { conditions: ['Eczema', 'Allergic Reaction', 'Scabies', 'Liver Disease', 'Fungal Infection'], weight: 1 },
  'hives': { conditions: ['Allergic Reaction', 'Urticaria', 'Drug Reaction'], weight: 1.5 },
  'skin discoloration': { conditions: ['Jaundice', 'Liver Disease', 'Bruising', 'Melanoma'], weight: 2 },
  'swelling': { conditions: ['Allergic Reaction', 'Cellulitis', 'Heart Failure', 'Kidney Disease', 'DVT'], weight: 2 },

  // === URINARY ===
  'frequent urination': { conditions: ['UTI', 'Diabetes', 'Prostate Enlargement', 'Overactive Bladder'], weight: 1.5 },
  'painful urination': { conditions: ['UTI', 'STI', 'Kidney Stones', 'Prostatitis'], weight: 2 },
  'blood in urine': { conditions: ['UTI', 'Kidney Stones', 'Bladder Cancer', 'Kidney Disease'], weight: 3 },

  // === CARDIOVASCULAR ===
  'palpitations': { conditions: ['Anxiety', 'Arrhythmia', 'Hyperthyroidism', 'Anemia', 'Caffeine'], weight: 2 },
  'rapid heartbeat': { conditions: ['Tachycardia', 'Anxiety', 'Hyperthyroidism', 'Dehydration', 'Arrhythmia'], weight: 2 },
  'swollen legs': { conditions: ['Heart Failure', 'DVT', 'Kidney Disease', 'Liver Disease', 'Varicose Veins'], weight: 2 },
  'cold extremities': { conditions: ['Peripheral Artery Disease', 'Raynaud Disease', 'Anemia', 'Hypothyroidism'], weight: 1.5 },

  // === MENTAL HEALTH ===
  'anxiety': { conditions: ['Generalized Anxiety Disorder', 'Panic Disorder', 'Hyperthyroidism', 'PTSD'], weight: 1.5 },
  'depression': { conditions: ['Major Depressive Disorder', 'Hypothyroidism', 'Bipolar Disorder', 'Seasonal Affective Disorder'], weight: 2 },
  'insomnia': { conditions: ['Insomnia', 'Anxiety', 'Depression', 'Sleep Apnea', 'Hyperthyroidism'], weight: 1 },
  'mood swings': { conditions: ['Bipolar Disorder', 'Hormonal Imbalance', 'PMS', 'Thyroid Disorder'], weight: 1.5 },

  // === EAR / EYE ===
  'ear pain': { conditions: ['Ear Infection', 'TMJ', 'Referred Tooth Pain', 'Swimmer Ear'], weight: 1 },
  'hearing loss': { conditions: ['Ear Infection', 'Meniere Disease', 'Noise-Induced Hearing Loss', 'Acoustic Neuroma'], weight: 2 },
  'eye pain': { conditions: ['Glaucoma', 'Conjunctivitis', 'Corneal Abrasion', 'Uveitis', 'Migraine'], weight: 2 },
  'red eye': { conditions: ['Conjunctivitis', 'Glaucoma', 'Uveitis', 'Subconjunctival Hemorrhage', 'Allergy'], weight: 1.5 },
};

// Condition details
const conditionDetails = {
  'Common Cold': { description: 'A viral infection of the upper respiratory tract causing runny nose, sore throat, and cough.', specialist: 'General Physician' },
  'Flu': { description: 'Influenza is a viral infection that attacks your respiratory system with high fever and body aches.', specialist: 'General Physician' },
  'COVID-19': { description: 'A respiratory illness caused by the SARS-CoV-2 virus with varied symptoms from mild to severe.', specialist: 'Pulmonologist / General Physician' },
  'Bronchitis': { description: 'Inflammation of the bronchial tubes causing persistent cough with mucus production.', specialist: 'Pulmonologist' },
  'Pneumonia': { description: 'Infection that inflames air sacs in lungs, which may fill with fluid or pus.', specialist: 'Pulmonologist' },
  'Asthma': { description: 'A chronic condition where airways narrow and swell, producing extra mucus.', specialist: 'Pulmonologist' },
  'Heart Attack': { description: 'Occurs when blood flow to heart muscle is blocked. Requires immediate emergency care.', specialist: 'Cardiologist / Emergency Medicine' },
  'Angina': { description: 'Chest pain caused by reduced blood flow to the heart, often a symptom of coronary artery disease.', specialist: 'Cardiologist' },
  'GERD': { description: 'Gastroesophageal reflux disease — chronic acid reflux damaging the esophageal lining.', specialist: 'Gastroenterologist' },
  'Migraine': { description: 'A neurological condition causing intense, debilitating headaches often with visual disturbances.', specialist: 'Neurologist' },
  'Tension Headache': { description: 'Most common type of headache with a dull, aching sensation across the forehead.', specialist: 'General Physician / Neurologist' },
  'Sinusitis': { description: 'Inflammation of the sinuses causing facial pain, congestion, and thick nasal discharge.', specialist: 'ENT Specialist' },
  'Allergic Rhinitis': { description: 'Allergic response causing sneezing, itching, runny nose, and congestion.', specialist: 'Allergist / ENT' },
  'Strep Throat': { description: 'Bacterial infection causing severe sore throat and fever, requires antibiotics.', specialist: 'ENT / General Physician' },
  'Gastritis': { description: 'Inflammation of the stomach lining causing pain, nausea, and indigestion.', specialist: 'Gastroenterologist' },
  'Food Poisoning': { description: 'Illness caused by consuming contaminated food or water with vomiting and diarrhea.', specialist: 'General Physician' },
  'Appendicitis': { description: 'Inflammation of the appendix causing severe abdominal pain, may require surgery.', specialist: 'General Surgeon' },
  'IBS': { description: 'Irritable Bowel Syndrome — chronic condition affecting the large intestine.', specialist: 'Gastroenterologist' },
  'Peptic Ulcer': { description: 'Open sores on the inner lining of the stomach or small intestine.', specialist: 'Gastroenterologist' },
  'UTI': { description: 'Urinary tract infection — bacterial infection of the urinary system.', specialist: 'Urologist / General Physician' },
  'Kidney Stones': { description: 'Hard deposits of minerals and salts inside the kidneys causing severe pain.', specialist: 'Urologist / Nephrologist' },
  'Diabetes': { description: 'A chronic condition that affects how the body processes blood sugar (glucose).', specialist: 'Endocrinologist' },
  'Hypertension': { description: 'Persistently elevated blood pressure that increases risk of heart disease and stroke.', specialist: 'Cardiologist' },
  'Anemia': { description: 'A condition where you lack enough healthy red blood cells to carry adequate oxygen.', specialist: 'Hematologist' },
  'Hypothyroidism': { description: 'Underactive thyroid gland not producing enough thyroid hormones.', specialist: 'Endocrinologist' },
  'Hyperthyroidism': { description: 'Overactive thyroid gland producing excess thyroid hormones.', specialist: 'Endocrinologist' },
  'Arthritis': { description: 'Inflammation of one or more joints causing pain, swelling, and stiffness.', specialist: 'Rheumatologist' },
  'Gout': { description: 'Form of arthritis caused by excess uric acid crystals in joints.', specialist: 'Rheumatologist' },
  'Stroke': { description: 'Occurs when blood supply to brain is interrupted. Requires IMMEDIATE emergency care.', specialist: 'Neurologist / Emergency Medicine' },
  'Meningitis': { description: 'Inflammation of the brain and spinal cord membranes, potentially life-threatening.', specialist: 'Neurologist / Infectious Disease' },
  'Epilepsy': { description: 'Neurological disorder causing recurrent, unprovoked seizures.', specialist: 'Neurologist' },
  'Malaria': { description: 'Mosquito-borne infectious disease causing fever, chills, and flu-like illness.', specialist: 'Infectious Disease / General Physician' },
  'Dengue': { description: 'Viral disease spread by mosquitoes causing high fever, severe body aches, and rash.', specialist: 'Infectious Disease / General Physician' },
  'Typhoid': { description: 'Bacterial infection causing high fever, weakness, and stomach pain, spread through contaminated food/water.', specialist: 'Infectious Disease / General Physician' },
  'Tuberculosis': { description: 'Serious bacterial infection primarily affecting the lungs with persistent cough and weight loss.', specialist: 'Pulmonologist / Infectious Disease' },
  'Depression': { description: 'A mental health disorder causing persistent sadness, loss of interest, and fatigue.', specialist: 'Psychiatrist' },
  'Major Depressive Disorder': { description: 'Clinical depression causing persistent and intense feelings of sadness affecting daily life.', specialist: 'Psychiatrist' },
  'Generalized Anxiety Disorder': { description: 'Excessive, uncontrollable worry about everyday matters affecting quality of life.', specialist: 'Psychiatrist / Psychologist' },
  'Vertigo': { description: 'A sensation of spinning dizziness, often caused by inner ear problems.', specialist: 'ENT / Neurologist' },
  'Eczema': { description: 'A condition causing inflamed, itchy, cracked, and rough skin patches.', specialist: 'Dermatologist' },
  'Psoriasis': { description: 'An autoimmune condition causing rapid skin cell buildup forming scales and itchy patches.', specialist: 'Dermatologist' },
  'DVT': { description: 'Deep Vein Thrombosis — blood clot in a deep vein, usually in the legs.', specialist: 'Vascular Surgeon / Hematologist' },
  'Heart Failure': { description: 'A chronic condition where the heart doesn\'t pump blood efficiently.', specialist: 'Cardiologist' },
  'Peripheral Neuropathy': { description: 'Damage to peripheral nerves causing weakness, numbness, and pain in extremities.', specialist: 'Neurologist' },
  'Multiple Sclerosis': { description: 'A disease where the immune system attacks the protective nerve coverings.', specialist: 'Neurologist' },
  'Celiac Disease': { description: 'An immune reaction to eating gluten causing intestinal damage.', specialist: 'Gastroenterologist' },
  'Hepatitis': { description: 'Inflammation of the liver, often caused by viral infection.', specialist: 'Hepatologist / Gastroenterologist' },
  'Conjunctivitis': { description: 'Inflammation of the eye\'s conjunctiva causing redness and discharge.', specialist: 'Ophthalmologist' },
  'Glaucoma': { description: 'A group of eye conditions that damage the optic nerve, often due to high eye pressure.', specialist: 'Ophthalmologist' },
  'Fibromyalgia': { description: 'A disorder causing widespread musculoskeletal pain with fatigue and mood issues.', specialist: 'Rheumatologist' },
  'Pulmonary Embolism': { description: 'A blood clot in the lungs — a potentially life-threatening condition.', specialist: 'Pulmonologist / Emergency Medicine' },
};

// Emergency conditions that always trigger high/emergency risk
const emergencyKeywords = [
  'heart attack', 'cardiac arrest', 'can\'t breathe', 'cannot breathe',
  'severe chest pain', 'stroke', 'seizure', 'unconscious', 'unresponsive',
  'severe bleeding', 'heavy bleeding', 'suicidal', 'suicide',
  'anaphylaxis', 'choking', 'drowning', 'poisoning', 'overdose',
  'difficulty breathing', 'paralysis', 'sudden numbness',
];

/**
 * Extract symptoms from natural language text
 */
function extractSymptoms(text) {
  const normalizedText = text.toLowerCase().trim();
  const foundSymptoms = [];

  // Sort symptom keys by length (descending) to match longer phrases first
  const sortedKeys = Object.keys(symptomDatabase).sort((a, b) => b.length - a.length);

  for (const symptom of sortedKeys) {
    if (normalizedText.includes(symptom)) {
      foundSymptoms.push({
        symptom,
        ...symptomDatabase[symptom],
      });
    }
  }

  return foundSymptoms;
}

/**
 * Check if text contains emergency indicators
 */
function detectEmergency(text) {
  const normalizedText = text.toLowerCase();
  return emergencyKeywords.some(keyword => normalizedText.includes(keyword));
}

/**
 * Calculate condition probabilities from matched symptoms
 */
function calculateProbabilities(matchedSymptoms) {
  const conditionScores = {};

  for (const match of matchedSymptoms) {
    for (const condition of match.conditions) {
      if (!conditionScores[condition]) {
        conditionScores[condition] = { score: 0, matchCount: 0 };
      }
      conditionScores[condition].score += match.weight;
      conditionScores[condition].matchCount += 1;
    }
  }

  // Convert to probabilities (normalize)
  const maxScore = Math.max(...Object.values(conditionScores).map(c => c.score), 1);
  const conditions = Object.entries(conditionScores)
    .map(([name, data]) => ({
      name,
      probability: Math.min(Math.round((data.score / maxScore) * 85 + data.matchCount * 5), 95),
      description: conditionDetails[name]?.description || 'A medical condition requiring professional evaluation.',
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5); // Top 5 conditions

  return conditions;
}

/**
 * Determine risk level based on conditions and symptoms
 */
function classifyRisk(conditions, isEmergency, matchedSymptoms) {
  if (isEmergency) return 'emergency';

  const topCondition = conditions[0]?.name || '';
  const totalWeight = matchedSymptoms.reduce((sum, s) => sum + s.weight, 0);

  // Emergency conditions
  const emergencyConditions = ['Heart Attack', 'Stroke', 'Pulmonary Embolism', 'Meningitis', 'Anaphylaxis'];
  if (emergencyConditions.some(c => conditions.some(cond => cond.name === c && cond.probability > 50))) {
    return 'emergency';
  }

  // High risk
  const highRiskConditions = ['Pneumonia', 'Appendicitis', 'DVT', 'Seizure', 'Kidney Stones', 'Heart Failure'];
  if (highRiskConditions.some(c => conditions.some(cond => cond.name === c && cond.probability > 40)) || totalWeight > 8) {
    return 'high';
  }

  // Medium risk
  if (totalWeight > 4 || conditions[0]?.probability > 60) {
    return 'medium';
  }

  return 'low';
}

/**
 * Generate contextual recommendations
 */
function generateRecommendations(conditions, riskLevel) {
  const recommendations = [];
  const topCondition = conditions[0]?.name;
  const specialist = conditionDetails[topCondition]?.specialist;

  // Risk-based recommendations
  if (riskLevel === 'emergency') {
    recommendations.push('🚨 Seek immediate medical attention — call 108 or go to the nearest ER');
    recommendations.push('Do not delay treatment — this could be life-threatening');
  } else if (riskLevel === 'high') {
    recommendations.push('⚠️ Schedule an urgent appointment with a doctor within 24 hours');
    recommendations.push('If symptoms worsen, visit the nearest emergency room');
  } else if (riskLevel === 'medium') {
    recommendations.push('📋 Schedule a doctor\'s appointment within the next few days');
    recommendations.push('Monitor your symptoms and note any changes');
  } else {
    recommendations.push('💊 Rest and manage symptoms with over-the-counter remedies');
    recommendations.push('If symptoms persist beyond a week, consult a doctor');
  }

  // Specialist recommendation
  if (specialist) {
    recommendations.push(`👨‍⚕️ Recommended specialist: ${specialist}`);
  }

  // General wellness recommendations
  recommendations.push('💧 Stay well-hydrated and get adequate rest');
  recommendations.push('📝 Keep track of your symptoms and any triggers');

  return recommendations;
}

/**
 * Generate follow-up questions
 */
function generateFollowUpQuestions(conditions, matchedSymptoms) {
  const questions = [];
  const topCondition = conditions[0]?.name;

  // Duration question
  questions.push('How long have you been experiencing these symptoms?');

  // Condition-specific questions
  if (topCondition === 'Heart Attack' || topCondition === 'Angina') {
    questions.push('Is the chest pain constant or does it come and go?');
    questions.push('Does the pain radiate to your arm, jaw, or back?');
  } else if (topCondition === 'Migraine') {
    questions.push('Do you experience visual disturbances (aura) before the headache?');
    questions.push('Is the headache on one side or both sides?');
  } else if (topCondition === 'Diabetes') {
    questions.push('Have you noticed increased thirst or frequent urination?');
    questions.push('Do you have a family history of diabetes?');
  } else if (topCondition === 'UTI') {
    questions.push('Do you experience burning or pain during urination?');
    questions.push('Have you noticed any changes in urine color or odor?');
  } else if (topCondition === 'Dengue' || topCondition === 'Malaria') {
    questions.push('Have you traveled recently or been in a mosquito-prone area?');
    questions.push('Do you have any skin rashes or bleeding from gums/nose?');
  }

  // Severity question
  questions.push('On a scale of 1-10, how severe are your symptoms?');

  return questions.slice(0, 4); // Max 4 follow-up questions
}

const medicationDatabase = {
  'Common Cold': ['Decongestants (e.g., Pseudoephedrine)', 'Antihistamines (e.g., Cetirizine)', 'Cough Suppressants'],
  'Flu': ['Pain Relievers/Fever Reducers (e.g., Paracetamol, Ibuprofen)', 'Rest and hydration'],
  'COVID-19': ['Fever Reducers (e.g., Paracetamol)', 'Hydration solutions', 'Cough Suppressants'],
  'Bronchitis': ['Cough Expectorants (e.g., Guaifenesin)', 'Mucolytics'],
  'Pneumonia': ['Requires prescription antibiotics. Fever Reducers (e.g., Paracetamol) for symptom management.'],
  'Asthma': ['Requires prescription bronchodilator inhalers (e.g., Albuterol/Salbutamol)'],
  'Heart Attack': ['EMERGENCY: Do NOT self-medicate. Seek emergency care.'],
  'Angina': ['Requires prescription Nitroglycerin. Seek cardiologist review.'],
  'GERD': ['Antacids (e.g., Gelusil, Digene)', 'H2 Blockers (e.g., Famotidine)', 'PPIs (e.g., Pantoprazole)'],
  'Gastritis': ['Antacids (e.g., Gelusil, Digene)', 'PPIs (e.g., Pantoprazole)'],
  'Peptic Ulcer': ['PPIs (e.g., Pantoprazole)', 'Antacids'],
  'Migraine': ['Pain Relievers (e.g., Ibuprofen, Paracetamol)', 'Triptans (prescription)'],
  'Tension Headache': ['Pain Relievers (e.g., Paracetamol, Ibuprofen)'],
  'Severe Headache': ['Pain Relievers (e.g., Ibuprofen)', 'Seek medical evaluation if persistent or sudden'],
  'Sinusitis': ['Saline Nasal Sprays', 'Decongestants', 'Pain Relievers'],
  'Allergic Rhinitis': ['Antihistamines (e.g., Cetirizine, Loratadine)', 'Nasal Steroid Sprays'],
  'Strep Throat': ['Requires prescription antibiotics. Throat lozenges, Paracetamol for pain relief.'],
  'Food Poisoning': ['Oral Rehydration Salts (ORS)', 'Probiotics'],
  'Gastroenteritis': ['Oral Rehydration Salts (ORS)', 'Probiotics'],
  'Diarrhea': ['Oral Rehydration Salts (ORS)', 'Loperamide (anti-diarrheal)'],
  'UTI': ['Requires prescription antibiotics. Cranberry supplements, Phenazopyridine for pain relief.'],
  'Kidney Stones': ['Pain Relievers (e.g., Ibuprofen)', 'Spasmolytics (prescription)', 'Heavy hydration'],
  'Diabetes': ['Requires prescription insulin or oral hypoglycemics (e.g., Metformin)'],
  'Hypertension': ['Requires prescription antihypertensive medications (e.g., Amlodipine, Telmisartan)'],
  'Anemia': ['Iron supplements', 'Vitamin B12 / Folic acid supplements'],
  'Hypothyroidism': ['Requires prescription Levothyroxine'],
  'Hyperthyroidism': ['Requires prescription antithyroid drugs (e.g., Methimazole)'],
  'Arthritis': ['Pain Relievers/NSAIDs (e.g., Ibuprofen, Naproxen)'],
  'Gout': ['Colchicine, NSAIDs (prescription), Hydration'],
  'Stroke': ['EMERGENCY: Do NOT self-medicate. Go to nearest stroke center.'],
  'Meningitis': ['EMERGENCY: Requires immediate hospitalization and IV antibiotics/antivirals.'],
  'Epilepsy': ['Requires prescription anticonvulsants (e.g., Levetiracetam)'],
  'Malaria': ['Requires prescription antimalarial drugs. Paracetamol for fever.'],
  'Dengue': ['Paracetamol only for fever/pain. Avoid Ibuprofen/Aspirin (increases bleeding risk). Hydration.'],
  'Typhoid': ['Requires prescription antibiotics. Paracetamol for fever.'],
  'Tuberculosis': ['Requires strict prescription anti-TB drug regimen (DOTS).'],
  'Depression': ['Requires consulting a psychiatrist/therapist. Anti-depressants (prescription).'],
  'Major Depressive Disorder': ['Consult a psychiatrist. Anti-depressants (prescription).'],
  'Generalized Anxiety Disorder': ['Anxiolytics (prescription), Therapy.'],
  'Vertigo': ['Antihistamines (e.g., Cinnarizine, Betahistine - prescription)'],
  'Eczema': ['Emollients/Moisturizers', 'Topical Hydrocortisone cream'],
  'Psoriasis': ['Topical Coal Tar, Corticosteroid creams (prescription), Moisturizers'],
  'DVT': ['Requires prescription anticoagulants (blood thinners)'],
  'Heart Failure': ['Requires prescription diuretics, ACE inhibitors. Consult cardiologist.'],
  'Peripheral Neuropathy': ['Pregabalin, Gabapentin (prescription), B-complex vitamins'],
  'Conjunctivitis': ['Lubricating eye drops', 'Antibiotic eye drops (for bacterial - prescription)'],
  'Glaucoma': ['Requires prescription eye drops to reduce intraocular pressure.'],
  'Fibromyalgia': ['Pain relievers, Pregabalin (prescription), gentle exercise'],
  'Pulmonary Embolism': ['EMERGENCY: Requires immediate hospitalization and blood thinners.'],
};

function suggestMedications(conditions) {
  const suggested = [];
  conditions.slice(0, 2).forEach(c => {
    const meds = medicationDatabase[c.name];
    if (meds) {
      suggested.push(`**For ${c.name}:** ${meds.join(', ')}`);
    }
  });
  if (suggested.length === 0) {
    suggested.push('Rest, stay hydrated. Consult a doctor for appropriate medication.');
  }
  return suggested;
}

function getNearbyHospitalsForSpecialty(specialist) {
  if (!hospitalsData || !hospitalsData.hospitals) return [];
  const term = specialist ? specialist.toLowerCase().split(' ')[0] : 'general';

  let matched = hospitalsData.hospitals.filter(h => {
    return h.specialities.some(s =>
      s.toLowerCase().includes(term) ||
      s.toLowerCase().includes('general') ||
      s.toLowerCase().includes('emergency')
    );
  });

  if (matched.length === 0) {
    matched = hospitalsData.hospitals;
  }

  return matched.sort((a, b) => b.rating - a.rating).slice(0, 3);
}

// Helper to extract duration mentions from text (supporting digits & word numbers)
function extractDuration(text) {
  const numberWords = { 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10' };
  let normalized = text.toLowerCase();
  for (const [w, d] of Object.entries(numberWords)) {
    normalized = normalized.replace(new RegExp(`\\b${w}\\b`, 'g'), d);
  }

  const match = normalized.match(/(?:for|since|past|last|about|around)?\s*(\d+\s*(?:days?|weeks?|hours?|months?|years?|hrs?|mins?|minutes?))/i);
  if (match) return match[1];
  if (/yesterday/i.test(text)) return 'Since yesterday';
  if (/today/i.test(text)) return 'Since today';
  if (/few days|couple of days/i.test(text)) return 'A few days';
  if (/few weeks|couple of weeks/i.test(text)) return 'A few weeks';
  if (/few hours|couple of hours/i.test(text)) return 'A few hours';
  return null;
}

// Helper to extract severity mentions from text (scale 1-10 or descriptive)
function extractSeverity(text) {
  // First look for explicit scale like 7/10, 7 out of 10, scale 7, severity 7
  let match = text.match(/(?:severity|scale|rate|pain|level)\s*(?:is|of|:)?\s*(\b[1-9]\b|10)/i);
  if (match) {
    const num = parseInt(match[1]);
    return `${num}/10 (${num >= 7 ? 'Severe' : num >= 4 ? 'Moderate' : 'Mild'})`;
  }
  
  match = text.match(/(\b[1-9]\b|10)\s*(?:\/|\s*out of\s*)\s*10/i);
  if (match) {
    const num = parseInt(match[1]);
    return `${num}/10 (${num >= 7 ? 'Severe' : num >= 4 ? 'Moderate' : 'Mild'})`;
  }

  // Look for a standalone digit (1-10) not followed by duration units
  match = text.match(/(?:,\s*|\b(?:is|level|rate)\s*)(\b[1-9]\b|10)(?!\s*(?:day|days|week|weeks|hour|hours|month|months|year|years|am|pm|min|mins|st|nd|rd|th))/i);
  if (match) {
    const num = parseInt(match[1]);
    return `${num}/10 (${num >= 7 ? 'Severe' : num >= 4 ? 'Moderate' : 'Mild'})`;
  }

  if (/unbearable|extreme|very severe/i.test(text)) return '9-10/10 (Critical/Extreme)';
  if (/severe|high/i.test(text)) return '7-8/10 (Severe)';
  if (/moderate|medium/i.test(text)) return '4-6/10 (Moderate)';
  if (/mild|slight|low/i.test(text)) return '1-3/10 (Mild)';
  return null;
}

/**
 * Main analysis function — processes user input and returns diagnosis
 * @param {string} message - User's symptom description in natural language
 * @param {Array} previousMessages - Previous conversation messages for context
 * @returns {Object} Diagnosis result with conditions, risk, recommendations
 */
async function analyzeSymptoms(message, previousMessages = []) {
  // Simulate AI processing delay for realistic UX
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 600));

  // Count user messages in conversation history (including the current message)
  const userMessages = previousMessages.filter(m => m.role === 'user');
  const userMessagesCount = userMessages.length;

  // Combine full conversation context
  const fullContext = [
    ...userMessages.map(m => m.content),
    message,
  ].join(' ');

  // Extract symptoms, duration, and severity
  const matchedSymptoms = extractSymptoms(fullContext);
  const isEmergency = detectEmergency(fullContext);
  const duration = extractDuration(fullContext);
  const severity = extractSeverity(fullContext);

  // If no symptoms detected, return guidance
  if (matchedSymptoms.length === 0 && !isEmergency) {
    return {
      response: `I'd like to help you assess your health. Could you please describe your symptoms in more detail? For example:\n\n• What are you feeling? (e.g., headache, fever, cough, stomach pain)\n• Where is the discomfort located?\n• How long have you been experiencing this?\n• How severe is it on a scale of 1-10?\n\nThe more details you provide, the better I can assist you.`,
      diagnosis: null,
    };
  }

  // Calculate condition probabilities & risk level
  const conditions = calculateProbabilities(matchedSymptoms);
  const riskLevel = classifyRisk(conditions, isEmergency, matchedSymptoms);
  const suggestedSpecialist = conditionDetails[conditions[0]?.name]?.specialist || 'General Physician';

  // Check if assistant has already asked follow-up clarifying questions in this conversation
  const assistantMessages = previousMessages.filter(m => m.role === 'assistant');
  const hasAskedFollowUp = assistantMessages.some(m =>
    m.content.includes('tell me a bit more about your health condition') ||
    m.content.includes('How long have you been experiencing')
  );

  // Interactive Assessment: Only ask follow-up questions ONCE on the very first turn if user hasn't already provided duration/severity
  if (!isEmergency && userMessagesCount === 1 && !hasAskedFollowUp && (!duration || !severity)) {
    const followUpQuestions = generateFollowUpQuestions(conditions, matchedSymptoms);
    let response = `Thank you for sharing your symptoms. To help me understand your condition better and provide an accurate assessment, could you please tell me a bit more about your health condition?\n\n`;
    followUpQuestions.forEach((q, i) => {
      response += `${i + 1}. **${q}**\n`;
    });
    response += `\nOnce you provide these details, I will compile your personalized health analysis report.`;

    return {
      response,
      diagnosis: null
    };
  }

  // Final Diagnosis Report (triggered immediately after user answers or on emergencies / detailed first messages)
  const recommendations = generateRecommendations(conditions, riskLevel);
  const meds = suggestMedications(conditions);

  // Build response text
  let response = '';

  if (isEmergency || riskLevel === 'emergency') {
    response += `🚨 **EMERGENCY ALERT** — Based on your symptoms, this could be a serious medical emergency.\n\n`;
  }

  response += `### 🏥 AI Diagnostic Assessment Report\n\n`;

  // Patient Input Summary
  response += `**📋 Patient Case Summary:**\n`;
  const symptomNames = [...new Set(matchedSymptoms.map(s => s.symptom.charAt(0).toUpperCase() + s.symptom.slice(1)))];
  response += `• **Identified Symptoms:** ${symptomNames.join(', ')}\n`;
  if (duration) response += `• **Reported Duration:** ${duration}\n`;
  if (severity) response += `• **Reported Severity:** ${severity}\n`;
  response += `\n`;

  response += `**Top Possible Conditions:**\n`;
  conditions.forEach((c, i) => {
    const icon = i === 0 ? '🔴' : i === 1 ? '🟠' : '🟡';
    response += `${icon} **${c.name}** — ${c.probability}% match\n`;
    response += `   _${c.description}_\n\n`;
  });

  response += `**Risk Level:** ${riskLevel.toUpperCase()}\n\n`;

  response += `**💊 Suggested Over-the-Counter Medications:**\n`;
  meds.forEach(m => {
    response += `• ${m}\n`;
  });
  response += `\n*Note: These are standard OTC suggestions. Please read packaging and consult a pharmacist or doctor before taking any medication.*\n\n`;

  response += `**Recommendations:**\n`;
  recommendations.forEach(r => {
    response += `• ${r}\n`;
  });

  // Suggest nearby hospitals/doctors if risk is high or emergency
  if (riskLevel === 'high' || riskLevel === 'emergency') {
    response += `\n**🏢 Recommended Nearby Hospitals & Doctors:**\n`;
    response += `We recommend consulting a **${suggestedSpecialist}** immediately. Here are the top recommended nearby facilities:\n\n`;

    const hospitals = getNearbyHospitalsForSpecialty(suggestedSpecialist);
    hospitals.forEach(h => {
      response += `• **${h.name}** (${h.type})\n`;
      response += `  📍 Address: ${h.address}, ${h.city}\n`;
      response += `  📞 Phone: ${h.phone} (Emergency: ${h.emergency || '108'})\n`;
      response += `  ⭐ Rating: ${h.rating}/5 | Specialty: ${h.specialities.slice(0, 3).join(', ')}\n\n`;
    });
  }

  response += `\n---\n⚕️ _This is an AI-assisted assessment and not a substitute for professional medical advice. Please consult a qualified healthcare provider for diagnosis and treatment._`;

  return {
    response,
    diagnosis: {
      conditions,
      riskLevel,
      recommendations,
      suggestedSpecialist,
    },
  };
}

module.exports = { analyzeSymptoms };
