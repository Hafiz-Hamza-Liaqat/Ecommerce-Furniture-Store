export const JobCommandTypes = {
  EnqueueBackgroundJob: "jobs.EnqueueBackgroundJob",
  CompleteBackgroundJob: "jobs.CompleteBackgroundJob",
  FailBackgroundJob: "jobs.FailBackgroundJob",
} as const;

export const JobQueryTypes = {
  GetBackgroundJob: "jobs.GetBackgroundJob",
  ListBackgroundJobs: "jobs.ListBackgroundJobs",
} as const;

export const JobPolicyActions = {
  Enqueue: "jobs.jobs.enqueue",
  Read: "jobs.jobs.read",
  Complete: "jobs.jobs.complete",
} as const;
