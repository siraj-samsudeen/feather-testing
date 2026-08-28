import type {
  AssertHasOptions,
  AssertPathOptions,
  QueuedStep,
  TestDriver,
} from "./types.js";
import { StepError } from "./errors.js";

export class Session<TContext = unknown> implements PromiseLike<void> {
  private steps: QueuedStep[] = [];
  private executedSteps: QueuedStep[] = [];
  private stepIndex = 0;

  constructor(private driver: TestDriver<TContext>) {}

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

    const wrap: (name: string, fn: () => Promise<void>) => Promise<void> =
      this.driver.wrapStep?.bind(this.driver) ?? ((_name, fn) => fn());

    for (const [i, step] of steps.entries()) {
      try {
        await wrap(step.name, step.action);
        this.executedSteps.push(step);
      } catch (error) {
        // Include steps executed in earlier chains so the full walk is
        // visible even when the user broke the chain across multiple awaits.
        throw new StepError(
          step,
          [...this.executedSteps, ...steps.slice(i)],
          error,
        );
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

  upload(label: string, path: string): this {
    return this.enqueue(`upload('${label}', '${path}')`, () =>
      this.driver.upload(label, path),
    );
  }

  dropFile(selector: string, path: string): this {
    return this.enqueue(`dropFile('${selector}', '${path}')`, () =>
      this.driver.dropFile(selector, path),
    );
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

  assertValue(label: string, value: string): this {
    return this.enqueue(`assertValue('${label}', '${value}')`, () =>
      this.driver.assertValue(label, value),
    );
  }

  assertChecked(label: string): this {
    return this.enqueue(`assertChecked('${label}')`, () =>
      this.driver.assertChecked(label),
    );
  }

  refuteChecked(label: string): this {
    return this.enqueue(`refuteChecked('${label}')`, () =>
      this.driver.refuteChecked(label),
    );
  }

  assertSelected(label: string, optionLabel: string): this {
    return this.enqueue(
      `assertSelected('${label}', '${optionLabel}')`,
      () => this.driver.assertSelected(label, optionLabel),
    );
  }

  assertOptions(label: string, optionLabels: string[]): this {
    const list = optionLabels.map((l) => `'${l}'`).join(", ");
    return this.enqueue(`assertOptions('${label}', [${list}])`, () =>
      this.driver.assertOptions(label, optionLabels),
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

  // --- Escape hatch ---

  /**
   * Queue a named custom step. `fn` receives the adapter's context
   * ({ page, scope } for Playwright, { user, container } for RTL), so a
   * missing verb never forces abandoning the chain. The name shows up in
   * StepError output like any built-in step.
   */
  step(name: string, fn: (context: TContext) => Promise<unknown>): this {
    return this.enqueue(`step('${name}')`, () => this.driver.step(fn));
  }

  // --- Scoping ---

  /**
   * `fn` must either return the scoped session — so its queued steps run — or
   * a promise it already awaited. Returning anything else would silently drop
   * the scoped chain, which is why the callback's return type is not `unknown`.
   */
  within(
    selector: string,
    fn: (scoped: Session<TContext>) => Session<TContext> | PromiseLike<unknown>,
  ): this {
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
