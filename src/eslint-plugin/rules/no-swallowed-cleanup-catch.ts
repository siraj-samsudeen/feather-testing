import type { Rule } from "eslint";
import type { Node } from "estree";

/** `() => {}`, `() => undefined`, `function () {}` — a handler that does nothing. */
function isEmptyHandler(node: Node): boolean {
  if (
    node.type !== "ArrowFunctionExpression" &&
    node.type !== "FunctionExpression"
  ) {
    return false;
  }
  const body = node.body;
  if (body.type === "BlockStatement") return body.body.length === 0;
  if (body.type === "Identifier") return body.name === "undefined";
  if (body.type === "Literal") return body.value === null;
  if (body.type === "ObjectExpression") return body.properties.length === 0;
  return false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Do not swallow errors from setup or cleanup — a discarded failure reads as a pass",
      recommended: true,
    },
    schema: [],
    messages: {
      swallowedCatch:
        "An empty .catch() turns a failed setup or cleanup into a green run, " +
        "and the test that follows fails somewhere else entirely. Assert on the " +
        "error, rethrow it with context, or narrow the catch to the one error " +
        "you expect and say why.",
      emptyCatchBlock:
        "This catch block discards the error, so a failure here is invisible. " +
        "Assert on it, rethrow it, or leave a comment saying which error is " +
        "expected and why ignoring it is safe.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== "MemberExpression" ||
          callee.computed ||
          callee.property.type !== "Identifier" ||
          callee.property.name !== "catch"
        ) {
          return;
        }
        const [handler] = node.arguments;
        if (handler && isEmptyHandler(handler as Node)) {
          context.report({ node, messageId: "swallowedCatch" });
        }
      },
      CatchClause(node) {
        if (node.body.body.length > 0) return;
        // A comment inside is the author annotating a deliberate ignore.
        if (sourceCode.getCommentsInside(node.body).length > 0) return;
        context.report({ node, messageId: "emptyCatchBlock" });
      },
    };
  },
};

export default rule;
