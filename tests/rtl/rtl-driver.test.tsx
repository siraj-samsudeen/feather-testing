import React, { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RTLDriver } from "../../src/rtl/driver.js";

afterEach(() => {
  cleanup();
});

// --- Test Components ---

function FormApp() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  return (
    <div>
      {submitted ? (
        <div>
          <p>Form submitted!</p>
          <p>Name: {formData.name}</p>
          <p>Color: {formData.color}</p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            setFormData(
              Object.fromEntries(data.entries()) as Record<string, string>,
            );
            setSubmitted(true);
          }}
        >
          <label htmlFor="name">Name</label>
          <input id="name" name="name" />

          <input name="nickname" placeholder="Nickname" />

          <label htmlFor="color">Favorite Color</label>
          <select id="color" name="color">
            <option value="">--Select--</option>
            <option value="r">Red</option>
            <option value="g">Green</option>
            <option value="b">Blue</option>
          </select>

          <label htmlFor="newsletter">Subscribe to newsletter</label>
          <input id="newsletter" name="newsletter" type="checkbox" />

          <label htmlFor="ads">Receive ads</label>
          <input id="ads" name="ads" type="checkbox" defaultChecked />

          <fieldset>
            <legend>Plan</legend>
            <label>
              <input type="radio" name="plan" value="free" /> Free
            </label>
            <label>
              <input type="radio" name="plan" value="pro" /> Pro
            </label>
          </fieldset>

          <button type="submit">Submit</button>
        </form>
      )}
    </div>
  );
}

function LinksApp() {
  const [clicked, setClicked] = useState("");
  return (
    <div>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setClicked("about");
        }}
      >
        About
      </a>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setClicked("contact");
        }}
      >
        Contact
      </a>
      <button onClick={() => setClicked("action")}>Action</button>
      <p>You are here</p>
      {clicked && <p>Clicked: {clicked}</p>}
    </div>
  );
}

function ScopedApp() {
  return (
    <div>
      <div data-testid="sidebar" className="sidebar">
        <p>Sidebar content</p>
        <button>Sidebar Button</button>
      </div>
      <div data-testid="main" className="main">
        <p>Main content</p>
        <button>Main Button</button>
      </div>
    </div>
  );
}

function SubmitByNameApp() {
  const [done, setDone] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <label htmlFor="val">Value</label>
      <input id="val" name="val" />
      <button>Submit</button>
      {done && <p>Done!</p>}
    </form>
  );
}

function SubmitByTypeApp() {
  const [done, setDone] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <label htmlFor="val">Value</label>
      <input id="val" name="val" />
      <button type="submit">Go</button>
      {done && <p>Done!</p>}
    </form>
  );
}

function SubmitFallbackApp() {
  const [done, setDone] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <label htmlFor="val">Value</label>
      <input id="val" name="val" />
      {/* No submit button at all */}
      {done && <p>Done!</p>}
    </form>
  );
}

function SubmitPrecedenceApp() {
  const [result, setResult] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setResult("Saved!");
      }}
    >
      <label htmlFor="val">Value</label>
      <input id="val" name="val" />
      <button type="button" onClick={() => setResult("Wrong button!")}>
        Submit other
      </button>
      <button type="submit">Save</button>
      {result && <p>{result}</p>}
    </form>
  );
}

function UploadApp() {
  const [uploaded, setUploaded] = useState("");
  const [dropped, setDropped] = useState("");
  return (
    <div>
      <form>
        <label htmlFor="avatar">Avatar</label>
        <input
          id="avatar"
          name="avatar"
          type="file"
          onChange={(e) => setUploaded(e.target.files?.[0]?.name ?? "")}
        />
      </form>
      <div
        data-testid="dropzone"
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setDropped(e.dataTransfer.files[0]?.name ?? "");
        }}
      >
        Drop files here
      </div>
      {uploaded && <p>Uploaded: {uploaded}</p>}
      {dropped && <p>Dropped: {dropped}</p>}
    </div>
  );
}

function DisappearingApp() {
  const [visible, setVisible] = useState(true);
  return (
    <div>
      <button onClick={() => setVisible(false)}>Hide</button>
      {visible && <p>Temporary text</p>}
    </div>
  );
}

// --- Tests ---

describe("RTLDriver", () => {
  describe("click()", () => {
    it("finds and clicks an element by text", async () => {
      render(<LinksApp />);
      const driver = new RTLDriver();
      await driver.click("You are here");
      // smoke test — didn't throw
    });
  });

  describe("clickLink()", () => {
    it("clicks a link by accessible name", async () => {
      render(<LinksApp />);
      const driver = new RTLDriver();
      await driver.clickLink("About");
      expect(screen.getByText("Clicked: about")).toBeTruthy();
    });
  });

  describe("clickButton()", () => {
    it("clicks a button by accessible name", async () => {
      render(<LinksApp />);
      const driver = new RTLDriver();
      await driver.clickButton("Action");
      expect(screen.getByText("Clicked: action")).toBeTruthy();
    });
  });

  describe("fillIn()", () => {
    it("fills an input by label", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.fillIn("Name", "Alice");
      expect(screen.getByLabelText("Name")).toHaveProperty("value", "Alice");
    });

    it("falls back to placeholder when label not found", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.fillIn("Nickname", "Ali");
      expect(screen.getByPlaceholderText("Nickname")).toHaveProperty(
        "value",
        "Ali",
      );
    });

    it("clears existing value before typing", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.fillIn("Name", "Alice");
      await driver.fillIn("Name", "Bob");
      expect(screen.getByLabelText("Name")).toHaveProperty("value", "Bob");
    });
  });

  describe("selectOption()", () => {
    it("selects a dropdown option by visible text", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.selectOption("Favorite Color", "Blue");
      expect(screen.getByLabelText("Favorite Color")).toHaveProperty(
        "value",
        "b",
      );
    });

    it("throws when option text not found", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await expect(
        driver.selectOption("Favorite Color", "Purple"),
      ).rejects.toThrow("no <option> with text 'Purple' found");
    });
  });

  describe("check() / uncheck()", () => {
    it("checks an unchecked checkbox", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.check("Subscribe to newsletter");
      expect(screen.getByLabelText("Subscribe to newsletter")).toHaveProperty(
        "checked",
        true,
      );
    });

    it("does not uncheck an already checked checkbox when check() is called", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      // "Receive ads" is defaultChecked
      await driver.check("Receive ads");
      expect(screen.getByLabelText("Receive ads")).toHaveProperty(
        "checked",
        true,
      );
    });

    it("unchecks a checked checkbox", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      // "Receive ads" is defaultChecked
      await driver.uncheck("Receive ads");
      expect(screen.getByLabelText("Receive ads")).toHaveProperty(
        "checked",
        false,
      );
    });

    it("does not check an already unchecked checkbox when uncheck() is called", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.uncheck("Subscribe to newsletter");
      expect(screen.getByLabelText("Subscribe to newsletter")).toHaveProperty(
        "checked",
        false,
      );
    });
  });

  describe("choose()", () => {
    it("selects a radio button by label", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.choose("Pro");
      expect(screen.getByRole("radio", { name: "Pro" })).toHaveProperty(
        "checked",
        true,
      );
    });
  });

  describe("submit()", () => {
    it("finds submit button by accessible name containing 'submit'", async () => {
      render(<SubmitByNameApp />);
      const driver = new RTLDriver();
      await driver.fillIn("Value", "test");
      await driver.submit();
      expect(screen.getByText("Done!")).toBeTruthy();
    });

    it("finds submit button by type='submit'", async () => {
      render(<SubmitByTypeApp />);
      const driver = new RTLDriver();
      await driver.fillIn("Value", "test");
      await driver.submit();
      expect(screen.getByText("Done!")).toBeTruthy();
    });

    it("falls back to requestSubmit when no submit button exists", async () => {
      render(<SubmitFallbackApp />);
      const driver = new RTLDriver();
      await driver.fillIn("Value", "test");
      await driver.submit();
      expect(screen.getByText("Done!")).toBeTruthy();
    });

    it("throws when no form was previously interacted with", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await expect(driver.submit()).rejects.toThrow(
        "submit() called but no form was previously interacted with",
      );
    });

    it("prefers type='submit' over accessible name containing 'submit'", async () => {
      render(<SubmitPrecedenceApp />);
      const driver = new RTLDriver();
      await driver.fillIn("Value", "test");
      await driver.submit();
      expect(screen.getByText("Saved!")).toBeTruthy();
    });
  });

  describe("upload()", () => {
    it("uploads a file to a file input by label", async () => {
      render(<UploadApp />);
      const driver = new RTLDriver();
      await driver.upload("Avatar", "/some/dir/photo.png");
      expect(screen.getByText("Uploaded: photo.png")).toBeTruthy();
    });
  });

  describe("dropFile()", () => {
    it("dispatches a drop with the file on a selector", async () => {
      render(<UploadApp />);
      const driver = new RTLDriver();
      await driver.dropFile(".dropzone", "/some/dir/report.pdf");
      expect(screen.getByText("Dropped: report.pdf")).toBeTruthy();
    });

    it("throws when selector matches nothing", async () => {
      render(<UploadApp />);
      const driver = new RTLDriver();
      await expect(
        driver.dropFile(".nonexistent", "file.txt"),
      ).rejects.toThrow("dropFile('.nonexistent'): element not found");
    });
  });

  describe("form-state assertions", () => {
    it("assertValue passes for a filled labeled input", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.fillIn("Name", "Alice");
      await driver.assertValue("Name", "Alice");
    });

    it("assertValue works with placeholder fields", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.fillIn("Nickname", "Ali");
      await driver.assertValue("Nickname", "Ali");
    });

    it("assertValue fails on wrong value", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.fillIn("Name", "Alice");
      await expect(driver.assertValue("Name", "Bob")).rejects.toThrow(
        "expected value 'Bob', but found 'Alice'",
      );
    });

    it("assertChecked passes for a checked checkbox", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.assertChecked("Receive ads");
    });

    it("assertChecked fails for an unchecked checkbox", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await expect(
        driver.assertChecked("Subscribe to newsletter"),
      ).rejects.toThrow("expected checkbox to be checked");
    });

    it("refuteChecked passes for an unchecked checkbox", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.refuteChecked("Subscribe to newsletter");
    });

    it("refuteChecked fails for a checked checkbox", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await expect(driver.refuteChecked("Receive ads")).rejects.toThrow(
        "expected checkbox NOT to be checked",
      );
    });

    it("assertSelected passes for the selected option label", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.selectOption("Favorite Color", "Blue");
      await driver.assertSelected("Favorite Color", "Blue");
    });

    it("assertSelected fails for a non-selected option", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.selectOption("Favorite Color", "Blue");
      await expect(
        driver.assertSelected("Favorite Color", "Red"),
      ).rejects.toThrow("expected selected option 'Red', but found 'Blue'");
    });

    it("assertOptions passes when the select offers exactly these options", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await driver.assertOptions("Favorite Color", [
        "--Select--",
        "Red",
        "Green",
        "Blue",
      ]);
    });

    it("assertOptions fails when the expectation is incomplete", async () => {
      render(<FormApp />);
      const driver = new RTLDriver();
      await expect(
        driver.assertOptions("Favorite Color", ["Red", "Green", "Blue"]),
      ).rejects.toThrow("assertOptions('Favorite Color')");
    });
  });

  describe("step()", () => {
    it("passes the user and container to the callback", async () => {
      render(<LinksApp />);
      const driver = new RTLDriver();

      let receivedUser: unknown;
      await driver.step(async ({ user, container }) => {
        receivedUser = user;
        await user.click(await container.findByRole("button", { name: "Action" }));
      });

      expect(receivedUser).toBeDefined();
      expect(screen.getByText("Clicked: action")).toBeTruthy();
    });
  });

  describe("assertText()", () => {
    it("passes when text is present", async () => {
      render(<LinksApp />);
      const driver = new RTLDriver();
      await driver.assertText("You are here");
    });

    it("throws when text is not present", async () => {
      render(<LinksApp />);
      const driver = new RTLDriver();
      await expect(driver.assertText("Not here")).rejects.toThrow();
    });
  });

  describe("refuteText()", () => {
    it("passes when text is not present", async () => {
      render(<LinksApp />);
      const driver = new RTLDriver();
      await driver.refuteText("Nonexistent text");
    });

    it("throws when text is present", async () => {
      render(<LinksApp />);
      const driver = new RTLDriver();
      await expect(driver.refuteText("You are here")).rejects.toThrow(
        "Expected NOT to find text 'You are here', but it was present.",
      );
    });

    it("retries until text disappears (waitFor)", async () => {
      render(<DisappearingApp />);
      const driver = new RTLDriver();

      // Text is present initially
      expect(screen.queryByText("Temporary text")).not.toBeNull();

      // Click the hide button
      await driver.clickButton("Hide");

      // refuteText should succeed because waitFor retries
      await driver.refuteText("Temporary text");
    });
  });

  describe("within()", () => {
    it("scopes queries to a container element", async () => {
      render(<ScopedApp />);
      const driver = new RTLDriver();

      const scoped = await driver.within(".sidebar");
      await scoped.assertText("Sidebar content");
      await scoped.clickButton("Sidebar Button");
    });

    it("scoped driver cannot see elements outside the container", async () => {
      render(<ScopedApp />);
      const driver = new RTLDriver();

      const scoped = await driver.within(".sidebar");
      await expect(scoped.assertText("Main content")).rejects.toThrow();
    });

    it("throws when selector matches nothing", async () => {
      render(<ScopedApp />);
      const driver = new RTLDriver();

      await expect(driver.within(".nonexistent")).rejects.toThrow(
        "within('.nonexistent'): element not found",
      );
    });
  });

  describe("debug()", () => {
    it("calls screen.debug without throwing", async () => {
      render(<LinksApp />);
      const driver = new RTLDriver();
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      await driver.debug();
      spy.mockRestore();
    });
  });

  describe("unsupported methods throw", () => {
    it("visit() throws", async () => {
      const driver = new RTLDriver();
      await expect(driver.visit("/")).rejects.toThrow(
        "visit() is not available in the RTL adapter",
      );
    });

    it("assertPath() throws", async () => {
      const driver = new RTLDriver();
      await expect(driver.assertPath("/")).rejects.toThrow(
        "assertPath() is not available in the RTL adapter",
      );
    });

    it("refutePath() throws", async () => {
      const driver = new RTLDriver();
      await expect(driver.refutePath("/")).rejects.toThrow(
        "refutePath() is not available in the RTL adapter",
      );
    });

    it("assertHas() throws", async () => {
      const driver = new RTLDriver();
      await expect(driver.assertHas("div")).rejects.toThrow(
        "assertHas() with CSS selectors is not recommended in RTL",
      );
    });

    it("refuteHas() throws", async () => {
      const driver = new RTLDriver();
      await expect(driver.refuteHas("div")).rejects.toThrow(
        "refuteHas() with CSS selectors is not recommended in RTL",
      );
    });
  });
});

// Mirrors tests/playwright's /collision page: a navigation chip whose
// accessible name merely CONTAINS the name of the control the spec wants.
function CollisionApp() {
  const [msg, setMsg] = useState("");
  return (
    <div>
      <nav className="sidebar">
        <button>Checklist Run — checklist</button>
        <a href="/about">About the checklist</a>
      </nav>
      <main>
        <form>
          <label htmlFor="company">Name of company</label>
          <input id="company" name="company" />

          <label htmlFor="who">Name</label>
          <input id="who" name="who" />
        </form>
        <button onClick={() => setMsg("Checked!")}>Check</button>
        <a href="/about">About</a>
        <p>{msg}</p>
      </main>
    </div>
  );
}

/**
 * The RTL adapter addresses controls exactly already — RTL's string matchers
 * are whole-string by default. These pin that guarantee so the two adapters
 * keep answering the same question: the Playwright driver had to be taught
 * `exact: true` after `clickButton('Check')` matched a "Checklist Run —
 * checklist" chip too and tripped strict mode.
 */
describe("RTLDriver — exact addressing", () => {
  it("clickButton picks the exactly-named button over a longer-named one", async () => {
    render(<CollisionApp />);
    const driver = new RTLDriver();
    await driver.clickButton("Check");
    await driver.assertText("Checked!");
  });

  it("clickButton fails when no button matches exactly", async () => {
    render(<CollisionApp />);
    const driver = new RTLDriver();
    // "Chec" is a substring of both buttons and the exact name of neither.
    await expect(driver.clickButton("Chec")).rejects.toThrow();
  });

  it("clickLink picks the exactly-named link", async () => {
    render(<CollisionApp />);
    const driver = new RTLDriver();
    await driver.clickLink("About");
  });

  it("fillIn picks the exactly-labelled field", async () => {
    render(<CollisionApp />);
    const driver = new RTLDriver();
    await driver.fillIn("Name", "Alice");
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
      "Alice",
    );
    expect(
      (screen.getByLabelText("Name of company") as HTMLInputElement).value,
    ).toBe("");
  });
});
