const _12tlk0l = function _1(md){return(
md`# Async Lambda, SQS, EventBridge benchmark`
)};
const _q698ra = function _2(md){return(
md`Run on cloudshell to resources in same region using boto3`
)};
const _9plg31 = function _3(Plot,data){return(
Plot.plot({
  color: { legend: true },
  marks: [
    Plot.line(
      data,
      Plot.binX({ y: "count" }, { x: "latency", stroke: "name", tip: true })
    )
  ]
})
)};
const _1cj6cs0 = async function _data(FileAttachment){return(
(await FileAttachment("results.csv").csv()).flatMap((d) => [
  { name: "eventbridge", latency: d.eventbridge },
  { name: "sqs", latency: d.sqs },
  { name: "lambda", latency: d.lambda }
])
)};
const _pmbep9 = function _5(md){return(
md`\`\`\`
import boto3
import time
import json

# Initialize clients
eventbridge_client = boto3.client('events')
lambda_client = boto3.client('lambda')
sqs_client = boto3.client('sqs')

# Parameters
event_bus_name = 'benchmark-tom'
lambda_function_name = 'benchmark-tom'
sqs_queue_url = 'https://sqs.eu-central-1.amazonaws.com/513386457761/benchmark-tom'
number_of_messages = 10  # Adjust based on your batching needs
number_of_runs = 1000
pause_between_invocations = 0.1  # 0.1 seconds

# Prepare messages
messages = [{'Id': str(i), 'MessageBody': '{"key": "value"}'} for i in range(number_of_messages)]
event_entries = [{'Source': 'benchmark.test', 'DetailType': 'test', 'Detail': '{"key": "value"}'} for _ in range(number_of_messages)]
lambda_payload = json.dumps([{'key': 'value'} for _ in range(number_of_messages)]).encode('utf-8')

results = []
for _ in range(number_of_runs):
    # Benchmark EventBridge put_events
    start_time = time.time()
    response = eventbridge_client.put_events(Entries=event_entries)
    eventbridge_time = time.time() - start_time

    # Benchmark Lambda async invocation
    start_time = time.time()
    response = lambda_client.invoke(FunctionName=lambda_function_name, InvocationType='Event', Payload=lambda_payload)
    lambda_time = time.time() - start_time

    # Benchmark SQS SendMessageBatch
    start_time = time.time()
    response = sqs_client.send_message_batch(QueueUrl=sqs_queue_url, Entries=messages)
    sqs_time = time.time() - start_time

    results.append([eventbridge_time, lambda_time, sqs_time])
    # Pause
    time.sleep(pause_between_invocations)

# dump as csv
with open('results.csv', 'w') as f:
    f.write('eventbridge,lambda,sqs\\n')
    for result in results:
        f.write(f'{result[0]},{result[1]},{result[2]}\\n')

\`\`\``
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["results.csv"].map((name) => {
    const module_name = "@tomlarkworthy/async-lambda-sqs-eventbridge-benchmark";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_12tlk0l", null, ["md"], _12tlk0l);  
  $def("_q698ra", null, ["md"], _q698ra);  
  $def("_9plg31", null, ["Plot","data"], _9plg31);  
  $def("_1cj6cs0", "data", ["FileAttachment"], _1cj6cs0);  
  $def("_pmbep9", null, ["md"], _pmbep9);
  return main;
}