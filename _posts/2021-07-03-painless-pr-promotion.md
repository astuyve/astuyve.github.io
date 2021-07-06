---
layout: post
title: Painless PR Promotions
description: Produce production PRs without profligating pain. - 8 mins
image: pic12.jpg
---

- Devops and Gitflow go together like blog titles and alliteration
- Rise of monorepos means that gitflow often deploys multiple code changes to multiple services at the same time
- How can we limit blast radius? How can we improve velocity? What target do we aim for?

- Introduction to trunk-based promotion
- This works if
  - Devs are empowered to ship/own their own code in production
  - Reduce changes per deployment
  - Empower developers to ship code when ready (feature flags, code reviews, painless rollbacks)
  - 1 PR per developer per day

- Example

- Rollbacks
- Cleanups
- Code small resources


Version Control branching strategy is a frequently overlooked aspect of engineering organizations seeking to adopt continuous delivery. Orgs often fall into the trap of cargo-culting their waterfall software delivery process straight into their brand new CI/CD pipeline, and then guess what? They’re right back to pushing software once every few weeks to prod, facing a terrifying full-application regression test effort, late night bug crunches, and painful rollback processes. There’s a better way!

The core value proposition behind DevOps and, specifically, continuous delivery is that it’s faster, safer, and provides faster feedback than traditional delivery methods (as laid out by Dr Nicole Forsgren, Gene Kim, and Jez Humble in the book Accelerate). If we consider continuous delivery to be our primary goal, what does a development workflow process designed to maximize these benefits look like? Here’s a system I’ve used at two different companies, and how it’s led us to recognize the power of continuous delivery.

PR based promotion is a process by which the main (or trunk) branch is deployed to production upon every commit. Feature branches are created from the main branch, tested locally, then promoted to a development, staging, and/or QA environment by way of merging to respective branches. When the necessary automated and manual steps have ensured the individual feature branch is working as intended, that feature branch is merged into the main branch by way of a Pull Request, which then deploys the feature branch to production.

We’ll discuss prerequisites (repeatable build process!) to this strategy, and then dive into the nitty gritty details. This promotion strategy delivers on the following philosophy:


Production deploys should be boring, frequent, and done in small batches
Testing changes in a prod-like environment should be painless
Inevitable production issues are fixed quickly by rolling forward 


After covering the actual promotion strategy, and discussing ways to address possible complexities like merge conflicts, and resetting/fast-forwarding Dev from Main, we’ll highlight the flywheel effect of shipping software in small, discrete increments (touching on Jeff Atwood’s Code Smaller post).