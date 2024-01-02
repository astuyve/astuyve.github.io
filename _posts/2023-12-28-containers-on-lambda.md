---
layout: post
title: How Lambda reduced container cold starts by 15x (and why you should probably use containers now)
description: Lambda recently improved the cold start performance of container images by up to 15x, but this isn't the only reason you should use them. The tooling, ecosystem, and entire developer culture has moved to container images and you should too.
categories: posts
image: assets/images/lambda_layers/lambda_layers_title.png
---

When AWS Lambda first introduced support for container-based functions, the initial reactions from the community were mostly negative. Lambda isn't meant to run large applications, it is meant to run small bits of code, scaled widely by executing many functions simultaneously.

Containers were not only antithetical to the philosophy of Lambda and the serverless mindset writ large, they were also far slower to initialize compared with their zip-based function counterparts.

But if we're being honest, I think the biggest roadblock to adoption was the cold start performance penalty associated with using containers.

Fast forward to 2023, and things have changed. The AWS Lambda team put in tremendous amounts of work and improved the cold-start times by a shocking **15x**, according to the paper and [talk given by Marc Brooker](https://www.youtube.com/watch?v=Wden61jKWvs), a Distinguished Engineer on the Lambda team.

Let's start with pragmatic advice, detailing what you should know about using containers with Lambda. The second half of this post will dive into the internal details of Lambda based on the paper, and help you understand how this performance feat was achieved.

## Performance
I set off to test this new container image strategy by creating several identical functions across zip and container-based packaging schemes. These varied from 0mb of additional dependencies, up to the 250mb limit of zip-based Lambda functions.

As usual, I'm testing the **round trip** request time for a cold start from within the same region. I'm not using init duration, which [does not include the time to load bytes into the function sandbox](https://youtu.be/2EDNcPvR45w?t=1421). I created a cold start by updating the function configuration (setting a new environment variable), and then sending a simple test request. The code for this project is [open source](https://github.com/astuyve/cold-start-benchmarker). I also streamed this entire process [live on twitch](https://twitch.tv/aj_stuyvenberg).

After several days and thousands of invocations, we see the final result. The top row represents container-based Lambda functions, and the bottom row reports zip-based Lambda functions (lower is better):
<span class="image fit"><a href ="/assets/images/lambda_containers/container_metrics.png" target="_blank"><img src="/assets/images/lambda_containers/container_metrics.png" alt="Round trip cold start request time for thousands of invocations over several days"></a></span>

It's easier to read a bar chart:
<span class="image fit"><a href ="/assets/images/lambda_containers/container_bar_chart.png" target="_blank"><img src="/assets/images/lambda_containers/container_bar_chart.png" alt="Round trip cold start request time for thousands of invocations over several days, as a bar chart"></a></span>

## TL;DR
Beyond ~30mb, container images *outperform* zip based lambda functions in cold start performance.

## Should you use containers on Lambda?
I am not advocating that you choose containers as a packaging mechanism for your Lambda function based *solely* on cold start performance.

That said, **you should be using containers on Lambda** anyway. With these cold start performance improvements, there are very few reasons *not* to.

Although it's technically true that container images are objectively less efficient means of deploying software applications, container images should be the standard for Lambda functions going forward.

Pros:
- Containers are ubiquitous in software development, and so many tools and developer workflows already revolve around them. It's easy to find and hire developers who already know how to use containers.
- Graviton on Lambda is quickly becoming the preferred architecture, and container images make x86/ARM cross-compliation easy. This is even more relevant now, as Apple silicon becomes a popular choice for developers. 
- Base images for Lambda are updated frequently, and it's easy enough to auto-deploy the latest image version containing security updates
- Containers do allow you to package larger functions, up to 10gb
- You can use custom runtimes and new runtime versions more easily
- Using the excellent [Lambda web adapter extension](https://github.com/awslabs/aws-lambda-web-adapter) with a container, you can very easily move a function from Lambda to Fargate or Apprunner if cost becomes an issue. This optionality is of high value, and shouldn't be overlooked.

Cons:
- To update dependencies managed by Lambda runtimes, you'll need to re-build your container image and re-deploy your function occasionally. This is something dependabot can easily do, but it could be painful if you have thousands of functions. These updates come free with managed runtimes anyway.
- You do pay for the init duration. Today, Lambda documentation claims that init duration is [always billed](https://aws.amazon.com/lambda/pricing/), but in practice we see that init duration for managed runtimes is not included in the billed duration, logged in the REPORT log line at the end of every execution.

If all of your functions are under 30mb and you're team is comfortable with zip files, then it may be worth continuing with zip files.

For me personally, all new Lambda-backed APIs I create are based on container images using the Lambda web adapter.

We've established that container-based Lambda functions have indeed become much faster to initialize, but this begs the question:
How did they pull this off?

If you like this type of content please subscribe to my [blog](https://aaronstuyvenberg.com) or reach out on [twitter](https://twitter.com/astuyve) with any questions. You can also ask me questions directly if I'm [streaming on Twitch](twitch.tv/aj_stuyvenberg) or [YouTube](https://www.youtube.com/channel/UCsWwWCit5Y_dqRxEFizYulw).
