export interface AssertHasOptions {
  text?: string;
  count?: number;
  exact?: boolean;
  timeout?: number;
}

export interface AssertPathOptions {
  queryParams?: Record<string, string>;
}

export interface QueuedStep {
  name: string;
  action: () => Promise<void>;
  index: number;
}

export interface TestDriver {
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
  assertHas(selector: string, opts?: AssertHasOptions): Promise<void>;
  refuteHas(selector: string, opts?: AssertHasOptions): Promise<void>;
  assertText(text: string): Promise<void>;
  refuteText(text: string): Promise<void>;
  assertPath(path: string, opts?: AssertPathOptions): Promise<void>;
  refutePath(path: string): Promise<void>;
  within(selector: string): Promise<TestDriver>;
  debug(): Promise<void>;
}
