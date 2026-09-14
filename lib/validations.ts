import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Enter your name").max(80),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(2, "Enter a firm name").max(120),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const organizationSchema = z.object({
  name: z.string().min(2).max(120),
  legalName: z.string().max(160).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  website: z.string().max(160).optional().or(z.literal("")),
  address: z.string().max(240).optional().or(z.literal("")),
});

export const projectSchema = z.object({
  name: z.string().min(2, "Enter a project name").max(160),
  number: z.string().min(1, "Enter a project number").max(40),
  client: z.string().min(1, "Enter a client").max(160),
  address: z.string().min(1, "Enter a site address").max(240),
  city: z.string().max(80).optional().or(z.literal("")),
  state: z.string().max(40).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  type: z.enum([
    "CIVIL_ENGINEERING",
    "LANDSCAPE_ARCHITECTURE",
    "STRUCTURAL_ENGINEERING",
    "ENVIRONMENTAL",
    "CONSTRUCTION_OBSERVATION",
  ]),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  description: z.string().max(4000).optional().or(z.literal("")),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

export const visitSchema = z.object({
  visitedAt: z.string().min(1, "Choose a date and time"),
  weather: z.string().max(80).optional().or(z.literal("")),
  temperatureF: z.coerce.number().optional().nullable(),
  notes: z.string().max(8000).optional().or(z.literal("")),
  recommendations: z.string().max(8000).optional().or(z.literal("")),
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED"]).optional(),
});

export const observationSchema = z.object({
  title: z.string().min(2, "Enter a title").max(160),
  description: z.string().max(8000).optional().or(z.literal("")),
  category: z.enum([
    "GENERAL",
    "EXISTING_CONDITION",
    "DEFICIENCY",
    "SAFETY_ISSUE",
    "CONSTRUCTION_ISSUE",
    "DRAINAGE",
    "GRADING",
    "IRRIGATION",
    "PLANT_VEGETATION",
    "TREE",
    "UTILITY",
    "MATERIAL",
    "OTHER",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  status: z.enum(["OPEN", "FLAGGED", "RESOLVED"]).optional(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

export const issueSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(8000).optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  assigneeId: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  observationId: z.string().optional().or(z.literal("")),
  siteVisitId: z.string().optional().or(z.literal("")),
});

export const taskSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(4000).optional().or(z.literal("")),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  assigneeId: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  issueId: z.string().optional().or(z.literal("")),
  projectId: z.string().min(1),
});

export const commentSchema = z.object({
  body: z.string().min(1).max(4000),
});

export const inviteSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]),
  password: z.string().min(8).optional().or(z.literal("")),
});

export const resetRequestSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16, "This reset link is invalid."),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string().min(1, "Confirm your password"),
}).refine((value) => value.password === value.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

export function formError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid input";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
