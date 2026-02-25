export type TimelineUnit = "days" | "weeks";

export type GigContentInput = {
  projectOverview: string;
  deliverables: string[];
  screeningQuestions: string[];
  timelineValue: number | null;
  timelineUnit: TimelineUnit;
};

export type GigContentParsed = {
  projectOverview: string;
  deliverables: string[];
  screeningQuestions: string[];
  timelineValue: number | null;
  timelineUnit: TimelineUnit;
};

const TITLE = "[FT-GIG-V1]";
const OVERVIEW = "## Project Overview";
const DELIVERABLES = "## Deliverables";
const TIMELINE = "## Timeline";
const QUESTIONS = "## Screening Questions";

const legacyOverviewMarker = "Project Overview:";
const legacyDeliverablesMarker = "Deliverables:";

function cleanLines(input: string) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function formatTimeline(value: number | null | undefined, unit: TimelineUnit = "weeks") {
  if (!value || value <= 0) return "Flexible";
  const label = value === 1 ? unit.slice(0, -1) : unit;
  return `${value} ${label}`;
}

export function composeGigDescription(input: GigContentInput) {
  const overview = input.projectOverview.trim();
  const deliverables = input.deliverables.map((x) => x.trim()).filter(Boolean);
  const questions = input.screeningQuestions.map((x) => x.trim()).filter(Boolean);
  const timeline = formatTimeline(input.timelineValue, input.timelineUnit);

  const deliverableLines = deliverables.length > 0
    ? deliverables.map((item) => `- ${item}`).join("\n")
    : "- Define deliverables";

  const questionLines = questions.length > 0
    ? questions.map((q, idx) => `${idx + 1}. ${q}`).join("\n")
    : "1. Share your relevant work samples.";

  return [
    TITLE,
    OVERVIEW,
    overview,
    "",
    DELIVERABLES,
    deliverableLines,
    "",
    TIMELINE,
    timeline,
    "",
    QUESTIONS,
    questionLines,
  ].join("\n");
}

function parseTimelineLine(line: string): { value: number | null; unit: TimelineUnit } {
  const raw = line.trim().toLowerCase();
  const match = raw.match(/(\d+)\s*(day|days|week|weeks)/i);
  if (!match) return { value: null, unit: "weeks" };

  const value = Number(match[1]);
  const unit: TimelineUnit = match[2].startsWith("day") ? "days" : "weeks";
  if (!value || Number.isNaN(value)) return { value: null, unit };
  return { value, unit };
}

function parseStructured(text: string): GigContentParsed {
  const lines = text.split("\n");
  let section: "overview" | "deliverables" | "timeline" | "questions" | null = null;

  const overviewLines: string[] = [];
  const deliverables: string[] = [];
  const questions: string[] = [];
  let timelineValue: number | null = null;
  let timelineUnit: TimelineUnit = "weeks";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line === TITLE) continue;

    if (line === OVERVIEW) {
      section = "overview";
      continue;
    }
    if (line === DELIVERABLES) {
      section = "deliverables";
      continue;
    }
    if (line === TIMELINE) {
      section = "timeline";
      continue;
    }
    if (line === QUESTIONS) {
      section = "questions";
      continue;
    }

    if (section === "overview") {
      overviewLines.push(line);
      continue;
    }

    if (section === "deliverables") {
      deliverables.push(line.replace(/^[-*]\s*/, ""));
      continue;
    }

    if (section === "timeline") {
      const parsedTimeline = parseTimelineLine(line);
      timelineValue = parsedTimeline.value;
      timelineUnit = parsedTimeline.unit;
      continue;
    }

    if (section === "questions") {
      questions.push(line.replace(/^\d+\.\s*/, ""));
      continue;
    }
  }

  return {
    projectOverview: overviewLines.join(" ").trim(),
    deliverables: deliverables.filter(Boolean),
    screeningQuestions: questions.filter(Boolean),
    timelineValue,
    timelineUnit,
  };
}

function parseLegacy(text: string): GigContentParsed {
  const raw = text.trim();
  if (!raw) {
    return {
      projectOverview: "",
      deliverables: [],
      screeningQuestions: [],
      timelineValue: null,
      timelineUnit: "weeks",
    };
  }

  const overviewIndex = raw.indexOf(legacyOverviewMarker);
  const deliverablesIndex = raw.indexOf(legacyDeliverablesMarker);

  if (overviewIndex === -1 && deliverablesIndex === -1) {
    return {
      projectOverview: raw,
      deliverables: [],
      screeningQuestions: [],
      timelineValue: null,
      timelineUnit: "weeks",
    };
  }

  const overview = overviewIndex >= 0
    ? raw
        .slice(
          overviewIndex + legacyOverviewMarker.length,
          deliverablesIndex >= 0 ? deliverablesIndex : raw.length,
        )
        .trim()
    : "";

  const deliverableBlock = deliverablesIndex >= 0
    ? raw.slice(deliverablesIndex + legacyDeliverablesMarker.length).trim()
    : "";

  const deliverables = cleanLines(deliverableBlock)
    .map((line) => line.replace(/^[-*]\s*/, ""));

  return {
    projectOverview: overview,
    deliverables,
    screeningQuestions: [],
    timelineValue: null,
    timelineUnit: "weeks",
  };
}

export function parseGigDescription(description: string | null | undefined): GigContentParsed {
  const text = String(description || "").trim();
  if (!text) {
    return {
      projectOverview: "",
      deliverables: [],
      screeningQuestions: [],
      timelineValue: null,
      timelineUnit: "weeks",
    };
  }

  if (text.includes(TITLE) || text.includes(OVERVIEW)) {
    return parseStructured(text);
  }

  return parseLegacy(text);
}
