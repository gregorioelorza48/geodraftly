import { Badge } from "@/components/ui";
import {
  ISSUE_STATUS_LABELS,
  OBSERVATION_STATUS_LABELS,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
  VISIT_STATUS_LABELS,
  getLabel,
} from "@/lib/labels";

function toneForPriority(priority: string) {
  if (priority === "CRITICAL" || priority === "HIGH") return "bad" as const;
  if (priority === "MEDIUM") return "warn" as const;
  return "neutral" as const;
}

export function PriorityBadge({ value }: { value: string }) {
  return <Badge tone={toneForPriority(value)}>{getLabel(PRIORITY_LABELS, value)}</Badge>;
}

export function ProjectStatusBadge({ value }: { value: string }) {
  return (
    <Badge tone={value === "ACTIVE" ? "good" : value === "ON_HOLD" ? "warn" : "neutral"}>
      {getLabel(PROJECT_STATUS_LABELS, value)}
    </Badge>
  );
}

export function VisitStatusBadge({ value }: { value: string }) {
  return (
    <Badge tone={value === "COMPLETED" ? "good" : value === "IN_PROGRESS" ? "brass" : "neutral"}>
      {getLabel(VISIT_STATUS_LABELS, value)}
    </Badge>
  );
}

export function ObservationStatusBadge({ value }: { value: string }) {
  return (
    <Badge tone={value === "RESOLVED" ? "good" : value === "FLAGGED" ? "bad" : "neutral"}>
      {getLabel(OBSERVATION_STATUS_LABELS, value)}
    </Badge>
  );
}

export function IssueStatusBadge({ value }: { value: string }) {
  return (
    <Badge tone={value === "RESOLVED" || value === "CLOSED" ? "good" : value === "IN_PROGRESS" ? "warn" : "neutral"}>
      {getLabel(ISSUE_STATUS_LABELS, value)}
    </Badge>
  );
}

export function TaskStatusBadge({ value }: { value: string }) {
  return (
    <Badge tone={value === "DONE" ? "good" : value === "IN_PROGRESS" ? "warn" : "neutral"}>
      {getLabel(TASK_STATUS_LABELS, value)}
    </Badge>
  );
}
