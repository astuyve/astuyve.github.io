---
layout: post
title: Developing against the Cloud
description: Stop emulating, start developing with real cloud services - 5 minutes
image: pic07.jpg
---

In the days of the LAMP stack, local web development was straightforward. You'd have a copy of your code on your machine, and fire up a local server with something like `rails server`. As complexity and codebases grew, we turned to Docker which promised to save us from configuration hell. The problem only compounded as the popularity of service-oriented architectures caused the number of services in an average backend to explode.

In the world of serverless development, building serverless apps via local emulation suffers from several drawbacks. It's hard to locally mock a large number of disparate services, the services are gaining new features frequently, and offline emulation tools are often community maintained, meaning that new features lag their cloud counterparts until someone like yourself [adds them](https://github.com/mj1618/serverless-offline-sns/pull/56).

The differences between a live AWS environment and a local emulators are many and stark. IAM policies can only be tested in the cloud. Timeouts and memory limits don't exist locally, neither do vCPUs or cold starts. Especially confounding are configuration failures which may cause a function to run without responding, or not to run at all!

There are some great tools such as [serverless offline](https://github.com/dherault/serverless-offline), [SAM local](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-start-api.html), and the [architect framework](https://arc.codes/docs/en/guides/developer-experience/local-development), but I propose that we consider a different way forward - a cloud development environment.

Emulating the cloud on your laptop is fragile, prone to lacking features, and hard to keep orderly (especially for new developers). Instead of trying to constantly keep up with the army of engineers at AWS, let's see how we can use per-feature stacks, shared data access, and extremely quick deployments, to replace local emulation entirely.

One of the aspects of serverless tech we love is that we pay per use, not based on number of servers, deployments, or tables. This means that we could have one stack which performs 10,000 requests per day, or 10 stacks which each perform 1,000 requests per day - and the final bill is the same. Coupled with a generous [free tier](https://aws.amazon.com/lambda/pricing/), it's almost a no-brainer to set up a different instance of your serverless app for every developer. I encourage taking this idea a step further, and actually creating a new stack for each feature you work on. I suggest one stack per branch as a good place to start!

Creating a new stack with the serverless framework (and most others, but this article focuses on the serverless framework) is pretty easy. You can simply give it a new stage name, and run serverless deploy:

```
sls deploy --stage my-new-feature
```

Now we can test in a completely isolated stack, specific to our new feature.

But this leads us to two problems facing cloud-local serverless development. Namely: sharing access to data stores, and painfully slow deployments.

A new stack for each feature is great, but sometimes we want to _share_ resources between by long lived environments (dev, staging, integration, etc) and local environments. Usually we'd prefer run each feature stack against a shared database. This is especially true for single-table designed services, which might require multiple API calls just to set up. How might we share access to things like DynamoDB tables between stacks?

We can accomplish this with a variable in our `serverless.yml` template. Let's imagine that we have a stage, `dev`, which contains a DynamoDB table which we'd like to use while we work on our feature branch, `my-new-feature`. This solution assumes you're using separate AWS accounts for `prod` and `dev`, but will be deploying your feature stacks into your `dev` account. If you've got a different setup this solution may still apply, but you might need to add more complex access control logic for cross-account resource access via IAM.

Take a look at this block in the `custom` section:

```yaml
// Create the boolean
custom:
  dynamoTableMap:
    dev: dev-table
    prod: prod-table
    other: dev-table // This will cause non dev or prod stages to use the dev table.
    // You can add more stage exclusions/specifications here
  dynamoTableName: ${self:custom.dynamoTableMap.${opt:stage}, self.dynamoTableMap.other}

// Permissions
iamRoleStatements:
  - Effect: Allow
    Action:
      - dynamodb:Query
      - dynamodb:Scan
      - dynamodb:GetItem
      - dynamodb:PutItem
      - dynamodb:UpdateItem
      - dynamodb:DeleteItem
      - dynamodb:BatchGetItem
    Resource:
      [
        'arn:aws:dynamodb:*:*:table/${self:custom.dynamoTableName}',
        'arn:aws:dynamodb:*:*:table/${self:custom.dynamoTableName}/index/*',
      ]

// Define the resource. Not necessarily required if you provisioned this in a separate stack
// But I left it here for completion
Resources:
    DynamoTable:
      Type: AWS::DynamoDB::Table
      DeletionPolicy: Retain
      Condition: SkipRetained
      Properties:
        TableName: ${self:custom.dynamoTableName}
```

What we've done here is specify a strict mapping of stage names to resources (in this case a DynamoDB table, but it can be any resource). Then we define a conditional that looks into the map with the stage name. If there's no match, we fall back to the _dev table_. Now when you deploy a new feature-stack, it'll read from and write to the shared dev table.

This isn't always what we'd want, as in some cases we may rely on DynamoDB streams to trigger our Lambda functions. In that case, we'd want to create a new table specific to our feature stack, and then load the necessary data.

So we've solved the data sharing problem. But anyone who has ran `serverless deploy` knows that Cloud Formation deployments can be slow, really slow. We're used to instant feedback, like you'd get from a local webserver. How can we get rapid deployments and quick feedback without long, several minute deployments?

Enter `serverless deploy function`. This [command](https://www.serverless.com/framework/docs/providers/aws/cli-reference/deploy-function/) makes use of the [update function code](https://docs.aws.amazon.com/lambda/latest/dg/API_UpdateFunctionCode.html) API call to skip a full Cloud Formation deployment, and instead simply uploads a new zip file to Lambda. It's much quicker, and usually takes 3-5 seconds (depending on project size). If we modify AWS resources or function configurations, we'd will still need to perform a full `serverless deploy`, but for the quick develop, iterate, deploy cycle that we're accustomed to, `serverless deploy function` is a really great solution.

Here's a demo, running with `time`:
<img src="/assets/images/sls_deploy_function.gif">

There's one last piece we're missing from replicating the full offline experience - and that's streaming logs! With a local server, each request we make streams logs directly to our console.

Lambda instead relies on CloudWatch for logs, and we could go to the AWS console and refresh the page until our latest request shows up. But it's much easier to just run:

```
serverless logs --function myFunctionName --stage my-new-feature
```

This command will use the AWS SDK to fetch the log stream data from CloudWatch and push it straight to our terminal. When I'm working in the develop, iterate, deploy cycle, I frequently have this pulled up in a terminal alongside my code, and then run `serverless deploy function` as I go.

Here's what it looks like, all together:

<iframe width="1000" height="600" src="https://www.youtube.com/embed/cAxGBhdrgB8?controls=0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

Finally, when my feature is ready to be merged into Production, I can easily remove my feature stack and all the resources I provisioned with `serverless remove --stage my-new-feature`. Because most serverless infrastructure is pay-per-use, it probably only cost me a few pennies (usually it's free), no matter how long I let the feature stack stay up!

Adopting a fully cloud-based serverless development workflow can be a tricky mindset change at first. But with per-feature stacks, shared access to data, and super fast deployments + logs, we can get really close to the feel of a local workflow without the pain of emulating every possible cloud service.
