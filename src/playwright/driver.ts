import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { type Page, type Locator, expect, test } from "@playwright/test";
import type {
  AssertHasOptions,
  AssertPathOptions,
  TestDriver,
} from "../types.js";

/** Context handed to custom step() callbacks in the Playwright adapter. */
export interface PlaywrightStepContext {
  page: Page;
  /** Current scope: the page, or the container locator inside within(). */
  scope: Page | Locator;
}

export class PlaywrightDriver implements TestDriver<PlaywrightStepContext> {
  private lastFormLocator: Locator | null = null;

  constructor(
    private page: Page,
    private scope: Page | Locator = page,
  ) {}

  async visit(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async click(text: string): Promise<void> {
    await this.scope.getByText(text).click();
  }

  async clickLink(text: string): Promise<void> {
    await this.scope.getByRole("link", { name: text }).click();
  }

  async clickButton(text: string): Promise<void> {
    await this.scope.getByRole("button", { name: text }).click();
  }

  private fieldByLabelOrPlaceholder(label: string): Locator {
    // .or() lets Playwright auto-wait on whichever appears, so
    // async-rendered labeled fields don't fall through to the
    // placeholder branch. Placeholder matching is exact — substring
    // matching would collide with labels ("Name" vs placeholder
    // "Nickname") and trip strict mode.
    return this.scope
      .getByLabel(label)
      .or(this.scope.getByPlaceholder(label, { exact: true }));
  }

  async fillIn(label: string, value: string): Promise<void> {
    const field = this.fieldByLabelOrPlaceholder(label);
    await field.fill(value);
    this.lastFormLocator = this.scope.locator("form", { has: field });
  }

  async selectOption(label: string, option: string): Promise<void> {
    const select = this.scope.getByLabel(label);
    await select.selectOption({ label: option });
    this.lastFormLocator = this.scope.locator("form", { has: select });
  }

  async check(label: string): Promise<void> {
    const checkbox = this.scope.getByLabel(label);
    await checkbox.check();
    this.lastFormLocator = this.scope.locator("form", { has: checkbox });
  }

  async uncheck(label: string): Promise<void> {
    const checkbox = this.scope.getByLabel(label);
    await checkbox.uncheck();
    this.lastFormLocator = this.scope.locator("form", { has: checkbox });
  }

  async choose(label: string): Promise<void> {
    const radio = this.scope.getByRole("radio", { name: label });
    await radio.check();
    this.lastFormLocator = this.scope.locator("form", { has: radio });
  }

  async submit(): Promise<void> {
    if (!this.lastFormLocator) {
      throw new Error(
        "submit() called but no form was previously interacted with. " +
          "Use fillIn(), selectOption(), check(), uncheck(), or choose() first.",
      );
    }
    // First try: an explicit type="submit" element — the DOM's ground truth
    const submitBtn = this.lastFormLocator.locator(
      'button[type="submit"], input[type="submit"]',
    );
    if ((await submitBtn.count()) > 0) {
      await submitBtn.first().click();
      return;
    }
    // Second try: a button whose accessible name contains "submit"
    const byRole = this.lastFormLocator.getByRole("button", {
      name: /submit/i,
    });
    if ((await byRole.count()) > 0) {
      await byRole.first().click();
    } else {
      // Last resort: press Enter on the last form field
      await this.lastFormLocator
        .locator("input, textarea, select")
        .last()
        .press("Enter");
    }
  }

  async upload(label: string, path: string): Promise<void> {
    const input = this.scope.getByLabel(label);
    await input.setInputFiles(path);
    this.lastFormLocator = this.scope.locator("form", { has: input });
  }

  async dropFile(selector: string, path: string): Promise<void> {
    const content = await readFile(path);
    const name = basename(path);
    const dataTransfer = await this.page.evaluateHandle(
      ([fileName, base64]) => {
        const dt = new DataTransfer();
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        dt.items.add(new File([bytes], fileName));
        return dt;
      },
      [name, content.toString("base64")] as const,
    );
    await this.scope.locator(selector).dispatchEvent("drop", { dataTransfer });
  }

  async assertHas(selector: string, opts?: AssertHasOptions): Promise<void> {
    let locator = this.scope.locator(selector);
    if (opts?.text) {
      locator = opts.exact
        ? locator.filter({ hasText: opts.text })
        : locator.filter({ hasText: new RegExp(opts.text) });
    }
    if (opts?.count !== undefined) {
      await expect(locator).toHaveCount(opts.count, {
        timeout: opts?.timeout,
      });
    } else {
      await expect(locator.first()).toBeVisible({ timeout: opts?.timeout });
    }
  }

  async refuteHas(selector: string, opts?: AssertHasOptions): Promise<void> {
    let locator = this.scope.locator(selector);
    if (opts?.text) {
      locator = opts.exact
        ? locator.filter({ hasText: opts.text })
        : locator.filter({ hasText: new RegExp(opts.text) });
    }
    await expect(locator).toHaveCount(0, { timeout: opts?.timeout });
  }

  async assertText(text: string): Promise<void> {
    await expect(this.scope.getByText(text).first()).toBeVisible();
  }

  async refuteText(text: string): Promise<void> {
    await expect(this.scope.getByText(text)).toHaveCount(0);
  }

  async assertValue(label: string, value: string): Promise<void> {
    await expect(this.fieldByLabelOrPlaceholder(label)).toHaveValue(value);
  }

  async assertChecked(label: string): Promise<void> {
    await expect(this.scope.getByLabel(label)).toBeChecked();
  }

  async refuteChecked(label: string): Promise<void> {
    await expect(this.scope.getByLabel(label)).not.toBeChecked();
  }

  async assertSelected(label: string, optionLabel: string): Promise<void> {
    const select = this.scope.getByLabel(label);
    await expect(select.locator("option:checked")).toHaveText(optionLabel);
  }

  async assertOptions(label: string, optionLabels: string[]): Promise<void> {
    const select = this.scope.getByLabel(label);
    await expect(select.locator("option")).toHaveText(optionLabels);
  }

  async assertPath(path: string, opts?: AssertPathOptions): Promise<void> {
    if (opts?.queryParams) {
      const params = new URLSearchParams(opts.queryParams).toString();
      await expect(this.page).toHaveURL(`${path}?${params}`);
    } else {
      await expect
        .poll(() => new URL(this.page.url()).pathname, {
          message: `assertPath('${path}')`,
        })
        .toBe(path);
    }
  }

  async refutePath(path: string): Promise<void> {
    await expect
      .poll(() => new URL(this.page.url()).pathname, {
        message: `refutePath('${path}')`,
      })
      .not.toBe(path);
  }

  async step(
    fn: (context: PlaywrightStepContext) => Promise<unknown>,
  ): Promise<void> {
    await fn({ page: this.page, scope: this.scope });
  }

  async within(selector: string): Promise<TestDriver<PlaywrightStepContext>> {
    const scopedLocator = this.scope.locator(selector);
    await expect(scopedLocator).toBeAttached();
    return new PlaywrightDriver(this.page, scopedLocator);
  }

  async debug(): Promise<void> {
    await this.page.screenshot({
      path: `debug-${Date.now()}.png`,
      fullPage: true,
    });
  }

  async wrapStep(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      // Throws when not running inside @playwright/test — fall back to
      // executing the step directly.
      test.info();
    } catch {
      return fn();
    }
    return test.step(name, fn);
  }
}
