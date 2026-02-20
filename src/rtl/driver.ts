import { screen, within as rtlWithin } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import type { AssertHasOptions, TestDriver } from "../types.js";

/**
 * RTL adapter implementing the subset of TestDriver that applies in JSDOM.
 * Navigation methods (visit, assertPath, refutePath) are not supported.
 */
export class RTLDriver implements TestDriver {
  private user: UserEvent;
  private container: ReturnType<typeof rtlWithin> | typeof screen;
  private lastFormElement: HTMLFormElement | null = null;

  constructor(user?: UserEvent, container?: HTMLElement) {
    this.user = user ?? userEvent.setup();
    this.container = container ? rtlWithin(container) : screen;
  }

  async visit(): Promise<void> {
    throw new Error(
      "visit() is not available in the RTL adapter. Render the desired component directly.",
    );
  }

  async click(text: string): Promise<void> {
    const element = await this.container.findByText(text);
    await this.user.click(element);
  }

  async clickLink(text: string): Promise<void> {
    const link = await this.container.findByRole("link", { name: text });
    await this.user.click(link);
  }

  async clickButton(text: string): Promise<void> {
    const button = await this.container.findByRole("button", { name: text });
    await this.user.click(button);
  }

  async fillIn(label: string, value: string): Promise<void> {
    let input: HTMLElement;
    try {
      input = await this.container.findByLabelText(label);
    } catch {
      input = await this.container.findByPlaceholderText(label);
    }
    await this.user.clear(input);
    await this.user.type(input, value);
    this.lastFormElement = input.closest("form");
  }

  async selectOption(label: string, option: string): Promise<void> {
    const select = await this.container.findByLabelText(label);
    await this.user.selectOptions(select, option);
    this.lastFormElement = select.closest("form");
  }

  async check(label: string): Promise<void> {
    const checkbox = await this.container.findByLabelText(label);
    if (!(checkbox as HTMLInputElement).checked) {
      await this.user.click(checkbox);
    }
    this.lastFormElement = checkbox.closest("form");
  }

  async uncheck(label: string): Promise<void> {
    const checkbox = await this.container.findByLabelText(label);
    if ((checkbox as HTMLInputElement).checked) {
      await this.user.click(checkbox);
    }
    this.lastFormElement = checkbox.closest("form");
  }

  async choose(label: string): Promise<void> {
    const radio = await this.container.findByRole("radio", { name: label });
    await this.user.click(radio);
    this.lastFormElement = radio.closest("form");
  }

  async submit(): Promise<void> {
    if (!this.lastFormElement) {
      throw new Error(
        "submit() called but no form was previously interacted with.",
      );
    }
    const submitBtn =
      rtlWithin(this.lastFormElement).queryByRole("button", {
        name: /submit/i,
      }) ??
      this.lastFormElement.querySelector(
        'button[type="submit"], input[type="submit"]',
      );
    if (submitBtn) {
      await this.user.click(submitBtn);
    } else {
      this.lastFormElement.requestSubmit();
    }
  }

  async assertHas(
    _selector: string,
    _opts?: AssertHasOptions,
  ): Promise<void> {
    throw new Error(
      "assertHas() with CSS selectors is not recommended in RTL. Use assertText() instead.",
    );
  }

  async refuteHas(
    _selector: string,
    _opts?: AssertHasOptions,
  ): Promise<void> {
    throw new Error(
      "refuteHas() with CSS selectors is not recommended in RTL. Use refuteText() instead.",
    );
  }

  async assertText(text: string): Promise<void> {
    await this.container.findByText(text);
  }

  async refuteText(text: string): Promise<void> {
    const el = this.container.queryByText(text);
    if (el) {
      throw new Error(
        `Expected NOT to find text '${text}', but it was present.`,
      );
    }
  }

  async assertPath(): Promise<void> {
    throw new Error(
      "assertPath() is not available in the RTL adapter (no real URL in JSDOM).",
    );
  }

  async refutePath(): Promise<void> {
    throw new Error(
      "refutePath() is not available in the RTL adapter (no real URL in JSDOM).",
    );
  }

  async within(selector: string): Promise<TestDriver> {
    const root =
      this.container === screen
        ? document.body
        : ((this.container as unknown as { container: HTMLElement })
            .container ?? document.body);
    const element = root.querySelector(selector);
    if (!element) throw new Error(`within('${selector}'): element not found`);
    return new RTLDriver(this.user, element as HTMLElement);
  }

  async debug(): Promise<void> {
    screen.debug();
  }
}
