// ─────────────────────────────────────────────────────────────────────────────
// Freelancer Tabs — Mock Data
// Realistic mock objects shaped exactly like the real API responses.
// Sorted by created_at DESC (newest first) to match backend sort order.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  GigWithFounderAndTags,
  FreelancerStats,
  Proposal,
  Tag,
  FounderInfo,
} from "./types";
import { DEFAULT_PAGE_SIZE } from "./config";

// ======================== Shared Entities ========================

const TAGS: Record<string, Tag> = {
  uiDesign: { id: "tag-001", slug: "ui-design", label: "UI Design" },
  reactNative: { id: "tag-002", slug: "react-native", label: "React Native" },
  figma: { id: "tag-003", slug: "figma", label: "Figma" },
  backend: { id: "tag-004", slug: "backend", label: "Backend" },
  nodejs: { id: "tag-005", slug: "nodejs", label: "Node.js" },
  python: { id: "tag-006", slug: "python", label: "Python" },
  ml: { id: "tag-007", slug: "machine-learning", label: "Machine Learning" },
  devops: { id: "tag-008", slug: "devops", label: "DevOps" },
  branding: { id: "tag-009", slug: "branding", label: "Branding" },
  productUx: { id: "tag-010", slug: "product-ux", label: "Product UX" },
};

const FOUNDERS: Record<string, FounderInfo> = {
  priya: {
    id: "founder-001",
    display_name: "Priya Sharma",
    avatar_url: null,
    company_name: "FinLeap Technologies",
  },
  rahul: {
    id: "founder-002",
    display_name: "Rahul Mehta",
    avatar_url: null,
    company_name: "GreenRoute Logistics",
  },
  ananya: {
    id: "founder-003",
    display_name: "Ananya Iyer",
    avatar_url: null,
    company_name: "EduBridge AI",
  },
  vikram: {
    id: "founder-004",
    display_name: "Vikram Desai",
    avatar_url: null,
    company_name: "HealthStack",
  },
  neha: {
    id: "founder-005",
    display_name: "Neha Kapoor",
    avatar_url: null,
    company_name: "StyleLoop",
  },
};

// ======================== Mock Gigs ========================
// Ordered by created_at DESC (newest first)

export const MOCK_GIGS: GigWithFounderAndTags[] = [
  {
    id: "gig-001",
    founder_id: FOUNDERS.priya.id,
    title: "Redesign Fintech Dashboard UI",
    description:
      "We need a complete redesign of our fintech dashboard. The current design is outdated and not mobile-responsive. Looking for someone experienced in financial product design with a clean, modern aesthetic. Must deliver Figma files with component library.",
    budget_type: "fixed",
    budget_min: 45000,
    budget_max: 60000,
    experience_level: "senior",
    startup_stage: "funded",
    status: "open",
    proposals_count: 7,
    location_text: "Mumbai, MH",
    is_remote: true,
    published_at: "2026-02-20T10:00:00.000Z",
    created_at: "2026-02-20T09:30:00.000Z",
    updated_at: "2026-02-20T10:00:00.000Z",
    tags: [TAGS.uiDesign, TAGS.figma, TAGS.productUx],
    founder: FOUNDERS.priya,
  },
  {
    id: "gig-002",
    founder_id: FOUNDERS.rahul.id,
    title: "Build React Native Driver App",
    description:
      "Looking for an experienced React Native developer to build a driver-facing mobile app for our logistics platform. Features include real-time GPS tracking, route optimization display, delivery status updates, and push notifications. Backend APIs are ready.",
    budget_type: "fixed",
    budget_min: 80000,
    budget_max: 120000,
    experience_level: "senior",
    startup_stage: "revenue",
    status: "open",
    proposals_count: 12,
    location_text: "Bengaluru, KA",
    is_remote: true,
    published_at: "2026-02-19T14:00:00.000Z",
    created_at: "2026-02-19T13:45:00.000Z",
    updated_at: "2026-02-19T14:00:00.000Z",
    tags: [TAGS.reactNative, TAGS.backend],
    founder: FOUNDERS.rahul,
  },
  {
    id: "gig-003",
    founder_id: FOUNDERS.ananya.id,
    title: "ML Model for Student Engagement Scoring",
    description:
      "We are building an ed-tech platform and need a machine learning engineer to develop a student engagement prediction model. You will work with our existing dataset of 50K+ student interactions. Deliverables include trained model, API endpoint, and documentation.",
    budget_type: "hourly",
    budget_min: 1500,
    budget_max: 2500,
    experience_level: "senior",
    startup_stage: "mvp",
    status: "open",
    proposals_count: 4,
    location_text: "Chennai, TN",
    is_remote: true,
    published_at: "2026-02-18T08:00:00.000Z",
    created_at: "2026-02-18T07:30:00.000Z",
    updated_at: "2026-02-18T08:00:00.000Z",
    tags: [TAGS.python, TAGS.ml],
    founder: FOUNDERS.ananya,
  },
  {
    id: "gig-004",
    founder_id: FOUNDERS.vikram.id,
    title: "Telemedicine App UI/UX Overhaul",
    description:
      "HealthStack needs a design overhaul for our telemedicine application. Current patient flow has a 40% drop-off rate. We need improved onboarding, consultation booking, and video call experience design. User research data available.",
    budget_type: "fixed",
    budget_min: 35000,
    budget_max: 50000,
    experience_level: "mid",
    startup_stage: "revenue",
    status: "in_progress",
    proposals_count: 9,
    location_text: "Hyderabad, TS",
    is_remote: true,
    published_at: "2026-02-15T11:00:00.000Z",
    created_at: "2026-02-15T10:30:00.000Z",
    updated_at: "2026-02-18T16:00:00.000Z",
    tags: [TAGS.uiDesign, TAGS.productUx, TAGS.figma],
    founder: FOUNDERS.vikram,
  },
  {
    id: "gig-005",
    founder_id: FOUNDERS.neha.id,
    title: "E-Commerce Brand Identity Design",
    description:
      "StyleLoop is a D2C fashion brand launching next month. We need complete brand identity: logo, color palette, typography, packaging design, and social media templates. Must be trendy and appeal to Gen-Z audience.",
    budget_type: "fixed",
    budget_min: 25000,
    budget_max: 40000,
    experience_level: "mid",
    startup_stage: "idea",
    status: "in_progress",
    proposals_count: 15,
    location_text: "Delhi, DL",
    is_remote: true,
    published_at: "2026-02-14T09:00:00.000Z",
    created_at: "2026-02-14T08:30:00.000Z",
    updated_at: "2026-02-17T12:00:00.000Z",
    tags: [TAGS.branding, TAGS.uiDesign],
    founder: FOUNDERS.neha,
  },
  {
    id: "gig-006",
    founder_id: FOUNDERS.priya.id,
    title: "Node.js Microservice for Payment Processing",
    description:
      "Need a Node.js developer to build a payment processing microservice integrating Razorpay and UPI. Must handle webhook events, idempotent retries, and generate settlement reports. Deployment on GCP Cloud Run.",
    budget_type: "hourly",
    budget_min: 1200,
    budget_max: 1800,
    experience_level: "senior",
    startup_stage: "funded",
    status: "completed",
    proposals_count: 6,
    location_text: "Mumbai, MH",
    is_remote: true,
    published_at: "2026-01-25T10:00:00.000Z",
    created_at: "2026-01-25T09:00:00.000Z",
    updated_at: "2026-02-10T18:00:00.000Z",
    tags: [TAGS.nodejs, TAGS.backend, TAGS.devops],
    founder: FOUNDERS.priya,
  },
  {
    id: "gig-007",
    founder_id: FOUNDERS.rahul.id,
    title: "CI/CD Pipeline Setup for Mobile App",
    description:
      "Set up a complete CI/CD pipeline for our React Native app using GitHub Actions. Must include: automated testing, code signing for iOS and Android, staging and production lanes, and Fastlane integration.",
    budget_type: "fixed",
    budget_min: 15000,
    budget_max: 25000,
    experience_level: "mid",
    startup_stage: "revenue",
    status: "completed",
    proposals_count: 8,
    location_text: "Bengaluru, KA",
    is_remote: true,
    published_at: "2026-01-20T12:00:00.000Z",
    created_at: "2026-01-20T11:30:00.000Z",
    updated_at: "2026-02-05T14:00:00.000Z",
    tags: [TAGS.devops, TAGS.reactNative],
    founder: FOUNDERS.rahul,
  },
  {
    id: "gig-008",
    founder_id: FOUNDERS.ananya.id,
    title: "Landing Page for EduBridge Beta Launch",
    description:
      "Design and develop a responsive landing page for our ed-tech beta launch. Must include: hero section, feature highlights, testimonials carousel, waitlist signup with email validation, and analytics integration.",
    budget_type: "fixed",
    budget_min: 12000,
    budget_max: 18000,
    experience_level: "junior",
    startup_stage: "mvp",
    status: "draft",
    proposals_count: 0,
    location_text: "Chennai, TN",
    is_remote: true,
    published_at: null,
    created_at: "2026-02-21T06:00:00.000Z",
    updated_at: "2026-02-21T06:00:00.000Z",
    tags: [TAGS.uiDesign, TAGS.reactNative],
    founder: FOUNDERS.ananya,
  },
  {
    id: "gig-009",
    founder_id: FOUNDERS.vikram.id,
    title: "Health Data Analytics Dashboard",
    description:
      "Build an analytics dashboard for healthcare providers to visualize patient data trends. Tech stack: React, D3.js, and a Python FastAPI backend. Must comply with basic data privacy guidelines.",
    budget_type: "fixed",
    budget_min: 55000,
    budget_max: 75000,
    experience_level: "senior",
    startup_stage: "revenue",
    status: "cancelled",
    proposals_count: 3,
    location_text: "Hyderabad, TS",
    is_remote: false,
    published_at: "2026-01-10T10:00:00.000Z",
    created_at: "2026-01-10T09:30:00.000Z",
    updated_at: "2026-01-28T10:00:00.000Z",
    tags: [TAGS.python, TAGS.uiDesign, TAGS.backend],
    founder: FOUNDERS.vikram,
  },
];

// ======================== Mock Stats ========================

export const MOCK_STATS: FreelancerStats = {
  earnings_mtd: 8450,
  active_projects: 4,
  earnings_growth_pct: 12,
};

// ======================== Mock Proposals ========================

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: "proposal-001",
    gig_id: "gig-004",
    freelancer_id: "mock-freelancer-001",
    cover_letter:
      "I have 3+ years of experience in healthcare UI design. I previously redesigned a patient portal for Apollo Hospitals which improved engagement by 35%. I would love to bring that expertise to HealthStack.",
    proposed_amount: 42000,
    estimated_days: 21,
    status: "accepted",
    created_at: "2026-02-16T10:00:00.000Z",
    updated_at: "2026-02-17T09:00:00.000Z",
  },
  {
    id: "proposal-002",
    gig_id: "gig-005",
    freelancer_id: "mock-freelancer-001",
    cover_letter:
      "As a brand designer specializing in D2C fashion, I have worked with 5 emerging fashion brands. My design language is modern, minimalist, and Gen-Z friendly. Portfolio attached for reference.",
    proposed_amount: 32000,
    estimated_days: 14,
    status: "accepted",
    created_at: "2026-02-15T08:00:00.000Z",
    updated_at: "2026-02-15T16:00:00.000Z",
  },
  {
    id: "proposal-003",
    gig_id: "gig-001",
    freelancer_id: "mock-freelancer-001",
    cover_letter:
      "I specialize in fintech dashboard design with experience at two YC-backed startups. My approach focuses on data density without sacrificing usability. I can deliver within 3 weeks.",
    proposed_amount: 55000,
    estimated_days: 21,
    status: "pending",
    created_at: "2026-02-20T12:00:00.000Z",
    updated_at: "2026-02-20T12:00:00.000Z",
  },
  {
    id: "proposal-004",
    gig_id: "gig-002",
    freelancer_id: "mock-freelancer-001",
    cover_letter:
      "I have shipped 4 React Native apps to production, including a logistics tracking app for a Series A startup. I am comfortable with maps, real-time updates, and push notifications.",
    proposed_amount: 95000,
    estimated_days: 35,
    status: "pending",
    created_at: "2026-02-19T16:00:00.000Z",
    updated_at: "2026-02-19T16:00:00.000Z",
  },
];

// ======================== Cursor Pagination Helper ========================

/**
 * Simulates cursor-based pagination over an in-memory array.
 * Items must be pre-sorted by created_at DESC.
 * Cursor format: Base64("created_at|id").
 */
export function mockCursorPaginate<
  T extends { id: string; created_at: string },
>(
  items: T[],
  cursor?: string,
  limit: number = DEFAULT_PAGE_SIZE,
): { items: T[]; next_cursor: string | null } {
  let startIndex = 0;

  if (cursor) {
    const decoded = atob(cursor);
    const separatorIndex = decoded.indexOf("|");
    const cursorDate = decoded.slice(0, separatorIndex);
    const cursorId = decoded.slice(separatorIndex + 1);

    startIndex = items.findIndex(
      (item) =>
        item.created_at < cursorDate ||
        (item.created_at === cursorDate && item.id < cursorId),
    );
    if (startIndex === -1) startIndex = items.length;
  }

  const page = items.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < items.length;
  const lastItem = page[page.length - 1];

  const next_cursor =
    hasMore && lastItem
      ? btoa(`${lastItem.created_at}|${lastItem.id}`)
      : null;

  return { items: page, next_cursor };
}
