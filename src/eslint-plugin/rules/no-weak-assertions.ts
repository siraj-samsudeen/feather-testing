import type { Rule } from "eslint";
import type { Expression, Super } from "estree";

const DEFAULT_MATCHERS = ["toBeTruthy", "toBeDefined"];

const ALTERNATIVES: Record<string, string> = {
  toBeTruthy:
    "assert the value you mean — toBe/toEqual, toHaveLength, toHaveText, or a " +
    "DSL assertion like assertText()",
  toBeDefined:
    "assert the value you mean — toBe/toEqual, or toBeInstanceOf when the type " +
    "is the point",
  toBeFalsy: "assert the exact falsy value — toBe(false), toBe(0), toBeNull()",
  toBeNull: "assert the value you mean, or pair it with a positive assertion",
};

/** Does this member chain hang off an `expect(...)` call? */
function rootsAtExpect(node: Expression | Super): boolean {
  let current: Expression | Super = node;
  while (current.type === "MemberExpression") current = current.object;
  return (
    current.type === "CallExpression" &&
    current.callee.type === "Identifier" &&
    current.callee.name === "expect"
  );
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Assert the shape you mean instead of truthiness or definedness",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          matchers: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      weak:
        "{{matcher}}() passes for almost any value, so it proves little more " +
        "than that the line ran. Assert the shape you mean with toBe/toEqual " +
        "and friends: {{alternative}}.",
    },
  },
  create(context) {
    const configured = context.options[0] as
      | { matchers?: string[] }
      | undefined;
    const matchers = new Set(configured?.matchers ?? DEFAULT_MATCHERS);

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== "MemberExpression" ||
          callee.computed ||
          callee.property.type !== "Identifier"
        ) {
          return;
        }
        const matcher = callee.property.name;
        if (!matchers.has(matcher)) return;
        if (!rootsAtExpect(callee.object)) return;

        context.report({
          node,
          messageId: "weak",
          data: {
            matcher,
            alternative:
              ALTERNATIVES[matcher] ?? "assert the shape you actually expect",
          },
        });
      },
    };
  },
};

export default rule;
