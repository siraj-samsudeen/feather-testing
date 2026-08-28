import type { Rule } from "eslint";
import type { Expression, Super } from "estree";

function memberPath(node: Expression | Super): string | null {
  if (node.type === "Identifier") return node.name;
  if (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier"
  ) {
    const prefix = memberPath(node.object);
    return prefix === null ? null : `${prefix}.${node.property.name}`;
  }
  return null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Flag serial mode, which makes each test depend on the ones before it",
      recommended: true,
    },
    schema: [],
    messages: {
      serial:
        "Serial mode couples these tests: one failure cascades into the rest, " +
        "so the report stops naming the real cause and a flake becomes a wall " +
        "of red. Make them independent — share setup, not state — or keep " +
        "serial with an eslint-disable-next-line comment saying why it is " +
        "required.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const path = memberPath(node.callee as Expression);
        if (path === null) return;

        const segments = path.split(".");
        const isSerialRunner =
          segments.includes("serial") &&
          ["test", "it", "describe", "suite"].includes(segments[0] ?? "");
        if (isSerialRunner) {
          context.report({ node, messageId: "serial" });
          return;
        }

        // test.describe.configure({ mode: "serial" })
        if (!path.endsWith(".configure")) return;
        const [options] = node.arguments;
        if (!options || options.type !== "ObjectExpression") return;
        const declaresSerial = options.properties.some(
          (property) =>
            property.type === "Property" &&
            !property.computed &&
            property.key.type === "Identifier" &&
            property.key.name === "mode" &&
            property.value.type === "Literal" &&
            property.value.value === "serial",
        );
        if (declaresSerial) context.report({ node, messageId: "serial" });
      },
    };
  },
};

export default rule;
