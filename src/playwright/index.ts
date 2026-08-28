import { test as base, type Page } from "@playwright/test";
import { Session } from "../session.js";
import { PlaywrightDriver, type PlaywrightStepContext } from "./driver.js";

export { Session } from "../session.js";
export { StepError } from "../errors.js";
export { PlaywrightDriver, type PlaywrightStepContext } from "./driver.js";
export type {
  AssertHasOptions,
  AssertPathOptions,
  TestDriver,
  UntilOptions,
  UntilPredicate,
} from "../types.js";

export function createSession(page: Page): Session<PlaywrightStepContext> {
  return new Session(new PlaywrightDriver(page));
}

export const test = base.extend<{ session: Session<PlaywrightStepContext> }>({
  session: async ({ page }, use) => {
    await use(createSession(page));
  },
});

export { expect } from "@playwright/test";
