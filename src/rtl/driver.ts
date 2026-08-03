import {
  fireEvent,
  screen,
  waitFor,
  within as rtlWithin,
} from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import type { AssertHasOptions, TestDriver } from "../types.js";

/** Context handed to custom step() callbacks in the RTL adapter. */
export interface RTLStepContext {
  user: UserEvent;
  /** Current scope: `screen`, or a within()-scoped query container. */
  container: ReturnType<typeof rtlWithin> | typeof screen;
}

type ValueElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

/**
 * RTL adapter implementing the subset of TestDriver that applies in JSDOM.
 * Navigation methods (visit, assertPath, refutePath) are not supported.
 */
export class RTLDriver implements TestDriver<RTLStepContext> {
  private user: UserEvent;
  private container: ReturnType<typeof rtlWithin> | typeof screen;
  private lastFormElement: HTMLFormElement | null = null;

  constructor(user?: UserEvent, container?: HTMLElement) {
    this.user = user ?? userEvent.setup();
    this.container = container ? rtlWithin(container) : screen;
  }

  private rootElement(): HTMLElement {
    return this.container === screen
      ? document.body
      : ((this.container as unknown as { container: HTMLElement })
          .container ?? document.body);
  }

  private async findFieldByLabelOrPlaceholder(
    label: string,
  ): Promise<HTMLElement> {
    try {
      return await this.container.findByLabelText(label);
    } catch {
      return await this.container.findByPlaceholderText(label);
    }
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
    const input = await this.findFieldByLabelOrPlaceholder(label);
    await this.user.clear(input);
    await this.user.type(input, value);
    this.lastFormElement = input.closest("form");
  }

  async selectOption(label: string, option: string): Promise<void> {
    const select = await this.container.findByLabelText(label);
    const optionEl = Array.from(
      (select as HTMLSelectElement).querySelectorAll("option"),
    ).find((o) => o.textContent?.trim() === option);
    if (!optionEl) {
      throw new Error(
        `selectOption('${label}', '${option}'): no <option> with text '${option}' found.`,
      );
    }
    await this.user.selectOptions(select, optionEl);
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
    // Prefer an explicit type="submit" element (the DOM's ground truth),
    // then a button whose accessible name contains "submit".
    const submitBtn =
      this.lastFormElement.querySelector(
        'button[type="submit"], input[type="submit"]',
      ) ??
      rtlWithin(this.lastFormElement).queryByRole("button", {
        name: /submit/i,
      });
    if (submitBtn) {
      await this.user.click(submitBtn);
    } else {
      this.lastFormElement.requestSubmit();
    }
  }

  async upload(label: string, path: string): Promise<void> {
    const input = await this.container.findByLabelText(label);
    // JSDOM has no filesystem access; synthesize a File from the basename.
    const name = path.split(/[\\/]/).pop() ?? path;
    const file = new File([""], name);
    await this.user.upload(input as HTMLInputElement, file);
    this.lastFormElement = input.closest("form");
  }

  async dropFile(selector: string, path: string): Promise<void> {
    const target = this.rootElement().querySelector(selector);
    if (!target) {
      throw new Error(`dropFile('${selector}'): element not found`);
    }
    const name = path.split(/[\\/]/).pop() ?? path;
    const file = new File([""], name);
    fireEvent.drop(target, {
      dataTransfer: {
        files: [file],
        items: [{ kind: "file", type: file.type, getAsFile: () => file }],
        types: ["Files"],
      },
    });
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
    await waitFor(() => {
      const el = this.container.queryByText(text);
      if (el) {
        throw new Error(
          `Expected NOT to find text '${text}', but it was present.`,
        );
      }
    });
  }

  async assertValue(label: string, value: string): Promise<void> {
    const field = await this.findFieldByLabelOrPlaceholder(label);
    await waitFor(() => {
      const actual = (field as ValueElement).value;
      if (actual !== value) {
        throw new Error(
          `assertValue('${label}', '${value}'): expected value '${value}', but found '${actual}'.`,
        );
      }
    });
  }

  async assertChecked(label: string): Promise<void> {
    const checkbox = await this.container.findByLabelText(label);
    await waitFor(() => {
      if (!(checkbox as HTMLInputElement).checked) {
        throw new Error(
          `assertChecked('${label}'): expected checkbox to be checked, but it was not.`,
        );
      }
    });
  }

  async refuteChecked(label: string): Promise<void> {
    const checkbox = await this.container.findByLabelText(label);
    await waitFor(() => {
      if ((checkbox as HTMLInputElement).checked) {
        throw new Error(
          `refuteChecked('${label}'): expected checkbox NOT to be checked, but it was.`,
        );
      }
    });
  }

  async assertSelected(label: string, optionLabel: string): Promise<void> {
    const select = (await this.container.findByLabelText(
      label,
    )) as HTMLSelectElement;
    await waitFor(() => {
      const selected = select.selectedOptions[0]?.textContent?.trim();
      if (selected !== optionLabel) {
        throw new Error(
          `assertSelected('${label}', '${optionLabel}'): expected selected option '${optionLabel}', but found '${selected ?? "(none)"}'.`,
        );
      }
    });
  }

  async assertOptions(label: string, optionLabels: string[]): Promise<void> {
    const select = (await this.container.findByLabelText(
      label,
    )) as HTMLSelectElement;
    await waitFor(() => {
      const actual = Array.from(select.querySelectorAll("option")).map(
        (o) => o.textContent?.trim() ?? "",
      );
      const matches =
        actual.length === optionLabels.length &&
        actual.every((text, i) => text === optionLabels[i]);
      if (!matches) {
        throw new Error(
          `assertOptions('${label}'): expected options [${optionLabels.join(", ")}], but found [${actual.join(", ")}].`,
        );
      }
    });
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

  async step(fn: (context: RTLStepContext) => Promise<unknown>): Promise<void> {
    await fn({ user: this.user, container: this.container });
  }

  async within(selector: string): Promise<TestDriver<RTLStepContext>> {
    const element = this.rootElement().querySelector(selector);
    if (!element) throw new Error(`within('${selector}'): element not found`);
    return new RTLDriver(this.user, element as HTMLElement);
  }

  async debug(): Promise<void> {
    screen.debug();
  }
}
