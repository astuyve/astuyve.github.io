---
layout: post
title: Thawing your Lambda Cold Starts with Lazy Loading
description: This post will show you how to identify opportunities where Lazy Loading can help you reduce Cold Start Latency. You'll learn this technique, while not always applicable, is something to watch for on your Serverless journey.
categories: posts
image: assets/images/
---

If you've heard anything about Serverless Applications or AWS Lambda Functions, you've certainly heard of the dreaded Cold Start. I've written a lot about Cold Starts, and I spend a great deal of time measuring and comparing various [Cold Start Benchmarks](aaronstuyvenberg.com/aws-sdk-comparison/).

In this post we'll recap what a Cold Start is, then we'll define a technique called Lazy Loading, show you when and how to use it, and measure the outcome!

## What is a Cold Start?
Lambda sandboxes are created on demand when a new request arrives, but live for multiple sequential invocations of a function. When an application experiences an increase in traffic, Lambda must create additional sandboxes.

The additional latency caused by this sandbox creation (which the user also experiences) is known as a Cold Start:

<span class="image fit"><a href ="/assets/images/cold_start.jpg" target="_blank"><img src="/assets/images/cold_start.jpg" alt="Cold Start diagram"></a></span>

## Sample App
This application is a Todo list, which is built for multiple tenants. This application is built using AWS Lambda, API Gateway, and DynamoDB.

One particular user (we can pick on me, AJ, in this case), demands that he is notified by SNS any time a new `Todo item` is added to his list.
The architecture of this application looks like this:

<span class="image fit"><a href ="/assets/images/lazy_load_arch.jpg" target="_blank"><img src="/assets/images/lazy_load_arch.jpg" alt="Lazy Load Todo Architecture"></a></span>

## Eager Loading
Eager loading happens when you load a dependency by calling `require`, or `import` at the top of your function code.
Normally, dependencies in your function are Eager loaded - or loaded during initialization. For Node, Python, and Ruby runtimes - your dependencies are loaded when your application bundle is loaded by AWS Lambda. If you're writing Rust or Go, this is the default behavior as well because binaries are statically compiled into one file.

This code is very typical and you've probably seen it many times. At the top of the file, we load a DynamoDB client along with a SNS client, then we move on to process the payload:

```javascript
'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbClient = DynamoDBDocumentClient.from(dynamoClient);

const { SNSClient, PublishBatchCommand } = require("@aws-sdk/client-sns");
const snsClient = new SNSClient({ region: process.env.AWS_REGION })
const { v4: uuidv4 } = require("uuid");

// handler code in gist
```

The full code is available [here](https://gist.github.com/astuyve/2e7fe4b39a7ffcfa0646deb9e147802d).

## Eager Loading Cold Start
We can measure the duration of this Cold Start Trace and see that loading DynamoDB loads in around 360ms. The DynamoDB client also depends on the AWS STS client, which is true of SNS and most other services. The trace looks like this:

<span class="image fit"><a href ="/assets/images/eager_load_dynamodb.png" target="_blank"><img src="/assets/images/eager_load_dynamodb.png" alt="Eager Load DynamoDB Cold Start Trace"></a></span>


Further down the flamegraph we see SNS loads in another 50ms:

<span class="image fit"><a href ="/assets/images/eager_load_sns.png" target="_blank"><img src="/assets/images/eager_load_sns.png" alt="Eager Load SNS Cold Start Trace"></a></span>

## Lazy Loading to improve performance
If we have hundreds or thousands of users; AJ's `todo` items may represent only 5% or 1% of calls to this endpoint. However we load the SNS client on *every single initialization*, regardless of if we'll use SNS!

Let's fix this!

To improve this performance we can move our `require` statement into a method which we'll call only when a `Todo item` item from AJ is received. Don't worry that we reassign this variable - in NodeJS, calls to `require` are cached so this module load will only occur once on the first call to `loadSns()`. We could also check if the snsClient variable is nil before calling the method, but brevity is preferred here.

This strategy is also effective for Ruby and Python (as well as Java and other languages).

```javascript
'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbClient = DynamoDBDocumentClient.from(dynamoClient);

let snsClient, PublishBatchCommand, SNSClient
const { v4: uuidv4 } = require("uuid");

const loadSns = () => {
  ({ SNSClient, PublishBatchCommand } = require("@aws-sdk/client-sns"));
  snsClient = new SNSClient({ region: process.env.AWS_REGION });
}

module.exports.addItem = async (event) => {
  const body = JSON.parse(event.body);
  const promises = []
  const newItemId = uuidv4()
  // It's for AJ - load the SNS client!
  if (body.userId === 'aj') {
    loadSns();
    // ... rest of handler code in gist
```

The full code is available [here](https://gist.github.com/astuyve/94029d6206eaf144903579cb5d1ea843).

Lazy Loading means that we only load the `SNS` client when we need it - so let's take a look at the Cold Start Trace when a normal user creates a `Todo item`:

<span class="image fit"><a href ="/assets/images/lazy_load_dynamodb.png" target="_blank"><img src="/assets/images/lazy_load_dynamodb.png" alt="Lazy Load DynamoDB Cold Start Trace"></a></span>

We can see that the handler loads in 401ms compared to the previous 478ms - that's a 16% decrease in latency for normal users experiencing a Cold Start!

So what happens when a `Todo item` is created for AJ? You can see that the ~80ms is shifted to the AWS Lambda Handler function span, where AJ has to wait for the SNS client to load:

<span class="image fit"><a href ="/assets/images/lazy_load_sns.png" target="_blank"><img src="/assets/images/lazy_load_sns.png" alt="Lazy Load SNS Cold Start Trace"></a></span>

## Wrapping up
Keen observers would point out that the `init` portion of a Lambda execution lifecycle is free. And they're right! For now. AWS doesn't promise that the init duration is free (although this is [widely observed](https://bitesizedserverless.com/bite/when-is-the-lambda-init-phase-free-and-when-is-it-billed/) and has been for some time).

Cost in dollars shouldn't really be a factor here, as the overall number of cold starts is limited and shifting this dependency to the user with a special case is worth saving everyone other use the initialization time.

This technique is especially applicable to [mono-lambda APIs](https://aaronstuyvenberg.com/posts/monolambda-vs-individual-function-api) where dependencies can vary by route, or specific users like in this simple example. I'd also make a strong case that this type of atypical behavior ought to be refactored out into a separate Lambda Function, but that will be a topic for a different day.

As you embark on your Serverless journey, keep an eye out for opportunities to be lazy!

Hopefully you enjoyed this post. If you're interested in other Serverless minutia, be sure to check out the rest of my [blog](https://aaronstuyvenberg.com) and [twitter feed](https://twitter.com/astuyve)!
