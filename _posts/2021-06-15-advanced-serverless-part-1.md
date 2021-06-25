---
layout: post
title: Title TK
description: lol
image: pic07.jpg
---

As Serverless usage ramps up, you'll often find the complexity, size, and subsequent deploy times of your applications grows very quickly.
Commonly, you'll find yourself needing to rely on shared infrastructure like cognito pools, authorizers, dynamoDB tables, VPCs, or API Gateways.

It's also common to reconcile Serverless with your existing IaC tools, like Terraform.
Regardless if you choose to keep your entire IaC configurations in Serverless, CloudFormation, Terraform, or anything else - beyond a certain scale, you'll want to separate infra from app logic.

The duration of a cloud formation deployment grows somewhere between linearly and exponentially with size, so as your serverless apps grow and add additional resources, you may find your deploy times grow to unacceptable levels. To avoid these problems, let's talk about three things - why to split infra and code, when to split infra and code, how to split infra and code, and how to place nice with other IaC tools like TF.

Why:
In the early stages, the beauty of the Serverless Framework is that you can create and configure an API Gateway, IAM Execution role, Lambda function, and CloudWatch logging - all with under 5 lines of code.
Eventually though, you'll run into limits such as 200 resources per Cloud Formation stack. Although there are [plugins]() to help work around the issue, my best advice is to avoid it entirely by splitting your projects into separate CloudFormation stacks by delineating between Infrastructure, and Code/Business Logic.

As code doesn't exist in a vacuum, it's common as projects grow to interface with infrastructure which may be shared by other applications in your cloud environment. Things like an event bus, SNS topic, VPC, database, or Kinesis stream.

When to split Infra and Code:
There are several signs indicating it's time to split your infra from your code, in general these are:

- your serverless.yml file is greater than 100 lines
- You've got more than a lambda function, dynamo table, and maybe a DDB stream-based function
- You're trying to decide if you should add a new domain into an app because a database, bucket, or vpc is set up there
- the lambda functions which run your business logic are greater than one hop from the infra you provision, violating the [law of demeter](https://en.wikipedia.org/wiki/Law_of_Demeter)
- You've got complicated cloudformation that often doesn't need to be updated with average deploys

After you've reached a few of these milestones, you should
