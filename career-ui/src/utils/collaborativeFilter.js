/**
 * collaborativeFilter.js
 *
 * Item-based Collaborative Filtering for job recommendations.
 *
 * Strategy:
 *  1. Build a skill-vector for every job (binary presence of each skill).
 *  2. For each job the user has interacted with (saved + applied), compute
 *     cosine similarity against all other jobs.
 *  3. Aggregate scores, weight applied > saved (stronger signal).
 *  4. Blend with the backend recommender score (passed in as `backendScores`)
 *     so the CF signal augments, not replaces, the semantic engine.
 *  5. Return the top-N jobs sorted by blended score, excluding jobs the user
 *     already interacted with.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cosine similarity between two sparse skill maps {skill: 1} */
function cosineSimilarity(vecA, vecB) {
  const keysA = Object.keys(vecA);
  if (keysA.length === 0) return 0;

  let dot = 0;
  for (const k of keysA) {
    if (vecB[k]) dot += 1;
  }

  const magA = Math.sqrt(keysA.length);
  const magB = Math.sqrt(Object.keys(vecB).length);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/** Build a skill-vector map from a skills array */
function toVec(skillsArray) {
  const vec = {};
  for (const s of skillsArray || []) {
    vec[s.toLowerCase().trim()] = 1;
  }
  return vec;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Run item-based CF.
 *
 * @param {Object} params
 * @param {Array}  params.allJobs         – full job list from /jobs API [{id, title, company, skills, domain, ...}]
 * @param {Array}  params.savedJobIds     – IDs the user saved
 * @param {Array}  params.appliedJobIds   – IDs the user applied to
 * @param {Object} params.backendScores   – optional map { jobId: float } from the semantic recommender
 * @param {number} params.topN            – how many to return (default 8)
 * @param {number} params.cfWeight        – weight for CF score in blend (0–1, default 0.45)
 * @param {number} params.backendWeight   – weight for backend score in blend (0–1, default 0.55)
 * @returns {Array} top-N job objects augmented with { cfScore, blendedScore, cfReasonSkills }
 */
export function collaborativeFilter({
  allJobs = [],
  savedJobIds = [],
  appliedJobIds = [],
  backendScores = {},
  topN = 8,
  cfWeight = 0.45,
  backendWeight = 0.55,
}) {
  if (allJobs.length === 0) return [];

  const savedSet   = new Set(savedJobIds.map(String));
  const appliedSet = new Set(appliedJobIds.map(String));
  const interactedSet = new Set([...savedSet, ...appliedSet]);

  if (interactedSet.size === 0) return [];

  // Build skill vectors for all jobs
  const jobVecs = {};
  for (const job of allJobs) {
    jobVecs[String(job.id)] = toVec(job.skills || []);
  }

  // Collect interaction jobs with weights: applied = 2.0, saved = 1.0
  const interactionWeights = {};
  for (const id of appliedSet) interactionWeights[id] = 2.0;
  for (const id of savedSet) {
    if (!interactionWeights[id]) interactionWeights[id] = 1.0;
  }

  // Accumulate CF scores for every non-interacted job
  const cfScores = {};        // jobId -> accumulated weighted similarity
  const cfReasonSkills = {};  // jobId -> top overlapping skills

  for (const [interactedId, weight] of Object.entries(interactionWeights)) {
    const vecI = jobVecs[interactedId];
    if (!vecI || Object.keys(vecI).length === 0) continue;

    for (const job of allJobs) {
      const jid = String(job.id);
      if (interactedSet.has(jid)) continue; // skip already-seen jobs

      const vecJ = jobVecs[jid];
      if (!vecJ || Object.keys(vecJ).length === 0) continue;

      const sim = cosineSimilarity(vecI, vecJ);
      if (sim === 0) continue;

      cfScores[jid] = (cfScores[jid] || 0) + sim * weight;

      // Track the skills that drove the match
      if (!cfReasonSkills[jid]) cfReasonSkills[jid] = {};
      for (const skill of Object.keys(vecI)) {
        if (vecJ[skill]) {
          cfReasonSkills[jid][skill] = (cfReasonSkills[jid][skill] || 0) + weight;
        }
      }
    }
  }

  if (Object.keys(cfScores).length === 0) return [];

  // Normalise CF scores to [0, 1]
  const maxCF = Math.max(...Object.values(cfScores));
  const normCF = {};
  for (const [id, score] of Object.entries(cfScores)) {
    normCF[id] = maxCF > 0 ? score / maxCF : 0;
  }

  // Normalise backend scores to [0, 1]
  const bScoreValues = Object.values(backendScores);
  const maxBS = bScoreValues.length ? Math.max(...bScoreValues) : 0;
  const normBS = {};
  for (const [id, score] of Object.entries(backendScores)) {
    normBS[id] = maxBS > 0 ? score / maxBS : 0;
  }

  // Build blended score for candidates
  const candidateIds = Object.keys(cfScores);
  const scored = candidateIds.map(jid => {
    const cf  = normCF[jid]  || 0;
    const bs  = normBS[jid]  || 0;
    const blended = cf * cfWeight + bs * backendWeight;

    // Top 3 reason skills by accumulated weight
    const reasonEntries = Object.entries(cfReasonSkills[jid] || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s);

    return { jid, cfScore: cf, backendScore: bs, blendedScore: blended, reasonSkills: reasonEntries };
  });

  scored.sort((a, b) => b.blendedScore - a.blendedScore);
  const topIds = scored.slice(0, topN);

  // Map back to full job objects
  const jobMap = {};
  for (const job of allJobs) jobMap[String(job.id)] = job;

  return topIds
    .map(({ jid, cfScore, blendedScore, reasonSkills }) => ({
      ...jobMap[jid],
      cfScore: Math.round(cfScore * 100) / 100,
      blendedScore: Math.round(blendedScore * 100) / 100,
      cfReasonSkills: reasonSkills,
    }))
    .filter(Boolean);
}

/**
 * Derive the user's implicit interest profile from their interactions.
 * Returns { topDomains, topSkills } based on saved + applied jobs.
 */
export function deriveUserProfile(allJobs, savedJobIds, appliedJobIds) {
  const savedSet   = new Set(savedJobIds.map(String));
  const appliedSet = new Set(appliedJobIds.map(String));

  const domainScore = {};
  const skillScore  = {};

  for (const job of allJobs) {
    const jid = String(job.id);
    const w = appliedSet.has(jid) ? 2 : savedSet.has(jid) ? 1 : 0;
    if (w === 0) continue;

    const domain = job.domain || '';
    domainScore[domain] = (domainScore[domain] || 0) + w;

    for (const skill of job.skills || []) {
      const s = skill.toLowerCase();
      skillScore[s] = (skillScore[s] || 0) + w;
    }
  }

  const topDomains = Object.entries(domainScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);

  const topSkills = Object.entries(skillScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([s]) => s);

  return { topDomains, topSkills };
}
