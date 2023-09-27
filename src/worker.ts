import { Worker } from '@temporalio/worker';
import * as activities from './activities';

async function run() {
  // ! setup() // const gqlWorkflows = gql.query(ALL_WORKFLOWS...)
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'), // workflows = getWorkflows(gqlWorkflows)
    activities,
    taskQueue: 'dsl-interpreter',
  });
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
