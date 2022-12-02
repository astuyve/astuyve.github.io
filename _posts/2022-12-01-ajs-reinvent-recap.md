---
layout: post
title: AJ's re:Invent Recap - 2022
description: My three favorite features launched at re:Invent 2022
image: reinvent2022.jpg
---

## re:Invent Recap

AWS re:Invent was a whirlwind! I had a great time meeting a number of AWS Community Builders, Heroes, and cloud enthusiasts. A huge part of re:Invent is the highly anticipated product launches, and there were far [too many](https://techcrunch.com/2022/11/30/heres-everything-aws-announced-today/) for me to discuss individually. Instead, here are three new features that I'm most excited about.

## EventBridge Pipes

EventBridge is one of my favorite serverless services. It's made building event-driven applications quite simple. You can easily create an Event Bus, define a few events, and set up targets to receive those events. This gave users a clear path to build loosely coupled, fully serverless systems.

However - I often found the need to use a Lambda function as a target to filter events in some way. Occasionally I'd do some transformation and re-publish an event back into a bus. This is easy enough, but there are operational and development considerations to adding any additional Lambda function to your application. Therefore, I'm happy to use any service which allows me to remove custom Lambda functions and replace them entirely with something managed.

<span class="image fit"><a href ="/assets/images/pipes.png" target="_blank"><img src="/assets/images/pipes.png" alt ="EventBridge Pipes - image from AWS Blog"></a></span>

Enter EventBridge Pipes. Pipes allow you to define optional filter, transform, or enrich stages between sources and target destinations. The Pipe will maintain order for you, and doesn't have to be used with an Event Bus.

You can learn more about EventBridge Pipes in the [blog post](https://aws.amazon.com/blogs/aws/new-create-point-to-point-integrations-between-event-producers-and-consumers-with-amazon-eventbridge-pipes)

## SnapStart

I've already written [extensively](https://aaronstuyvenberg.com/snap-start-for-lambda/) about SnapStart, so I won't dive in here. That said, SnapStart for Lambda is how Lambda should have been from the very beginning.

I discussed this opinion in depth with Tarun, the Lambda Product Manager behind this feature, who understands my perspective (although I won't say he necessarily agrees. This blog is my opinion, not his).

SnapStart is the result of many years of work, requiring infrastructure changes, new caching system deployments, and runtime changes to make the hooks function. It was a heavy lift, and I'm pleased to see this one land.

Hopefully we see SnapStart for more runtimes very soon.

## Application Composer

I had never used Stackery for a production deployment, but given how complex some of my CloudFormation templates have been - I think I probably should have. Stackery was SaaS product that helped you build Serverless applications with a simple drag and drop interface.

Stackery was acqui-hired by AWS in 2021, and the product was shut down. It seems that some of those innovations and influences have been rolled into a new feature called Application Composer, and the UX actually looks; really really good.

AWS is infamous for building really reliable, scalable infrastructure tools with a clunky developer experience. But from the videos I've seen so far, Application Composer looks excellent. I haven't played with it yet, but I'm looking forward to it.

<span class="image fit"><a href ="/assets/images/composer.png" target="_blank"><img src="/assets/images/composer.png" alt ="Application Composer - image from AWS Blog"></a></span>

You can import existing CloudFormation or SAM templates and visualize them, make changes, and then re-export them without ever having to use another intrinsic function like `!ref` or `!getAtt`.

Check out the [blog post](https://aws.amazon.com/blogs/compute/visualize-and-create-your-serverless-workloads-with-aws-application-composer/) from Julian Wood to learn more.

## Bonus: Javascript resolvers for AppSync

AppSync helps developers write GraphQL APIs on AWS, which I haven't used seriously - mainly due to my aversion to authoring VTL.

Now I'll need to give it a serious second look, as we can use a subset of Javascript to implement business logic in AppSync.

There are limitations, but this release likely helps many users remove Lambda functions which they previously used between AppSync and other AWS resources. For that alone, it deserves a mention here. Learn more [here](https://aws.amazon.com/blogs/mobile/getting-started-with-javascript-resolvers-in-aws-appsync-graphql-apis/).

## Wrapping up

Alright, if you've made it to the end, I assume I have either deeply offended you, or piqued your interest. You can find more of my thoughts on my [blog](https://aaronstuyvenberg.com) and on [twitter](https://twitter.com/astuyve) and let me know!
