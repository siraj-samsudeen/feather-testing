import { RuleTester } from "eslint";
import { describe, it, expect } from "vitest";
import plugin, { rules, recommendedRules } from "../../src/eslint-plugin/index.js";

// RuleTester drives a test framework's own describe/it when handed them.
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
});

ruleTester.run("no-wait-for-timeout", rules["no-wait-for-timeout"]!, {
  valid: [
    "await session.until('the export finishes', ({ page }) => page.evaluate(() => window.done));",
    "await expect.poll(() => rows.length).toBe(3);",
    "await page.getByText('Done').waitFor();",
    // A timer whose callback does real work is not a sleep.
    "useEffect(() => { const id = setTimeout(() => setReady(true), 120); return () => clearTimeout(id); }, []);",
    "const id = setTimeout(() => refresh(), 50);",
  ],
  invalid: [
    {
      code: "await page.waitForTimeout(500);",
      errors: [{ messageId: "waitForTimeout" }],
    },
    {
      code: "await this.page.waitForTimeout(500);",
      errors: [{ messageId: "waitForTimeout" }],
    },
    {
      code: "await new Promise((resolve) => setTimeout(resolve, 100));",
      errors: [{ messageId: "sleep" }],
    },
    {
      code: "await new Promise((r) => window.setTimeout(r, 100));",
      errors: [{ messageId: "sleep" }],
    },
    {
      code: "await new Promise((resolve) => setTimeout(() => resolve(), 100));",
      errors: [{ messageId: "sleep" }],
    },
  ],
});

ruleTester.run("no-conditional-skip", rules["no-conditional-skip"]!, {
  valid: [
    "test.skip('not implemented yet', async () => {});",
    "test.describe.skip('legacy flow', () => {});",
    "it.skip(`templated name`, async () => {});",
    "test.fixme('flaky on webkit', async () => {});",
    "queue.skip(3);",
  ],
  invalid: [
    {
      code: "test.skip(!process.env.API_URL, 'needs a server');",
      errors: [{ messageId: "conditionalSkip" }],
    },
    {
      code: "test.skip();",
      errors: [{ messageId: "conditionalSkip" }],
    },
    {
      code: "it.skip(isCI);",
      errors: [{ messageId: "conditionalSkip" }],
    },
    {
      code: "test('flow', async function () { this.skip(); });",
      errors: [{ messageId: "conditionalSkip" }],
    },
    {
      code: "test.describe.skip(shouldSkip, () => {});",
      errors: [{ messageId: "conditionalSkip" }],
    },
  ],
});

ruleTester.run("no-weak-assertions", rules["no-weak-assertions"]!, {
  valid: [
    "expect(rows).toHaveLength(3);",
    "expect(user.name).toBe('Ada');",
    "expect(error).toBeInstanceOf(StepError);",
    "expect(el).not.toBeNull();",
    // Not an expect() chain at all.
    "assert(value).toBeTruthy();",
  ],
  invalid: [
    {
      code: "expect(rows).toBeTruthy();",
      errors: [{ messageId: "weak" }],
    },
    {
      code: "expect(user).toBeDefined();",
      errors: [{ messageId: "weak" }],
    },
    {
      code: "expect(value).not.toBeTruthy();",
      errors: [{ messageId: "weak" }],
    },
    {
      code: "await expect(promise).resolves.toBeDefined();",
      errors: [{ messageId: "weak" }],
    },
    {
      code: "expect(value).toBeNull();",
      options: [{ matchers: ["toBeNull"] }],
      errors: [{ messageId: "weak" }],
    },
  ],
});

ruleTester.run(
  "no-swallowed-cleanup-catch",
  rules["no-swallowed-cleanup-catch"]!,
  {
    valid: [
      "await cleanup().catch((e) => { throw new Error('cleanup failed: ' + e.message); });",
      "await cleanup().catch((e) => log(e));",
      "try { risky(); } catch (e) { expect(e.message).toContain('nope'); }",
      "try { risky(); } catch { /* the file may not exist yet */ }",
    ],
    invalid: [
      {
        code: "await server.close().catch(() => {});",
        errors: [{ messageId: "swallowedCatch" }],
      },
      {
        code: "await setup().catch(function () {});",
        errors: [{ messageId: "swallowedCatch" }],
      },
      {
        code: "await rm(dir).catch(() => undefined);",
        errors: [{ messageId: "swallowedCatch" }],
      },
      {
        code: "try { risky(); } catch (e) {}",
        errors: [{ messageId: "emptyCatchBlock" }],
      },
    ],
  },
);

ruleTester.run("warn-serial-mode", rules["warn-serial-mode"]!, {
  valid: [
    "test.describe('checkout', () => {});",
    "test.describe.parallel('checkout', () => {});",
    "test.describe.configure({ mode: 'parallel' });",
    "test.describe.configure({ retries: 2 });",
  ],
  invalid: [
    {
      code: "test.describe.serial('checkout', () => {});",
      errors: [{ messageId: "serial" }],
    },
    {
      code: "describe.serial('checkout', () => {});",
      errors: [{ messageId: "serial" }],
    },
    {
      code: "test.describe.serial.only('checkout', () => {});",
      errors: [{ messageId: "serial" }],
    },
    {
      code: "test.describe.configure({ mode: 'serial' });",
      errors: [{ messageId: "serial" }],
    },
  ],
});

describe("plugin packaging", () => {
  it("exports every rule under the recommended config", () => {
    const configured = Object.keys(recommendedRules).map((name) =>
      name.replace("feather-testing/", ""),
    );
    expect(configured.sort()).toEqual(Object.keys(rules).sort());
  });

  it("ships a flat recommended config that registers the plugin", () => {
    const recommended = plugin.configs.recommended!;
    expect(recommended.plugins).toHaveProperty("feather-testing");
    expect(recommended.rules).toEqual(recommendedRules);
  });

  it("gives every rule a message that names the alternative", () => {
    const alternatives = /session\.until|expect\.poll|test\.fixme|toBe|rethrow|independent/;
    for (const [name, rule] of Object.entries(rules)) {
      const messages = rule.meta?.messages ?? {};
      expect(Object.keys(messages).length, name).toBeGreaterThan(0);
      for (const message of Object.values(messages)) {
        expect(message, name).toMatch(alternatives);
      }
    }
  });
});
