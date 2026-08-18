import {
  CLINICIAN_RANGE,
  ILLUSTRATIVE_ASSUMPTIONS,
  calculateImpact,
  clampClinicians,
  formatNumber,
} from './impact';

describe('clampClinicians', () => {
  it('keeps values inside the slider range', () => {
    expect(clampClinicians(0)).toBe(CLINICIAN_RANGE.min);
    expect(clampClinicians(1000)).toBe(CLINICIAN_RANGE.max);
    expect(clampClinicians(25)).toBe(25);
  });

  it('falls back to the initial value for non-numeric input', () => {
    // input.valueAsNumber is NaN when a range input is empty or unparsable,
    // which would otherwise propagate NaN through every displayed figure.
    expect(clampClinicians(Number.NaN)).toBe(CLINICIAN_RANGE.initial);
    expect(clampClinicians(Number.POSITIVE_INFINITY)).toBe(CLINICIAN_RANGE.initial);
  });

  it('rounds fractional input to whole clinicians', () => {
    expect(clampClinicians(24.6)).toBe(25);
  });
});

describe('calculateImpact', () => {
  it('derives each figure from the stated assumptions', () => {
    const result = calculateImpact(20);

    // 20 clinicians * 3.5 hours = 70 hours per week
    expect(result.hoursPerWeek).toBe(70);
    // 70 hours * 46 clinical weeks = 3,220 hours per year
    expect(result.hoursPerYear).toBe(3220);
    // 20 clinicians * 180 appointments = 3,600 per year
    expect(result.appointmentsPerYear).toBe(3600);
  });

  it('scales linearly, which is what the model claims', () => {
    const small = calculateImpact(10);
    const large = calculateImpact(100);

    expect(large.hoursPerWeek).toBe(small.hoursPerWeek * 10);
    expect(large.appointmentsPerYear).toBe(small.appointmentsPerYear * 10);
  });

  it('clamps out-of-range input rather than producing nonsense', () => {
    expect(calculateImpact(-50).clinicians).toBe(CLINICIAN_RANGE.min);
    expect(calculateImpact(10_000).clinicians).toBe(CLINICIAN_RANGE.max);
  });

  it('reports whole hours rather than false precision', () => {
    // 25 * 3.5 = 87.5, which should not be shown to a tenth of an hour.
    const result = calculateImpact(25);

    expect(Number.isInteger(result.hoursPerWeek)).toBe(true);
    expect(Number.isInteger(result.hoursPerYear)).toBe(true);
  });

  it('accepts alternative assumptions so the model is not hard-coded', () => {
    // The rates are illustrative; the function must not assume these specific
    // values, or replacing them later means rewriting the calculation.
    const result = calculateImpact(10, {
      ...ILLUSTRATIVE_ASSUMPTIONS,
      hoursPerClinicianPerWeek: 1,
      clinicalWeeksPerYear: 50,
    });

    expect(result.hoursPerWeek).toBe(10);
    expect(result.hoursPerYear).toBe(500);
  });
});

describe('formatNumber', () => {
  it('groups digits so large figures stay readable', () => {
    // Non-breaking or thin spaces vary by locale build, so the assertion checks
    // that grouping happened rather than pinning an exact separator.
    expect(formatNumber(3600)).toMatch(/^3.600$/);
    expect(formatNumber(161_000)).toMatch(/^161.000$/);
  });

  it('leaves small numbers unchanged', () => {
    expect(formatNumber(70)).toBe('70');
  });
});
