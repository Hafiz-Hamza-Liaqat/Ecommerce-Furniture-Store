export {
  ok,
  fail,
  isOk,
  isFail,
  isValidationFailure,
  isBusinessFailure,
  isInfrastructureFailure,
  mapResult,
  flatMapResult,
} from "./result.js";
export type { Result, ResultSuccess, ResultFailure } from "./result.js";
