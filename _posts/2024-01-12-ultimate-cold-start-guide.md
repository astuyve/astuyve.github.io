---
layout: post
title: The Ultimate Lambda Cold Start Guide 
description: AWS Lambda cold starts can be managed. This guide will teach you how to minimize and optimize your AWS Lambda cold starts, as well as bust several cold start myths 
categories: posts
image: assets/images/lambda_layers/lambda_layers_title.png
---

## The Ultimate Lambda Cold Start Guide
Serverless cold starts are frequently cited as the reason why developers should swear off Lambda functions entirely. The fact of the matter is that painful cold starts are typically managable, and mostly a result of the initial serverless learning curve; not an intractable compromise of using the technology.

This guide breaks down the typical causes of painful cold starts along with the mitigation strategies, with the intention to serve as a reference along your serverless journey. I gave a version of this piece as a talk at AWS re:Invent in 2023, which you can optionally watch:

### Online scaling
If you're new to serverless compute, the most important nuance to understand is that application scaling is an _online activity_. Contrasted against a typical instance based service, you would spin up new compute and then wait, probing a health check endpoint until the new instance is ready. Only then would the instance be placed behind a load balancer and be routed traffic from the load balancer.

Serverless functions scale on demand in the face of pending customer requests, so your application must now initialize as quickly as possible. This tradeoff isn't inherently good or bad, but it is something we can manage.

With that in mind, let's examine the most common cause of cold starts, and how to prevent them.

## Know and Reduce the Code you Load
By far the single most common cause of unnecessarily slow cold starts is *unknowingly* loading dependencies which are *not* needed to serve incoming requests.

This is common as most users build their first functions by *migrating* existing applications into Lambda. They bring all of the existing dependencies, many of which they don't need or even use.
Usually caused when developers import the "junk drawer" libraries, which may include multiple other libraries unknowingly.

### Remove unused code
- Best thing to do here is delete code you don't use
- Lint rules help, but developers love sneaking code in giant exports

### The AWS SDK example
### Be careful with junk-drawer libraries
### Lazily load code which isn't always needed
### ESBuild and Bundling

# Accurately observe your service

### Proactive Initialization
### Init Duration
### Measure round trip request time
- do this with tracing or with metrics
- this will help you understand your *actual* p99 latencies

# Don't fight the platform

### Give your functions enough RAM
- The runtime you select still must fit in the RAM given. Most runtimes aren't designed to operate within 128mb RAM
- More RAM won't fix your cold starts though
- Use power tuning

### Read the docs

### SnapStart for Java
- Probably the single-best switch you can press, but you may find yourself reaching for Quarkus anyway

### Provisioned Concurrency + Autoscaling
- If you have any traffic consistency and time

### Container performance improved 15x


## Mythbusting
- No, layers don't help and you shouldn't use them
- No, warmers don't help and you shouldn't use them
- No, the duration or memory size don't really matter
- Does file locality matter?


## Wrapping up

If you like this type of content please subscribe to my [blog](https://aaronstuyvenberg.com) or reach out on [twitter](https://twitter.com/astuyve) with any questions. You can also ask me questions directly if I'm [streaming on Twitch](twitch.tv/aj_stuyvenberg) or [YouTube](https://www.youtube.com/channel/UCsWwWCit5Y_dqRxEFizYulw).
