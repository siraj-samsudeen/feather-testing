import type { QueuedStep } from "./types.js";

export class StepError extends Error {
  constructor(
    failedStep: QueuedStep,
    allSteps: QueuedStep[],
    cause: unknown,
  ) {
    const causeMessage =
      cause instanceof Error ? cause.message : String(cause);

    const stepList = allSteps
      .map((step) => {
        const prefix = step === failedStep ? ">>> " : "    ";
        const status =
          step.index < failedStep.index
            ? "[ok]"
            : step.index === failedStep.index
              ? "[FAILED]"
              : "[skipped]";
        return `${prefix}${status} ${step.name}`;
      })
      .join("\n");

    super(
      `feather-testing: Step ${failedStep.index + 1} of ${allSteps.length} failed\n\n` +
        `Failed at: ${failedStep.name}\n` +
        `Cause: ${causeMessage}\n\n` +
        `Chain:\n${stepList}\n`,
      { cause },
    );

    this.name = "StepError";
  }
}
