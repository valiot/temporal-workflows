import { Client } from '@temporalio/client';
import { DSLInterpreter, DSL } from './workflows';
// import { XstateInterpreter } from '@valiot/workflows'
import yaml from 'js-yaml';
import fs from 'fs';

// default DSL structure if no arguments are passed
// validate with http://nodeca.github.io/js-yaml/
let dslInput: DSL = {
  name: 'blabla',
  variables: { arg1: 'value1', arg2: 'value2' },
  root: {
    sequence: {
      elements: [
        { activity: { name: 'activity1', arguments: ['arg1'], result: 'result1' } },
        { activity: { name: 'activity2', arguments: ['result1'], result: 'result2' } },
        { activity: { name: 'activity3', arguments: ['arg2', 'result2'], result: 'result3' } },
      ],
    },
  },
};

async function run() {
  // why fetch workflowRuns?
  // ! WE NEED THE FRONTEND TO BE AWARE OF THE CURRENT RUNS OF WORKFLOWS AND THEIR STATE
  // ! could be handled by activities
  // ! const myWorkflows = setup() // load current workflowRuns MAAAAYBE we LOAD the workflowRuns from Temporal, not the other way around
  // payloadSchema = {loc: "string", type: "string", uuid: "string"}
  // SEND("PLANNER", "INIT", payload={loc: "MTY", type: "BBT", extension: 36}) // BBT | FILTERS | REPOSO
  // gqlClient.subscribe(workflowRunEvents).subscribe({
  //   next (response) {
  //     const payload = response.data.workflowEventCreated.result
  // !   // Special event for workflow initialization:
  //     if (payload.event.name === 'INIT') {
  //        const myXstateConfig = myWorkflows[payload.workflow.name]
  //        await client.workflow.execute(XstateInterpreter, {
  //          args: [myXstateConfig],
  //          taskQueue: 'dsl-interpreter',
  //          * "my-dsl-id-PLANNER-MTY-BBT", "my-dsl-id-PLANNER-GDL-BBT"
  //          workflowId: 'my-dsl-id-${payload.workflow.name}-${getWorkflowId(payload.event.payload, payload.workflow.events.INIT.payloadSchema)}',
  //        });
  //     } else {
  // !     // regular events here:
  //       await handle.signal('increment', { name: 'test-counter' })
  //     }
  //   }
  // })
  const path = process.argv[2];
  if (path) {
    dslInput = yaml.load((await fs.promises.readFile(path)).toString()) as DSL;
  }
  const client = new Client(); // remember to configure Connection for production

  // Invoke the `DSLInterpreter` Workflow, only resolved when the workflow completes
  const result = await client.workflow.execute(DSLInterpreter, {
    args: [dslInput],
    taskQueue: 'dsl-interpreter',
    workflowId: `my-dsl-id-${dslInput.name}`,
  });
  console.log(result); // Hello, Temporal!
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
