import type { Linter, Rule } from "eslint";
import noWaitForTimeout from "./rules/no-wait-for-timeout.js";
import noConditionalSkip from "./rules/no-conditional-skip.js";
import noWeakAssertions from "./rules/no-weak-assertions.js";
import noSwallowedCleanupCatch from "./rules/no-swallowed-cleanup-catch.js";
import warnSerialMode from "./rules/warn-serial-mode.js";

/**
 * The defect classes an expensive suite audit found by reading, turned into
 * checks. Every message names the fix, so an agent or a reviewer mid-task
 * learns what to do from the error alone.
 */
export const rules: Record<string, Rule.RuleModule> = {
  "no-wait-for-timeout": noWaitForTimeout,
  "no-conditional-skip": noConditionalSkip,
  "no-weak-assertions": noWeakAssertions,
  "no-swallowed-cleanup-catch": noSwallowedCleanupCatch,
  "warn-serial-mode": warnSerialMode,
};

export const recommendedRules: Linter.RulesRecord = {
  "feather-testing/no-wait-for-timeout": "error",
  "feather-testing/no-conditional-skip": "error",
  "feather-testing/no-weak-assertions": "error",
  "feather-testing/no-swallowed-cleanup-catch": "error",
  // Serial mode is sometimes genuinely required; a warning asks for the
  // annotation rather than forbidding the choice.
  "feather-testing/warn-serial-mode": "warn",
};

export interface FeatherTestingPlugin {
  meta: { name: string };
  rules: Record<string, Rule.RuleModule>;
  configs: Record<string, Linter.Config>;
}

const plugin: FeatherTestingPlugin = {
  meta: { name: "feather-testing" },
  rules,
  configs: {},
};

plugin.configs.recommended = {
  name: "feather-testing/recommended",
  plugins: { "feather-testing": plugin as unknown as Linter.Config["plugins"] },
  rules: recommendedRules,
} as Linter.Config;

export default plugin;
