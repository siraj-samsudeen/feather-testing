import type {
  AssertHasOptions,
  AssertPathOptions,
  QueuedStep,
  TestDriver,
} from "./types.js";
import { StepError } from "./errors.js";

export class Session implements PromiseLike<void> {
  private steps: QueuedStep[] = [];
  private stepIndex = 0;

  constructor(private driver: TestDriver) {}

  then<TResult1 = void, TResult2 = never>(
    onfulfilled?:
      | ((value: void) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.executeSteps().then(onfulfilled, onrejected);
  }

  private async executeSteps(): Promise<void> {
    const steps = [...this.steps];
    this.steps = [];

    for (const step of steps) {
      try {
        await step.action();
      } catch (error) {
        throw new StepError(step, steps, error);
      }
    }
  }

  private enqueue(name: string, action: () => Promise<void>): this {
    this.steps.push({ name, action, index: this.stepIndex++ });
    return this;
  }

  // --- Navigation ---

  visit(path: string): this {
    return this.enqueue(`visit('${path}')`, () => this.driver.visit(path));
  }

  // --- Interactions ---

  click(text: string): this {
    return this.enqueue(`click('${text}')`, () => this.driver.click(text));
  }

  clickLink(text: string): this {
    return this.enqueue(`clickLink('${text}')`, () =>
      this.driver.clickLink(text),
    );
  }

  clickButton(text: string): this {
    return this.enqueue(`clickButton('${text}')`, () =>
      this.driver.clickButton(text),
    );
  }

  fillIn(label: string, value: string): this {
    return this.enqueue(`fillIn('${label}', '${value}')`, () =>
      this.driver.fillIn(label, value),
    );
  }

  selectOption(label: string, option: string): this {
    return this.enqueue(`selectOption('${label}', '${option}')`, () =>
      this.driver.selectOption(label, option),
    );
  }

  check(label: string): this {
    return this.enqueue(`check('${label}')`, () => this.driver.check(label));
  }

  uncheck(label: string): this {
    return this.enqueue(`uncheck('${label}')`, () =>
      this.driver.uncheck(label),
    );
  }

  choose(label: string): this {
    return this.enqueue(`choose('${label}')`, () =>
      this.driver.choose(label),
    );
  }

  submit(): this {
    return this.enqueue("submit()", () => this.driver.submit());
  }

  // --- Assertions ---

  assertText(text: string): this {
    return this.enqueue(`assertText('${text}')`, () =>
      this.driver.assertText(text),
    );
  }

  refuteText(text: string): this {
    return this.enqueue(`refuteText('${text}')`, () =>
      this.driver.refuteText(text),
    );
  }

  assertHas(selector: string, opts?: AssertHasOptions): this {
    const desc = opts?.text
      ? `assertHas('${selector}', text: '${opts.text}')`
      : `assertHas('${selector}')`;
    return this.enqueue(desc, () => this.driver.assertHas(selector, opts));
  }

  refuteHas(selector: string, opts?: AssertHasOptions): this {
    const desc = opts?.text
      ? `refuteHas('${selector}', text: '${opts.text}')`
      : `refuteHas('${selector}')`;
    return this.enqueue(desc, () => this.driver.refuteHas(selector, opts));
  }

  assertPath(path: string, opts?: AssertPathOptions): this {
    return this.enqueue(`assertPath('${path}')`, () =>
      this.driver.assertPath(path, opts),
    );
  }

  refutePath(path: string): this {
    return this.enqueue(`refutePath('${path}')`, () =>
      this.driver.refutePath(path),
    );
  }

  // --- Scoping ---

  within(selector: string, fn: (scoped: Session) => Session): this {
    return this.enqueue(`within('${selector}')`, async () => {
      const scopedDriver = await this.driver.within(selector);
      const scopedSession = new Session(scopedDriver);
      await fn(scopedSession);
    });
  }

  // --- Debug ---

  debug(): this {
    return this.enqueue("debug()", () => this.driver.debug());
  }
}
