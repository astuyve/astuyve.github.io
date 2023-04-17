---
layout: post
title: Introducing Streaming Response from AWS Lambda
description: A quick look a new way to stream data from AWS Lambda functions, written in NodeJS.
image: /assets/images/response-streaming.png
---
Today, AWS has announced support for [Streaming Responses from Lambda Functions](https://aws.amazon.com/blogs/compute/introducing-aws-lambda-response-streaming/). This long-awaited capability helps developers stream responses from their functions to their users without necessarily waiting for the entire response to be finished. It's especially useful for server-side rendering, commonly used by modern javascript frameworks. This capability reduces Time to First Byte, which makes your application feel snappier, and load more quickly - especially for users who are geographically far from the AWS datacenter you're using, or users with poor connections.

Let's dive in.

## Enabling

To enable Streaming Responses, developers will have to modify their function code slightly. Your handler will need to use a new decorator available in the Lambda runtime for Node 14, 16, or 18, which wraps your handler. This decorator is injected directly in the runtime, so you don't need to import any packages. A user [extracted the method from the base lambda image](https://gist.github.com/magJ/63bac8198469b6a25d5697ad490d31e6#file-index-mjs-L925) quite some time ago, so this launch has clearly been planned for a while.

Here's an example from the launch post:
```javascript
exports.handler = awslambda.streamifyResponse(
    async (event, responseStream, context) => {
        responseStream.setContentType("text/plain");
        responseStream.write("Hello, world!");
        responseStream.end();
    }
);
```

If you're familiar with Node's [writable stream API](https://nodejs.org/docs/latest-v14.x/api/stream.html#stream_writable_streams), then you'll recognize that this decorator implements one. AWS suggests you use stream pipelines to write to the stream - again, here's the example from the launch post:
```javascript
const pipeline = require("util").promisify(require("stream").pipeline);
const zlib = require('zlib');
const { Readable } = require('stream');

exports.gzip = awslambda.streamifyResponse(async (event, responseStream, _context) => {
    // As an example, convert event to a readable stream.
    const requestStream = Readable.from(Buffer.from(JSON.stringify(event)));
    
    await pipeline(requestStream, zlib.createGzip(), responseStream);
});
```

Apart from something like server-side HTML rendering, this feature also helps transmit media back to API callers. Here's an example of a Lambda function rendering an image, using response streaming:
```javascript
/**
 * Response streaming function which loads a large image.
 */
exports.handler = awslambda.streamifyResponse(
  async (event, responseStream, _context) => {
    responseStream.setContentType("image/jpeg");
    let result = fs.createReadStream("large-photo.jpeg");

    await pipeline(result, responseStream);    
  }
);
```

You can see the response streaming to the browser, which looks like this:
<video width="1410" height="720" controls>
  <source src="/assets/images/streaming_response.mp4" type="video/mp4">
</video> 

## Calling these functions

Next, if you're going to call a function which issues a Streaming Response programmatically using the NodeJS AWS SDK, you'll need to use v3. I've [written about this change extensively](https://aaronstuyvenberg.com/aws-sdk-comparison/), but most importantly for this feature - it doesn't seem that the v2 SDK is supported at all. So you'll need to upgrade before you can take advantage of Streaming Responses. If you're looking to invoke a function using Streaming Responses with other languages, it's also now supported using the AWS SDK for Java 2.x, and AWS SDKs for Go version 1 and version 2. I'd hope Python's boto3 support is coming soon.

## But wait, one catch

Finally, developers can use this capability only with the newer Lambda Function URL integration. Function URLs are one of several ways to trigger a Lambda Function via an HTTP request, which I've covered [previously, in another post](https://dev.to/aws-builders/introducing-lambda-function-urls-4ahd). This will be a bit limiting in terms of authentication mechanisms.

API Gateway and ALB are more common HTTP Integration methods for Lambda, and they do not support chunked transfer encoding - so you can't stream responses directly from a Lambda function to API Gateway or ALB using this feature.

You can use API Gateway in front of Lambda Function URL, and use that to increase the response size from the previous limit of 10mb, up to the new soft limit of 20mb - but users won't see an improvement in Time to First Byte.

## My take
If you're using Lambda to serve media such as images, videos, or audio - Streaming Responses will help immensely. That's not been a core use case for me personally, but I suspect this will be most leveraged by developers using Lambda to serve frontend applications using server-side rendering. For those users, I think this launch is particularly exciting.
Ultimately, Streaming Response for Lambda is an important step in bringing the capability of Lambda closer to what users can get in other, traditional server-ful compute environments. It's an exciting new feature, and I'm looking forward to seeing the capabilities it unlocks for users.

## Wrapping up

As always, if you liked this post you can find more of my thoughts on my [blog](https://aaronstuyvenberg.com) and on [twitter](https://twitter.com/astuyve)!
