import { test, expect } from "./fixtures.js";
import { PlaywrightDriver } from "../../src/playwright/driver.js";
import { Session } from "../../src/session.js";
import { StepError } from "../../src/errors.js";
import type { TestDriver } from "../../src/types.js";

test.describe("PlaywrightDriver", () => {
  test.describe("visit()", () => {
    test("navigates to a URL", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/");
      await expect(page.locator("h1")).toHaveText("Home");
    });

    test("navigates to different pages", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/about");
      await expect(page.locator("h1")).toHaveText("About");
    });
  });

  test.describe("click()", () => {
    test("finds and clicks an element by text", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/");
      await driver.click("Click me");
      await expect(page.locator("#msg")).toHaveText("Clicked!");
    });
  });

  test.describe("clickLink()", () => {
    test("clicks a link by accessible name", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/");
      await driver.clickLink("About");
      await expect(page.locator("h1")).toHaveText("About");
    });
  });

  test.describe("clickButton()", () => {
    test("clicks a button by accessible name", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/");
      await driver.clickButton("Click me");
      await expect(page.locator("#msg")).toHaveText("Clicked!");
    });
  });

  test.describe("fillIn()", () => {
    test("fills an input by label", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.fillIn("Name", "Alice");
      await expect(page.getByLabel("Name")).toHaveValue("Alice");
    });

    test("falls back to placeholder when label not found", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.fillIn("Nickname", "Ali");
      await expect(page.getByPlaceholder("Nickname")).toHaveValue("Ali");
    });

    test("replaces existing value", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.fillIn("Name", "Alice");
      await driver.fillIn("Name", "Bob");
      await expect(page.getByLabel("Name")).toHaveValue("Bob");
    });

    test("waits for an async-rendered labeled field", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/delayed-field");
      // Field appears 300ms after load; .or() auto-waits instead of
      // falling through to the placeholder branch.
      await driver.fillIn("Late Field", "made it");
      await expect(page.getByLabel("Late Field")).toHaveValue("made it");
    });
  });

  test.describe("selectOption()", () => {
    test("selects a dropdown option by visible label text", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.selectOption("Favorite Color", "Blue");
      await expect(page.getByLabel("Favorite Color")).toHaveValue("b");
    });
  });

  test.describe("check() / uncheck()", () => {
    test("checks an unchecked checkbox", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.check("Subscribe to newsletter");
      await expect(page.getByLabel("Subscribe to newsletter")).toBeChecked();
    });

    test("does not uncheck an already checked checkbox when check() is called", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      // "Receive ads" is checked by default
      await driver.check("Receive ads");
      await expect(page.getByLabel("Receive ads")).toBeChecked();
    });

    test("unchecks a checked checkbox", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.uncheck("Receive ads");
      await expect(page.getByLabel("Receive ads")).not.toBeChecked();
    });
  });

  test.describe("choose()", () => {
    test("selects a radio button by label", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.choose("Pro");
      await expect(
        page.getByRole("radio", { name: "Pro" }),
      ).toBeChecked();
    });
  });

  test.describe("submit()", () => {
    test("finds submit button by accessible name containing 'submit'", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/submit-by-name");
      await driver.fillIn("Value", "test");
      await driver.submit();
      await expect(page.locator("#r")).toHaveText("Done!");
    });

    test("finds submit button by type='submit'", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/submit-by-type");
      await driver.fillIn("Value", "test");
      await driver.submit();
      await expect(page.locator("#r")).toHaveText("Done!");
    });

    test("falls back to pressing Enter when no submit button", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/submit-enter");
      await driver.fillIn("Value", "test");
      await driver.submit();
      await expect(page.locator("#r")).toHaveText("Done!");
    });

    test("throws when no form was previously interacted with", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await expect(driver.submit()).rejects.toThrow(
        "submit() called but no form was previously interacted with",
      );
    });

    test("prefers type='submit' over accessible name containing 'submit'", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/submit-precedence");
      await driver.fillIn("Value", "test");
      await driver.submit();
      await expect(page.locator("#r")).toHaveText("Saved!");
    });
  });

  test.describe("upload()", () => {
    test("sets a file input by label", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/upload");
      await driver.upload("Avatar", "package.json");
      await expect(page.locator("#uploaded")).toContainText(
        "Uploaded: package.json",
      );
    });
  });

  test.describe("dropFile()", () => {
    test("dispatches a DataTransfer drop on a selector", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/upload");
      await driver.dropFile("#dropzone", "package.json");
      await expect(page.locator("#dropped")).toContainText(
        "Dropped: package.json",
      );
      // Real file content was transferred, not an empty placeholder
      await expect(page.locator("#dropped")).not.toContainText("(0 bytes)");
    });
  });

  test.describe("assertText() / refuteText()", () => {
    test("assertText passes when text is visible", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/");
      await driver.assertText("Welcome to the home page");
    });

    test("assertText fails when text is not present", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/");
      await expect(driver.assertText("Nonexistent text")).rejects.toThrow();
    });

    test("refuteText passes when text is not present", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/");
      await driver.refuteText("Nonexistent text");
    });

    test("refuteText fails when text is visible", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/");
      await expect(
        driver.refuteText("Welcome to the home page"),
      ).rejects.toThrow();
    });
  });

  test.describe("assertHas() / refuteHas()", () => {
    test("assertHas passes when element exists", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/multi");
      await driver.assertHas("li.item");
    });

    test("assertHas with count", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/multi");
      await driver.assertHas("li.item", { count: 3 });
    });

    test("assertHas with count fails on wrong count", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/multi");
      await expect(
        driver.assertHas("li.item", { count: 5, timeout: 1000 }),
      ).rejects.toThrow();
    });

    test("assertHas with text filter", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/multi");
      await driver.assertHas(".card", { text: "Overdue" });
    });

    test("assertHas with text and count", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/multi");
      // Only one card contains "Overdue"
      await driver.assertHas(".card", { text: "Overdue", count: 1 });
    });

    test("assertHas with exact text", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/multi");
      // "task" as regex matches all 3 cards
      await driver.assertHas(".card", { text: "task", count: 3 });
      // "task" as exact substring also matches all 3
      await driver.assertHas(".card", {
        text: "task",
        exact: true,
        count: 3,
      });
    });

    test("assertHas fails when element not found", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/multi");
      await expect(
        driver.assertHas(".nonexistent", { timeout: 1000 }),
      ).rejects.toThrow();
    });

    test("refuteHas passes when element does not exist", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/multi");
      await driver.refuteHas(".nonexistent");
    });

    test("refuteHas fails when element exists", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/multi");
      await expect(
        driver.refuteHas("li.item", { timeout: 1000 }),
      ).rejects.toThrow();
    });

    test("refuteHas with text filter", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/multi");
      // No card with text "Deleted"
      await driver.refuteHas(".card", { text: "Deleted" });
    });

    test("refuteHas respects exact option", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/multi");
      // "Important" as regex matches the card with "Important task"
      await expect(
        driver.refuteHas(".card", {
          text: "Important",
          exact: false,
          timeout: 1000,
        }),
      ).rejects.toThrow();
    });
  });

  test.describe("form-state assertions", () => {
    test("assertValue passes for a filled labeled input", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.fillIn("Name", "Alice");
      await driver.assertValue("Name", "Alice");
    });

    test("assertValue works with placeholder fields", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.fillIn("Nickname", "Ali");
      await driver.assertValue("Nickname", "Ali");
    });

    test("assertValue fails on wrong value", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.fillIn("Name", "Alice");
      await expect(driver.assertValue("Name", "Bob")).rejects.toThrow();
    });

    test("assertChecked passes for a checked checkbox", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.assertChecked("Receive ads");
    });

    test("assertChecked fails for an unchecked checkbox", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await expect(
        driver.assertChecked("Subscribe to newsletter"),
      ).rejects.toThrow();
    });

    test("refuteChecked passes for an unchecked checkbox", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.refuteChecked("Subscribe to newsletter");
    });

    test("refuteChecked fails for a checked checkbox", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await expect(driver.refuteChecked("Receive ads")).rejects.toThrow();
    });

    test("assertSelected passes for the selected option label", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.selectOption("Favorite Color", "Blue");
      await driver.assertSelected("Favorite Color", "Blue");
    });

    test("assertSelected fails for a non-selected option", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.selectOption("Favorite Color", "Blue");
      await expect(
        driver.assertSelected("Favorite Color", "Red"),
      ).rejects.toThrow();
    });

    test("assertOptions passes when the select offers exactly these options", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await driver.assertOptions("Favorite Color", [
        "--Select--",
        "Red",
        "Green",
        "Blue",
      ]);
    });

    test("assertOptions fails when an option is missing from the expectation", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/form");
      await expect(
        driver.assertOptions("Favorite Color", ["Red", "Green", "Blue"]),
      ).rejects.toThrow();
    });
  });

  test.describe("assertPath() / refutePath()", () => {
    test("assertPath does not match a path suffix", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/re/import");
      await driver.assertPath("/re/import");
      await expect(driver.assertPath("/import")).rejects.toThrow();
    });

    test("refutePath passes on a path suffix of the current path", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/re/import");
      await driver.refutePath("/import");
    });

    test("assertPath passes when on the correct path", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/about");
      await driver.assertPath("/about");
    });

    test("assertPath fails when on wrong path", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/about");
      await expect(driver.assertPath("/form")).rejects.toThrow();
    });

    test("assertPath ignores query params by default", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/search?q=hello");
      await driver.assertPath("/search");
    });

    test("assertPath with queryParams", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/search?q=hello&page=1");
      await driver.assertPath("/search", {
        queryParams: { q: "hello", page: "1" },
      });
    });

    test("refutePath passes when not on the path", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/about");
      await driver.refutePath("/form");
    });

    test("refutePath fails when on the path", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/about");
      await expect(driver.refutePath("/about")).rejects.toThrow();
    });
  });

  test.describe("within()", () => {
    test("scopes actions to a container element", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/scoped");

      const scoped = await driver.within(".sidebar");
      await scoped.assertText("Sidebar content");
      await scoped.clickButton("Sidebar Button");
    });

    test("scoped driver cannot see elements outside container", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/scoped");

      const scoped = await driver.within(".sidebar");
      await expect(scoped.assertText("Main content")).rejects.toThrow();
    });

    test("returns a TestDriver (can be used as a driver)", async ({
      page,
    }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/scoped");

      const scoped: TestDriver = await driver.within(".sidebar");
      expect(scoped).toBeDefined();
    });
  });

  test.describe("debug()", () => {
    test("takes a screenshot without throwing", async ({ page }) => {
      const driver = new PlaywrightDriver(page);
      await driver.visit("/");
      // Just verify it doesn't throw
      await driver.debug();
    });
  });
});

test.describe("Session with PlaywrightDriver", () => {
  test("step() receives the page and scope", async ({ page }) => {
    const session = new Session(new PlaywrightDriver(page));
    await session
      .visit("/form")
      .step("fill name directly", async ({ page: p, scope }) => {
        expect(scope).toBe(p);
        await p.getByLabel("Name").fill("via step");
      })
      .assertValue("Name", "via step");
  });

  test("failed step() shows its name in StepError", async ({ page }) => {
    const session = new Session(new PlaywrightDriver(page));
    try {
      await session.visit("/form").step("explode", async () => {
        throw new Error("boom");
      });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(StepError);
      expect((e as StepError).message).toContain(
        ">>> [FAILED] step('explode')",
      );
      expect((e as StepError).message).toContain("Cause: boom");
    }
  });

  test("StepError includes steps from earlier chains", async ({ page }) => {
    const session = new Session(new PlaywrightDriver(page));
    await session.visit("/form").fillIn("Name", "Alice");

    try {
      await session.assertText("Nonexistent text");
      throw new Error("should have thrown");
    } catch (e) {
      const msg = (e as StepError).message;
      expect(msg).toContain("[ok] visit('/form')");
      expect(msg).toContain("[ok] fillIn('Name', 'Alice')");
      expect(msg).toContain(">>> [FAILED] assertText('Nonexistent text')");
    }
  });
});
