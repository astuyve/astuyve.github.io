---
layout: post
title: Clawdbot bought me a car
description: Outsourcing the painful aspects of a car purchase to AI was refreshingly nice, and sold me on the vision of Clawdbot
categories: posts
image: assets/images/clawd_car/clawd_home.jpg
---

## Car buying in 2026 still sucks
Buying a car from a dealership is an objectively awful experience. There's a long history behind why manufacturers can't sell directly to customers (without certain workarounds like Tesla/Rivian), so unless you're going that route you'll inevitably need to talk with someone trying to sell you a car ASAP. Salespeople are typically paid on commission so they're incentivized to get you out of the test drive and into the finance office as quickly as possible.

It's also typically a low-trust endeavor. Manufacturers change incentives every few weeks. Loan rates change constantly. You'll negotiate a price and learn they didn't include expensive dealer add-ons which can't be removed, or an offer made today is gone tomorrow. Then when you're exhausted and at the end of your patience, they'll slide over a prepaid maintenance contract or key replacement service. It's awful.

So when my family needed to replace our trusty old Subaru, I thought it'd be a good opportunity to say "Claude, take the wheel" and handed over the keys for my digital life to a chatbot.

## Clawdbot
[Clawdbot](https://clawd.bot) is the internet's latest obsession after Claude Code. It's an [open source](https://github.com/clawdbot/clawdbot) project which pairs an LLM with long running processes to do things like read and write email (and monitor for replies), manage your calendar, and drive a browser with great effect. Unlike ChatGPT or Claude Code, Clawdbot does not start with a blank memory every time it starts. It saves files, breadcrumbs, and your chat histories so it can handle tasks which can take a few days without much issue:

<span class="image half"><a href="/assets/images/clawd_car/clawd_bot.png" target="_blank"><img src="/assets/images/clawd_car/clawd_bot.png" alt="Clawdbot logo"></a></span>

I've been dying to try it out on something *real* and useful, so buying a new car seemed like a good first task.

You can prompt Clawdbot from a web browser just like ChatGPT, or the terminal CLI like Clade Code. The real power comes when you link it to a messaging service. Then messages sent via whatsapp (or imessage, signal or telegram) become prompts for Clawdbot to take action on your behalf. I chose a combination of the browser and whatsapp. It took a bit of fiddling around with Google Cloud to set up `gog` and access gmail/gdrive/gcal, but soon enough Clawdbot was able to access basically my entire digital life.

I installed Clawdbot on my M1 Macbook and named it `Icarus` for reasons which became obvious to me in hindsight.

## The car
For a variety of reasons we landed on a Hyundai Palisade.
I'm not interested in explaining the entire rationale, but YouTuber Doug DeMuro gives a good explanation of why this car stood out for him [here](https://youtu.be/q5J1JHlcLvE?t=1815). After a few test drives and lots of research we moved from the `looking` phase to the `buying` phase.

Ask anyone in sales and they'll tell you that walking into a negotiation with a bit of extra knowledge is often the edge you need to win. So I decided to kick things off with a bit of price discovery. Car prices are very local, so I wanted to see what people in my area were paying for the vehicle/trim that we wanted.

I began with a simple enough prompt:
```
Search reddit.com/r/hyundaipalisade and find the typical and lowest prices people paid for a 2026 palisade hybrid in Massachusetts
```

Clawdbot churned away and flipped through several browser windows. Interestingly enough it hit a few roadblocks including an error message saying `Your request was blocked by network security`, but Clawdbot would not be denied.

After a few minutes it found that most people paid around $58k (plus tax/title/licensing):
<span class="image half"><a href="/assets/images/clawd_car/price_discovery.png" target="_blank"><img src="/assets/images/clawd_car/price_discovery.png" alt="Price Discovery"></a></span>

So that left us with a target price of hopefully $57k.

## Finding the car
My wife had picked out a specific color combination which was a bit rare. Blue (or green), with a brown interior. I didn't want to browse every dealer site or call anyone, so I used an [online inventory tool](https://hexorcism.com/HyundaiApp/inventory.php) and gave Clawdbot the following prompt:

```
Use https://hexorcism.com/HyundaiApp/inventory.php to search dealers for a Palisade Hybrid in the Calligraphy trim with a green or blue exterior and brown (code ISB) interior. Stay within 50 miles of Boston. Then find the car using the VIN number on each dealers website and contact them asking for the best out-the-door price
```

Clawdbot churned away at this for some time. It popped up several browser tabs, and started filling out forms with my contact information. Clawdbot already had my email address (because I gave it gmail access). Since I had also set up whatsapp, Clawdbot had my phone number too.

<span class="image half"><a href="/assets/images/clawd_car/inquiry_submitted.png" target="_blank"><img src="/assets/images/clawd_car/inquiry_submitted.png" alt="Inquiry SUbmitted"></a></span>

I typically never want to negotiate for a car on the phone, it's easier to cut through noise and fluff in writing. Most dealers do require a phone number to complete their contact page, but not all. Clawdbot pre-filled my real number onto the form without prompting me at all! Suddenly the automated texts and calls started trickling in.

This was my first jaw-dropping moment with Clawdbot. I prompted this language model hooked up to a browser and email, and moments later it did something very useful to me in the "real world"!

But the next day the messages would start pouring in from actual salespeople, and the real work began.

## Negotiating
My simple negotiation strategy is to send each dealer the lowest quote and ask them to beat it. This works best if you don't care about the color or specifications, as you can find vehicles which have been sitting on the lot for 30+ days which salespeople are more inclined to discount. It's a bit riskier if you want a less common and more sought-after color, those tend to move more quickly.

Clawd had found 3 area dealers which had the car. By the second day all had emailed us back, so I asked to:
```
Check my emails every few minutes for messages from dealers. Negotiate for the lowest sale price possible, do not negotiate any trade in or interest rate. Just the lowest price. Prompt me before replying to anything consequential.
```

This set up Cron task within Clawdbot. It quickly played people off each other, sending the quote PDF files from dealer 1 to dealer 2. I got a few text messages here as well, but at this point I hadn't quite gotten iMessage set up correctly so when those came in I just asked the sales people to email me and let Clawdbot take over.

<span class="image half"><a href="/assets/images/clawd_car/cron_running.png" target="_blank"><img src="/assets/images/clawd_car/cron_running.png" alt="Cron Running"></a></span>

Clawdbot also made a couple mistakes in this phase. When dealers would call, my flow was to politely decline and answer as many questions as I could via email with Clawdbot. At one point I got an inbound call and an email at the same time, so I asked Clawdbot to reply and say `I can't talk, I'm in a condo board meeting. Email them back with our search parameters` and in a timeless blunder, Clawd picked the wrong email thread and sent this someone we were already negotiating with:

<span class="image half"><a href="/assets/images/clawd_car/email_mistake.png" target="_blank"><img src="/assets/images/clawd_car/email_mistake.png" alt="Email Mistake"></a></span>

That was the only minor slipup by Clawdbot during this process. I didn't allow Clawd to be fully autonomous, which I'm sure would have caused additional issues.

## Closing the deal
Eventually one dealer stopped responding, but two were very eager to make a deal. The emails kept flying, we had a bidding war!

<span class="image half"><a href="/assets/images/clawd_car/bidding_war.png" target="_blank"><img src="/assets/images/clawd_car/bidding_war.png" alt="Bidding War"></a></span>

Finally one dealer replied and said they'd take an additional $500 off if we closed tonight. Clawdbot managed to negoiate a **$4200 dealer discount** which put us below our target and down to **$56k!**

At this point credit applications were being sent around so I asked Clawd to stop and took over the actual communications. Thankfully this dealer had an entirely online process so I was able to e-sign everything and pick up the car the next day.

<span class="image half"><a href="/assets/images/clawd_car/deail_made.png" target="_blank"><img src="/assets/images/clawd_car/deal_made.png" alt="Deal Made"></a></span>

## Wrapping up 
My experience with Clawdbot made me feel like I'm living in the future. It's the first big "leap" I've felt since Claude Code launched. I've already found a dozen additional use cases including politely declining inbound recruiter messages via email or linkedin. It's also exceedingly good at setting up little cronjobs for web tasks, which is going to be my primary use case going forward.

This made Clawdbot pretty annoying to run on a laptop that I also used for other things. Since I needed a home desktop anyway, I picked up a new Mac Mini for Clawd (a popular trend on the internet in these past few weeks):

<span class="image fit"><a href="/assets/images/clawd_car/clawd_home.jpg" target="_blank"><img src="/assets/images/clawd_car/clawd_home.jpg" alt="Clawd's new home"></a></span>

If you like this type of nonsense (or more technical stuff) you can follow me on [twitter](https://twitter.com/astuyve) and send me any questions or comments.
