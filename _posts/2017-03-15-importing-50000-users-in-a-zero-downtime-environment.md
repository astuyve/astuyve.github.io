---
layout: post
title: Importing 50,000 Users in a continuous delivery environment
description: How we successfully merged two identity providers, imported 50,000 user accounts, and did it all with no downtime.
image: /assets/images/pic01.jpg
categories: posts
redirect_from:
  - /importing-50000-users-in-a-zero-downtime-environment
---


SportsEngine has benefitted from several changes recently. In the last year we’ve not only been acquired by [NBC Sports](http://www.nbcuniversal.com/press-release/nbc-sports-group-acquires-youth-and-amateur-sports-technology-company-sport-ngin), but we've also [acquired some companies](http://www.sportsengine.com/news/). In certain instances, it made sense to replace some individual components with SportsEngine’s own platform software. Specifically, we decided that it would be best for both software ecosystems to authenticate against one Identity Provider (IDP).

For one particular acquisition (Company A), replacing the Identity Provider meant importing all of Company A’s users into SportsEngine’s Identity Provider. The SportsEngine IDP acts as an OAuth Provider for both the SportsEngine Platform and other software integrators. After validating Company A’s user records, we were ready to import 50,000 accounts into Sports Engine’s system.

### The Risks
* Downtime for either Company A, or SportsEngine
* Corruption of User data
* Loss of User Data
* Loss of User functions

### The Plan
We needed to perform the Identity Provider replacement without causing downtime for either Company A or SportsEngine. Disabling either platform for `Maintenance` was unacceptable, so we devised a plan to execute the Identity Provider replacement in two separate steps. **We decoupled the user import process from the Identity Provider switchover.** This meant we could import all of the users, then test that the import was successful independently from pushing all production OAuth traffic from Company A's platform through the SportsEngine IDP.

Since Company A and SportsEngine used different encryption schemes for passwords, the next thing we did was modify the User model and schema to include a column indicating which organization this user account originated from. This `custom_validator` column defines not only which algorithm to use when validating passwords, but also how to combine the password salt as well as any other special considerations (BCrypt iteration count, for example).

We then implemented a `CustomPasswordValidator` class which would, upon login, authenticate a user’s password using the validation scheme from the originating organization. In the case of Company A, this was a slightly different BCrypt implementation than we use at SportsEngine. When a user authenticates successfully on log in, we encrypt the user’s password using SportsEngine’s encryption scheme before sending the user to their destination.

### The Edge Cases
The next consideration when approaching this task was account overlap. Specifically - how many users of Company A’s services also have user accounts in SportsEngine? Since the primary method of identification in both systems is an email address, this number was easy to quantify. We determined about 20,000 users have accounts on both systems. Interesting business implications aside, this number presents us with the challenging task of finding a way to effectively merge accounts from Company A into SportsEngine. For clarity, I’ll refer to users as two types, `Newly Imported User` (representing accounts which only exist in Company A, who will get new accounts in SportsEngine), and `Existing Merged User` (where an account existed in both Company A and SportsEngine).

To solve the `Existing Merged User` case, we modified the popular Devise Rails library to allow users to authenticate with multiple passwords. The encrypted password belonging to a user from Company A was written to a new `SecondaryPassword` table during the import process. Now, their `Existing Merged User` account has two passwords.  The same `CustomPasswordValidator` class was then leveraged to allow users to authenticate successfully using either their password for Company A or their SportsEngine password.

### The Execution
Having handled the `Newly Imported User` case as well as the `Existing Merged User` case, the final step was to actually import the records. The last piece in this puzzle was determining how to link imported users from Company A with their `Newly Imported` or `Existing Merged User` in SportsEngine. If we failed here, a user could log in to Company A through SportsEngine and find all of their work has vanished, having been inadvertently mapped to a different user!

To ensure that the mappings between user records were preserved correctly, we needed to maintain the link between the user’s UUID from Company A to their user account, now in SportsEngine. Initially we considered putting Company A’s applications into `Maintenance Mode` so that we could update Company A’s local user records with the UUIDs associated with their new SportsEngine users. To avoid downtime we decided to import UUID’s from Company A into the SportsEngine IDP instead.

SportsEngine users have internal UUIDs, which haven’t been used up to this point. Since Company A relied on this UUIDs to authorize a user, we decided to import the UUIDs as well. We modified our CSV-based user import tool to allow the UUIDs from Company A to be used as the `New Imported` SportsEngine user’s UUID, as well as writing Company A’s UUIDs onto the `Existing Merged` users. Since we’re effectively overwriting existing UUIDs when merging users, this parlor trick only works one time (after all, UUIDs matter now!).

When we do this again in the future, we’ll likely modify Company A’s OAuth client applications to accept email addresses as a fallback. This way, if no UUID was found to match an authorized user, the system would accept the UUID from the OAuth response from SportsEngine and map it to the consuming application’s user record. Then we’d simply elect to not import any UUID information from the exporting system.

After two weeks of testing and planning, we were ready. The accounts were exported from Company A’s production system and imported into the SportsEngine IDP. Once we verified that we could log in to both `Newly Imported` test accounts and `Existing Merged` test accounts (using both passwords), we redirected production traffic from Company A’s OAuth provider to SportsEngine’s IDP.

During this entire time, existing users of Company A could still log in and perform all of their normal actions with one caveat; during this time we disabled new account creation. In the future we could enable it and simply run a second import after the OAuth Identity Provider switch was completed. Neither Company A, nor SportsEngine experienced any downtime during this process.

### The Aftermath
While we did expect some initial confusion, there were very little customer service incidents as a result of our Identity Provider replacement project. We did see a slight uptick in password resets, which we expected, but overall the process went very smoothly.

When we do this again, the only changes we expect to make revolve around user mapping. By requiring the new client application to match identity by email address, we can easily repeat this process over and over in the future.

