/**
 * The illustrative impact model behind the home page calculator.
 *
 * Pure functions with no React involvement, so the arithmetic can be tested
 * directly and the component is left responsible only for presenting it.
 *
 * On the choice of outputs: the design reference produced a headline currency
 * figure ("Estimated Net Annual Operational Value: $2,386,500") from invented
 * per-clinician rates. A precise monetary result implies a business case that
 * nothing here supports, and it is the number a reader is most likely to quote
 * out of context. The outputs below are hours and appointments, each derived in
 * one step from a rate that is displayed alongside the result, so the whole
 * calculation is visible rather than asserted.
 */

export interface ImpactAssumptions {
  /** Clinician hours returned each week, per clinician. */
  hoursPerClinicianPerWeek: number;
  /** Appointments recovered each year through fewer missed slots, per clinician. */
  appointmentsPerClinicianPerYear: number;
  /** Clinical weeks per year, allowing for leave. */
  clinicalWeeksPerYear: number;
}

/**
 * Round numbers chosen to be plausible and obviously approximate. They are
 * shown in the interface next to the results they produce.
 */
export const ILLUSTRATIVE_ASSUMPTIONS: ImpactAssumptions = {
  hoursPerClinicianPerWeek: 3.5,
  appointmentsPerClinicianPerYear: 180,
  clinicalWeeksPerYear: 46,
};

export const CLINICIAN_RANGE = {
  min: 5,
  max: 200,
  step: 5,
  initial: 25,
} as const;

export interface ImpactResult {
  clinicians: number;
  hoursPerWeek: number;
  hoursPerYear: number;
  appointmentsPerYear: number;
}

/** Constrains a value to the slider's range, guarding against bad input. */
export function clampClinicians(value: number): number {
  if (!Number.isFinite(value)) return CLINICIAN_RANGE.initial;
  return Math.min(CLINICIAN_RANGE.max, Math.max(CLINICIAN_RANGE.min, Math.round(value)));
}

export function calculateImpact(
  clinicians: number,
  assumptions: ImpactAssumptions = ILLUSTRATIVE_ASSUMPTIONS,
): ImpactResult {
  const safeClinicians = clampClinicians(clinicians);
  const hoursPerWeek = safeClinicians * assumptions.hoursPerClinicianPerWeek;

  return {
    clinicians: safeClinicians,
    // Rounded for display; fractional hours per week are false precision.
    hoursPerWeek: Math.round(hoursPerWeek),
    hoursPerYear: Math.round(hoursPerWeek * assumptions.clinicalWeeksPerYear),
    appointmentsPerYear: safeClinicians * assumptions.appointmentsPerClinicianPerYear,
  };
}

/**
 * Intl.NumberFormat rather than a formatting library: it is built into every
 * target browser and handles digit grouping per locale for free.
 *
 * The formatter is created once at module scope. Constructing one per render is
 * a well-known performance trap, since each construction reloads locale data.
 */
const numberFormatter = new Intl.NumberFormat('en-GB');

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
