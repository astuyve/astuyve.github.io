---
layout: post
title: I let Clawdbot buy a car
description: Outsourcing the painful aspects of a car purchase to AI was refreshingly nice, and sold me on the vision of Clawdbot
categories: posts
image: assets/images/silent_crash/silent_crash_header.png
---

## Car buying in 2026 still sucks
Buying a car from a dealership is an objectively awful experience. There's a long history behind why manufacturers don't sell directly to customers (without certain workarounds like Tesla/Rivian), but unless you're going that route you'll inevitably need to talk with someone trying to sell you a car ASAP. Salespeople are typically paid on commission so they're incentivized to get you out of the test drive and into the finance office as quickly as possible.

It's also typically a low-trust endeavor. Manufacturers change incentives every few weeks. Loan rates change constnatly. You'll negotiate a price and learn they didn't include expensive dealer add-ons which can't be removed, or an offer made today is gone tomorrow. Then when you're exhausted and at the end of your patience, they'll slide over a prepaid maintenance contract or key replacement service. It's awful.

So when my family needed to replace our trusty old Subaru, I thought it'd be a good opportunity to say "Claude, take the wheel" and handed over the keys for my digital life to a chatbot.

## Clawdbot
[Clawdbot](https://clawd.bot) is the internet's latest obsession after Claude Code. It's an [open source]() project which pairs an LLM with long running processes to do things like read and write email (and monitor for replies), manage your calendar, and drive a browser with great effect.
<span class="image half"><a href="/assets/images/silent_crash/freeze.png" target="_blank"><img src="/assets/images/silent_crash/freeze.png" alt="Lambda's runtime lifecycle"></a></span>

I've been dying to try it out on something *real* and useful, so buying a new car seemed like a good first task.

You can instruct Clawdbot from a web browser, integrate it with tailscale, or simply send it messages via whatsapp (or signal or telegram). I chose a combination of the browser and whatsapp. It took a bit of fiddling around with Google Cloud to set up `gog` and access gmail/gdrive/gcal, but soon enough Clawdbot was able to access basically my entire digital life.

I named my Clawdbot instance `Icarus` for reasons which became obvious to me in hindsight.

## The car
For a variety of reasons we landed on a Hyundai Palisade.
I'm not interested in explaining my family situation or entire rationale, but YouTuber Doug DeMuro gives a good explanation [here](https://youtu.be/q5J1JHlcLvE?t=1815). After a few test drives and lots of research we moved from the `looking` phase to the `buying` phase.

Ask anyone in sales and they'll tell you that entering a negotiation with a bit of extra knowledge is often the edge you need to win. I didn't have this, but I did have Clawdbot and the entire internet.

For price research, I began with a simple enough prompt: `Use reddit.com/r/hyundaipalisade and find the typical and lowest prices people paid for a 2026 palisade hybrid in Massachusetts`.
Clawdbot churned away and flipped through several browser windows. Interestingly enough it hit a few roadblocks including an error messagin saying `Your request was blocked by network security`, but Clawdbot churned through.

After a few minutes it decided a target price was ~62k:

## Finding the car
My wife had picked out a specific color combination which was a bit rare. Blue (or green), with a brown interior. 


If you like this type of content please subscribe to my [YouTube](https://www.youtube.com/channel/UCsWwWCit5Y_dqRxEFizYulw) channel and follow me on [twitter](https://twitter.com/astuyve) to send me any questions or comments. You can also ask me questions directly if I'm [streaming on Twitch](twitch.tv/aj_stuyvenberg).
