export const PROJECT_TYPE_LABELS = {
  CIVIL_ENGINEERING: "Civil Engineering",
  LANDSCAPE_ARCHITECTURE: "Landscape Architecture",
  STRUCTURAL_ENGINEERING: "Structural Engineering",
  ENVIRONMENTAL: "Environmental",
  CONSTRUCTION_OBSERVATION: "Construction Observation",
} as const;

export const PROJECT_STATUS_LABELS = {
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
} as const;

export const VISIT_STATUS_LABELS = {
  DRAFT: "Draft",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
} as const;

export const CATEGORY_LABELS = {
  GENERAL: "General Observation",
  EXISTING_CONDITION: "Existing Condition",
  DEFICIENCY: "Deficiency",
  SAFETY_ISSUE: "Safety Issue",
  CONSTRUCTION_ISSUE: "Construction Issue",
  DRAINAGE: "Drainage",
  GRADING: "Grading",
  IRRIGATION: "Irrigation",
  PLANT_VEGETATION: "Plant / Vegetation",
  TREE: "Tree",
  UTILITY: "Utility",
  MATERIAL: "Material",
  OTHER: "Other",
} as const;

export const PRIORITY_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
} as const;

export const OBSERVATION_STATUS_LABELS = {
  OPEN: "Open",
  FLAGGED: "Flagged",
  RESOLVED: "Resolved",
} as const;

export const ISSUE_STATUS_LABELS = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
} as const;

export const TASK_STATUS_LABELS = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
} as const;

export type ProjectType = keyof typeof PROJECT_TYPE_LABELS;
export type ProjectStatus = keyof typeof PROJECT_STATUS_LABELS;
export type SiteVisitStatus = keyof typeof VISIT_STATUS_LABELS;
export type ObservationCategory = keyof typeof CATEGORY_LABELS;
export type Priority = keyof typeof PRIORITY_LABELS;
export type ObservationStatus = keyof typeof OBSERVATION_STATUS_LABELS;
export type IssueStatus = keyof typeof ISSUE_STATUS_LABELS;
export type TaskStatus = keyof typeof TASK_STATUS_LABELS;

export function getLabel(labels: Record<string, string>, value: string) {
  return labels[value] ?? value.replaceAll("_", " ");
}

export const PROJECT_TYPES = Object.keys(PROJECT_TYPE_LABELS) as ProjectType[];
export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];
export const CATEGORIES = Object.keys(CATEGORY_LABELS) as ObservationCategory[];
export const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];
export const OBSERVATION_STATUSES = Object.keys(OBSERVATION_STATUS_LABELS) as ObservationStatus[];
export const ISSUE_STATUSES = Object.keys(ISSUE_STATUS_LABELS) as IssueStatus[];
export const TASK_STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];
export const VISIT_STATUSES = Object.keys(VISIT_STATUS_LABELS) as SiteVisitStatus[];
