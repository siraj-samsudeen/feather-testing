import { type Page, type Locator, expect } from "@playwright/test";
import type {
  AssertHasOptions,
  AssertPathOptions,
  TestDriver,
} from "../types.js";

export class PlaywrightDriver implements TestDriver {
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

  async fillIn(label: string, value: string): Promise<void> {
    const byLabel = this.scope.getByLabel(label);
    if ((await byLabel.count()) > 0) {
      await byLabel.fill(value);
      this.lastFormLocator = this.scope.locator("form", { has: byLabel });
      return;
    }
    const byPlaceholder = this.scope.getByPlaceholder(label);
    await byPlaceholder.fill(value);
    this.lastFormLocator = this.scope.locator("form", {
      has: byPlaceholder,
    });
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
    const submitBtn = this.lastFormLocator.locator(
      'button[type="submit"], input[type="submit"]',
    );
    if ((await submitBtn.count()) > 0) {
      await submitBtn.first().click();
    } else {
      await this.lastFormLocator
        .locator("input, textarea, select")
        .last()
        .press("Enter");
    }
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
      locator = locator.filter({ hasText: opts.text });
    }
    await expect(locator).toHaveCount(0, { timeout: opts?.timeout });
  }

  async assertText(text: string): Promise<void> {
    await expect(this.scope.getByText(text).first()).toBeVisible();
  }

  async refuteText(text: string): Promise<void> {
    await expect(this.scope.getByText(text)).toHaveCount(0);
  }

  async assertPath(path: string, opts?: AssertPathOptions): Promise<void> {
    if (opts?.queryParams) {
      const params = new URLSearchParams(opts.queryParams).toString();
      await expect(this.page).toHaveURL(`${path}?${params}`);
    } else {
      const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      await expect(this.page).toHaveURL(
        new RegExp(`^[^?]*${escaped}(\\?.*)?$`),
      );
    }
  }

  async refutePath(path: string): Promise<void> {
    const url = new URL(this.page.url());
    if (url.pathname === path) {
      throw new Error(`Expected path to NOT be '${path}', but it is.`);
    }
  }

  async within(selector: string): Promise<TestDriver> {
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
}
