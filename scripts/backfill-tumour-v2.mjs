/**
 * Idempotent migration from the legacy patient-level modules to the unified
 * Patient -> Tumour -> Events architecture.
 *
 * Run after `prisma db push`: node scripts/backfill-tumour-v2.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SITE_MAP = {
  "1": "1", // cervix
  "2": "3", // ovary
  "3": "2", // endometrium
  "4": "6", // vulva
  "5": "7", // vagina
  "6": "8", // GTD/GTN
  "7": "8",
};

function normalizeNationalId(value) {
  const normalized = String(value ?? "").replace(/[\s-]/g, "").trim().toUpperCase();
  return normalized || null;
}

function tumourCode(registryNumber, sequence = 1) {
  return `${registryNumber}-T${sequence}`;
}

async function upsertLegacy(delegate, legacySourceId, match, data) {
  const bySource = await delegate.findUnique({ where: { legacySourceId } });
  if (bySource) {
    await delegate.update({ where: { id: bySource.id }, data });
    return false;
  }

  const unclaimedMatch = await delegate.findFirst({
    where: { ...match, legacySourceId: null },
  });
  if (unclaimedMatch) {
    await delegate.update({
      where: { id: unclaimedMatch.id },
      data: { ...data, legacySourceId },
    });
    return false;
  }

  await delegate.create({ data: { ...data, legacySourceId } });
  return true;
}

async function main() {
  const patients = await prisma.patient.findMany({
    include: {
      referral: true,
      diagnosis: true,
      mdtMeetings: { orderBy: { meetingDate: "asc" } },
      imaging: true,
      surgeries: { orderBy: { surgeryDate: "asc" } },
      histopathology: true,
      chemotherapies: { orderBy: { chemoStartDate: "asc" } },
      radiotherapy: true,
      complications: { orderBy: { complicationDate: "asc" } },
      recurrence: true,
      survival: true,
      patientOutcome: true,
      medicalHistory: true,
      tumours: {
        include: {
          pathology: true,
          imaging: true,
          stagings: true,
          mdts: true,
          mdtPreparations: true,
          surgeries: true,
          systemicTherapies: true,
          radiotherapies: true,
          recurrences: true,
          outcomes: true,
          labs: true,
          complications: true,
        },
        orderBy: { sequencePrimary: "asc" },
      },
    },
  });

  const summary = {
    patients: patients.length,
    normalizedIds: 0,
    nationalIdConflicts: [],
    referrals: 0,
    tumours: 0,
    events: 0,
  };

  const normalizedOwners = new Map();
  for (const patient of patients) {
    const normalizedId = normalizeNationalId(patient.nationalId);
    if (normalizedId) {
      const owners = normalizedOwners.get(normalizedId) ?? [];
      owners.push(patient.id);
      normalizedOwners.set(normalizedId, owners);
    }
    if (patient.nationalIdNormalized && patient.nationalIdNormalized !== normalizedId) {
      await prisma.patient.update({
        where: { id: patient.id },
        data: { nationalIdNormalized: null },
      });
      patient.nationalIdNormalized = null;
    }
  }

  for (const patient of patients) {
    const normalizedId = normalizeNationalId(patient.nationalId);
    const normalizedIdOwners = normalizedId ? normalizedOwners.get(normalizedId) : [];
    if (normalizedId && normalizedIdOwners.length > 1) {
      if (patient.nationalIdNormalized) {
        await prisma.patient.update({
          where: { id: patient.id },
          data: { nationalIdNormalized: null },
        });
      }
      if (!summary.nationalIdConflicts.some((conflict) => conflict.value === normalizedId)) {
        summary.nationalIdConflicts.push({
          value: normalizedId,
          patientIds: normalizedIdOwners,
        });
      }
    } else if (normalizedId !== patient.nationalIdNormalized) {
      await prisma.patient.update({
        where: { id: patient.id },
        data: { nationalIdNormalized: normalizedId },
      });
      summary.normalizedIds++;
    }

    if (patient.referral) {
      const created = await upsertLegacy(
        prisma.referralEpisode,
        `referral:${patient.referral.id}`,
        { patientId: patient.id, referralDate: patient.referral.referralDate },
        {
            patientId: patient.id,
            referralDate: patient.referral.referralDate,
            referralReceived: patient.referral.referralReceived,
            referralSource: patient.referral.referralSource ?? patient.referral.pathwaySource,
            referralFacility: patient.referral.referralFacility,
            referralLevel: patient.referral.referralLevel,
            referralReasons: JSON.stringify(
              patient.referral.referralReason ? [patient.referral.referralReason] : [],
            ),
            suspectedCa: patient.referral.suspectedCa,
            referralUrgency: patient.referral.referralUrgency,
            firstContactDate: patient.referral.firstContactDate,
            firstSeenDate: patient.referral.dateSeenAtCancerCenter,
            previousFacilities: patient.referral.previousFacilities,
            referralNotes: patient.referral.referralNotes,
            symptomStartDate: patient.referral.symptomStartDate,
            firstFacilityVisit: patient.referral.firstHealthFacilityVisit,
            diagnosisDate: patient.referral.diagnosisDate,
            treatmentStartDate: patient.referral.treatmentStartDate,
        },
      );
      if (created) summary.referrals++;
    }

    await prisma.medicalHistory.upsert({
      where: { patientId: patient.id },
      create: {
        patientId: patient.id,
        hivStatus: patient.hivStatus,
        artStatus: patient.artStatus,
        artRegimen: patient.artRegimen,
        latestCd4: patient.cd4Count,
        viralLoad: patient.viralLoad,
      },
      update: {
        hivStatus: patient.medicalHistory?.hivStatus ?? patient.hivStatus,
        artStatus: patient.medicalHistory?.artStatus ?? patient.artStatus,
        artRegimen: patient.medicalHistory?.artRegimen ?? patient.artRegimen,
        latestCd4: patient.medicalHistory?.latestCd4 ?? patient.cd4Count,
        viralLoad: patient.medicalHistory?.viralLoad ?? patient.viralLoad,
      },
    });

    const hasLegacyTumourData = Boolean(
      patient.diagnosis ||
      patient.mdtMeetings.length ||
      patient.imaging ||
      patient.surgeries.length ||
      patient.histopathology ||
      patient.chemotherapies.length ||
      patient.radiotherapy ||
      patient.complications.length ||
      patient.recurrence ||
      patient.survival,
    );
    let tumour =
      patient.tumours.find((item) => item.legacyDiagnosisId === patient.diagnosis?.id) ??
      patient.tumours[0];
    if (!tumour && hasLegacyTumourData) {
      tumour = await prisma.tumour.create({
        data: {
          patientId: patient.id,
          tumourCode: tumourCode(patient.registryNumber),
          legacyDiagnosisId: patient.diagnosis?.id,
          sequencePrimary: 1,
          site: SITE_MAP[patient.diagnosis?.cancerType ?? ""] ?? "11",
          histology: patient.diagnosis?.histology,
          tumourGrade: patient.diagnosis?.grade,
          incidenceDate: patient.referral?.diagnosisDate,
          diagnosisDate: patient.referral?.diagnosisDate,
          figoStage: patient.diagnosis?.figoStage,
          hivStatus: patient.hivStatus,
          basisDiagnosis: patient.histopathology ? "Histology" : "Clinical",
        },
        include: {
          pathology: true,
          imaging: true,
          stagings: true,
          mdts: true,
          mdtPreparations: true,
          surgeries: true,
          systemicTherapies: true,
          radiotherapies: true,
          recurrences: true,
          outcomes: true,
          labs: true,
          complications: true,
        },
      });
      summary.tumours++;
    } else if (tumour && patient.diagnosis && !tumour.legacyDiagnosisId) {
      tumour = await prisma.tumour.update({
        where: { id: tumour.id },
        data: { legacyDiagnosisId: patient.diagnosis.id },
        include: {
          pathology: true,
          imaging: true,
          stagings: true,
          mdts: true,
          mdtPreparations: true,
          surgeries: true,
          systemicTherapies: true,
          radiotherapies: true,
          recurrences: true,
          outcomes: true,
          labs: true,
          complications: true,
        },
      });
    }
    if (!tumour) continue;

    if (patient.survival) {
      const latestTumourOutcome = [...tumour.outcomes].sort(
        (a, b) => +b.statusDate - +a.statusDate,
      )[0];
      const created = await upsertLegacy(
        prisma.patientOutcome,
        `survival:${patient.survival.id}`,
        { patientId: patient.id },
        {
            patientId: patient.id,
            vitalStatus: patient.survival?.aliveStatus ?? latestTumourOutcome?.vitalStatus,
            lastContactDate: patient.survival?.dateLastSeen ?? latestTumourOutcome?.lastContactDate,
            deathDate: patient.survival?.deathDate ?? latestTumourOutcome?.deathDate,
            causeOfDeath: patient.survival?.causeOfDeath ?? latestTumourOutcome?.causeOfDeath,
            cancerRelatedDeath: latestTumourOutcome?.cancerRelatedDeath ?? false,
            lostToFollowUp: latestTumourOutcome?.lostToFollowUp ?? false,
            lostFollowUpDate: latestTumourOutcome?.lostFollowUpDate,
        },
      );
      if (created) summary.events++;
    }

    if (patient.histopathology) {
      const created = await upsertLegacy(
        prisma.tumourPathology,
        `histopathology:${patient.histopathology.id}`,
        {
          tumourId: tumour.id,
          reportDate: patient.histopathology.pathologyDate,
          histology: patient.histopathology.histology,
        },
        {
          tumourId: tumour.id,
          specimenDate: patient.histopathology.pathologyDate,
          reportDate: patient.histopathology.pathologyDate,
          histology: patient.histopathology.histology,
          grade: patient.histopathology.grade,
          tumourSize: patient.histopathology.tumorSizeMm?.toString(),
          depthInvasion: patient.histopathology.depthInvasion,
          lvsi: patient.histopathology.lvsi ? "Yes" : "No",
          marginStatus: patient.histopathology.marginStatus,
          nodesExamined: patient.histopathology.nodesRemoved,
          nodesPositive: patient.histopathology.positiveNodes,
          p16: patient.histopathology.p16,
          p53: patient.histopathology.p53,
          er: patient.histopathology.er,
          pr: patient.histopathology.pr,
          mmr: patient.histopathology.mmr,
          pole: patient.histopathology.pole,
          brca: patient.histopathology.brca,
          hrd: patient.histopathology.hrd,
          ki67: patient.histopathology.ki67,
          molecularNotes: patient.histopathology.ihcNotes,
          reportText: patient.histopathology.ihcNotes,
        },
      );
      if (created) summary.events++;
    }

    if (patient.imaging) {
      const modalities = [
        patient.imaging.ultrasoundDone && "US",
        patient.imaging.ctDone && "CT",
        patient.imaging.mriDone && "MRI",
        patient.imaging.petDone && "PET-CT",
      ].filter(Boolean);
      const created = await upsertLegacy(
        prisma.tumourImaging,
        `imaging:${patient.imaging.id}`,
        { tumourId: tumour.id, modality: modalities.join(", ") || "Other" },
        {
          tumourId: tumour.id,
          modality: modalities.join(", ") || "Other",
          tumourSeen: patient.imaging.tumorSizeMm != null,
          tumourSize: patient.imaging.tumorSizeMm?.toString(),
          pelvicNodes: patient.imaging.lymphNodesPresent,
          ascites: patient.imaging.ascites,
          impression: patient.imaging.pciScore != null
            ? `Legacy PCI score ${patient.imaging.pciScore}`
            : undefined,
        },
      );
      if (created) summary.events++;
    }

    if (patient.diagnosis?.figoStage) {
      const created = await upsertLegacy(
        prisma.tumourStaging,
        `diagnosis:${patient.diagnosis.id}`,
        {
          tumourId: tumour.id,
          system: "FIGO",
          finalStage: patient.diagnosis.figoStage,
        },
        {
          tumourId: tumour.id,
          stagingDate: patient.referral?.diagnosisDate ?? patient.diagnosis.createdAt,
          system: "FIGO",
          stage: patient.diagnosis.figoStage,
          finalStage: patient.diagnosis.figoStage,
          basis: "Legacy chart migration",
        },
      );
      if (created) summary.events++;
    }

    for (const meeting of patient.mdtMeetings) {
      const created = await upsertLegacy(
        prisma.tumourMdt,
        `mdt:${meeting.id}`,
        { tumourId: tumour.id, meetingDate: meeting.meetingDate },
        {
            tumourId: tumour.id,
            meetingDate: meeting.meetingDate,
            status: "Discussed",
            recommendation: meeting.summary,
            notes: `Legacy MDT type: ${meeting.meetingType}`,
        },
      );
      if (created) summary.events++;
    }

    for (const surgery of patient.surgeries) {
      const created = await upsertLegacy(
        prisma.tumourSurgery,
        `surgery:${surgery.id}`,
        { tumourId: tumour.id, surgeryDate: surgery.surgeryDate },
        {
            tumourId: tumour.id,
            surgeryDate: surgery.surgeryDate,
            procedure: surgery.procedure,
            surgeon: surgery.surgeon,
            assistant: surgery.assistant,
            approach: surgery.approach,
            bloodLossMl: surgery.bloodLossMl,
            transfusion: surgery.transfusion,
            residualDisease: surgery.residualDisease,
            ccScore: surgery.ccScore,
            icu: surgery.icuAdmission,
            intraopComplication: surgery.intraoperativeComplication,
        },
      );
      if (created) summary.events++;
    }

    for (const therapy of patient.chemotherapies) {
      const created = await upsertLegacy(
        prisma.tumourSystemic,
        `chemotherapy:${therapy.id}`,
        {
          tumourId: tumour.id,
          therapyDate: therapy.chemoStartDate,
          regimen: therapy.regimen,
        },
        {
            tumourId: tumour.id,
            therapyDate: therapy.chemoStartDate,
            therapyType: "Chemotherapy",
            regimen: therapy.regimen,
            cycleNumber: therapy.cyclesReceived,
            doseReduction: therapy.doseReduction,
            ctcaeGrade: therapy.toxicityGrade,
            completed: !therapy.stoppedEarly,
            reasonStopped: therapy.stoppedEarly ? "Stopped early (legacy record)" : undefined,
        },
      );
      if (created) summary.events++;
    }

    if (patient.radiotherapy) {
      const created = await upsertLegacy(
        prisma.tumourRadiotherapy,
        `radiotherapy:${patient.radiotherapy.id}`,
        {
          tumourId: tumour.id,
          startDate: patient.radiotherapy.ebrtStart,
          endDate: patient.radiotherapy.ebrtEnd,
        },
        {
          tumourId: tumour.id,
          startDate: patient.radiotherapy.ebrtStart,
          endDate: patient.radiotherapy.ebrtEnd,
          ebrt: patient.radiotherapy.ebrtGiven,
          ebrtDose: patient.radiotherapy.doseGy?.toString(),
          ebrtFractions: patient.radiotherapy.fractions?.toString(),
          brachytherapy: patient.radiotherapy.brachytherapyGiven,
          brachyFractions: patient.radiotherapy.brachytherapySessions?.toString(),
          interrupted: patient.radiotherapy.interrupted,
        },
      );
      if (created) summary.events++;
    }

    if (patient.recurrence) {
      const created = await upsertLegacy(
        prisma.tumourRecurrence,
        `recurrence:${patient.recurrence.id}`,
        {
          tumourId: tumour.id,
          recurrenceDate: patient.recurrence.recurrenceDate,
          site: patient.recurrence.recurrenceSite,
        },
        {
          tumourId: tumour.id,
          recurrenceDate: patient.recurrence.recurrenceDate,
          site: patient.recurrence.recurrenceSite,
          confirmationMethod: patient.recurrence.biopsyConfirmed ? "Biopsy" : undefined,
          treatmentGiven: patient.recurrence.treatmentForRecurrence,
          treatment: patient.recurrence.treatmentForRecurrence,
        },
      );
      if (created) summary.events++;
    }

    if (patient.survival) {
      const created = await upsertLegacy(
        prisma.tumourOutcome,
        `survival:${patient.survival.id}`,
        { tumourId: tumour.id, statusDate: patient.survival.dateLastSeen ?? patient.survival.updatedAt },
        {
          tumourId: tumour.id,
          statusDate: patient.survival.dateLastSeen ?? patient.survival.updatedAt,
          vitalStatus: patient.survival.aliveStatus,
          lastContactDate: patient.survival.dateLastSeen,
          deathDate: patient.survival.deathDate,
          causeOfDeath: patient.survival.causeOfDeath,
        },
      );
      if (created) summary.events++;
    }

    for (const complication of patient.complications) {
      const created = await upsertLegacy(
        prisma.tumourComplication,
        `complication:${complication.id}`,
        {
          tumourId: tumour.id,
          complicationDate: complication.complicationDate,
          complicationType: complication.complicationType,
        },
        {
            tumourId: tumour.id,
            complicationDate: complication.complicationDate,
            complicationType: complication.complicationType,
            clavienDindo: complication.clavienDindoGrade,
            readmission: complication.readmission,
            reoperation: complication.reoperation,
            icu: complication.icu,
            mortality30Day: complication.mortality30Day,
            mortality90Day: complication.mortality90Day,
        },
      );
      if (created) summary.events++;
    }

    const histologyAvailable = tumour.pathology.length > 0 || Boolean(patient.histopathology);
    const imagingAvailable = tumour.imaging.length > 0 || Boolean(patient.imaging);
    const latestLegacyMdt = patient.mdtMeetings.at(-1);
    if (histologyAvailable || imagingAvailable || tumour.mdts.length > 0 || latestLegacyMdt) {
      const created = await upsertLegacy(
        prisma.mdtPreparation,
        `tumour-backfill:${tumour.id}`,
        { tumourId: tumour.id, requestDate: null },
        {
          tumourId: tumour.id,
          requestDate: null,
          histologyAvailable,
          imagingAvailable,
          ready: histologyAvailable && imagingAvailable,
          scheduledDate: latestLegacyMdt?.meetingDate,
          status: latestLegacyMdt
            ? "Discussed"
            : histologyAvailable && imagingAvailable
              ? "Ready—not booked"
              : "Not ready",
          reasonNotReady:
            histologyAvailable && imagingAvailable
              ? null
              : [!histologyAvailable && "Awaiting histology", !imagingAvailable && "Awaiting imaging"]
                  .filter(Boolean)
                  .join("; "),
        },
      );
      if (created) summary.events++;
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
