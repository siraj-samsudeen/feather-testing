# feather-testing

Part of the [Feather Framework](https://github.com/siraj-samsudeen/feather-framework) ecosystem.

Phoenix Test-inspired fluent testing DSL for Playwright and React Testing Library.

Write browser tests that read like user stories:

```ts
await session
  .visit("/projects")
  .clickLink("New Project")
  .fillIn("Name", "My Project")
  .submit()
  .assertText("My Project");
```

Inspired by [Phoenix Test](https://hexdocs.pm/phoenix_test/PhoenixTest.html) — Elixir's pipe-chain testing DSL.

## Installation

```bash
npm install feather-testing
```

All test framework dependencies are optional peers — install only what you use:

```bash
# For Playwright E2E tests
npm install @playwright/test

# For React Testing Library integration tests
npm install @testing-library/react @testing-library/user-event
```

## Usage

### Playwright E2E

```ts
// e2e/fixtures.ts
import { test as featherTest } from "feather-testing/playwright";
export const test = featherTest;
export { expect } from "@playwright/test";
```

```ts
// e2e/auth.spec.ts
import { test } from "./fixtures";

test("full auth lifecycle", async ({ session }) => {
  // Sign up
  await session
    .visit("/")
    .assertText("Hello, Anonymous!")
    .click("Sign up instead")
    .fillIn("Email", "e2e@example.com")
    .fillIn("Password", "password123")
    .clickButton("Sign up")
    .assertText("Hello! You are signed in.");

  // Sign out
  await session
    .clickButton("Sign out")
    .assertText("Hello, Anonymous!");

  // Sign in
  await session
    .fillIn("Email", "e2e@example.com")
    .fillIn("Password", "password123")
    .clickButton("Sign in")
    .assertText("Hello! You are signed in.");
});
```

### React Testing Library

```ts
import { createSession } from "feather-testing/rtl";

test("form submission", async () => {
  render(<App />);
  const session = createSession();

  await session
    .fillIn("Email", "test@example.com")
    .fillIn("Password", "password123")
    .clickButton("Sign in")
    .assertText("Hello! You are signed in.");
});
```

## API

Every method returns `this` for chaining. A single `await` at the start of the chain executes all steps sequentially.

### Navigation

| Method | Description |
|--------|-------------|
| `visit(path)` | Navigate to URL (Playwright only) |

### Interactions

| Method | Description |
|--------|-------------|
| `click(text)` | Find any element by text and click it |
| `clickLink(text)` | Click `<a>` by accessible name |
| `clickButton(text)` | Click `<button>` by accessible name |
| `fillIn(label, value)` | Fill input by label or placeholder |
| `selectOption(label, option)` | Select dropdown option by label |
| `check(label)` / `uncheck(label)` | Toggle checkbox by label |
| `choose(label)` | Select radio button by label |
| `submit()` | Submit the most recently interacted form |

### Assertions

| Method | Description |
|--------|-------------|
| `assertText(text)` / `refuteText(text)` | Assert text is visible / not visible |
| `assertHas(selector, opts?)` / `refuteHas(...)` | Assert element exists (Playwright only) |
| `assertPath(path, opts?)` / `refutePath(path)` | Assert URL path (Playwright only) |

### Scoping

| Method | Description |
|--------|-------------|
| `within(selector, fn)` | Scope actions to a container element |

### Debug

| Method | Description |
|--------|-------------|
| `debug()` | Screenshot (Playwright) or log DOM (RTL) |

## How It Works

The `Session` class uses a **thenable action-queue pattern**. Each method pushes an async operation onto an internal queue and returns `this`. The class implements `PromiseLike<void>`, so `await` triggers execution of the entire queue.

```
session.visit("/").fillIn("Name", "x").clickButton("Go")
       ↓              ↓                    ↓
    [push thunk]  [push thunk]        [push thunk]
                                           ↓
                                    await triggers
                                    sequential execution
```

This means you write one `await` per chain, not one per line.

### Breaking chains

If you need conditional logic mid-flow, break into multiple chains:

```ts
await session.visit("/").fillIn("Email", email);

if (isNewUser) {
  await session.click("Sign up instead").clickButton("Sign up");
} else {
  await session.clickButton("Sign in");
}
```

### Composable helpers

Functions that take and return a Session work as reusable steps:

```ts
function signIn(session: Session, email: string, password: string): Session {
  return session
    .fillIn("Email", email)
    .fillIn("Password", password)
    .clickButton("Sign in");
}

test("authenticated flow", async ({ session }) => {
  await signIn(session.visit("/"), "test@example.com", "pass123")
    .assertText("Welcome!");
});
```

## Error Messages

When a step fails, `StepError` shows the full chain with status markers:

```
feather-testing: Step 4 of 6 failed

Failed at: clickButton('Sign up')
Cause: locator.click: getByRole('button', { name: 'Sign up' }) resolved to 0 elements

Chain:
    [ok] visit('/')
    [ok] assertText('Hello, Anonymous!')
    [ok] fillIn('Email', 'e2e@example.com')
>>> [FAILED] clickButton('Sign up')
    [skipped] fillIn('Password', 'password123')
    [skipped] assertText('Hello! You are signed in.')
```

## RTL Adapter Limitations

The RTL adapter runs in JSDOM, which has no real browser. These methods are not available and will throw:

- `visit()` — render the component directly instead
- `assertPath()` / `refutePath()` — no URL in JSDOM
- `assertHas()` / `refuteHas()` — RTL discourages CSS selectors; use `assertText()` instead

## Exports

```ts
// Core types (for building custom drivers)
import { Session, StepError, type TestDriver } from "feather-testing";

// Playwright adapter
import { test, createSession, expect } from "feather-testing/playwright";

// RTL adapter
import { createSession } from "feather-testing/rtl";
```

## License

MIT
