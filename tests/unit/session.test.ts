import { describe, it, expect, vi } from "vitest";
import { Session } from "../../src/session.js";
import { StepError } from "../../src/errors.js";
import type { TestDriver } from "../../src/types.js";

/**
 * Creates a mock TestDriver that records all method calls.
 * Every method resolves successfully unless overridden.
 */
function createMockDriver(overrides?: Partial<TestDriver>): {
  driver: TestDriver;
  calls: string[];
} {
  const calls: string[] = [];

  const handler = (name: string) => {
    return (...args: unknown[]) => {
      calls.push(`${name}(${args.map((a) => JSON.stringify(a)).join(", ")})`);
      return Promise.resolve();
    };
  };

  const driver: TestDriver = {
    visit: vi.fn(handler("visit")),
    click: vi.fn(handler("click")),
    clickLink: vi.fn(handler("clickLink")),
    clickButton: vi.fn(handler("clickButton")),
    fillIn: vi.fn(handler("fillIn")),
    selectOption: vi.fn(handler("selectOption")),
    check: vi.fn(handler("check")),
    uncheck: vi.fn(handler("uncheck")),
    choose: vi.fn(handler("choose")),
    submit: vi.fn(handler("submit")),
    upload: vi.fn(handler("upload")),
    dropFile: vi.fn(handler("dropFile")),
    assertText: vi.fn(handler("assertText")),
    refuteText: vi.fn(handler("refuteText")),
    assertValue: vi.fn(handler("assertValue")),
    assertChecked: vi.fn(handler("assertChecked")),
    refuteChecked: vi.fn(handler("refuteChecked")),
    assertSelected: vi.fn(handler("assertSelected")),
    assertOptions: vi.fn(handler("assertOptions")),
    assertHas: vi.fn(handler("assertHas")),
    refuteHas: vi.fn(handler("refuteHas")),
    assertPath: vi.fn(handler("assertPath")),
    refutePath: vi.fn(handler("refutePath")),
    step: vi.fn(async (fn: (context: unknown) => Promise<unknown>) => {
      calls.push("step");
      await fn({ mock: true });
    }),
    within: vi.fn(async (selector: string) => {
      calls.push(`within(${JSON.stringify(selector)})`);
      // Return a new mock driver for the scoped session
      return createMockDriver().driver;
    }),
    debug: vi.fn(handler("debug")),
    ...overrides,
  };

  return { driver, calls };
}

describe("Session", () => {
  describe("chaining", () => {
    it("every method returns the same session instance", () => {
      const { driver } = createMockDriver();
      const session = new Session(driver);

      // Each method should return `this`
      const result = session
        .visit("/")
        .click("text")
        .clickLink("link")
        .clickButton("btn")
        .fillIn("label", "value")
        .selectOption("label", "option")
        .check("label")
        .uncheck("label")
        .choose("label")
        .submit()
        .upload("label", "path.txt")
        .dropFile(".zone", "path.txt")
        .assertText("text")
        .refuteText("text")
        .assertValue("label", "value")
        .assertChecked("label")
        .refuteChecked("label")
        .assertSelected("label", "option")
        .assertOptions("label", ["a", "b"])
        .assertHas("selector")
        .refuteHas("selector")
        .assertPath("/path")
        .refutePath("/path")
        .step("custom", async () => {})
        .debug();

      // result is the same session (not yet awaited)
      expect(result).toBe(session);
    });
  });

  describe("queue execution", () => {
    it("executes all steps in order when awaited", async () => {
      const { driver, calls } = createMockDriver();
      const session = new Session(driver);

      await session
        .visit("/")
        .fillIn("Email", "test@example.com")
        .clickButton("Sign in")
        .assertText("Welcome");

      expect(calls).toEqual([
        'visit("/")',
        'fillIn("Email", "test@example.com")',
        'clickButton("Sign in")',
        'assertText("Welcome")',
      ]);
    });

    it("does nothing without await", async () => {
      const { driver, calls } = createMockDriver();
      const session = new Session(driver);

      // No await — just chain
      session.visit("/").clickButton("Go");

      // Wait a tick to make sure nothing ran
      await new Promise((r) => setTimeout(r, 10));
      expect(calls).toEqual([]);
    });

    it("resets the queue after await, allowing a second chain", async () => {
      const { driver, calls } = createMockDriver();
      const session = new Session(driver);

      await session.visit("/").fillIn("Name", "Alice");
      expect(calls).toEqual(['visit("/")', 'fillIn("Name", "Alice")']);

      calls.length = 0; // reset tracking

      await session.clickButton("Submit").assertText("Done");
      expect(calls).toEqual(['clickButton("Submit")', 'assertText("Done")']);
    });

    it("resolves without error for empty chain", async () => {
      const { driver } = createMockDriver();
      const session = new Session(driver);
      await session; // no steps
    });

    it("passes correct arguments to each driver method", async () => {
      const { driver } = createMockDriver();
      const session = new Session(driver);

      await session
        .visit("/path")
        .click("some text")
        .clickLink("my link")
        .clickButton("my button")
        .fillIn("Email", "a@b.com")
        .selectOption("Color", "Red")
        .check("Newsletter")
        .uncheck("Ads")
        .choose("Plan A")
        .submit()
        .upload("Avatar", "avatar.png")
        .dropFile("#zone", "doc.pdf")
        .assertText("Hello")
        .refuteText("Goodbye")
        .assertValue("Email", "a@b.com")
        .assertChecked("Newsletter")
        .refuteChecked("Ads")
        .assertSelected("Color", "Red")
        .assertOptions("Color", ["Red", "Blue"])
        .assertHas("div.card", { text: "hi", count: 2 })
        .refuteHas("span.error")
        .assertPath("/done", { queryParams: { id: "1" } })
        .refutePath("/login")
        .debug();

      expect(driver.visit).toHaveBeenCalledWith("/path");
      expect(driver.click).toHaveBeenCalledWith("some text");
      expect(driver.clickLink).toHaveBeenCalledWith("my link");
      expect(driver.clickButton).toHaveBeenCalledWith("my button");
      expect(driver.fillIn).toHaveBeenCalledWith("Email", "a@b.com");
      expect(driver.selectOption).toHaveBeenCalledWith("Color", "Red");
      expect(driver.check).toHaveBeenCalledWith("Newsletter");
      expect(driver.uncheck).toHaveBeenCalledWith("Ads");
      expect(driver.choose).toHaveBeenCalledWith("Plan A");
      expect(driver.submit).toHaveBeenCalled();
      expect(driver.upload).toHaveBeenCalledWith("Avatar", "avatar.png");
      expect(driver.dropFile).toHaveBeenCalledWith("#zone", "doc.pdf");
      expect(driver.assertText).toHaveBeenCalledWith("Hello");
      expect(driver.refuteText).toHaveBeenCalledWith("Goodbye");
      expect(driver.assertValue).toHaveBeenCalledWith("Email", "a@b.com");
      expect(driver.assertChecked).toHaveBeenCalledWith("Newsletter");
      expect(driver.refuteChecked).toHaveBeenCalledWith("Ads");
      expect(driver.assertSelected).toHaveBeenCalledWith("Color", "Red");
      expect(driver.assertOptions).toHaveBeenCalledWith("Color", [
        "Red",
        "Blue",
      ]);
      expect(driver.assertHas).toHaveBeenCalledWith("div.card", {
        text: "hi",
        count: 2,
      });
      expect(driver.refuteHas).toHaveBeenCalledWith("span.error", undefined);
      expect(driver.assertPath).toHaveBeenCalledWith("/done", {
        queryParams: { id: "1" },
      });
      expect(driver.refutePath).toHaveBeenCalledWith("/login");
      expect(driver.debug).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("wraps a failing step in StepError", async () => {
      const { driver } = createMockDriver({
        clickButton: vi.fn(async () => {
          throw new Error("button not found");
        }),
      });
      const session = new Session(driver);

      await expect(
        session.visit("/").clickButton("Go").assertText("Done"),
      ).rejects.toThrow(StepError);
    });

    it("StepError contains the correct step number", async () => {
      const { driver } = createMockDriver({
        assertText: vi.fn(async () => {
          throw new Error("text not found");
        }),
      });
      const session = new Session(driver);

      try {
        await session.visit("/").fillIn("Name", "x").assertText("Done");
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(StepError);
        expect((e as StepError).message).toContain("Step 3 of 3 failed");
      }
    });

    it("stops execution after a failure (skips remaining steps)", async () => {
      const { driver, calls } = createMockDriver({
        clickButton: vi.fn(async () => {
          throw new Error("fail");
        }),
      });
      const session = new Session(driver);

      try {
        await session
          .visit("/")
          .clickButton("Go")
          .assertText("Done")
          .assertPath("/done");
      } catch {
        // expected
      }

      // visit ran, clickButton ran (and threw), rest were skipped
      expect(calls).toEqual(['visit("/")']);
      // clickButton was called but it's not in `calls` because the mock override doesn't push to calls
      expect(driver.clickButton).toHaveBeenCalled();
      expect(driver.assertText).not.toHaveBeenCalled();
      expect(driver.assertPath).not.toHaveBeenCalled();
    });

    it("StepError message includes skipped steps", async () => {
      const { driver } = createMockDriver({
        fillIn: vi.fn(async () => {
          throw new Error("input not found");
        }),
      });
      const session = new Session(driver);

      try {
        await session
          .visit("/")
          .fillIn("Name", "x")
          .clickButton("Go")
          .assertText("Done");
        expect.fail("should have thrown");
      } catch (e) {
        const msg = (e as StepError).message;
        expect(msg).toContain("[ok] visit('/')");
        expect(msg).toContain("[FAILED] fillIn('Name', 'x')");
        expect(msg).toContain("[skipped] clickButton('Go')");
        expect(msg).toContain("[skipped] assertText('Done')");
      }
    });

    it("preserves the original error as cause", async () => {
      const originalError = new Error("original");
      const { driver } = createMockDriver({
        visit: vi.fn(async () => {
          throw originalError;
        }),
      });
      const session = new Session(driver);

      try {
        await session.visit("/");
        expect.fail("should have thrown");
      } catch (e) {
        expect((e as StepError).cause).toBe(originalError);
      }
    });
  });

  describe("within()", () => {
    it("calls driver.within with the selector and executes scoped actions", async () => {
      const scopedCalls: string[] = [];
      const scopedDriver: TestDriver = {
        ...createMockDriver().driver,
        clickButton: vi.fn(async (text: string) => {
          scopedCalls.push(`clickButton(${text})`);
        }),
        assertText: vi.fn(async (text: string) => {
          scopedCalls.push(`assertText(${text})`);
        }),
      };

      const { driver, calls } = createMockDriver({
        within: vi.fn(async (selector: string) => {
          calls.push(`within(${JSON.stringify(selector)})`);
          return scopedDriver;
        }),
      });
      const session = new Session(driver);

      await session.within(".sidebar", (s) =>
        s.clickButton("Settings").assertText("Preferences"),
      );

      expect(calls).toEqual(['within(".sidebar")']);
      expect(scopedCalls).toEqual([
        "clickButton(Settings)",
        "assertText(Preferences)",
      ]);
    });

    it("continues the parent chain after within()", async () => {
      const { driver, calls } = createMockDriver();
      const session = new Session(driver);

      await session
        .visit("/")
        .within(".sidebar", (s) => s.clickButton("Go"))
        .assertText("Done");

      expect(calls[0]).toBe('visit("/")');
      // within is calls[1]
      expect(calls[2]).toBe('assertText("Done")');
    });
  });

  describe("step() escape hatch", () => {
    it("passes the driver-provided context to the callback", async () => {
      const { driver } = createMockDriver();
      const session = new Session(driver);

      let received: unknown;
      await session.step("custom work", async (context) => {
        received = context;
      });

      expect(received).toEqual({ mock: true });
      expect(driver.step).toHaveBeenCalled();
    });

    it("shows the step name in StepError when it fails", async () => {
      const { driver } = createMockDriver({
        step: vi.fn(async (fn: (context: unknown) => Promise<unknown>) => {
          await fn({});
        }),
      });
      const session = new Session(driver);

      try {
        await session.visit("/").step("drag the card", async () => {
          throw new Error("drag failed");
        });
        expect.fail("should have thrown");
      } catch (e) {
        const msg = (e as StepError).message;
        expect(msg).toContain(">>> [FAILED] step('drag the card')");
        expect(msg).toContain("Cause: drag failed");
      }
    });
  });

  describe("session-level step history", () => {
    it("includes steps from earlier chains in StepError", async () => {
      const { driver } = createMockDriver({
        assertText: vi.fn(async () => {
          throw new Error("fail");
        }),
      });
      const session = new Session(driver);

      // First chain: 2 steps (indices 0, 1)
      await session.visit("/").clickButton("Go");

      // Second chain fails: StepError shows the full walk across chains
      try {
        await session.fillIn("Name", "x").assertText("Done");
        expect.fail("should have thrown");
      } catch (e) {
        const msg = (e as StepError).message;
        expect(msg).toContain("Step 4 of 4 failed");
        expect(msg).toContain("    [ok] visit('/')");
        expect(msg).toContain("    [ok] clickButton('Go')");
        expect(msg).toContain("    [ok] fillIn('Name', 'x')");
        expect(msg).toContain(">>> [FAILED] assertText('Done')");
      }
    });

    it("marks steps after the failure as skipped across chains", async () => {
      const { driver } = createMockDriver({
        fillIn: vi.fn(async () => {
          throw new Error("input not found");
        }),
      });
      const session = new Session(driver);

      await session.visit("/");

      try {
        await session.fillIn("Name", "x").clickButton("Go");
        expect.fail("should have thrown");
      } catch (e) {
        const msg = (e as StepError).message;
        expect(msg).toContain("Step 2 of 3 failed");
        expect(msg).toContain("    [ok] visit('/')");
        expect(msg).toContain(">>> [FAILED] fillIn('Name', 'x')");
        expect(msg).toContain("    [skipped] clickButton('Go')");
      }
    });
  });

  describe("wrapStep hook", () => {
    it("wraps each step execution when the driver provides wrapStep", async () => {
      const wrapped: string[] = [];
      const { driver } = createMockDriver();
      driver.wrapStep = vi.fn(
        async (name: string, fn: () => Promise<void>) => {
          wrapped.push(name);
          await fn();
        },
      );
      const session = new Session(driver);

      await session.visit("/").clickButton("Go");

      expect(wrapped).toEqual(["visit('/')", "clickButton('Go')"]);
    });
  });
});
