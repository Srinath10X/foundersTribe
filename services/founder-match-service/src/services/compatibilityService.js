function commitmentAligned(a, b) {
  if (a === "full_time" && b === "full_time") return true;
  if (a === "part_time" && b === "part_time") return true;
  if (a === "exploring" || b === "exploring") return true;
  return false;
}

function roleComplement(roleA, lookingForA, roleB, lookingForB) {
  const roleMatchesLookingFor = (role, lookingFor) => {
    if (lookingFor === "either") return true;
    if (lookingFor === "tech") return role === "tech";
    if (lookingFor === "business") return role === "business" || role === "growth";
    return false;
  };
  return roleMatchesLookingFor(roleA, lookingForB) && roleMatchesLookingFor(roleB, lookingForA);
}

function stageAligned(stageA, stageB) {
  if (stageA === stageB) return true;
  const order = { idea: 1, mvp: 2, revenue: 3 };
  return Math.abs(order[stageA] - order[stageB]) <= 1;
}

function computeSkillScore(skillsA, skillsB) {
  const setA = new Set(skillsA || []);
  const setB = new Set(skillsB || []);
  const overlap = [...setA].filter((s) => setB.has(s)).length;
  const complement = Math.max(setA.size, setB.size) - overlap;
  let score = 0;
  if (overlap > 0) score += 7;
  if (complement > 0) score += 8;
  return { score, overlap, complement };
}

export function computeCompatibility(viewerProfile, targetProfile, viewerSkills = [], targetSkills = []) {
  let score = 0;
  const breakdown = {};
  const roleComp = roleComplement(
    viewerProfile.role,
    viewerProfile.looking_for,
    targetProfile.role,
    targetProfile.looking_for,
  );
  if (roleComp) {
    score += 30;
    breakdown.roleComplement = 30;
  } else {
    breakdown.roleComplement = 0;
  }
  const industriesA = new Set(viewerProfile.industry_tags || []);
  const industriesB = new Set(targetProfile.industry_tags || []);
  const industryOverlap = [...industriesA].filter((t) => industriesB.has(t)).length;
  if (industryOverlap > 0) {
    const industryScore = 20;
    score += industryScore;
    breakdown.industryOverlap = industryScore;
  } else {
    breakdown.industryOverlap = 0;
  }
  const commitmentOk = commitmentAligned(viewerProfile.commitment, targetProfile.commitment);
  if (commitmentOk) {
    score += 20;
    breakdown.commitmentAlignment = 20;
  } else {
    breakdown.commitmentAlignment = 0;
  }
  const stageOk = stageAligned(viewerProfile.stage, targetProfile.stage);
  if (stageOk) {
    score += 15;
    breakdown.stageAlignment = 15;
  } else {
    breakdown.stageAlignment = 0;
  }
  const skillMetrics = computeSkillScore(viewerSkills, targetSkills);
  score += skillMetrics.score;
  breakdown.skillComplement = skillMetrics.score;
  const finalScore = Math.min(100, score);
  return {
    score: finalScore,
    breakdown,
    commitmentAligned: commitmentOk,
    roleComplement: roleComp,
    stageAligned: stageOk,
    skillScore: skillMetrics.score,
    industryOverlap,
  };
}

