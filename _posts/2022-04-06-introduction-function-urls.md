---
title: Introducing Lambda Function URLs
description: A quick look at a brand new way to invoke Lambda functions!
categories: posts
image: assets/images/function_urls/function_url_cover.png
---

AWS has just launched a new, not entirely unfamiliar feature - there is now a new way to invoke a Lambda function via HTTP API call.

Lambda Function URLs are built into Lambda itself, so there's no need to configure an external API Gateway (V1) or HTTP Api (V2).

You can create one right now through the AWS console, either by creating a new function or editing an existing function:
<span class="image fit"><a href ="/assets/images/function_urls/function_url_cover.png" target="_blank"><img src="/assets/images/function_urls/function_url_cover.png" alt="Function URLs in the AWS Lambda Console"></a></span>

This short post will help you understand what Lambda Function URLs are, when to choose them, and when to reach for a more traditional API integration.

## At a glance

Lambda Function URLs allow your function to be called via a HTTP request. This capability isn't new, previously you'd need to pair Lambda with API Gateway (v1 or v2) to invoke a function via HTTP request. API Gateway had a free tier, but after that you'd be charged $1.00/million requests (not including the time your Lambda function required to execute).

The key distinction between API Gateway and Lambda Function URLs is that Function URLs are a _free_* way to invoke your Lambda function via HTTP request *(you only pay for the very small additional running time incurred by serializing the request and response).

## That's right, Lambda Function URLs are free

This is clearly the biggest selling point for Function URLs because it's not uncommon for API Gateway to be the biggest part of a Serverless bill!


There are also more significant advantages:
- Function timeout is 15 minutes, instead of API Gateway's 29 seconds
- Ease of setup and use
- Performance seems to be _really_ good for an API-based Lambda integration. With a vanilla Node.JS App, cold starts take about 900ms until the function is invoked, and warm starts are a *blistering* 8.35ms 🤯

<span class="image fit"><a href ="/assets/images/function_urls/cold_start.png" target="_blank"><img src="/assets/images/function_urls/cold_start.png" alt="Function URLs Cold Start"></a></span>
and
<span class="image fit"><a href ="/assets/images/function_urls/warm_start.png" target="_blank"><img src="/assets/images/function_urls/warm_start.png" alt="Function URLs Warm Start"></a></span>

But there are some drawbacks over a API Gateway/HTTP API:

- No specified routes or payload formatting options
- No custom domain names. Your URL is randomly assigned an ID: `https://<url-id>.lambda-url.<region>.on.aws`
- IAM authorization or public endpoints only, no authorizers are supported.
- Only synchronous invocation is supported


## Routing
Function URLs are similar to the `proxy+` integration you may be familiar with in API Gateway.
This means that any HTTP method to any endpoint will route to your function, eg:
`POST https://<url-id>.lambda-url.<region>.on.aws/foo/123/bar`
and
`GET https://<url-id>.lambda-url.<region>.on.aws/biz/456/`
will both invoke your function.

If you want to serve multiple resources from the same Function URL, you'll need to parse the route from the requestOptions in your Lambda Function. This effectively places you into a [Mono-Lambda](https://aaronstuyvenberg.com/posts/monolambda-vs-individual-function-api) API pattern.

## Authorization Options

<span class="image fit"><a href ="/assets/images/function_urls/auth.png" target="_blank"><img src="/assets/images/function_urls/auth.png" alt="Function URL Authorization"></a></span>
Your authorization choices are limited to Public, or IAM authorized. This lets you write IAM policies to restrict which users or services can invoke your Lambda Function via the Function URL. It's worth noting that you can still use IAM to limit who can invoke the function explicitly via the `aws sdk` or CLI, which opens up some interesting configuration choices. 

## Payload Specification

As there is no method for specifying Lambda integration method, like with API Gateway, Lambda Function URLs infer response format and use the API Gateway payload v2 request format.

- If your function returns a string, API Gateway will return a HTTP 200 status code and your message.
- If your function returns valid JSON, it will be sent (along with a HTTP 200 status code).

Most users will want more control over the full HTTP response, and thus specific keys like `headers`, `statusCode`, and `isBase64Encoded` are properly assigned to the API response. `cookies` can also be set, and are represented as a string array.

Function output:

```json
{
  "statusCode": 201,
  "headers": {
    "specified-header": "specified-header-value"
  },
  "body": "\"result\":\"success\"",
  "cookies": ["User_Id=abcd1234; Expires 19 Nov 2021 20:22 GMT"]
}
```

Client response:

```
HTTP 201
content-type: application/json
specified-header: specified-header-value
set-cookie: User_Id=abcd1234; Expires=19 Nov 2021 20:22 GMT
{
  "result": "success"
}
```

The full documentation is available [here](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html), and goes into several more examples.

## Key takeaways

Having played with Lambda Function URLs, I think they're useful in a couple of important cases - Mono-Lambda APIs, Service to Service communication, and lightweight webhooks. I think with a few iterations, Function URLs could get much better - and possibly be the default integration mechanism for HTTP-based Lambda invocation.

## The Mono-Lambda API

Given the caveat that your authentication and authorization is already handled via IAM, or you can resolve it in your function against a provider like Auth0 - Lambda Function URLs are a cheap and easy way spin up a Mono-Lambda API. I've written extensively about why you might consider this pattern, so dig in to this [blog post](https://aaronstuyvenberg.com/posts/monolambda-vs-individual-function-api) if you're curious to learn more.

## The Webhook use case

Sometimes I just need a darn lambda function to talk to Slack, or to receive a webhook from Github. Gluing workflows together has been one of the key attractions of Serverless technology, and Function URLs fit a great niche as they are easy to set up when I don't care to have an `api.company.com` domain name.

## Service-to-Service communication

Serverless APIs often use Cognito or Auth0 to authenticate requests from users, but in a service oriented architecture, one system often needs to authenticate with another system as a service (not acting as a user). Usually this is for things like bulk processing of records, or fetching data asynchronously.

Function URLs protected with IAM roles fill a gap here, as previously you'd either need to pass user authentication context (which is not desirable, especially if the downstream service is being invoked via some persistent mechanism like DynamoDB Streams), or call the Lambda function directly with the AWS SDK (which is either a slight hassle or massive headache).

## New for 2023 - Response Streaming
Almost exactly a year later AWS has launched Streaming Responses for NodeJS. This feature helps reduce time to first byte by allowing your function to start streaming the beginning of a response to the user before waiting for the entire response to be finished. Function URLs are the only way to get streaming responses out of Lambda, so you'll need to use them if you'd like to harness this new capability. You can read more about Response Streaming [here](https://aaronstuyvenberg.com/posts/introducing-response-streaming).

## Wrapping up

Long term I see Function URLs fitting a pattern of service discover via Outputs, where public APIs are served with API Gateway, and internal API endpoints are surfaced with Function URLs and shared via CloudFormation Outputs (which I [suggest](https://dev.to/aws-builders/serverless-at-team-scale-a8) you to use for sharing configuration between services).

Good luck out there. Feel free to reach out on [twitter](https://twitter.com/astuyve) with specific questions, or to share something you're building!

