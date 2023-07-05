---
layout: post
title: Custom migration types with Rails 5
description: Leverage support for multiple databases in Rails 5 to implement custom migration types for post-deploy migrations, or for scheduled migrations.
categories: posts
redirect_from:
  - /custom-migrations-with-rails-5
  - /custom-migrations-with-rails-5/
image: assets/images/pic07.jpg
---

Rails has long supported database migrations to help you evolve your database schema over time, but traditionally migrations are used strictly to alter the schema of the database.
However, mature Rails applications often need migration-like tasks which may not alter the schema, or may have special considerations.
I prefer to use an after-deploy migration for any task that is so rare I don't anticipate repeating it, or so complex I simply will not be able to reuse that code. Specifically, I've used them to fix corrupt data, perform a 1-time import process, and rebuild denormalized data. You'll note that each of these examples are *not* schema changes.

Late-night migrations fall into a different classification. They might be schema changes that can lock a table or cause other issues that would arise during the day. They also may just be after-deploy migrations which consume a lot of resources, and are best ran during times of low customer use.

Rails 5 introduced multi-database support, which also benefits from multiple directories for migrations. You can leverage
that logic and create a new task for special migrations like this:

```ruby
namespace :db do
  desc "Migrate the database through scripts in db/migrate_after_deploy. Target specific version with VERSION=x. Turn off output with VERBOSE=false."
  task :migrate_after_deploy => :environment do
    ActiveRecord::Migration.verbose = ENV["VERBOSE"] ? ENV["VERBOSE"] == "true" : true
    ActiveRecord::MigrationContext.new('db/migrate_after_deploy').migrate(ENV["VERSION"] ? ENV["VERSION"].to_i : nil)
  end
end
```

Now, you can run `rake db:migrate_after_deploy` to run the migrations inside the `db/migrate_after_deploy` directory.

Read more about this change [here](https://github.com/rails/rails/commit/a2827ec9811b5012e8e366011fd44c8eb53fc714).

Thanks to [@eileencodes](https://github.com/eileencodes) for the new feature, and excellent commit message. If you haven't seen her keynote at RailsConf 2018 you [absolutely should](https://www.youtube.com/watch?v=8evXWvM4oXM)
