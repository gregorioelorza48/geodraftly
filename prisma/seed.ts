import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import "../lib/db-env";
import bcrypt from "bcryptjs";
import { getDatabaseUrl } from "../lib/db-env";
import { putFile } from "../lib/storage";

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing in this shell. On the website service Variables add DATABASE_URL=${{Postgres.DATABASE_URL}}, or run: export DATABASE_URL='(copy from Postgres → Variables → DATABASE_URL)' && npm run db:seed",
  );
}

if (/^postgres(ql)?:/i.test(databaseUrl)) {
  const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const next = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  if (next !== schema) fs.writeFileSync(schemaPath, next);
  execSync("npx prisma generate", { stdio: "inherit" });
}

const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const ava = await db.user.upsert({
    where: { email: "demo@geodraftly.app" },
    update: { passwordHash, name: "Ava Chen" },
    create: { email: "demo@geodraftly.app", name: "Ava Chen", passwordHash },
  });

  const marcus = await db.user.upsert({
    where: { email: "marcus@geodraftly.app" },
    update: { passwordHash, name: "Marcus Hale" },
    create: { email: "marcus@geodraftly.app", name: "Marcus Hale", passwordHash },
  });

  const jordan = await db.user.upsert({
    where: { email: "client@geodraftly.app" },
    update: { passwordHash, name: "Jordan Hale" },
    create: { email: "client@geodraftly.app", name: "Jordan Hale", passwordHash },
  });

  const org = await db.organization.upsert({
    where: { slug: "northridge-studio" },
    update: {},
    create: {
      name: "Northridge Studio",
      slug: "northridge-studio",
      legalName: "Northridge Civil & Landscape, Ltd.",
      email: "field@northridge.studio",
      phone: "(312) 555-0148",
      address: "220 W Kinzie Street, Chicago, IL",
    },
  });

  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: ava.id } },
    update: { role: "OWNER" },
    create: { organizationId: org.id, userId: ava.id, role: "OWNER" },
  });
  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: marcus.id } },
    update: { role: "MEMBER" },
    create: { organizationId: org.id, userId: marcus.id, role: "MEMBER" },
  });
  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: jordan.id } },
    update: { role: "CLIENT" },
    create: { organizationId: org.id, userId: jordan.id, role: "CLIENT" },
  });

  await db.reportTemplate.upsert({
    where: { id: "seed-default-template" },
    update: {},
    create: {
      id: "seed-default-template",
      organizationId: org.id,
      name: "Site Observation Report",
      isDefault: true,
      headerNote: "This report documents existing conditions and field observations.",
      footerNote: "Confidential — for project use only.",
    },
  });

  const riverbend = await db.project.upsert({
    where: { organizationId_number: { organizationId: org.id, number: "LA-26-014" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Riverbend Park Renovation",
      number: "LA-26-014",
      client: "City of Greendale Parks Department",
      address: "400 Riverbend Drive",
      city: "Greendale",
      state: "IL",
      postalCode: "60025",
      latitude: 42.0412,
      longitude: -87.8214,
      type: "LANDSCAPE_ARCHITECTURE",
      status: "ACTIVE",
      description:
        "Full renovation of the north lawn, playground, and river-edge path. Scope includes planting, irrigation, drainage, and play surfacing.",
    },
  });

  const oak = await db.project.upsert({
    where: { organizationId_number: { organizationId: org.id, number: "CE-26-008" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Oak Street Drainage Improvements",
      number: "CE-26-008",
      client: "Village of Oak Park Public Works",
      address: "1100 Oak Street",
      city: "Oak Park",
      state: "IL",
      postalCode: "60301",
      latitude: 41.888,
      longitude: -87.784,
      type: "CIVIL_ENGINEERING",
      status: "ACTIVE",
      description: "Curb inlet replacement, swale regrading, and pavement restoration along Oak Street.",
    },
  });

  await db.projectMember.upsert({
    where: { projectId_userId: { projectId: riverbend.id, userId: ava.id } },
    update: {},
    create: { projectId: riverbend.id, userId: ava.id, role: "LEAD" },
  });
  await db.projectMember.upsert({
    where: { projectId_userId: { projectId: riverbend.id, userId: marcus.id } },
    update: {},
    create: { projectId: riverbend.id, userId: marcus.id, role: "MEMBER" },
  });
  await db.projectMember.upsert({
    where: { projectId_userId: { projectId: riverbend.id, userId: jordan.id } },
    update: { role: "CLIENT" },
    create: { projectId: riverbend.id, userId: jordan.id, role: "CLIENT" },
  });
  await db.projectMember.upsert({
    where: { projectId_userId: { projectId: oak.id, userId: ava.id } },
    update: {},
    create: { projectId: oak.id, userId: ava.id, role: "LEAD" },
  });

  const visit = await db.siteVisit.upsert({
    where: { id: "seed-riverbend-visit-1" },
    update: {},
    create: {
      id: "seed-riverbend-visit-1",
      projectId: riverbend.id,
      observerId: ava.id,
      visitedAt: new Date("2026-08-22T14:30:00"),
      weather: "Partly cloudy",
      temperatureF: 78,
      notes:
        "Walked the north lawn, playground, and river path with Parks staff. Play surfacing and the north swale are the primary existing-condition concerns. Irrigation appears functional but several heads are buried.",
      recommendations:
        "Replace playground surfacing in the next bid package. Regrade and armor the north swale before fall planting. Raise irrigation heads at the time of mulch refresh.",
      status: "COMPLETED",
      completedAt: new Date("2026-08-22T16:10:00"),
    },
  });

  const observations = [
    {
      id: "seed-obs-1",
      title: "Playground surfacing failing at west bay",
      description:
        "EWF is thin and compacted. Exposed geotextile at the west bay. Fall zone no longer meets the original spec depth.",
      category: "EXISTING_CONDITION" as const,
      priority: "HIGH" as const,
      latitude: 42.04135,
      longitude: -87.8217,
    },
    {
      id: "seed-obs-2",
      title: "North path swale eroded",
      description:
        "Concentrated flow has cut a 6–8 inch channel through the swale invert. Mulch and fines washed onto the path.",
      category: "DRAINAGE" as const,
      priority: "HIGH" as const,
      latitude: 42.04155,
      longitude: -87.8211,
    },
    {
      id: "seed-obs-3",
      title: "Specimen bur oak in good condition",
      description:
        "36-inch bur oak at the river overlook. Full crown, no included bark of concern. Protect during path reconstruction.",
      category: "TREE" as const,
      priority: "MEDIUM" as const,
      latitude: 42.04095,
      longitude: -87.8219,
    },
    {
      id: "seed-obs-4",
      title: "Irrigation heads buried in mulch",
      description: "Four rotary heads along the north lawn are 1–2 inches below finished mulch grade.",
      category: "IRRIGATION" as const,
      priority: "MEDIUM" as const,
      latitude: 42.0411,
      longitude: -87.8213,
    },
  ];

  for (const obs of observations) {
    await db.observation.upsert({
      where: { id: obs.id },
      update: {},
      create: {
        ...obs,
        projectId: riverbend.id,
        siteVisitId: visit.id,
        authorId: ava.id,
        status: "OPEN",
      },
    });
  }

  await db.issue.upsert({
    where: { id: "seed-issue-1" },
    update: {},
    create: {
      id: "seed-issue-1",
      projectId: riverbend.id,
      siteVisitId: visit.id,
      observationId: "seed-obs-1",
      createdById: ava.id,
      assigneeId: marcus.id,
      title: "Replace playground surfacing at west bay",
      description: "Specify poured-in-place or engineered wood fiber to restore fall-zone depth.",
      status: "OPEN",
      priority: "HIGH",
      dueDate: new Date("2026-09-15"),
    },
  });

  await db.issue.upsert({
    where: { id: "seed-issue-2" },
    update: {},
    create: {
      id: "seed-issue-2",
      projectId: riverbend.id,
      siteVisitId: visit.id,
      observationId: "seed-obs-2",
      createdById: ava.id,
      assigneeId: ava.id,
      title: "Repair and armor north swale",
      description: "Regrade invert, add check dams or cobble, restore path edge.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: new Date("2026-09-30"),
    },
  });

  await db.task.upsert({
    where: { id: "seed-task-1" },
    update: {},
    create: {
      id: "seed-task-1",
      projectId: riverbend.id,
      issueId: "seed-issue-1",
      createdById: ava.id,
      assigneeId: marcus.id,
      title: "Draft surfacing spec language for addendum",
      status: "TODO",
      dueDate: new Date("2026-09-05"),
    },
  });

  const photoKey = `projects/${riverbend.id}/photos/seed-playground.svg`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <rect width="1200" height="800" fill="#cfc8b6"/>
  <rect x="0" y="520" width="1200" height="280" fill="#8a9a7a"/>
  <rect x="80" y="300" width="420" height="260" fill="#d4a574" opacity="0.85"/>
  <circle cx="900" cy="280" r="90" fill="#3d5a45"/>
  <rect x="880" y="350" width="40" height="180" fill="#5a4030"/>
  <text x="80" y="80" font-size="28" fill="#1c211e" font-family="Georgia">Riverbend Park — west play bay</text>
</svg>`;
  await putFile(photoKey, Buffer.from(svg), "image/svg+xml");
  await db.photo.upsert({
    where: { id: "seed-photo-1" },
    update: {},
    create: {
      id: "seed-photo-1",
      projectId: riverbend.id,
      siteVisitId: visit.id,
      observationId: "seed-obs-1",
      uploadedById: ava.id,
      fileKey: photoKey,
      contentType: "image/svg+xml",
      caption: "West play bay — existing surfacing",
    },
  });

  await db.pinComment.upsert({
    where: { id: "seed-pin-photo-1" },
    update: {},
    create: {
      id: "seed-pin-photo-1",
      projectId: riverbend.id,
      authorId: ava.id,
      kind: "PHOTO",
      body: "Geotextile is exposed here. This is the area we flagged for replacement.",
      photoId: "seed-photo-1",
      x: 0.28,
      y: 0.48,
    },
  });
  await db.pinComment.upsert({
    where: { id: "seed-pin-photo-2" },
    update: {},
    create: {
      id: "seed-pin-photo-2",
      projectId: riverbend.id,
      authorId: jordan.id,
      kind: "PHOTO",
      body: "Parks agrees — please include this bay in the addendum.",
      photoId: "seed-photo-1",
      parentId: "seed-pin-photo-1",
    },
  });
  await db.pinComment.upsert({
    where: { id: "seed-pin-map-1" },
    update: {},
    create: {
      id: "seed-pin-map-1",
      projectId: riverbend.id,
      authorId: marcus.id,
      kind: "MAP",
      body: "Can we walk this corner with Parks on the next visit? Access from Ballard looks tight.",
      latitude: 42.0414,
      longitude: -87.8215,
    },
  });

  await db.activity.createMany({
    data: [
      {
        organizationId: org.id,
        projectId: riverbend.id,
        actorId: ava.id,
        kind: "PROJECT_CREATED",
        message: "Ava Chen created project LA-26-014 — Riverbend Park Renovation",
      },
      {
        organizationId: org.id,
        projectId: riverbend.id,
        actorId: ava.id,
        kind: "VISIT_COMPLETED",
        message: "Ava Chen completed a site visit on LA-26-014",
      },
    ],
  });

  console.log("Seeded Northridge Studio.");
  console.log("Staff:  demo@geodraftly.app / demo1234");
  console.log("Client: client@geodraftly.app / demo1234");
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
