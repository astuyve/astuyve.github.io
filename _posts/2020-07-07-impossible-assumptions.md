---
layout: post
title: That's not possible!
description: Learning new and fun things about the Zip file data structure. Reading time - 2 minutes
image: pic09.jpg
---

### That's not possible!

How many times have you said this to yourself, while working on a bug?

I found myself saying it recently. Here at [serverless](https://serverless.com) we've been hard at work on a killer developer experience called [components](https://www.serverless.com/components/), and part of my job has been to design and build the onboarding experience.

Components are meant to be small, reusable pieces of infrastructure-as-code (think libraries or node modules, but for cloud infrastructure). People can publish components to a registry and share them with other developers. To help people get packages from the registry we sought to build a simple, one-command initialization system for the framework that would get developers up and running in the most frictionless way possible, like teflon, but for cloud development.

The `init` command does a lot of things, but for the sake of brevity, let's say it fetched a zip archive from the component registry, inflated/extracted it, and pre-configured attributes in the `serverless.yml` file for the developer.

The `publish` command was mostly the process in reverse. We'd gather up the files in the workspace, generate a new `serverless.yml` file based on the existing `serverless.yml` file in the workspace, compress them, and push a component to the registry.

### The impossible bug

As I began testing the `init` command end-to-end, I saw that the `serverless.yml` file that was unzipped from the registry seemed to include attributes that we didn't store in the template.

However - when I manually unzipped the file on my macbook, the `serverless.yml` files It appeared to be the newly generated file, exactly as we'd expect the `publish` command to do.

I stepped through the code once more and scratched my head - the code says that the original `serverless.yml` file lived in the zip file - and that the generated `serverless.yml` file was missing!

How could this be possible? How could one copy of an unzipped archive contain different files than ANOTHER copy _of the very same archive_?!

### Proving my assumptions wrong

Eventually I tried using [unzip](https://linux.die.net/man/1/unzip) on the file and was greeted with the strangest message:
<span class="image fit"><a href ="/assets/images/unzip-duplicate.png" target="_blank"><img src="/assets/images/unzip-duplicate.png" alt ="Two files with the same name in the same directory of the same zip file."></a></span>

There were two `serverless.yml` files in the _same directory_ inside of the zip file.

Although some filesystems over the years have supported multiple files with the same name in the same directory, on most systems the filename must be unique to the directory the file is in. This is true for HFS, NTFS (unless you really break it), and ext4.

However in a zip archive, files are identified by a [metadata header](<https://en.wikipedia.org/wiki/Zip_(file_format)#Structure>), which includes the filename. This means that it's _totally possible_ to put two files with the same name in the same zip archive.
<span class="image right" style="float: right;"><a href ="/assets/images/zip_layout.png" target="_blank"><img src="/assets/images/zip_layout.png" alt ="Internal structure of a zip file, image by wikipedia"></a>Internal structure of a zip file, image by wikipedia</span>
<br>

I inadvertently discovered that `adm-zip` would silently overwrite one file with the other when extracting into a directory. As it turns out, MacOS does the same thing - however both utilities seemed to pick different files. `unzip` will ask you what to do with the duplicate file, which leads me to suspect that this is a known edge case with zip files, and that the decision regarding what to do in this case has been largely left up to the author of the library.

### Fixing the bug and closing thoughts

When a user would run the `publish` command, internally the framework would build up an array of files to include in the zipped package. Additionally we'd add the `serverless.yml` file into the array, modifying it so it could be used as a package in the registry. This inadvertently led to two `serverless.yml` files being happily written to the registry zip archive. I simply had to modify the `publish` tree-walking algorithm to skip any `serverless.yml` files that the author may have inadvertently left in the package root.

It was fun to learn that an assumption I've held since my earliest interactions with computers is completely baseless - it's totally possible to have more than one file with the same name in the same directory (in a zip archive, anyway).
