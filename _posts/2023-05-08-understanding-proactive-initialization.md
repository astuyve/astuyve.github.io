--
layout: post
title: Understanding AWS Lambda Proactive Initialization
description: Half of your cold starts don't increase latency for users. In this article we'll define Proactive Initialization, observe its frequency, and help you identify invocations where your cold starts weren't really that cold.
image: /assets/images/response-streaming.png
---


AWS recently updated the documentation for the [Lambda Function Lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html), including an interesting new bit:

"For functions using unreserved (on-demand) concurrency, Lambda may may proactively initialize a function instance, even if there's no invocation."

It goes on to say:
"When this happens, you can observe an unexpected time gap between your function's initialization and invocation phases. This gap can appear similar to what you would observe when using provisioned concurrency."




Recently I was working on a bug which presented a distributed trace to a user appearing to show a Lambda Function sandbox intializing several minutes before the first function invocation. I didn't think this was possible, but after much discussion with AWS - I learned of the existince of something called Proactive Initialization. As a result of my ticket, AWS updated the Lambda documentation. The documentation for the [Lambda Function Lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html) now says:

"For functions using unreserved (on-demand) concurrency, Lambda may may proactively initialize a function instance, even if there's no invocation."

It goes on to say:
"When this happens, you can observe an unexpected time gap between your function's initialization and invocation phases. This gap can appear similar to what you would observe when using provisioned concurrency."


Here's what this looks like in practice:
<img src="">

## Define a Cold Start
AWS Lambda defines a cold start in the [documentation](https://aws.amazon.com/blogs/compute/operating-lambda-performance-optimization-part-1/) as the time taken to download your application code and start the application runtime.

<img src=""> 

Until now, it was assumed that (absent using SnapStart or Provisioned Concurrency), cold starts would happen on any function invocation where there is no idle, initialized sandbox to receive the request.
When a function invocation experiences a cold start, users see `Init Duration` reported in the CloudWatch logs, and usually experience 100ms to several additional seconds of latency.

## Technical Definition
Proactive Initializations are defined as the initialization of a Lambda Function Sandbox without an invocation immediately present to serve. As a customer this is desirable, because each proactively initialized sandbox means one less painful cold start which otherwise a user would experience.

It's like getting Lambda Provisioned Concurrency - for free.

## Cause of a Proactive Initialization
The cause of this is a recent performance optimization within lambda where initDuration is still reported however the container was pre-warmed.
It does not appear that AWS is intentionally pre-warming your functions, rather this is a consequence of traffic patterns in your application and the performance optimization which will assign pending lambda requests to sandboxes as they become available.

Here's how it works:

When a request triggers a Lambda function, AWS will check for available `warm` sandboxes to run your request.
If none are available, a new sandbox is created - this is a cold start.

However it's possible in this time that a warm sandbox completes a request
In this case, Lambda will assign the request to the newly-free warm sandbox.

The new sandbox which was created now has no request to serve. It is still kept warm, and can serve new requests.

This is a proactive initialization.

## Detecting Proactive Initializations
We can exploit the fact that AWS Lambda functions must initialize within 10 seconds, otherwise the Lambda runtime is re-intialized from scratch. Using this fact, we can safely infer that a Lambda Sandbox is proactively initialized when:
1. Greater than 10 seconds has passed between the earliest part of function initialization first invocation processed
and
2. We're processing the first invocation for a sandbox.

Both of these are easily tested, here's the code for Nodejs:
```javascript
// TK
```

and Python:
```python
```

## Frequency of Proactive Initializations
At low throughput, there are virtually no proactive initializations for AWS Lambda functions. We can d


## What you should do about Proactive Initialization
We use Serverless services because we offload undifferentiated heavy lifting to cloud providers. As our dev 
