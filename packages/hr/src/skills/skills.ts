/**
 * Skills & certifications — no validation engine.
 */

export type SkillCategory = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
};

export type Skill = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly categoryId: string | null;
};

export type Certification = {
  readonly id: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly name: string;
  readonly issuer: string | null;
  readonly issuedAt: string | null;
  readonly expiresAt: string | null;
};

export type License = {
  readonly id: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly name: string;
  readonly licenseNumber: string | null;
  readonly issuedAt: string | null;
  readonly expiresAt: string | null;
};

export type ExpirationReference = {
  readonly subjectType: "certification" | "license" | "training" | "other";
  readonly subjectId: string;
  readonly companyId: string;
  readonly expiresAt: string;
};

export type TrainingRecord = {
  readonly id: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly title: string;
  readonly completedAt: string | null;
  readonly expiresAt: string | null;
};
