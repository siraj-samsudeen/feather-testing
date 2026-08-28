import type { Rule } from "eslint";
import type { Expression, Node, Super } from "estree";

const RUNNERS = new Set(["test", "it", "describe", "suite"]);

/** The identifier a member chain like `test.describe.skip` starts from. */
function rootIdentifier(node: Expression | Super): string | null {
  let current: Expression | Super = node;
  while (current.type === "MemberExpression") current = current.object;
  return current.type === "Identifier" ? current.name : null;
}

/** `test.skip("name", fn)` is declarative — the report still lists it. */
function isDeclarativeSkip(args: Node[]): boolean {
  const [first] = args;
  return (
    first !== undefined &&
    (first.type === "Literal" || first.type === "TemplateLiteral")
  );
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Do not skip tests at runtime — a self-skipping spec is green while proving nothing",
      recommended: true,
    },
    schema: [],
    messages: {
      conditionalSkip:
        "A runtime skip un-tests this spec silently: the run stays green while " +
        "nothing is checked, sometimes for the life of the file. Make the " +
        "precondition part of the test (set it up, or fail with a message that " +
        "says what is missing), or mark the spec test.fixme(...) so the report " +
        "names it as not running.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== "MemberExpression" ||
          callee.computed ||
          callee.property.type !== "Identifier" ||
          callee.property.name !== "skip"
        ) {
          return;
        }

        // this.skip() — Mocha's runtime skip.
        if (callee.object.type === "ThisExpression") {
          context.report({ node, messageId: "conditionalSkip" });
          return;
        }

        const root = rootIdentifier(callee.object);
        if (root === null || !RUNNERS.has(root)) return;
        if (isDeclarativeSkip(node.arguments as Node[])) return;

        context.report({ node, messageId: "conditionalSkip" });
      },
    };
  },
};

export default rule;
