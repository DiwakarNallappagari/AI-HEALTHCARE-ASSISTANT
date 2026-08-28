/**
 * Drug Interaction Service
 * JSON-based drug interaction graph with fuzzy search and severity classification
 */
const drugData = require('../data/drugInteractions.json');

// Build in-memory lookup maps for fast access
const drugMap = new Map();
const interactionGraph = new Map();

// Initialize drug maps on module load
function initializeDrugMaps() {
  for (const drug of drugData.drugs) {
    const key = drug.name.toLowerCase();
    drugMap.set(key, drug);

    // Build bidirectional interaction graph
    if (!interactionGraph.has(key)) {
      interactionGraph.set(key, new Map());
    }

    for (const interaction of drug.interactions) {
      const targetKey = interaction.drug.toLowerCase();
      interactionGraph.get(key).set(targetKey, {
        severity: interaction.severity,
        description: interaction.description,
      });

      // Ensure bidirectional
      if (!interactionGraph.has(targetKey)) {
        interactionGraph.set(targetKey, new Map());
      }
      if (!interactionGraph.get(targetKey).has(key)) {
        interactionGraph.get(targetKey).set(key, {
          severity: interaction.severity,
          description: interaction.description,
        });
      }
    }
  }
}

initializeDrugMaps();

/**
 * Fuzzy search for drugs by name
 * @param {string} query - Partial drug name
 * @returns {Array} Matching drugs
 */
function searchDrugs(query) {
  const normalizedQuery = query.toLowerCase().trim();
  const results = [];

  for (const drug of drugData.drugs) {
    const name = drug.name.toLowerCase();
    const generic = drug.genericName.toLowerCase();

    // Match on name or generic name
    if (name.includes(normalizedQuery) || generic.includes(normalizedQuery)) {
      results.push({
        name: drug.name,
        genericName: drug.genericName,
        category: drug.category,
      });
    }
  }

  return results.sort((a, b) => {
    // Exact match first, then starts-with, then contains
    const aExact = a.name.toLowerCase() === normalizedQuery;
    const bExact = b.name.toLowerCase() === normalizedQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const aStarts = a.name.toLowerCase().startsWith(normalizedQuery);
    const bStarts = b.name.toLowerCase().startsWith(normalizedQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return a.name.localeCompare(b.name);
  });
}

/**
 * Get detailed drug information
 * @param {string} drugName - Drug name
 * @returns {Object|null} Drug details or null
 */
function getDrugDetails(drugName) {
  const key = drugName.toLowerCase().trim();
  return drugMap.get(key) || null;
}

/**
 * Check interactions between multiple drugs
 * @param {Array<string>} drugs - List of drug names to check
 * @returns {Object} Interaction results with severity and details
 */
function checkInteractions(drugs) {
  const normalizedDrugs = drugs.map(d => d.toLowerCase().trim());
  const interactions = [];
  const checkedPairs = new Set();

  // Severity priority for overall risk
  const severityOrder = { contraindicated: 5, major: 4, moderate: 3, minor: 2, none: 1 };

  // Check all pairs
  for (let i = 0; i < normalizedDrugs.length; i++) {
    for (let j = i + 1; j < normalizedDrugs.length; j++) {
      const drugA = normalizedDrugs[i];
      const drugB = normalizedDrugs[j];
      const pairKey = [drugA, drugB].sort().join('|');

      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      // Look up interaction
      const interaction = interactionGraph.get(drugA)?.get(drugB);

      if (interaction) {
        interactions.push({
          drugA: drugs[i],
          drugB: drugs[j],
          severity: interaction.severity,
          description: interaction.description,
        });
      }
    }
  }

  // Sort by severity (most severe first)
  interactions.sort((a, b) =>
    (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
  );

  // Determine overall risk level
  let overallRisk = 'none';
  if (interactions.length > 0) {
    overallRisk = interactions[0].severity;
  }

  // Generate summary
  const summary = generateInteractionSummary(interactions, drugs);

  return {
    drugs: drugs.map(d => {
      const details = getDrugDetails(d);
      return {
        name: d,
        found: !!details,
        category: details?.category || 'Unknown',
      };
    }),
    interactions,
    overallRisk,
    totalInteractions: interactions.length,
    summary,
  };
}

/**
 * Generate human-readable interaction summary
 */
function generateInteractionSummary(interactions, drugs) {
  if (interactions.length === 0) {
    return `✅ No known interactions found between ${drugs.join(', ')}. However, always inform your healthcare provider about all medications you are taking.`;
  }

  const contraindicated = interactions.filter(i => i.severity === 'contraindicated');
  const major = interactions.filter(i => i.severity === 'major');
  const moderate = interactions.filter(i => i.severity === 'moderate');
  const minor = interactions.filter(i => i.severity === 'minor');

  let summary = `Found ${interactions.length} interaction(s) between your medications:\n\n`;

  if (contraindicated.length > 0) {
    summary += `🚫 **CONTRAINDICATED (${contraindicated.length}):** These drugs should NEVER be taken together.\n`;
  }
  if (major.length > 0) {
    summary += `🔴 **Major (${major.length}):** Potentially dangerous interactions requiring medical attention.\n`;
  }
  if (moderate.length > 0) {
    summary += `🟠 **Moderate (${moderate.length}):** May require dosage adjustment or monitoring.\n`;
  }
  if (minor.length > 0) {
    summary += `🟡 **Minor (${minor.length}):** Generally low risk, but be aware.\n`;
  }

  summary += '\n⚕️ _Please consult your doctor or pharmacist before making changes to your medications._';

  return summary;
}

/**
 * Get all available drugs in the database
 * @returns {Array} List of drug names
 */
function getAllDrugs() {
  return drugData.drugs.map(d => ({
    name: d.name,
    genericName: d.genericName,
    category: d.category,
  }));
}

module.exports = {
  searchDrugs,
  getDrugDetails,
  checkInteractions,
  getAllDrugs,
};
