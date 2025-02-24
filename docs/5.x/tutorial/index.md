# 1. Getting Started

## Introduction

Laravel JSON:API is a library for creating JSON:API server implementations
(backends) using the Laravel application framework.

To try it out, let's create a simple blog application. This will comprise of
blog *posts* that are created by an *author* (the signed-in user). The author
will be allowed to *tag* posts, while other users can *comment* on a blog post.

By following this tutorial, you'll learn how the JSON:API specification works,
and how to implement a JSON:API compliant server in a Laravel application.

In this chapter, we'll setup our Laravel application so we're ready to develop
our blog application.

## Requirements

This tutorial assumes you are using [Laravel Herd](https://laravel.com/docs/installation#local-installation-using-herd)
to run your application.

There are other ways of running Laravel -
e.g. [Laravel Sail](https://laravel.com/docs/installation#docker-installation-using-sail). If you want to use an
alternative method then make sure you follow the relevant Laravel documentation on how to setup an application.

You'll also need a method of submitting AJAX requests to your application. For
example, Postman, PHPStorm HTTP requests, or cURL. The tutorial shows the HTTP
requests you'll need to submit, but how to do that will depend on the HTTP client
you are using.

## Example Application

You will learn more if you follow this tutorial and incrementally build the
application. Learning by doing is always the best way to learn!

However, if you want to see the complete application, you can find it on
Github in the [laravel-json-api/tutorial-app](https://github.com/laravel-json-api/tutorial-app)
repository.

## Installation

To get started, we'll need to create our new Laravel application. To do this, we'll follow
the [Local Installation Using Laravel Herd](https://laravel.com/docs/installation#local-installation-using-herd)
instructions. This contains information on creating your first project and running it using Herd - there's instructions
for MacOS and Windows.

:::tip
If you're using Linux, we suggest you follow
the [Laravel Sail](https://laravel.com/docs/installation#docker-installation-using-sail) instructions.
:::

Run the following commands to set up your new Laravel application. When prompted, select:

- No starter kit
- PHPUnit as your testing framework (to match the examples in this tutorial)
- SQLite as your database
- Run the default migrations

```bash
cd ~/Herd
laravel new jsonapi-tutorial
cd jsonapi-tutorial
herd open
```

Once this has finished running:

```bash
cd jsonapi-tutorial
herd open
```

This will open [jsonapi-tutorial.test](http://jsonapi-tutorial.test/) in your browser, and you should see the default
Laravel welcome page.

:::tip
As this tutorial is about JSON:API, we haven't included extensive information on starting the project for the first
time. Refer to the Laravel installation documentation for more details.
:::

For this tutorial, you'll also need to run Artisan commands. Check that Artisan is working by running:

```bash
herd php artisan -V
```

That command should output the Laravel version, for example:

```
Laravel Framework 11.25.0
```

## API Routing

As our application is going to be an API, we need to install
the [Laravel API starter kit.](https://laravel.com/docs/routing#api-routes)

Run the following command:

```bash
herd php artisan install:api
```

This will install Sanctum, which we'll use for API authentication, and an API routes file.

## In Summary

You've created a new Laravel application, are running it locally, and have set it up for API routing.

In the [next chapter](02-models.md) we'll add the database tables and models required for our blog application.
