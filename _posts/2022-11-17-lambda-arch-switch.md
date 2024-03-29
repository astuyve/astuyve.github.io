---
layout: post
title: Safely migrating Lambda functions from x86 to ARM
description: Exploring an interesting side-effect of CloudFormation deployments for Lambda - 6 minutes
categories: posts
redirect_from:
  - /lambda-arch-switch
  - /lambda-arch-switch/
image: assets/images/pic15.jpg
---

## Sharp tools and their sharp edges

As Serverless developers, we often take our tools for granted. We press `serverless deploy` or `cdk deploy`, sip some coffee, and it all `just works`. But in reality we're wielding powerful managed services and infrastructure as code; the underlying systems which actually run our software are abstracted away from us - and that's kind of the point. These tools give us zero-downtime deployments, rollbacks, and zero-to-large scale compute _right out of the box_. It's amazing!

These magical abstractions also mean that we often forget that our tools are sharp. Like a knife used absentmindedly, we'll occasionally leave unsafe defaults in place from development to production. That's not a bad thing necessarily! But sharp tools can unpredictably cut us. And unlike chef knives, software is constantly shifting.

## I love getting stuff for free

Serverless developers have the benefit of cloud providers deploying new features which improve our experience and reduce costs. Recently AWS introduced Graviton for Lambda, which leverages their custom ARM-based processor. Using Graviton, AWS says that users can see [19% better performance at 20% lower cost](https://aws.amazon.com/blogs/aws/aws-lambda-functions-powered-by-aws-graviton2-processor-run-your-functions-on-arm-and-get-up-to-34-better-price-performance/) - and many users wouldn't even have to change any of their code at all! At my day job at Datadog, we quickly rolled out ARM-compatible versions of the [Datadog Extension](https://github.com/DataDog/datadog-agent) and our IaC integrations like the [Serverless Plugin](https://www.github.com/DataDog/serverless-plugin-datadog) and the [CDK Construct](https://github.com/DataDog/datadog-cdk-constructs).

Before long a [bug was reported](https://github.com/DataDog/datadog-cdk-constructs/issues/110) by some folks from Vercel, and I started digging in. At first it seemed like a simple bug; switching from x86 to arm64-based Lambda functions caused unix launch errors. It appeared as though an x86-based binary extension was being applied to an arm64-based function. These binaries are incompatible, as x86 and arm64 have different instruction sets. I was able to reproduce the issue, and started to suspect the CloudFormation template generated by the CDK construct.

## That's impossible!

But the CloudFormation template was correct! I couldn't create a condition where we'd erroneously match up the ARM function with x86 Lambda Extension, or vice-versa! It was frustrating. No matter what the template said, for a few seconds during the deployment, the Lambda function would fail to initialize with a unix process launch error.

At this point I had a hunch that this wasn't a bug per-se, rather a sharp edge around CloudFormation and the Lambda control plane. I decided to try to reproduce this issue with the Serverless Framework. It also relies on CloudFormation, but generates different CloudFormation templates, and would rule out the existence of a bug in the CDK construct. I created a [demo project](https://github.com/astuyve/lambda-architecture-bug) and was able to reproduce this immediately.

With two reproducible cases, I filed an AWS support ticket. After some back and forth with the support team, my case ended with a Chime call to the Lambda Workers team. They were super helpful, and pointed out that CloudFormation deployments result in two important API calls to different systems: an `updateFunction` call and `updateFunctionConfiguration` call. These API calls happen in parallel, so the `updateFunction` call is updating the Lambda Function code and architecture, while the `updateFunctionConfiguration` call is setting layers/extensions, as well as environment variables, tags, and things like timeout value and memory.

This race condition is inherent to Lambda and CloudFormation today, and can occur for Layers, Extensions, Environment Variables, or tags! Ultimately we can entirely avoid this failure mode by adhering to best practices: For any production system, you should _never_ directly invoke the [unqualified function ARN](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html). This means specifically rolling out changes to a new Lambda function version or alias, and then mapping that version to your integration (API Gateway, SQS, SNS, EventBridge, etc).

Qualified ARN:

```
arn:aws:lambda:aws-region:acct-id:function:helloworld:42
```

Unqualified ARN:

```
arn:aws:lambda:aws-region:acct-id:function:helloworld
```

## Developer Ergonomics

I freely admit that this is harder to do than simply invoking `$LATEST`. There's a reason multi-phase deployments are not the default for these IaC tools. In many cases you'll need to deploy twice, once to update the function code/configuration, and once to update your integration to point to the new function. Of course if you've [split your stacks](https://dev.to/aws-builders/serverless-at-team-scale-a8), this would already be your deployment practice. But fundamentally I don't think this is your fault, developer. We need sensible defaults that include best practices. We need less risky IAM policies, and we need safer deployments.

We need to demand more ergonomic tools.

## Wrapping up

Although we probably can use `serverless deploy` or `cdk deploy` with regular, unversioned function ARNs in a lot of cases; we need to remember that we're orchestrating load balancers, messaging queues, and complex integrations. These are complex systems with complex failure modes, and these failure modes don't often appear in development environments, and will only burn us in production.

Our tools need to improve as well. Both CDK and Serverless could have interactive deployments to roll out new Lambda function versions. CloudFormation can and should detect when function code and function configuration changes are being deployed simultaneously, and warn or require versioned functions be used. I'd love to see this particular sharp edge documented in the [cdk best practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html).

Until then, let's agree not to point all our traffic straight to `$LATEST`. Our tools are sharp and we use them regularly, but it's important not to forget that we can cut ourselves.

That's all I've got for you today. If you've been burned by this or other Serverless side-effects, feel free to reach out to me on [twitter](https://twitter.com/astuyve) and let me know!
