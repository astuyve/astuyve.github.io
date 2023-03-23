---
layout: post
title: Benchmarking the AWS SDK 
description: Benchmarking cold start performance of the AWS SDK v2 and v3.
image: /aws-sdk/sdk_header_image.png
---

If you're building Serverless applications on AWS, you will likely use the AWS SDK to interact with some other service. You may be using DynamoDB to store data, or publishing events to SNS, SQS, or EventBridge.

Today the NodeJS runtime for AWS Lambda is at a bit of a crossroads. Like all available Lambda runtimes, NodeJS includes the `aws-sdk` in the base image for each supported version of Node.

This means Lambda users don't need to manually bundle the commonly-used dependency into their applications. This reduces the deployment package size, which is key for Lambda. Functions packaged as zip files can be a maximum of `250mb` including code + layers, and container-based functions support up to `10GB` image sizes.

The decision about which SDK you use and how you use it in your function seems simple at first - but it's actually a complex multidimensional engineering decision.

In the Node runtime, `Node12.x`, `14.x`, and `16.x` each contain the AWS SDK v2 packaged in the runtime. This means virtually all Lambda functions up until recently have been built to use the v2 SDK. When AWS launched the `Node18.x` runtime for Lambda, they packaged the AWS SDK v3 by default. Since the AWS SDK is likely the most commonly used library in Lambda, I decided to break down the cold start performance of each version across a couple of dimensions.
 
We'll trace the cold start and measure the time to load the SDK via the following configurations from the runtime:
1. The entire v2 SDK
2. One v2 SDK client
3. One v3 SDK client

Then we'll use [esbuild](https://esbuild.github.io/) to tree-shake and minify each client, and run the tests again:
1. Tree-shaken v2 SDK
2. One tree-shaken v2 SDK client
3. One tree-shaken v3 SDK client

Each of these tests were performed in my local AWS region (us-east-1), using x86 Lambda Functions configured with 1024mb of RAM. The client I selected was SNS. I ran each test 3 times and screengrabbed one. Limitations are noted at the end.

## Loading the entire v2 SDK

There are a few common ways to use the v2 SDK.
In most blogs and documentation (including AWS's [own](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/dynamodb-examples-using-tables.html), but not [always](https://aws.amazon.com/blogs/compute/operating-lambda-performance-optimization-part-2/)), you'll find something like this:
```js
const AWS = require('aws-sdk');
const snsClient = new AWS.SNS({});
// ... some handler code
```

Although functional, this code is suboptimal as it loads the entire AWS SDK into memory. Let's take a look at that flame graph for the cold start trace:
<span class="image fit"><a href ="/assets/images/aws-sdk/v2_all.png" target="_blank"><img src="/assets/images/aws-sdk/v2_all.png" alt="Loading the entire AWS SDK"></a></span>
In this case we can see that this function loaded the entire `aws-sdk` in *324ms*. Check out all of this extra _stuff_ that we're loading!

Here we see that we're loading not only SNS, but also a smattering of every other client in the `/clients` directory, like DynamoDB, S3, Kinesis, Sagemaker, and so many small files that I don't even trace them in this cold start trace:
<span class="image fit"><a href ="/assets/images/aws-sdk/v2_all_clients.png" target="_blank"><img src="/assets/images/aws-sdk/v2_all_clients.png" alt="Loading the entire v2 AWS SDK - focusing on clients"></a></span>
```
First run: 324ms
Second run: 344ms
Third run: 343ms
```

## Packaging and loading the entire v2 SDK

One common piece of advice I've read suggests that users should pin a specific version of the `aws-sdk`, and package it into their application.

Although the `aws-sdk` is already provided by AWS in the Lambda runtime, the logic is that AWS can roll out changes to the SDK at any point with no changes on your side. These changes _should_ be backwards compatible, but unless you're specifically [managing runtime updates](https://aws.amazon.com/blogs/compute/introducing-aws-lambda-runtime-management-controls/), those new SDK changes will be applied automatically - potentially breaking your application.

But does manually packaging the `aws-sdk` impact the cold start duration? In this test, the code is still the same:

```js
const AWS = require('aws-sdk');
const snsClient = new AWS.SNS({});
// ... some handler code
```

Yet the flame graph is not:
<span class="image fit"><a href ="/assets/images/aws-sdk/v2_all_packaged.png" target="_blank"><img src="/assets/images/aws-sdk/v2_all_packaged.png" alt="Loading the entire v2 AWS SDK - packaged by us"></a></span>

Note the difference from the first flame graph. When we load node modules from the runtime, the span labels are `aws.lambda.require_runtime`. Now that we're packaging our own version of the sdk, we see the same general composition of spans labeled `aws.lambda.require`.

We also see that packaging our own v2 `aws-sdk` clocks in at `540ms`!

```
First run: 540ms
Second run: 531ms
Third run: 502ms
```

The v3 `aws-sdk` is modularized by default, so we won't test importing the entire v3 SDK, so we'll move on to sub-client imports.

## Loading one v2 SDK client
Let's consider a more efficient approach. We can instead simply pluck the SNS client (or whichever client you please) from the library itself:
```js
const SNS = require('aws-sdk/clients/sns');
const snsClient = new SNS({});
```

This should save us a fair amount of time, check out the flame graph:
<span class="image fit"><a href ="/assets/images/aws-sdk/v2_individual.png" target="_blank"><img src="/assets/images/aws-sdk/v2_individual.png" alt="Loading only the v2 SNS client"></a></span>
This is much nicer, *104ms*. Since we're not loading clients we won't use,that saves us around 238 milliseconds!
```
First run: 110ms
Second run: 104ms
Third Run: 109ms
```

## AWS SDK v3
The v3 SDK is entirely client-based, so we have to specify the SNS client specifically. Here's what that looks like in code:
```js
const { SNSClient, PublishBatchCommand } = require("@aws-sdk/client-sns");
const snsClient = new SNSClient({})
```
This results in a pretty deep cold start trace:
<span class="image fit"><a href ="/assets/images/aws-sdk/v3_individual.png" target="_blank"><img src="/assets/images/aws-sdk/v3_individual.png" alt="Loading only the v3 SNS client"></a></span>

We can see that the SNS client in v3 loaded in *250ms*.
The Simple Token Service (STS) contributed *84ms* of this time:
<span class="image fit"><a href ="/assets/images/aws-sdk/v3_sts.png" target="_blank"><img src="/assets/images/aws-sdk/v3_sts.png" alt="Loading only the v3 SNS client, zooming in on STS"></a></span>
```
First run: 250ms
Second run: 259ms
Third run: 236ms
```

## Bundled JS benchmarks
The other option I want to highlight is packaging the project using something like [Webpack](https://webpack.js.org/) or [esbuild](https://esbuild.github.io/). JS Bundlers transpile all of your separate files and classes (along with all node_modules) into one single file, a practice originally developed to reduce package size for frontend applications. This helps improve the cold start time in Lambda, as unimported files can be pruned and the entire handler becomes one file.


## AWS SDK v2 - minified in its entirety
Now we'll load the entire AWS SDK v2 again, this time using esbuild to transpile the handler and SDK v2:
```js
const AWS = require('aws-sdk');
const snsClient = new AWS.SNS({});
// ... some handler code
}
```
And here's the cold start trace:
<span class="image fit"><a href ="/assets/images/aws-sdk/v2_minified_entire.png" target="_blank"><img src="/assets/images/aws-sdk/v2_minified_entire.png" alt="Loading the entire minified v2 AWS SDK"></a></span>
You'll note that now we only have one span tracing the handler (as the entire SDK is now included in the same output file) - but the interesting thing is that the load time is almost *600ms*!
```
First run: 597ms
Second run: 570ms
Third run: 621ms
```

## Why is this so much slower than the non-bundled version?
Handler-contributed cold start duration is primarily driven by syscalls used by the runtime (NodeJS) to open files; eg `fs.readSync`.

To break this down:
1. Your code tells NodeJS to `require` the file.
2. NodeJS finds the file (this happens inside the `require` method)
3. NodeJS makes a system call, which tells the Firecracker VM instance to open the file.
4. Firecracker opens the file.
5. NodeJS reads the file entirely.
6. Your function code continues running.

The handler file is now 7.5mb uncompressed, and Node has to load it entirely.

<span class="image"><a href ="/assets/images/aws-sdk/large_handler.png" target="_blank"><img src="/assets/images/aws-sdk/large_handler.png" alt="Loading the entire minified v2 AWS SDK"></a></span>

Additionally I suspect that AWS can separately cache the built-in sdk with better locality (on each worker node) than your individual handler package, which must be fetched after a Lambda Worker is assigned to run your function.

In simple terms - AWS knows most functions will need to load the AWS SDK, so the library is cached on each machine before your function is even created.

## Minified v2 SDK - loading only the SNS client
Once again we're importing only the SNS client, but this time we've minified it, so the code is the same:
```js
const SNS = require('aws-sdk/clients/sns');
const snsClient = new SNS({});
```
You can see in the cold start trace that the SDK is no longer being loaded from the runtime, rather it's all part of the handler:
<span class="image fit"><a href ="/assets/images/aws-sdk/v2_individual_minified.png" target="_blank"><img src="/assets/images/aws-sdk/v2_individual_minified.png" alt="Loading the minified v2 AWS SDK, containing only the SNS client"></a></span>

63ms is *much* better than the entire minified SDK from the previous test. Here are all three runs:
```
First run: 63ms
Second run: 71ms
Third run: 67ms
```

## Minified v3 SDK
Next, let's look at a minified project using the SNS client from the v3 SDK:
```js
const { SNSClient, PublishBatchCommand } = require("@aws-sdk/client-sns");
const snsClient = new SNSClient({})
```

Here's the flame graph:
<span class="image fit"><a href ="/assets/images/aws-sdk/v3_minified.png" target="_blank"><img src="/assets/images/aws-sdk/v3_minified.png" alt="Loading only the SNS client, minified v3 AWS SDK"></a></span>
Far better now, *104ms*. After repeating this test a few times, I saw that 104ms tended towards the high end and measured some as low as 83ms. No surprise that this will vary a bit (see the caveats), but I thought it was interesting that we got around the same performance as the minified v2 sns client code.
```
First run: 104ms 
Second run: 83ms
Third run: 110ms
```

I also find it fun to see the core modules, which are provided by Node Core, are also traced:
<span class="image fit"><a href ="/assets/images/aws-sdk/v3_http_core.png" target="_blank"><img src="/assets/images/aws-sdk/v3_http_core.png" alt="Loading a core module from the v3 AWS SDK"></a></span>


## Scoring
Here's the list of fastest to slowest packaging strategies for the AWS SDK:

|Config|Runtime|Result|
|--------|----|-----|
|esbuild + individual v2 SNS client|Node16x|63ms|
|esbuild + individual v3 SNS client|Node18x|83ms|
|v2 SNS client from the runtime|Node16x|104ms|
|v3 SNS client from the runtime|Node18x|250ms|
|Entire v2 client from the runtime|Node16x|324ms|
|Entire v2 client, packaged by us|Node16x|540ms|
|esbuild + entire v2 SDK|Node16x|570ms|

## Caveats, etc
Measuring the cold start time of a Lambda function and drawing concrete conclusions at the millisecond level is a bit of a perilous task. Deep below a running Lambda function lives an actual server whose load factor is totally unknowable to us as users. There could be an issue with noisy reighbors, where other Lambda functions are stealing too many resources. The host could have failing hardware, older components, etc. It could be networked via an overtaxed switch or subnet, or simply have a bug somewhere in the millions of lines of code needed to run a Lambda function.

This benchmark is only one library, and one client (SNS). I'd like to repeat this test with other libraries, but that's a bit too much content for one post.

## Takeaways
Most importantly, users should *know* how long their function takes to initialize and understand specifically *which* modules are contributing to that duration.

As the old adage goes:
*You can't fix what you can't measure.*

Based on this experiment, I can offer a few key takeaways:
1. Load only the code you need. Consider adding a lint rule to disallow loading the entire v2 sdk.
2. Small, focused Lambda functions will experience less painful cold starts. If your application has a number of dependencies, consider breaking it up across several functions.
3. Bundling can be worthwhile, but may not always make sense.

For me, this means using the runtime-bundled SDK and import clients directly. For you, that might be different.

As far as the Node18.x runtime and v3 SDK, AWS has already said they're [aware of this issue and working on it](https://github.com/aws/aws-lambda-base-images/issues/47#issuecomment-1423915498). I'll happily re-run this test when there's a notable change in the performance.

Keep in mind, the AWS SDK is only one dependency! Most applications have several, or even dozens of dependencies in each function. Optimizing the AWS SDK may not have a large impact on your service, which brings me to my final point:

## Try this on your own functions
I traced these functions using a feature I built for Datadog called [Cold Start Tracing](https://www.datadoghq.com/blog/serverless-cold-start-traces/), it's available now for Python and Node, and I'd encourage you to try this yourself with your own functions.

## Wrapping up

You can find more of my thoughts on my [blog](https://aaronstuyvenberg.com) and on [twitter](https://twitter.com/astuyve)!
