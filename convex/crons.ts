import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "process-due-offboardings",
  { minutes: 1 },
  internal.offboardingAutomation.scanAndProcessDueOffboardings
);

export default crons;
