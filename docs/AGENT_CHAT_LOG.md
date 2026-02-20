# feather-testing — Project Dialogue

## Origin: "Can we make JS tests look like Phoenix Test?" (2025-02-20)

Started from a comparison of Phoenix Test's pipe-chain syntax vs our Playwright/RTL tests in the starter-pack. The Phoenix Test example that sparked everything:

```elixir
conn
|> visit(projects_path())
|> click_link("New Project")
|> fill_in("Name", with: "Test Project 1")
|> submit()
|> assert_text("Test Project 1")
```

vs our Playwright equivalent:

```ts
await page.goto("/");
await page.getByPlaceholder("Email").fill("e2e@example.com");
await page.getByRole("button", { name: "Sign up" }).click();
await expect(page.getByText("Hello! You are signed in.")).toBeVisible();
```

**Q: Is this feasible in JS/TS without a pipe operator?**
A: Yes — thenable action-queue pattern. A class that queues operations, returns `this` from every method, and implements `PromiseLike<void>` so the whole chain is `await`-able. Same pattern as [playwright-fluent](https://github.com/hdorgeval/playwright-fluent).

## Decision: Scope — Both Playwright + RTL

**Q: Playwright only first, or both adapters?**
Walked through before/after examples for both. Playwright gets the biggest noise reduction (every line is cleaner). RTL gets a moderate win (mainly assertion wrapping + removing `userEvent.setup()` boilerplate). Decided: **build both, Playwright first then RTL**.

**Q: Should the RTL adapter match the full API?**
A: **Subset only.** `visit()`, `assertPath()`, `refutePath()` don't apply in JSDOM — they throw clear errors rather than silently no-op. `assertHas()`/`refuteHas()` with CSS selectors also throw (against RTL philosophy). Keeps the surface honest.

## Decision: Prototype in starter-pack copy

Copied `_archive/benchmark/starter-pack/` to `feather-testing-trial/` to avoid touching the original. All prototyping happened there. Verified existing tests (7 vitest + 1 playwright) passed before making any changes.

## Milestone: Playwright adapter working

Built 5 core files in `e2e/feather-test/`: types, errors, session, playwright-driver, index.

First run failed — `clickLink("Sign up instead")` timed out because the element is a `<span onClick>`, not an `<a>`. Phoenix Test doesn't need a generic `click()` because LiveView apps use proper semantic elements. We do. Added `click(text)` to both Session and TestDriver.

Second run: **1 passed (1.1s)**.

Error output on the first failure was excellent — the `StepError` chain trace showed exactly which step failed:

```
    [ok] visit('/')
    [ok] assertText('Hello, Anonymous!')
>>> [FAILED] clickLink('Sign up instead')
    [skipped] fillIn('Email', 'e2e@example.com')
```

## Milestone: RTL adapter working

Built `RTLDriver` with subset API. Key difference from Playwright: uses `findByText` (async with retry) for assertions, `userEvent.type()` for input (keystroke-by-keystroke, hence ~2s per form fill test).

**All 7 vitest tests passed** on first try.

## Decision: Standalone package, not inside convex-test-provider

**Q: Where should this live?**
Four options considered:
1. Standalone package (`feather-testing`) — clean separation, reusable beyond Convex
2. Subpath of `convex-test-provider` — single install but couples generic DSL to Convex
3. Monorepo — shared dev but overkill for two small packages
4. Local only — zero overhead but no sharing

Chose **standalone** because the DSL has nothing to do with Convex. Non-Convex apps can use it directly.

## Decision: Package naming

**Q: `feather-test` vs `feather-testing` vs `feather-flow`?**
A: **`feather-testing`** — matches the hierarchy: `feather-testing` is generic, `feather-testing-convex` extends it for Convex, future `feather-testing-instantdb` for InstantDB, etc.

## Milestone: Package extracted and verified

Created `NonDropBoxProjects/feather-testing/` with:
- `src/` — core (session, types, errors) + playwright/ + rtl/ adapters
- Three subpath exports: `.`, `./playwright`, `./rtl`
- `tsc` build, 6.4 kB packed, zero runtime deps

Hit dual-Playwright-load error when using `npm install ../feather-testing` (symlink). Fixed by using `npm pack` + tarball install. Updated `feather-testing-trial` imports from local files to package imports.

**Final: all 8 tests pass** (7 vitest + 1 playwright) importing from the `feather-testing` package.

## Next: Wrap in feather-testing-convex

Decided that `feather-testing-convex` should depend on and wrap `feather-testing` to provide batteries-included Convex testing. New exports planned:
- `feather-testing-convex/playwright` — session fixture with auto Convex cleanup
- `feather-testing-convex/rtl` — `renderWithSession()` combining render + session creation

See [HANDOFF.md](../HANDOFF.md) for detailed implementation plan.

---

Last updated: 2025-02-20
