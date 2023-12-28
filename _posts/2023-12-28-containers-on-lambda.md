---
layout: post
title: Containers, Coldstarts, and Lambda - Oh My!
description: Lambda recently improved the cold start performance of container images by up to 15x, but this isn't the only reason you should use them. The tooling, ecosystem, and entire developer culture has moved to container images and you should too.
categories: posts
image: assets/images/lambda_layers/lambda_layers_title.png
---

## The case for Containers on Lambda
## Container-based Lambda cold starts have improved dramatically

When AWS Lambda first introduced support for container-based functions, the initial reactions from the community were mostly negative. Lambda isn't meant to run large applications, it is meant to run small bits of code, scaled widely by executing many functions simultaneously.

Containers were not only antithetical to the philosophy of Lambda and the serverless mindset writ large, they were also far slower to initialize compared with their zip-based function counterparts.

Fast forward to 2023, and things have changed. The AWS Lambda team put in tremendous amounts of work and improved the cold-start times by a shocking factor of 15x, according to a paper and talk given by [Marc Brooker](), a Distinguished Engineer on the Lambda team.

So how did they pull this off? And should we all use containers on Lambda from now on?

## The paper
"On demand container loading on AWS Lambda" was published on TODO GET DATE. I suggest you [read the full paper](https://arxiv.org/abs/2305.13162), as it's quite approachable and extremely interesting, but I'll break it down here.

The key to this performance improvement can be summed up in four steps.
1. Deterministically serialize container layers (which are tar.gz files) onto an ext4 file system
2. Divide filesystem into 512kb chunks
3. Encrypt each chunk
4. Cache the chunks and share them _across all customers_

But how can you safely encrypt, cache, and share bits of a container image *between* users?!

Read on, and find out.

## Container images are sparse
One interesting fact about container images is that they're an objectively inefficient method for distributing software applications. It's true!

Container images are sparse blobs, with only a fraction of the contained bytes required to actually run the packaged application. [Harter et al]() found that only 6.5% of bytes on average were needed at startup.

When we consider a collection of container images, the frequency and number of similar bytes is very high. This means there are lots of duplicated bytes copied over the wire every time you push or pull an image!

This is attributed to the fact that container images include a ton of stuff that doesn't vary, things like the kernel, the operating system, system libraries like libc or curl, and runtimes like the jvm, python, or nodejs.

Not to mention all of the code in your app which you copied from Chat GPT (like everyone else).

The reality is that we're all shipping ~90% of the same software.

## Deterministic serialization onto ext4
Container images are stacks of tarballs, layered on top of eachother to form a filesystem like the one on your own computer. This process is typically done at container runtime, using a [storage driver](https://docs.docker.com/storage/storagedriver/) like [overlayfs](https://docs.docker.com/storage/storagedriver/overlayfs-driver/).

In a typical filesystem, this process of copying files from the tar.gz file to the filesystem's underlying block device is *nondeterministic*. Files always land in the same directory, but those locations *on disk* may land on different parts of the block device over the course of multiple instantiations of the container.

This is a performance optimization, as most filesystems use concurrency to improve performance, which introduces nondeterminism.

Lambda also needs a filesystem to execute any typical runtime and function code, so this process is done when a function is created or updated. But for Lambda to efficiently cache chunks of a function container image, this process needed to be deterministic. So they made filesystem creation a serial operation, and thus the creation of Lambda filesystem blocks are deterministic.

## Filesystem chunking
Now that each byte of a container image will land in the same block each time a function is created, Lambda can divide the blocks into 512kb chunks. They specifically call out that larger chunks reduce metadata duplication, and smaller chunks lead to better deduplication and thus cache hit rate, so they expect this exact value to change over time.

The next two steps are the most important.

## Convergent encryption
Lambda code is considered unsafe, as any customer can upload anything they want. But how then, can the


<span class="image fit"><a href ="/assets/images/lambda_layers/layer_run_time.png" target="_blank"><img src="/assets/images/lambda_layers/layer_run_time.png" alt="Lambda function code loading library A @ 3.0!"></a></span>



## Wrapping up


If you like this type of content please subscribe to my [blog](https://aaronstuyvenberg.com) or reach out on [twitter](https://twitter.com/astuyve) with any questions. You can also ask me questions directly if I'm [streaming on Twitch](twitch.tv/aj_stuyvenberg) or [YouTube](https://www.youtube.com/channel/UCsWwWCit5Y_dqRxEFizYulw).
