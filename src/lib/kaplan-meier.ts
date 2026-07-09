export type KmPoint = { timeDays: number; survival: number; atRisk: number };

export type KaplanMeierCurve = {
  label: string;
  n: number;
  events: number;
  points: KmPoint[];
  insufficient: boolean;
  message?: string;
};

type SurvivalObservation = {
  timeDays: number;
  event: boolean;
};

function computeKaplanMeier(observations: SurvivalObservation[]): KmPoint[] {
  if (observations.length === 0) return [];

  const sorted = [...observations].sort((a, b) => a.timeDays - b.timeDays);
  const times = [...new Set(sorted.map((o) => o.timeDays))].sort((a, b) => a - b);

  let survival = 1;
  let atRisk = sorted.length;
  const points: KmPoint[] = [{ timeDays: 0, survival: 1, atRisk }];

  for (const t of times) {
    const atTime = sorted.filter((o) => o.timeDays === t);
    const events = atTime.filter((o) => o.event).length;
    const censored = atTime.filter((o) => !o.event).length;

    if (events > 0 && atRisk > 0) {
      survival *= 1 - events / atRisk;
      points.push({
        timeDays: t,
        survival: Math.round(survival * 1000) / 1000,
        atRisk,
      });
    }

    atRisk -= events + censored;
  }

  return points;
}

export function buildOverallSurvivalCurve(
  observations: SurvivalObservation[],
  minN = 3,
): KaplanMeierCurve {
  const valid = observations.filter((o) => o.timeDays >= 0);
  const events = valid.filter((o) => o.event).length;

  if (valid.length < minN) {
    return {
      label: "Overall survival",
      n: valid.length,
      events,
      points: [],
      insufficient: true,
      message: `Need at least ${minN} patients with diagnosis date and follow-up.`,
    };
  }

  return {
    label: "Overall survival",
    n: valid.length,
    events,
    points: computeKaplanMeier(valid),
    insufficient: false,
  };
}

export function buildProgressionFreeSurvivalCurve(
  observations: SurvivalObservation[],
  minN = 3,
): KaplanMeierCurve {
  const valid = observations.filter((o) => o.timeDays >= 0);
  const events = valid.filter((o) => o.event).length;

  if (valid.length < minN) {
    return {
      label: "Progression-free survival",
      n: valid.length,
      events,
      points: [],
      insufficient: true,
      message: `Need at least ${minN} patients with diagnosis and recurrence or follow-up.`,
    };
  }

  return {
    label: "Progression-free survival",
    n: valid.length,
    events,
    points: computeKaplanMeier(valid),
    insufficient: false,
  };
}
