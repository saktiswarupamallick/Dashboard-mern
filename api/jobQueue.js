import Queue from "bull";
import Job from "./models/Job.js";
import { executeCpp } from "./executeCpp.js";
import { executePy } from "./executePy.js";

const jobQueue = new Queue("job-runner-queue");
const NUM_WORKERS = 5;

jobQueue.process(NUM_WORKERS, async ({ data }) => {
  const jobId = data.id;
  const job = await Job.findById(jobId);
  if (job === undefined) {
    throw new Error(`cannot find Job with id ${jobId}`);
  }
  try {
    let output;
    job.startedAt = new Date();
    if (job.language === "cpp") {
      output = await executeCpp(job.filepath);
    } else if (job.language === "py") {
      output = await executePy(job.filepath);
    }
    job.completedAt = new Date();
    job.output = output;
    job.status = "success";
    await job.save();
    return true;
  } catch (err) {
    job.completedAt = new Date();
    job.output = JSON.stringify(err);
    job.status = "error";
    await job.save();
    throw new Error(JSON.stringify(err));
  }
});

jobQueue.on("failed", (error) => {
  console.error(error.data.id, error.failedReason);
});

const addJobToQueue = async (jobId) => {
  jobQueue.add({
    id: jobId,
  });
};

export { addJobToQueue };
