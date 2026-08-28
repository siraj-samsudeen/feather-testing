import type { Rule } from "eslint";
import type { Node } from "estree";

const SLEEP_MESSAGE =
  "This sleeps for a fixed time instead of waiting for a condition, so it is " +
  "slow when it passes and lying when it fails. Use " +
  "session.until('<what you are waiting for>', fn) — or expect.poll / findBy* " +
  "— so the wait names the thing it is waiting for.";

function isGlobalSetTimeout(callee: Node): boolean {
  if (callee.type === "Identifier") return callee.name === "setTimeout";
  return (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier" &&
    callee.property.name === "setTimeout" &&
    callee.object.type === "Identifier" &&
    ["window", "globalThis", "global"].includes(callee.object.name)
  );
}

/**
 * Only sleeps, not every timer. `setTimeout(resolve, 100)` and a setTimeout
 * inside a `new Promise(...)` executor are the sleep idiom; a timer whose
 * callback does real work (a fixture component, a debounce test) is not.
 */
function isSleep(node: Rule.Node): boolean {
  const [first] = (node as Rule.Node & { arguments: Node[] }).arguments;
  if (first && first.type === "Identifier") return true;

  let current: Rule.Node | null = node.parent ?? null;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (
      current.type === "NewExpression" &&
      current.callee.type === "Identifier" &&
      current.callee.name === "Promise"
    ) {
      return true;
    }
    current = current.parent ?? null;
  }
  return false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Wait for a condition instead of sleeping for a fixed duration",
      recommended: true,
    },
    schema: [],
    messages: {
      waitForTimeout:
        "page.waitForTimeout() sleeps for a fixed time. Use " +
        "session.until('<what you are waiting for>', fn) — or expect.poll / a " +
        "web-first assertion — so the wait names its condition and ends as " +
        "soon as it holds.",
      sleep: SLEEP_MESSAGE,
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === "MemberExpression" &&
          !callee.computed &&
          callee.property.type === "Identifier" &&
          callee.property.name === "waitForTimeout"
        ) {
          context.report({ node, messageId: "waitForTimeout" });
          return;
        }
        if (isGlobalSetTimeout(callee) && isSleep(node)) {
          context.report({ node, messageId: "sleep" });
        }
      },
    };
  },
};

export default rule;
