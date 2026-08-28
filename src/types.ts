export interface AssertHasOptions {
  text?: string;
  count?: number;
  exact?: boolean;
  timeout?: number;
}

export interface AssertPathOptions {
  queryParams?: Record<string, string>;
}

export interface UntilOptions {
  /** Overall budget in ms. Defaults to the adapter's own wait timeout. */
  timeout?: number;
  /** Gap between polls in ms. Defaults to the adapter's own cadence. */
  interval?: number;
}

export interface QueuedStep {
  name: string;
  action: () => Promise<void>;
  index: number;
}

/** A condition polled by `until()`; may be sync or async. */
export type UntilPredicate<TContext> = (
  context: TContext,
) => unknown | Promise<unknown>;

/**
 * TContext is the adapter-specific context handed to custom step() callbacks
 * (e.g. { page, scope } for Playwright, { user, container } for RTL).
 */
export interface TestDriver<TContext = unknown> {
  visit(path: string): Promise<void>;
  click(text: string): Promise<void>;
  clickLink(text: string): Promise<void>;
  clickButton(text: string): Promise<void>;
  fillIn(label: string, value: string): Promise<void>;
  selectOption(label: string, option: string): Promise<void>;
  check(label: string): Promise<void>;
  uncheck(label: string): Promise<void>;
  choose(label: string): Promise<void>;
  submit(): Promise<void>;
  upload(label: string, path: string): Promise<void>;
  dropFile(selector: string, path: string): Promise<void>;
  assertHas(selector: string, opts?: AssertHasOptions): Promise<void>;
  refuteHas(selector: string, opts?: AssertHasOptions): Promise<void>;
  assertText(text: string): Promise<void>;
  refuteText(text: string): Promise<void>;
  assertValue(label: string, value: string): Promise<void>;
  assertChecked(label: string): Promise<void>;
  refuteChecked(label: string): Promise<void>;
  assertSelected(label: string, optionLabel: string): Promise<void>;
  assertOptions(label: string, optionLabels: string[]): Promise<void>;
  assertPath(path: string, opts?: AssertPathOptions): Promise<void>;
  refutePath(path: string): Promise<void>;
  /**
   * Poll `predicate` until it returns something truthy, or fail once the
   * timeout is spent. `description` is what the chain trace prints, so it
   * has to say what is being awaited in plain language.
   */
  until(
    description: string,
    predicate: UntilPredicate<TContext>,
    opts?: UntilOptions,
  ): Promise<void>;
  step(fn: (context: TContext) => Promise<unknown>): Promise<void>;
  within(selector: string): Promise<TestDriver<TContext>>;
  debug(): Promise<void>;
  /**
   * Optional hook: wrap a queued step's execution (e.g. in Playwright's
   * test.step()) so chains appear in trace viewers and reporters.
   */
  wrapStep?(name: string, fn: () => Promise<void>): Promise<void>;
}
