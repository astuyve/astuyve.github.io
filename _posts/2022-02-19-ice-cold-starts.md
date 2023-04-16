---
layout: post
title: Ice Cold Starts
description: Understanding the various types of cold starts in Lambda - 9 minutes
image: /assets/images/pic14.jpg
---

## Lambda Cold Starts

Cold starts are often the first thing developers hear about when they start exploring in the world of Serverless. Although there are a dizzying array of takes on the subject, fundamentally a few things are true:

- Cold starts can be managed, or may be negligible
- The impact of a cold start to your users is dependent on your use case and choice of runtime, package size, and configuration settings
- There are a few types of cold starts - and the differences matter

However not all cold starts are equal. This piece from [Yan Cui](https://lumigo.io/blog/this-is-all-you-need-to-know-about-lambda-cold-starts/) credits Michael Hart with first discovering two unique subtypes of cold starts.
In this case, Yan states that the two types are:

1. Cold starts that happen immediately after a code change
2. Other cold starts (e.g. when Lambda needs to scale up the number of workers to match traffic demand)

Given that cold starts caused by code or configuration change are somewhat unavoidable, the post mainly focuses on the second type of cold start.

However, while working on Datadog's Serverless tooling, I learned of a _third_ type of cold start - caused when a function times out or runs out of memory (OOM).

## The third type of cold start

When a function overruns execution time or memory, the Lambda orchestration system kills the invocation and emits a log (and metric) indicating the invocation failed.

If the same function is invoked again (before the Lambda service recycles the function container and shuts down the environment), we don't see an ice-cold start like we would for a brand new function configuration or when Lambda needs to scale up concurrent invocations of your function. However we do see that the function state is not preserved from previous invocation which timed out or ran out of memory. This cold start clears any connections or data persisted outside of the function handler, and restarts the entire function.

This type of cold start is unique from a traditional cold start, as there is no `init duration` reported at the end of the invocation.

We can prove this type of cold start exists with a small bit of javascript and a simple test case.

## Why you'd memoize

Memoizing, or caching, external data or connections is a common practice in Lambda. Users whose functions connect to databases like Postgres or MySQL, caches like Redis or Memcached, will frequently create the connection initially inside of the handler, and then assign that connection to a variable _outside_ of the handler function, so that it can be re-used on subsequent invocations.

If you're unfamiliar with this technique, you can learn more from [Jeremy Daly](https://www.jeremydaly.com/reuse-database-connections-aws-lambda/), or [MongoDB](https://docs.atlas.mongodb.com/best-practices-connecting-from-aws-lambda/).

## Reproducing this type of cold start

What we'll do is memoize (or cache) a javascript object outside of the function handler code. Then we'll invoke the function a few times. Finally we'll trigger a timeout or OOM error, and then invoke the function again. Each time we'll inspect the cache and see if it's been cleared.

If you'd like to reproduce this in your own AWS account, you may checkout this repository [here](https://github.com/astuyve/ice-cold-starts).
What I've done is create two handlers, each receiving a POST request:

```yaml
functions:
  iceColdStartTimeout:
    handler: timeout.iceColdStartTimeout
    events:
      - http:
          path: /iceColdStartTimeout
          method: post
  iceColdStartError:
    handler: error.iceColdStartError
    events:
      - http:
          path: /iceColdStartError
          method: post
```

When the first invocation runs, we'll note it's a cold start and begin caching the total number of requests outside of the handler.

```javascript
// Helper function to time out the invocation
const delay = async (time) => {
  return new Promise((res) => setTimeout(res, time));
};

// Set up the cache outside of the handler
let cacheVar = { start: "is cold", hits: 1 };

module.exports.iceColdStartTimeout = async (event) => {
  const body = JSON.parse(event.body);

  let returnVal;
  if (cacheVar.start === "is cold") {
    // If we have a cold start, set the 'is warm' value
    returnVal = cacheVar;
    cacheVar = { start: "is warm", hits: 1 };
  } else {
    // Otherwise, increase the cache hits
    cacheVar.hits += 1;
  }
  console.log("cache: ", JSON.stringify(returnVal || cacheVar, null, 2));

  if (body && body.timeout) {
    // Intentionally time the function out
    // if the 'timeout' value is present in the request body
    await delay(30000);
  }
  return {
    statusCode: 200,
    body: JSON.stringify(returnVal || cacheVar, null, 2),
  };
};
```

On subsequent invocations, our handler will increment the count each time a warm cache is hit. Here's an example series of logs demonstrating the behavior, we'll take it invocation by invocation (note that timestamps have been removed and request IDs shortened for readability)

Here's the first invocation after the stack is deployed. You can see it's a cold start because the cache is at its initial state, and that we also see a reported Init Duration of `167.50ms` after the invocation. This represents the time taken for Lambda to provision my function and start my code. The total time my code ran took `10.38ms`. This is an ice-cold start:

```
START RequestId: 4f3645464c2f Version: $LATEST
4f3645464c2f INFO cache: { "start": "is cold", "hits": 1 }
END RequestId: 4f3645464c2f
REPORT RequestId: 4f3645464c2f Duration: 10.38 ms Billed Duration: 11 ms Memory Size: 128 MB Max Memory Used: 56 MB Init Duration: 167.50 ms
```

Now here's the second invocation. Note that in this case, the cache is warm (as it's persisted outside of the handler function), and reports back a second cache it. No Init Duration is reported, as this is a warm-start. We see that this invocation is only `1.32ms`.

```
START RequestId: 5a1560621e1b Version: $LATEST
5a1560621e1b INFO cache: { "start": "is warm", "hits": 2 }
END RequestId: 5a1560621e1b
REPORT RequestId: 5a1560621e1b Duration: 1.32 ms Billed Duration: 2 ms Memory Size: 128 MB Max Memory Used: 56 MB
```

Here's another normal, warm invocation. The cache reports 3 total hits so far, and it only took `1.32ms`.

```
START RequestId: cc337b738bc8 Version: $LATEST
cc337b738bc8 INFO cache: { "start": "is warm", "hits": 3 }
END RequestId: cc337b738bc8
REPORT RequestId: cc337b738bc8 Duration: 1.32 ms Billed Duration: 2 ms Memory Size: 128 MB Max Memory Used: 56 MB
```

Now let's pass `{timeout: true}` in the JSON payload. This causes our function to hang, which is reported after the REPORT line:

```
START RequestId: fd9bb1b0dfd7 Version: $LATEST
fd9bb1b0dfd7 INFO cache: { "start": "is warm", "hits": 4 }
END RequestId: fd9bb1b0dfd7
REPORT RequestId: fd9bb1b0dfd7 Duration: 6006.56 ms Billed Duration: 6000 ms Memory Size: 128 MB Max Memory Used: 57 MB
fd9bb1b0dfd7 Task timed out after 6.01 seconds
```

Finally, we can re-invoke our function. We know it's a cold start, because the cache has been emptied back to its initial state. However, there's no Init Duration reported, as was reported in the first invocation. In this case, the handler code ran for `9.96ms`. This is still a cold start, but not an ice-cold start.

```
START RequestId: 8a7d862fa2c3 Version: $LATEST
8a7d862fa2c3 INFO cache: { "start": "is cold", "hits": 1 }
END RequestId: 8a7d862fa2c3
REPORT RequestId: 8a7d862fa2c3 Duration: 9.96 ms Billed Duration: 10 ms Memory Size: 128 MB Max Memory Used: 12 MB
```

I repeated this test with a function which could trigger an out of memory error. The code is virtually identical, except there's a small utility method which allocates arbitrary blocks of memory, which intentionally triggers the out of memory error.

```javascript
const generateData = (size) => {
  return new Blob([new ArrayBuffer(size)], {
    type: "application/octet-stream",
  });
};
```

Here are the logs:

```
START RequestId: 9508f87c1dbb Version: $LATEST
9508f87c1dbb INFO cache: { "start": "is cold", "hits": 1 }
END RequestId: 9508f87c1dbb
REPORT RequestId: 9508f87c1dbb Duration: 15.75 ms Billed Duration: 16 ms Memory Size: 128 MB Max Memory Used: 56 MB Init Duration: 171.86 ms

START RequestId: fe8478bf2b04 Version: $LATEST
fe8478bf2b04 INFO cache: { "start": "is warm", "hits": 2 }
END RequestId: fe8478bf2b04
REPORT RequestId: fe8478bf2b04 Duration: 1.28 ms Billed Duration: 2 ms Memory Size: 128 MB Max Memory Used: 56 MB

START RequestId: 10993c2d8749 Version: $LATEST
10993c2d8749 INFO cache: { "start": "is warm", "hits": 3 }
END RequestId: 10993c2d8749
REPORT RequestId: 10993c2d8749 Duration: 1.42 ms Billed Duration: 2 ms Memory Size: 128 MB Max Memory Used: 57 MB

START RequestId: 43e50939ce8c Version: $LATEST
43e50939ce8c INFO cache: { "start": "is warm", "hits": 4 }
END RequestId: 43e50939ce8c
REPORT RequestId: 43e50939ce8c Duration: 3296.38 ms Billed Duration: 3297 ms Memory Size: 128 MB Max Memory Used: 128 MB
RequestId: 43e50939ce8c Error: Runtime exited with error: signal: killed Runtime.ExitError

START RequestId: dd47fb969a5e Version: $LATEST
dd47fb969a5e INFO cache: { "start": "is cold", "hits": 1 }
END RequestId: dd47fb969a5e
REPORT RequestId: dd47fb969a5e Duration: 5.17 ms Billed Duration: 6 ms Memory Size: 128 MB Max Memory Used: 51 MB
```

## Impact

If you're caching a connection outside of your handler, cold starts caused by timeouts or OOM errors are _especially_ painful, as those cached connections (and anything memoized outside of the handler function) are cleared during a timeout or OOM error.

## Rationale

It makes sense that a function OOM or timeout would trigger a cold start. [Firecracker](https://firecracker-microvm.github.io/), the micro-VM system underpinning Lambda, freezes the entire function state between executions. If a function just erred, or timed out, it would make sense that Firecracker would want to reset the function to the last known good state. But this isn't a full cold start, as the underlying container still holds the function code, which is why these cold starts aren't as painful as ice-cold starts.

## Key takeaways

Now we know that there are three types of cold starts:

1. Cold starts that happen immediately after a code change (ice-cold start)
2. Other cold starts (e.g. when Lambda needs to scale up the number of workers to match traffic demand, ice-cold start)
3. Cold starts which happen on invocations directly following a function timeout or out of memory error (cold, but not ice-cold)

If you rely on caching data or connections outside of your function handler to improve performance, you should be especially careful about avoiding out of memory errors and timeouts, as those caches will be empty after these errors and need to be rehydrated on the subsequent invocation. This can be especially painful if a datastore is responding slowly, as several concurrent function timeouts (and subsequent reconnection attempts) can exacerbate downtime and outages.

That's all I've got for you this time. If you know of other types of cold starts, or interesting Lambda phenomena, feel free to reach out to me on [twitter](https://twitter.com/astuyve) and let me know!
