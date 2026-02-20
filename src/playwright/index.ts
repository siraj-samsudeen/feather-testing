import { test as base, type Page } from "@playwright/test";
import { Session } from "../session.js";
import { PlaywrightDriver } from "./driver.js";

export { Session } from "../session.js";
export { StepError } from "../errors.js";
export { PlaywrightDriver } from "./driver.js";
export type {
  AssertHasOptions,
  AssertPathOptions,
  TestDriver,
} from "../types.js";

export function createSession(page: Page): Session {
  return new Session(new PlaywrightDriver(page));
}

export const test = base.extend<{ session: Session }>({
  session: async ({ page }, use) => {
    await use(createSession(page));
  },
});

export { expect } from "@playwright/test";
