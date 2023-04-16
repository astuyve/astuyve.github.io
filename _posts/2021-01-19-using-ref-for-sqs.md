---
layout: post
title: How to pass a SQS URL to a Serverless Function
description: Easily pass an SQS URL to your serverless function - 2 minutes
image: /assets/images/pic01.jpg
---

### How to pass a SQS URL to a Serverless Function

I answered [this question](https://stackoverflow.com/questions/60387211/get-sqs-url-from-within-serverless-function/60401467#60401467) on StackOverflow in February 2020, and I noticed that the submission still receives upvotes every few weeks. In the spirit of [@swyx](https://twitter.com/swyx/status/1351197649727352836)'s Three Strikes Rule for Blogging, I decided to write a quick post about it.

The mantra for Serverless applications is to leverage managed services to handle undifferentiated heavy lifting, so it's common to share cloud resources between applications.

Here's how to use the `Ref` to pass an SQS queue URL to a lambda function with the Serverless Framework. We'll handle this by passing the URL as an environment variable to your function. This works for other resources too, like SNS!

Here's the yaml you'll need to create a new queue:

```yaml
resources:
  Resources:
    TheQueue:
      Type: "AWS:SQS:Queue"
      Properties:
        QueueName: "TheQueue"
```

Then, you can reference the queue name and load it as an environment variable:

```yaml
provider:
  name: aws
  runtime: node12.x
  environment:
    THE_QUEUE_URL: { Ref: TheQueue }
```

Now your queue URL can be fetched from the running environment! For a nodejs function, it looks like this:

```js
const params = {
  MessageBody: "message body here",
  QueueUrl: process.env.THE_QUEUE_URL,
  DelaySeconds: 5,
};
```

Under the hood, `Ref` is a CloudFormation method that ensures your queue is created (if it's the first deployment) and then passes the resolved value to your function. You can read more about how psuedo-parameters in the [documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html).

There are lots of other ways to templatize your Serverless Framework apps! You can use command line options, reference files, or even code itself - learn more [here](https://www.serverless.com/framework/docs/providers/aws/guide/variables/)
