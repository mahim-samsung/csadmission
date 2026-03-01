/**
 * Seed data from CSRankings — all areas, US only, 2014–2026.
 * Source: https://csrankings.org/#/fromyear/2014/toyear/2026/index?all&us
 * Ranking = publication-weighted score across all CS conference areas.
 * Institution URLs from CSRankings institutions.csv dataset.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// csRank reflects the actual CSRankings position (ties share the same number)
const universities = [
  // ── Rank 1–6 ─────────────────────────────────────────────────────────────
  {
    name: "Carnegie Mellon University",
    state: "PA", website: "https://www.cmu.edu",
    csRank: 1,
    csAdmissionUrl: "https://www.csd.cs.cmu.edu/academics/doctoral/admissions",
    admission: { deadline: new Date("2024-12-09"), greRequired: false, ieltsRequired: true, ieltsScore: 7.5, toeflScore: 102, applicationFee: 75,  confidenceScore: 0.95 },
  },
  {
    name: "University of Illinois Urbana-Champaign",
    state: "IL", website: "https://illinois.edu",
    csRank: 2,
    csAdmissionUrl: "https://siebelschool.illinois.edu/academics/graduate/phd",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 6.5, toeflScore: 103, applicationFee: 70,  confidenceScore: 0.93 },
  },
  {
    name: "University of California San Diego",
    state: "CA", website: "https://ucsd.edu",
    csRank: 3,
    csAdmissionUrl: "https://cse.ucsd.edu/graduate/degree-programs/phd-program",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 85,  applicationFee: 155, confidenceScore: 0.92 },
  },
  {
    name: "Georgia Institute of Technology",
    state: "GA", website: "https://www.gatech.edu",
    csRank: 4,
    csAdmissionUrl: "https://www.cc.gatech.edu/future/graduates/phd",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 100, applicationFee: 75,  confidenceScore: 0.91 },
  },
  {
    name: "University of California Berkeley",
    state: "CA", website: "https://www.berkeley.edu",
    csRank: 5,
    csAdmissionUrl: "https://eecs.berkeley.edu/academics/graduate/research-programs/admissions/",
    admission: { deadline: new Date("2024-12-08"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 90,  applicationFee: 140, confidenceScore: 0.91 },
  },
  {
    name: "Massachusetts Institute of Technology",
    state: "MA", website: "https://web.mit.edu",
    csRank: 6,
    csAdmissionUrl: "https://www.eecs.mit.edu/academics/graduate-programs/admission-process/",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 100, applicationFee: 75,  confidenceScore: 0.90 },
  },

  // ── Rank 7 (tie) ─────────────────────────────────────────────────────────
  {
    name: "University of Michigan",
    state: "MI", website: "https://umich.edu",
    csRank: 7,
    csAdmissionUrl: "https://cse.engin.umich.edu/academics/graduate/admissions/",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 6.5, toeflScore: 84,  applicationFee: 75,  confidenceScore: 0.89 },
  },
  {
    name: "University of Washington",
    state: "WA", website: "https://www.washington.edu",
    csRank: 7,
    csAdmissionUrl: "https://www.cs.washington.edu/academics/phd/admissions",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 92,  applicationFee: 85,  confidenceScore: 0.89 },
  },

  // ── Rank 9–11 ─────────────────────────────────────────────────────────────
  {
    name: "Cornell University",
    state: "NY", website: "https://www.cornell.edu",
    csRank: 9,
    csAdmissionUrl: "https://www.cs.cornell.edu/phd/admissions",
    admission: { deadline: new Date("2024-12-01"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 100, applicationFee: 105, confidenceScore: 0.88 },
  },
  {
    name: "University of Maryland College Park",
    state: "MD", website: "https://umd.edu",
    csRank: 10,
    csAdmissionUrl: "https://www.cs.umd.edu/grad/admissions",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 100, applicationFee: 75,  confidenceScore: 0.87 },
  },
  {
    name: "Stanford University",
    state: "CA", website: "https://www.stanford.edu",
    csRank: 11,
    csAdmissionUrl: "https://www.cs.stanford.edu/admissions/phd",
    admission: { deadline: new Date("2024-12-05"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 100, applicationFee: 125, confidenceScore: 0.87 },
  },

  // ── Rank 12–20 ────────────────────────────────────────────────────────────
  {
    name: "Northeastern University",
    state: "MA", website: "https://www.northeastern.edu",
    csRank: 12,
    csAdmissionUrl: "https://www.khoury.northeastern.edu/programs/phd/",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 6.5, toeflScore: 100, applicationFee: 100, confidenceScore: 0.80 },
  },
  {
    name: "Purdue University",
    state: "IN", website: "https://www.purdue.edu",
    csRank: 13,
    csAdmissionUrl: "https://www.cs.purdue.edu/graduate/admission/index.html",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 6.5, toeflScore: 77,  applicationFee: 60,  confidenceScore: 0.84 },
  },
  {
    name: "University of Texas at Austin",
    state: "TX", website: "https://www.utexas.edu",
    csRank: 14,
    csAdmissionUrl: "https://www.cs.utexas.edu/graduate/prospective-students",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 100, applicationFee: 65,  confidenceScore: 0.83 },
  },
  {
    name: "New York University",
    state: "NY", website: "https://www.nyu.edu",
    csRank: 15,
    csAdmissionUrl: "https://cs.nyu.edu/home/phd/admission.html",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 100, applicationFee: 110, confidenceScore: 0.83 },
  },
  {
    name: "University of Wisconsin-Madison",
    state: "WI", website: "https://www.wisc.edu",
    csRank: 16,
    csAdmissionUrl: "https://www.cs.wisc.edu/graduate/phd-program/",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 92,  applicationFee: 75,  confidenceScore: 0.82 },
  },
  {
    name: "Princeton University",
    state: "NJ", website: "https://www.princeton.edu",
    csRank: 17,
    csAdmissionUrl: "https://www.cs.princeton.edu/grad/admissions",
    admission: { deadline: new Date("2024-12-08"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 100, applicationFee: 90,  confidenceScore: 0.82 },
  },

  // ── Rank 18 (tie) ─────────────────────────────────────────────────────────
  {
    name: "Columbia University",
    state: "NY", website: "https://www.columbia.edu",
    csRank: 18,
    csAdmissionUrl: "https://www.cs.columbia.edu/education/phd/",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 101, applicationFee: 110, confidenceScore: 0.81 },
  },
  {
    name: "University of Pennsylvania",
    state: "PA", website: "https://www.upenn.edu",
    csRank: 18,
    csAdmissionUrl: "https://www.cis.upenn.edu/graduate/program-offerings/doctoral-program/",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 100, applicationFee: 80,  confidenceScore: 0.81 },
  },

  // ── Rank 20–25 ────────────────────────────────────────────────────────────
  {
    name: "University of California Los Angeles",
    state: "CA", website: "https://www.ucla.edu",
    csRank: 20,
    csAdmissionUrl: "https://www.cs.ucla.edu/graduate-admissions/",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 87,  applicationFee: 155, confidenceScore: 0.80 },
  },
  {
    name: "University of Southern California",
    state: "CA", website: "https://www.usc.edu",
    csRank: 21,
    csAdmissionUrl: "https://www.cs.usc.edu/academic-programs/phd/",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 6.5, toeflScore: 90,  applicationFee: 90,  confidenceScore: 0.79 },
  },
  {
    name: "University of Chicago",
    state: "IL", website: "https://www.uchicago.edu",
    csRank: 22,
    csAdmissionUrl: "https://www.cs.uchicago.edu/academics/phd/",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 102, applicationFee: 90,  confidenceScore: 0.79 },
  },
  {
    name: "University of Massachusetts Amherst",
    state: "MA", website: "https://www.umass.edu",
    csRank: 23,
    csAdmissionUrl: "https://www.cics.umass.edu/admissions/application-instructions-phd",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 90,  applicationFee: 75,  confidenceScore: 0.78 },
  },
  {
    name: "Northwestern University",
    state: "IL", website: "https://www.northwestern.edu",
    csRank: 24,
    csAdmissionUrl: "https://www.mccormick.northwestern.edu/computer-science/graduate/phd/",
    admission: { deadline: new Date("2024-12-01"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 95,  applicationFee: 95,  confidenceScore: 0.77 },
  },

  // ── Rank 25 (tie) ─────────────────────────────────────────────────────────
  {
    name: "Stony Brook University",
    state: "NY", website: "https://www.stonybrook.edu",
    csRank: 25,
    csAdmissionUrl: "https://www.cs.stonybrook.edu/admissions/graduate-program",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 6.5, toeflScore: 85,  applicationFee: 100, confidenceScore: 0.76 },
  },
  {
    name: "University of California Irvine",
    state: "CA", website: "https://uci.edu",
    csRank: 25,
    csAdmissionUrl: "https://cs.ics.uci.edu/graduate/prospective-students/",
    admission: { deadline: new Date("2024-12-15"), greRequired: false, ieltsRequired: true, ieltsScore: 7.0, toeflScore: 80,  applicationFee: 155, confidenceScore: 0.76 },
  },
];

async function main() {
  console.log("🌱 Seeding from CSRankings — all areas, US, 2014–2026\n");
  console.log("   Source: https://csrankings.org/#/fromyear/2014/toyear/2026/index?all&us\n");

  for (const u of universities) {
    // Match by name to handle tied ranks
    const existing = await db.university.findFirst({
      where: { name: u.name },
    });

    const university = existing
      ? await db.university.update({
          where: { id: existing.id },
          data: { name: u.name, state: u.state, website: u.website, csRanking: u.csRank, csAdmissionUrl: u.csAdmissionUrl },
        })
      : await db.university.create({
          data: { name: u.name, state: u.state, website: u.website, csRanking: u.csRank, csAdmissionUrl: u.csAdmissionUrl },
        });

    const existingAdm = await db.csPhdAdmission.findFirst({
      where: { universityId: university.id },
    });

    if (existingAdm) {
      await db.csPhdAdmission.update({
        where: { id: existingAdm.id },
        data: { ...u.admission, lastVerifiedAt: new Date() },
      });
    } else {
      await db.csPhdAdmission.create({
        data: { universityId: university.id, ...u.admission, lastVerifiedAt: new Date(), rawHtmlSnapshot: "" },
      });
    }

    const rankLabel = String(u.csRank).padStart(2);
    console.log(`  ✓ #${rankLabel} ${u.name} (${u.state})`);
  }

  console.log(`\n✅ Seeded ${universities.length} universities.`);
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => db.$disconnect());
