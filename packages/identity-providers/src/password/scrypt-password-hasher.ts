/**
 * Production password hashing — Node scrypt with configurable work factors
 * and legacy SHA-256 verification for migration.
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import {
  Sha256PasswordHasher,
  type PasswordHasher,
} from "@afh/identity";

export type ScryptWorkFactors = {
  /** CPU/memory cost parameter (default 16384) */
  readonly N: number;
  readonly r: number;
  readonly p: number;
  readonly keyLength: number;
};

export const DEFAULT_SCRYPT_WORK_FACTORS: ScryptWorkFactors = {
  N: 16384,
  r: 8,
  p: 1,
  keyLength: 64,
};

const LEGACY_PREFIX = "sha256$";
const SCRYPT_PREFIX = "scrypt$";

function scryptDerive(
  plain: string,
  salt: string,
  keyLength: number,
  factors: Pick<ScryptWorkFactors, "N" | "r" | "p">,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      plain,
      salt,
      keyLength,
      { N: factors.N, r: factors.r, p: factors.p },
      (err, derived) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(derived);
      },
    );
  });
}

/**
 * Production PasswordHasher. New hashes use scrypt; verify also accepts
 * Phase 2A sha256$ hashes so existing credentials migrate without flow changes.
 */
export class ScryptPasswordHasher implements PasswordHasher {
  readonly #legacy = new Sha256PasswordHasher();
  readonly #factors: ScryptWorkFactors;

  constructor(factors: Partial<ScryptWorkFactors> = {}) {
    this.#factors = { ...DEFAULT_SCRYPT_WORK_FACTORS, ...factors };
  }

  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const { N, r, p, keyLength } = this.#factors;
    const derived = await scryptDerive(plain, salt, keyLength, { N, r, p });
    return `${SCRYPT_PREFIX}${N}$${r}$${p}$${keyLength}$${salt}$${derived.toString("hex")}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    if (hash.startsWith(SCRYPT_PREFIX)) {
      return this.#verifyScrypt(plain, hash);
    }
    if (hash.startsWith(LEGACY_PREFIX)) {
      return this.#legacy.verify(plain, hash);
    }
    return false;
  }

  /** True when hash should be re-written with current scrypt parameters. */
  needsRehash(hash: string): boolean {
    if (!hash.startsWith(SCRYPT_PREFIX)) {
      return true;
    }
    const parts = hash.split("$");
    if (parts.length !== 7) {
      return true;
    }
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const keyLength = Number(parts[4]);
    return (
      N !== this.#factors.N ||
      r !== this.#factors.r ||
      p !== this.#factors.p ||
      keyLength !== this.#factors.keyLength
    );
  }

  async #verifyScrypt(plain: string, hash: string): Promise<boolean> {
    const parts = hash.split("$");
    if (parts.length !== 7 || parts[0] !== "scrypt") {
      return false;
    }
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const keyLength = Number(parts[4]);
    const salt = parts[5] ?? "";
    const expectedHex = parts[6] ?? "";
    if (
      !Number.isFinite(N) ||
      !Number.isFinite(r) ||
      !Number.isFinite(p) ||
      !Number.isFinite(keyLength) ||
      salt.length === 0 ||
      expectedHex.length === 0
    ) {
      return false;
    }
    try {
      const derived = await scryptDerive(plain, salt, keyLength, { N, r, p });
      const expected = Buffer.from(expectedHex, "hex");
      if (derived.length !== expected.length) {
        return false;
      }
      return timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }
}
