import { Session } from "../session.js";
import { RTLDriver, type RTLStepContext } from "./driver.js";

export { Session } from "../session.js";
export { StepError } from "../errors.js";
export { RTLDriver, type RTLStepContext } from "./driver.js";

export function createSession(): Session<RTLStepContext> {
  return new Session(new RTLDriver());
}
