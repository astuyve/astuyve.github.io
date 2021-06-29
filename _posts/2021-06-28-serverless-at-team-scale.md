---
layout: post
title: Serverless at (Team) Scale
description: Reduce complexity, cognitive load, and deployment times by splitting cloud infrastructure from lambda code, using CloudFormation Outputs to share resources, and use SSM to play nice with Terraform and other IaC tools. - 8 mins
image: pic11.jpg
---
One of the great aspects of building Serverless applications is that it's pretty dang easy to get started. You can plop down five lines of yaml in your framework of choice, and deploy a full endpoint comprising an API Gateway, a route, a Lambda function and trigger, IAM role and policy, AND even logging. And the best part is that it's massively scalable. You don't need to deploy a load balancer, understand how a reverse-proxy works, or learn how to set up syslog. You can just push code!

<span class="image fit"><img src="/assets/images/splitting_stacks/start.png"></span>

And yet somehow, so many of our `serverless.yml` files come out looking more like this:
<span class="image fit"><img src="/assets/images/splitting_stacks/bad.png"></span>

CloudFormation is great! Seriously, this post is not thrashing CloudFormation. It does so much! It manages the state of the services you're configuring, it understands how to resolve dependencies between cloud pieces, and provides a reliable, deterministic way to provision infrastructure. _However_ - As your Serverless usage ramps up, you'll often find the complexity, size, and subsequent deploy times of your applications grows very quickly.

Primarily this is due to the fact that your application consumes or provisions numerous AWS resources. This in itself is not a bad thing, the Serverless mantra is to prefer managed services over custom solutions! However, you'll often find your template(s) include a bunch of resources. When you deploy these templates CloudFormation needs to construct a directed, acyclic graph of resources, and check the configuration of each one before moving on. This takes a long time, upwards of 20 minutes in some cases. These deployment times are challenging as the vast majority (> 90%) of your deployments will only touch the actual business configuration (Lambda function code) for your app!
<span class="image fit"><img src="/assets/images/splitting_stacks/deploy_time.jpeg"></span>

As you grow, you'll also want to solve new business problems with Serverless. This leads to new stacks, and often presents an issue - how does one share infrastructure between Serverless stacks? More specifically, frequently shared infrastructure like cognito pools, VPCs, or API Gateways. You may even run into the dreaded 200 resources per CloudFormation stack error!

Although it's tempting to reach for a [plugin](https://www.npmjs.com/package/serverless-plugin-split-stacks) which can split stacks into smaller stacks, that's only going to _increase_ your deployment times (not to mention overall complexity). It's time to split stacks, but the right answer is not to split one giant stack programmatically. The answer is to *split your infrastructure from your code, intentionally.*

## Divide and conquer your business domains in the cloud
Specifically what I'm talking about here is splitting your long-lived and/or shared infrastructure from the resources you change frequently. Frequently changed resources are generally:
- Lambda function code & configuration
- API Gateway configuration (unless you're using a shared gateway or mono-lambda pattern)
- DynamoDB table (unless it's shared, which I don't typically recommend)

Long-lived infrastructure are things like:
- Cognito configuration
- VPCs
- API Gateways (if they are shared, or you're using a mono-lambda pattern)
- EventBridge
- SNS topics
- Kinesis Producers

The key takeaway here is to move your shared, long term, slowly-changing infrastructure into a separate stack from your domain-specific, often-updated business logic & configuration. This will reduce the cognitive overhead of logic changes, limit bug blast radius, and perhaps most relevant for developers like myself - _drastically_ cut down on deployment time. If you haven't read my post about how to cut that down even further, check out [developing against the cloud](https://dev.to/aws-builders/developing-against-the-cloud-55o4/stats)

## Warning signs which indicate your stacks are too large
The biggest sign you need to split your infrastructure into new stacks is if you find yourself violating the Infrastructure [Law of Demeter](https://en.wikipedia.org/wiki/Law_of_Demeter). That is to say - the Lambda function which run your business logic are greater than one hop from the infra you provision in the same stack.

Beyond that, there are several other code smells which, when you catch a whiff, warn you it's time to split your infra from your code. Namely:
- Your serverless.yml file is greater than a few hundred-ish lines
- You've got more than a lambda function, dynamo table, and maybe a DDB stream-based function in your stack
- You're trying to decide if you should add a new business domain into a stack purely because a database table, bucket, or vpc is set up in the existing stack

A clean and scalable way to share resources between stacks is with [CloudFormation Outputs](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html). Outputs let you share arbitrary primitives across stacks within the same AWS Account. You can declare these inside your `serverless.yml` in the `resources` block:

```yaml
resources:
  # Okay, now we're writing raw CloudFormation
  Resources:
    Outputs:
        PersonasTableArn:
        Description: The ARN for the Persona's Table
        Value:
            'Fn::GetAtt': [personasTable, Arn] # This could be a string, but I'm using a GetAtt as that seems more realistic
        Export:
            Name: ${self:service}:${opt:stage}:PersonasTableArn # Export name must be *unique* across all outputs for a region. This name is what you'll import in other stacks
```

Then you'll use the `Export` name in another stack to consume the output with the `${cf:output_name}` syntax (documentation [here](https://www.serverless.com/framework/docs/providers/aws/guide/variables/)):
```yaml
provider:
  environment:
    PERSONAS_TABLE_ARN: ${cf:OtherService:${opt:stage}:PersonasTableArn}
```
You can learn more about cross-stack references [here](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/walkthrough-crossstackref.html). Here's a more detailed [reference](https://www.serverless.com/framework/docs/providers/aws/guide/variables#reference-cloudformation-outputs) for Serverless Framework projects.

## Notes on Terraform, and other non-CloudFormation systems
It's also common to reconcile Serverless with your existing IaC tools, like Terraform. If you do use Terraform, I'd recommend adhering to the same principles above. Namely, rely on Terraform to provision your long-lived, seldom-changed infrastructure. Then use SAM, Serverless Framework, or whatever you prefer for rapid code deployments.

Terraform doesn't rely on CloudFormation. Instead, it offers to store state in an plethora of backends (often an S3 bucket), which means you'll need to share resource identifiers manually, instead of using CloudFormation Outputs. The easiest option I've found is to rely on AWS Systems Manager [(SSM)](https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-systems-manager.html).

If you use Terraform to provision something like a Cognito pool, or a shared SQS Queue, you'll need to publish the ARN or name into SSM using the [Terraform SSM parameter resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter). Then you can consume them in Serverless apps with the `${ssm:...}` [reference](https://www.serverless.com/framework/docs/providers/aws/guide/variables#reference-variables-using-the-ssm-parameter-store).

Occasionally you'll find yourself needing to share resources _FROM_ a CloudFormation stack _TO_ a Terraform project. In that case, I recommend you try the [serverless-ssm-publish plugin](https://www.npmjs.com/package/serverless-ssm-publish-plugin). This will allow you to publish to SSM upon deployment of your infrastructure stacks, and then consume them in Terraform.

The downside of mixing the two, and more generally using SSM to maintain cloud state, is that there's no dependency resolution. One must be careful to ensure your Terraform projects push data to SSM before consuming them in Serverless apps, and vice-versa.

Regardless if you choose to keep your entire IaC configurations in Serverless, CloudFormation, Terraform, or anything else - beyond a certain scale, you'll want to separate infra from app logic. This will keep cognitive overhead per deployment low, limit your deployment blast radius, and cut down on that ever-important deployment time.