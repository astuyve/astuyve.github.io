--
layout: post
title: Understanding AWS Lambda Proactive Initialization
description: 50% or more of cold starts don't increase latency for users. In this article we'll define Proactive Initialization, observe its frequency, and help you identify invocations where your cold starts weren't really that cold.
image: 
---

AWS recently updated the documentation for the [Lambda Function Lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html), and included this interesting new bit:

"For functions using unreserved (on-demand) concurrency, Lambda may proactively initialize a function instance, even if there's no invocation."

It goes on to say:
"When this happens, you can observe an unexpected time gap between your function's initialization and invocation phases. This gap can appear similar to what you would observe when using provisioned concurrency."

This update is no accident. In fact it's the result of several months I spent working closely with the AWS Lambda service team:
<img src="">

[1 Execution environments (see 'Init Phase' section)](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html), and [2](https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-invocation.html#troubleshooting-invocation-initialization-gap)

## Tracing Proactive Initialization

This adventure began when I noticed what appeared to be a bug in a distributed trace showing a Lambda Function sandbox initializing several minutes before the first function invocation. This can happen with SnapStart, or Provisioned Concurrency - but this function wasn't using either of these capabilities and was otherwise entirely unremarkable.


Here's what the flamegraph looks like:
<img src="">

We can see a massive gap between function initialization and invocation - in this case the API Gateway request wasn't even made by the client until several minutes after the sandbox was warmed up.

After much discussion with the AWS Lambda Service team - I learned that this was a Proactively Initialized Lambda Sandbox.

It's difficult to discuss Proactive Initialization at a technical level without first defining a cold start, so let's start there.

## Defining a Cold Start
AWS Lambda defines a cold start in the [documentation](https://aws.amazon.com/blogs/compute/operating-lambda-performance-optimization-part-1/) as the time taken to download your application code and start the application runtime.

<img src=""> 

Until now, it was understood that cold starts would happen for any function invocation where there is no idle, initialized sandbox ready to receive the request (absent using SnapStart or Provisioned Concurrency).

When a function invocation experiences a cold start, users experience something ranging from 100ms to several additional seconds of latency, and developers observe an `Init Duration` reported in the CloudWatch logs for the invocation.

With cold starts defined, let's expand this to understand the definition of Proactive Initialization.

## Technical Definition of Proactive Initialization
Proactive Initialization occurs when a Lambda Function Sandbox is initialized without being created in response to a waiting Lambda invocation.

As a developer this is desirable, because each proactively initialized sandbox means one less painful cold start which otherwise a user would experience.

As a user of the application powered by Lambda, it's as if there were never any cold starts at all.

It's like getting Lambda Provisioned Concurrency - for free.

## Aligned interests in the Shared Responsibility Model 
According to the AWS Lambda service team, Proactive Initialization is the result of aligned interests by both the team running AWS Lambda and developers running applications on Lambda.

We know that from an economic perspective, AWS Lambda wants to run as many functions on the same server as possible (yes, serverless has servers...). We also know that developers want their cold starts to be as infrequent and fast as possible.

Understanding the fact that cold starts absorb valuable CPU time in a shared, multi-tenant system, (time which is currently not billed) it's clear that any option AWS has to minimize this time is mutually beneficial.

AWS Lambda is a distributed service. Worker fleets need to be redeployed, scaled out, scaled in, and respond to failures in the underlying hardware. After all - everything fails all the time.

This means that even with steady-state throughput, Lambda will need to rotate function sandboxes for users over the course of hours or days. AWS does not publish minimum or maximum lease durations for a function sandbox, although in practice I've observed ~7 minutes on the low side and several hours on the high side.

The service also needs to run efficiently, combining as many functions onto one machine as possible. In distributed systems parlace, this is known as `bin packing` (aka shoving as much stuff as possible into the same bucket).

The less time spent initializing functions which AWS *knows* will serve invocations, the better for everyone.

## When Lambda will Proactively Initialize your function

// BEGIN NDA BLOCK
## One clear cause of Proactive Initialization
On a call with the AWS Lambda Service Team, they confirmed some logical cases of Proactive Initialization - deployments and predictive scaleups.

Consider we're working with a function which at steady state experiences 100 concurrent invocations. When you deploy a change to your function (or function configuration), AWS can make a pretty reasonable guess that you'll invoke that same function 100 times concurrently. Instead of waiting for each invocation to trigger a cold start, AWS will automatically re-provision (roughly) 100 sandboxes to absorb that load when the deployment finishes. Many users will still experience the full cold start duration, but some won't.

Similarly, if a function begins to experience a rapid increase in invocations, AWS Lambda will scale out sandboxes at a rate greater than the current immediate rate of invocations. For a hypothetical example, a Lambda function may experience a sequence of 5 cold starts at the same time, so AWS Lambda provisions 8 new sandboxes (predicting that an additional 3 requests will arrive).

These aren't novel optimizations in the realm of distributed systems, but this is the first time AWS has confirmed they make these optimizations.
// END NDA BLOCK

## One clear cause of a Proactive Initialization
In certain cases, Proactive Initialization is a consequence of natural traffic patterns in your application where an internal system called the AWS Lambda Placement Service will assign pending lambda invocation requests to sandboxes as they become available.

Here's how it works:

When a request triggers a Lambda function, AWS will check for available `warm` sandboxes to run your request.
If none are available, a new sandbox is created - this is a cold start.

However it's possible that in this time that a warm sandbox completes a request and is ready to receive a new request.
In this case, Lambda will assign the request to the newly-free warm sandbox.

The new sandbox which was created now has no request to serve. It is still kept warm, and can serve new requests - but a user did not wait for the sandbox to warm up.

This is a proactive initialization.

## Detecting Proactive Initializations
We can leverage the fact that AWS Lambda functions must [initialize within 10 seconds](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html), otherwise the Lambda runtime is re-initialized from scratch. Using this fact, we can safely infer that a Lambda Sandbox is proactively initialized when:
1. Greater than 10 seconds has passed between the earliest part of function initialization first invocation processed
and
2. We're processing the first invocation for a sandbox.

Both of these are easily tested, here's the code for Node:
```javascript
const coldStartSystemTime = new Date()
let functionDidColdStart = true

export async function handler(event, context) {
  if(functionDidColdStart) {
    const handlerWrappedTime = new Date()
    const proactiveInitialization = handlerWrappedTime - coldStartSystemTime > 10000 ? true : false
    console.log({proactiveInitialization})
    functionDidColdStart = false
  }
  return
}
```

and for Python:
```python
import json
import time

init_time = time.time_ns() // 1_000_000
cold_start = True

def hello(event, context):
    global cold_start
    if cold_start:
        now = time.time_ns() // 1_000_000
        cold_start = False
        proactive_initialization = False
        if (now - init_time) > 10_000:
            proactive_initialization = True
        print(f'{{proactiveInitialization: {proactive_initialization}}}')
    body = {
        "message": "Go Serverless v1.0! Your function executed successfully!",
        "input": event
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
```

## Frequency of Proactive Initializations
At low throughput, there are virtually no proactive initializations for AWS Lambda functions. But I called this function over and over in an endless loop (thanks to AWS credits provided by the AWS Community Builder program), and noticed that almost *65%* of my cold starts were actually proactive initializations, and did not contribute to user-facing latency.

Here's the query:
```
fields @timestamp, @message.proactiveInitialization
| filter proactiveInitialization == 0 or proactiveInitialization == 1
| stats count() by proactiveInitialization
```

Here's the detailed breakdown:
<img src=""> 

Running this query over several days across multiple runtimes, I observed between 50% and 75% of initializations were Proactive (versus 50% to 25% which were true Cold Starts):
<img src=""> 

## What's new with Proactive Initialization
This post confirms what we've all speculated but never knew with certainty - AWS Lambda is pre-warming your functions. We've demonstrated how you can observe this behavior, and even
// NDA BLOCK 
spoken with the AWS Lambda service team to confirm some triggers for this warming.
// END NDA BLOCK

But that begs the question - what should you do about AWS Lambda Proactive Initialization?

## What you should do about Proactive Initialization
Nothing.

In a way, this is the fulfillment of the promise of Serverless. You'll focus on your own application while AWS improves the underlying infrastructure. Cold starts eventually become something managed out by the provider, and you never have to think about them.

We use Serverless services because we offload undifferentiated heavy lifting to cloud providers. Your autoscaling needs and my autoscaling needs probably aren't that similar, but workloads taken in aggregate with millions of functions across thousands of customers, AWS can predictively scale out functions and improve performance for everyone involved.

## Wrapping it up
I hope you enjoyed this first look at Proactive Initialization, and learned a bit more about how to observe and understand your workloads on AWS Lambda. If you want to track metrics and/or APM traces for proactively initialized functions, it's available for anyone using Datadog.

This was also my first post as an [AWS Serverless Hero!](), so if you like this type of content please subscribe to my [blog]() or reach out on [twitter]() or [bluesky]() with any questions.
