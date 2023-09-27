import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

export type DSL = {
  name: string;
  variables: Record<string, unknown>;
  root: Statement;
};

type Sequence = {
  elements: Statement[];
};
type ActivityInvocation = {
  name: string;
  arguments?: string[];
  result?: string;
};
type Parallel = {
  branches: Statement[];
};

type Statement = { activity: ActivityInvocation } | { sequence: Sequence } | { parallel: Parallel };

const acts = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
}) as Record<string, (...args: string[]) => Promise<string | undefined>>;

export async function DSLInterpreter(dsl: DSL): Promise<unknown> {
  const bindings = dsl.variables as Record<string, string>;
  const runInterpreter = async (statement: Statement, bindings: Record<string, string | undefined>) => {
    // ! gqlSyncWorkflowStarted() // gqlClient.mutate(createWorkflowRun, {name: dsl.name})
    const result = await execute(dsl.root, bindings);
    // ! gqlSyncWorkflowFinished()
    return result;
  };
  return await runInterpreter(dsl.root, bindings);
}

// const xstateConfig = {
//   config: {
//     initial: '',
//   },
//   services: {
//     // def jobName(log, input, job): input.value
//     // def jobName(ctx): ctx.value
//     helloWorld: async (ctx, evt) => {
//       return await acts['helloWorld'](ctx, evt);
//     },
//     test: async (ctx, evt) => {
//       return await acts['test'](ctx, evt);
//     },
//   },
// };

/**
 * const machineOptions = getMachineOptions(gql.query(xWorkflow))
 * const myMachine = Machine(machineOptions)
 * const machineInterpreter = interpret(myMachine).onTransition(() => {
 *   ! gqlSyncTransitionHappened()
 * })
 * machineInterpreter.start()
 * ! somewhere else:
 * const count = 0
 * ! Maybe replace with workflow signals:
 * client.subscribe(MY_MACHINE_EVENTS, () => { // ! subscribe {workflowRunEventUpdated(workflowRunId: x){event, payload...}}
 *   machineInterpreter.send(myEvent, myPayload)
 *   count++
 *   if(count > 50000) {
 *     workflow.startAsNew()
 *   }
 * })
 * await machineInterpreter.isFinished()
 */

async function execute(statement: Statement, bindings: Record<string, string | undefined>): Promise<void> {
  // note that this function returns void
  // we don't assign the results here - all results must be declared+bound in the activity DSL
  if ('parallel' in statement) {
    await Promise.all(statement.parallel.branches.map((el) => execute(el, bindings)));
  } else if ('sequence' in statement) {
    for (const el of statement.sequence.elements) {
      await execute(el, bindings);
    }
  } else {
    const activity = statement.activity;
    let args = activity.arguments || [];
    args = args.map((arg) => bindings[arg] ?? arg);
    // ! gqlSyncActivityStarted(), gqlSyncStateChanged()

    const activityResult = await acts[activity.name](...args);
    if (activity.result) {
      bindings[activity.result] = activityResult;
    }
  }
}
