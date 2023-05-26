---
layout: post
title: Deploying a Serverless Image Service on AWS with CloudFront, Api Gateway, S3, AWS Lambda, and Thumbor
description: Leverage this CloudFormation template with a few simple tweaks to deploy a cost-effective Image Service to your platform.
categories: posts
redirect_from:
  - /software-lessons-from-lego-league
image: assets/images/pic06.jpg
---

As a melting pot for all things youth sport technologies, [SportsEngine](https://sportsengine.com) has experienced a fair share of integration challenges. Aggregating and integrating player information is key to our long-term success as a company, and a significant part of that is dealing with images of athletes on the platform.

Traditionally the solution for cropping, resizing, and storing images was simple. You'd decide on how many sizes and formats of an image you'd need, and upload each version to S3 when a user decided to attach a new image to their profile. In the Ruby on Rails world, I'd use something like CarrierWave to interface with S3, expose the resulting image in an API, and be done with it. This worked well, for a while.

Today's users expect high resolution images for their desktop, mobile, and web application experience. It's not time-effective to create dozens of different variations of images for every single upload. Instead, it's best to design a system that allows the client to specify details such as image size, filetype, and color tone - and let the service create an image in response.

Enter an Image Service. AWS makes it simple with the [Serverless Image Handler template](https://aws.amazon.com/answers/web-applications/serverless-image-handler/). Using CloudFront, Api Gateway, Lambda, and S3 you can easily deploy a new service to manipulate images on the fly. You can even utilize AWS Rekognition to automatically detect faces and crop images to center subjects!

### Serverless Image Handler Architecture
<span class="image fit"><img src="/assets/images/serverless_image_handler.png" alt="Serverless Image Handler Architecture Diagram" /></span>

Here's how the process works:
1. The client requests an image from a CloudFront URL.
2. CloudFront checks its cache. If the image exists, it's returned.
3. If the image doesn't exist, the client request is sent to a resource handled by API Gateway
4. API Gateway triggers an AWS Lambda function, which:
5. Fetches the existing image from Amazon S3
6. Uses Thumbor to manipulate the image
7. Stores the image in S3
8. Returns the image to API Gateway
9. API Gateway then stores the resulting image in CloudFront, which is now cached for much faster future access.

This is far superior than the way traditional webservices would work, which would basically generate all required versions of an image up front. If you ever needed a new one, you'd be faced with a nasty, long-running task to convert all existing images - regardless of if you needed every image, or just a few thousand!
However, the initial Serverless Image Handler lacks a few key features.
- Firstly, it only supports one S3 Bucket out of the box
- Secondly, the implementation requires all image parameters to be specified on the query string. This works fine internally, but exposes a bit too much information to the end user.


### Adaptations to extend the service
Here are simple ways to build and deploy a more flexible, powerful, Serverless Image Service.

First, you can actually enable multiple bucket support by simply omitting the AWS_LOADER_BUCKET, and then passing the bucket name as the first argument to Thumbor in the URL
- Set the [AWS_LOADER_BUCKET](https://github.com/awslabs/serverless-image-handler/blob/f47c7c7c8a29e605921297a4bf301a24637f10b1/deployment/serverless-image-handler.template#L366) environment variable to an empty string ('') in your CloudFormation template.

```
 Environment:
        Variables:
          TC_AWS_LOADER_BUCKET: '' # MUST be an empty string, cannot be null
          TC_AWS_ENDPOINT: !FindInMap
            - S3EndPointMap
            - us-east-1
            - endpoint
          TC_AWS_REGION: us-east-1
          # SO-SIH-155 - 07/16/2018 - Rekognition integration
          # Adding env variable for AWS Rekognition
          REKOGNITION_REGION: us-east-1
          LOG_LEVEL: INFO
```

- Pass the bucket as the first argument in the URL

`'https://${Domain}/fit-in/100x100/image-name.jpg'` becomes `'https://${Domain}/fit-in/100x100/bucket_name/image-name.jpg'`

It's worthwhile to note that the default [CloudFormation template](https://github.com/awslabs/serverless-image-handler/blob/master/deployment/serverless-image-handler.template#L237) creates an IAM policy for your stack so that you can read from the specified bucket. If you plan on using multiple buckets, you should explicitly create additional policies, or ensure the buckets are public.

The next thing I wanted to do was provide a way to alias combinations of image manipulations. I disliked having to specify `256x256` and `files:format(png)` all in the query string. Instead, I wanted to simply say `ios_profile_image` or `android_org_logo`, and know that I'll get an image matching preset formats and dimensions. I didn't want to necessarily lose the ability to convert images to arbitrary formats on the fly, but I did want a more concise URL to pass around - especially to public consumers.

This part was pretty straightforward. The Serverless Image Handler template already makes use of the AWS API Gateway, so we simply added an additional resource and routed it back to the default API Gateway route provided by the template. It looks like this:
```
  IosProfileImageMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      ApiKeyRequired: false
      AuthorizationType: NONE
      RestApiId: !Ref ImageHandlerApi
      ResourceId: !Ref IosProfileImage
      HttpMethod: ANY
      RequestParameters:
        method.request.path.imagepath: true
      Integration:
        Type: HTTP_PROXY
        IntegrationHttpMethod: ANY
        PassthroughBehavior: WHEN_NO_MATCH
        RequestParameters:
          integration.request.path.imagepath: method.request.path.imagepath
        Uri: !Sub
          - "https://${ImageHandlerApi}.execute-api.${AWS::Region}.amazonaws.com/image/90x90/smart/filters:format(png)/${Bucket}/{imagepath}"
          - ImageHandlerApi: !Ref ImageHandlerApi
            Bucket: !FindInMap [ PerAccount, !Ref "AWS::AccountId", AssetsBucket ]
```

We realized at this point that although we wanted to support multiple buckets, we could easily map buckets to our API aliases. The `ios_profile_image` API mapped to a profile images bucket, and the `org_logo` API mapped to a totally different bucket (in another AWS account, actually). Because we didn't need the user to specify the origin bucket, we were able to completely remove the `Bucket` argument from the alias. Therefore if an image lives here:

`https://s3.aws.com/some-bucket/profile_images/123/456/image.jpg`

I could create a 90x90, PNG, face-detected image by just navigating to

`http://my_api_gateway.com/profile-image/ios/profile_images/123/456/image.jpg`

and the service would quickly and cheaply convert the image I needed - on demand!

### Rolling it out to Production
There was one last wrinkle to sort out with our Image Service. A bug would somehow prevent our CloudFront URL from properly calling the aliases! We could call each alias directly via the API Gateway, but somehow the addition of CloudFront caused the service to throw a CloudFront 400 error. We were confounded.

AWS support was able to quickly identify the issue. In front of each API Gateway deployment, there actually lives an *implicit CloudFront distribution*. The error we were receiving was caused by CloudFront detecting three redirects through different CloudFront Distributions, and the request was terminated to mitigate a potential DDOS attack vector.

The solution was simple. The CloudFront distribution which we created in front of API Gateway simple needed to be a `Regional` distribution, instead of `Edge-Optimized`. Once we made this change, we were able to roll the Serverless Image Service to production.
