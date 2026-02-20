import { Session } from "../session.js";
import { RTLDriver } from "./driver.js";

export { Session } from "../session.js";
export { StepError } from "../errors.js";
export { RTLDriver } from "./driver.js";

export function createSession(): Session {
  return new Session(new RTLDriver());
}
