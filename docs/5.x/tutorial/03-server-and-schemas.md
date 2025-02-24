# 3. Servers and Schemas

## Introduction

In this chapter, we are going to:

- install the Laravel JSON:API package;
- create our JSON:API server; and
- create our first JSON:API resource - the `posts` resource.

At the end of this chapter, you'll be able to retrieve a `posts` resource from
the API.

## Installing Laravel JSON:API

To start, we'll need to install the Laravel JSON:API package into our application,
via Composer. Run the following commands:

```bash
herd composer require laravel-json-api/laravel
herd composer require --dev laravel-json-api/testing
```

We then need to publish the Laravel JSON:API configuration file, using the
following command:

```bash
herd php artisan vendor:publish --provider="LaravelJsonApi\Laravel\ServiceProvider"
```

This will create a `config/jsonapi.php` file.

### Exception Handler

There's one final setup step. Laravel JSON:API needs to ensure that your API
returns errors in the JSON:API format. To do this, we need to add a few things
to our application's exception handler.

Open the `bootstrap/app.php` file and you'll see the exception handler is configured in the `withExceptions()` call. Make the following changes to this file:

```diff
     ->withExceptions(function (Exceptions $exceptions) {
-        //
+        $exceptions->dontReport(
+            \LaravelJsonApi\Core\Exceptions\JsonApiException::class,
+        );
+        $exceptions->render(
+            \LaravelJsonApi\Exceptions\ExceptionParser::renderer(),
+        );
     })->create();
```

The renderer takes care of converting exceptions to the JSON:API format, if the client has requested JSON:API content via the `application/vnd.api+json` media type.

## Creating a JSON:API Server

Laravel JSON:API allows you to create multiple JSON:API servers within you
application. In this tutorial we're going to create a single server, which
we'll call `v1`.

Run the following command to create your first server:

```bash
herd php artisan jsonapi:server v1
```

This creates a new file in your application: `app/JsonApi/V1/Server.php`.
This is the class that contains the configuration for your JSON:API server.
It looks like this:

```php
namespace App\JsonApi\V1;

use LaravelJsonApi\Core\Server\Server as BaseServer;

class Server extends BaseServer
{

    /**
     * The base URI namespace for this server.
     *
     * @var string
     */
    protected string $baseUri = '/api/v1';

    /**
     * Bootstrap the server when it is handling an HTTP request.
     *
     * @return void
     */
    public function serving(): void
    {
        // no-op
    }

    /**
     * Get the server's list of schemas.
     *
     * @return array
     */
    protected function allSchemas(): array
    {
        return [
            // @TODO
        ];
    }
}
```

It's worth noting at this point that the `$baseUri` property is set to
`/api/v1`. This means all the HTTP requests we send to our API will start with
`http://jsonapi-tutorial.test/api/v1/`.

There's one thing we need to do at this point: we need to tell Laravel JSON:API
that we have a `v1` server. To do that, we need to edit our `config/jsonapi.php`
configuration file. If you open that file, it looks like this:

```php
return [

    /*
    |--------------------------------------------------------------------------
    | Root Namespace
    |--------------------------------------------------------------------------
    |
    | The root JSON:API namespace, within your application's namespace.
    | This is used when generating any class that does not sit *within*
    | a server's namespace. For example, new servers and filters.
    |
    | By default this is set to `JsonApi` which means the root namespace
    | will be `\App\JsonApi`, if your application's namespace is `App`.
    */
    'namespace' => 'JsonApi',

    /*
    |--------------------------------------------------------------------------
    | Servers
    |--------------------------------------------------------------------------
    |
    | A list of the JSON:API compliant APIs in your application, referred to
    | as "servers". They must be listed below, with the array key being the
    | unique name for each server, and the value being the fully-qualified
    | class name of the server class.
    */
    'servers' => [
//        'v1' => \App\JsonApi\V1\Server::class,
    ],
];
```

To add our server, we just need to uncomment the line in the `servers` part of
the configuration. Do that now, so that your configuration looks like this:

```diff
 'servers' => [
-//  'v1' => \App\JsonApi\V1\Server::class,
+    'v1' => \App\JsonApi\V1\Server::class,
 ],
```

And that's it! We now have a JSON:API server. Next we need to add our first
resource: the `posts` resource.

## The Post Schema

Laravel JSON:API uses Nova-style classes called *Schemas* to define the resources
in an API. In JSON:API, *resources* refer to the objects that can be created,
read, updated and deleted in your API. Our blog application will have the
following resources:

- `posts`
- `users`
- `comments`
- `tags`

Hopefully you recognise those names - they match the models we created in our
application.

In this chapter, we'll create just the schema for our `Post` model, and
read the resource from our API to check it's working.

### Creating the Schema

To create our schema, run the following command:

```bash
herd php artisan jsonapi:schema posts
```

This creates a new file, `app/JsonApi/V1/Posts/PostSchema.php`, which looks
like this:

```php
namespace App\JsonApi\V1\Posts;

use App\Models\Post;
use LaravelJsonApi\Eloquent\Contracts\Paginator;
use LaravelJsonApi\Eloquent\Fields\DateTime;
use LaravelJsonApi\Eloquent\Fields\ID;
use LaravelJsonApi\Eloquent\Filters\WhereIdIn;
use LaravelJsonApi\Eloquent\Pagination\PagePagination;
use LaravelJsonApi\Eloquent\Schema;

class PostSchema extends Schema
{

    /**
     * The model the schema corresponds to.
     *
     * @var string
     */
    public static string $model = Post::class;

    /**
     * Get the resource fields.
     *
     * @return array
     */
    public function fields(): array
    {
        return [
            ID::make(),
            DateTime::make('createdAt')->sortable()->readOnly(),
            DateTime::make('updatedAt')->sortable()->readOnly(),
        ];
    }

    /**
     * Get the resource filters.
     *
     * @return array
     */
    public function filters(): array
    {
        return [
            WhereIdIn::make($this),
        ];
    }

    /**
     * Get the resource paginator.
     *
     * @return Paginator|null
     */
    public function pagination(): ?Paginator
    {
        return PagePagination::make();
    }

}
```

Our new `PostSchema` class defines the `posts` resource, which is the JSON:API
representation of the `Post` model - notice how that is defined on the the
static `$model` property of the class.

Now we've created the schema, we need to tell our JSON:API server that the
schema exists. To do this, we update the `allSchemas()` method in our
`app/JsonApi/Server.php` file. Update that to look like this:

```diff
 /**
  * Get the server's list of schemas.
  *
  * @return array
  */
 protected function allSchemas(): array
 {
     return [
-        // @TODO
+        Posts\PostSchema::class,
     ];
 }
```

### Schema Fields

The `fields()` method on the schema defines the attributes and relationships
that our resource has. Notice the created file has a few standard fields in
it already: the `ID` field for the resource, and the `createdAt` and `updatedAt`
dates that are standard on an Eloquent model.

Our `Post` model has a few more attributes than that. Hopefully you remember
that the database table had `content`, `published_at`, `slug` and `title`
columns. We want to add these to our `PostSchema` as these values should be
shown in our API. To do that, we make the following changes to our class:

```diff
 namespace App\JsonApi\V1\Posts;

 use App\Models\Post;
 use LaravelJsonApi\Eloquent\Contracts\Paginator;
 use LaravelJsonApi\Eloquent\Fields\DateTime;
 use LaravelJsonApi\Eloquent\Fields\ID;
+use LaravelJsonApi\Eloquent\Fields\Str;
 use LaravelJsonApi\Eloquent\Filters\WhereIdIn;
 use LaravelJsonApi\Eloquent\Pagination\PagePagination;
 use LaravelJsonApi\Eloquent\Schema;

 class PostSchema extends Schema
 {

     /**
      * The model the schema corresponds to.
      *
      * @var string
      */
     public static string $model = Post::class;

     /**
      * Get the resource fields.
      *
      * @return array
      */
     public function fields(): array
     {
         return [
             ID::make(),
+            Str::make('content'),
             DateTime::make('createdAt')->sortable()->readOnly(),
+            DateTime::make('publishedAt')->sortable(),
+            Str::make('slug'),
+            Str::make('title')->sortable(),
             DateTime::make('updatedAt')->sortable()->readOnly(),
         ];
     }

     /**
      * Get the resource filters.
      *
      * @return array
      */
     public function filters(): array
     {
         return [
             WhereIdIn::make($this),
         ];
     }

     /**
      * Get the resource paginator.
      *
      * @return Paginator|null
      */
     public function pagination(): ?Paginator
     {
         return PagePagination::make();
     }

 }
```

## Fetching a Post Resource

When we ran our database seeder, we created a `Post` model in the database. As
the primary key of this model is auto-incrementing, we know that first model will
have an identifier of `1`.

The JSON:API specification states that we should be able to fetch this post
using the JSON:API `type` and `id`. Together, these two things uniquely identify
the post in our API. The URL to do this will follow this format:

`<HOST>/<API_NAMESPACE>/<TYPE>/<ID>`

That means we can fetch our first post using the following URL:

`http://jsonapi-tutorial.test/api/v1/posts/1`

When running this request, we need to specify the JSON:API media type in the
`Accept` header - the media type is `application/vnd.api+json`. This means our
HTTP request will look like this:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/1 HTTP/1.1
Accept: application/vnd.api+json
```

Try this now. You should see the following response:

```http
HTTP/1.0 404 Not Found
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "The route api\/v1\/posts\/1 could not be found.",
      "status": "404",
      "title": "Not Found"
    }
  ]
}
```

This is a JSON:API error, with a `404 Not Found` HTTP status - which tells us
the `/api/v1/posts/1` route does not exist. We'll need to add that now.

### Routing

Laravel JSON:API makes it easy to register JSON:API routes for your server.

In Laravel applications, our API routing is defined in the `routes/api.php`
file. If you open that file now, you will see:

```php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
```

To add our JSON:API server's routes, we will use the `JsonApiRoute` facade.
Update the `routes/api.php` file to look like this:

```diff
 use Illuminate\Http\Request;
 use Illuminate\Support\Facades\Route;
+use LaravelJsonApi\Laravel\Facades\JsonApiRoute;
+use LaravelJsonApi\Laravel\Http\Controllers\JsonApiController;
+use LaravelJsonApi\Laravel\Routing\ResourceRegistrar;

 Route::get('/user', function (Request $request) {
     return $request->user();
 })->middleware('auth:sanctum');
+
+JsonApiRoute::server('v1')->prefix('v1')->resources(function (ResourceRegistrar $server) {
+    $server->resource('posts', JsonApiController::class)->readOnly();
+});
```

The `JsonApiRoute` facade provides a fluent interface for defining the HTTP
routes for your JSON:API server. The `server()` method tells it that we're
defining routes for our `v1` server.

On a default Laravel installation, the routes you define in the `routes/api.php`
file already have the `/api` URL prefix. The `prefix('v1')` call above adds
`/v1` so that in total our API's URL prefix is `/api/v1`.

The closure that is passed to the `resources()` method receives a `$server`
argument. This is a helper to make it easy to define the resource routes in the
server. We've added the following:

```php
$server->resource('posts', JsonApiController::class)->readOnly();
```

This adds the following routes:

- `GET /api/v1/posts`
- `GET /api/v1/posts/<ID>`

:::tip
At the moment we're only adding read-only routes - i.e. `GET` routes. Later in
the tutorial we'll add routes to create, update and delete post resources.
:::

Try the HTTP request again:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/1 HTTP/1.1
Accept: application/vnd.api+json
```

This time you'll see the following:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "Unauthenticated.",
      "status": "401",
      "title": "Unauthorized"
    }
  ]
}
```

This time we get a `401 Unauthorized` HTTP status, which tells us that we need
to add some logic to tell our server who can access the post resource. We'll
add that now.

### Authentication

Laravel JSON:API uses Laravel's policy implementation to authorise requests to
the API. This means for our posts resource we need to create a `PostPolicy`.
You can do this using the following Laravel command:

```bash
herd php artisan make:policy PostPolicy --model Post
```

This will create a `app/Policies/PostPolicy.php` file, which looks like this:

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class PostPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        //
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Post $post): bool
    {
        //
    }

    // ...other policy methods
}
```

The `view()` method is where we need to put the logic for who can view a specific
post in our blog. Make the following changes to the `view()` method:

```diff
 /**
  * Determine whether the user can view the model.
  */
-public function view(User $user, Post $post)
+public function view(?User $user, Post $post)
 {
-    //
+    if ($post->published_at) {
+        return true;
+    }
+
+    return $user && $user->is($post->author);
 }
```

Notice we've made the `$user` argument nullable. This means the method will be
called if there is no authenticated user.

Our logic says: if the post is published, anyone can see it. If it is not
published (a draft post), there must be an authenticated user *and* they must be
the author of the post.

This is a sensible approach for a blog application. We want anyone to see our
published posts, but draft posts should only be visible to the author.

### Fetching the Post

Now we added our authorization logic, we can retry our request:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/1 HTTP/1.1
Accept: application/vnd.api+json
```

Success! This time you'll see the `posts` resource:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1"
  },
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "content": "In our first blog post, you will learn all about Laravel JSON:API...",
      "createdAt": "2024-09-30T17:37:00.000000Z",
      "publishedAt": "2024-09-30T17:37:00.000000Z",
      "slug": "welcome-to-laravel-jsonapi",
      "title": "Welcome to Laravel JSON:API",
      "updatedAt": "2024-09-30T17:37:00.000000Z"
    },
    "links": {
      "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1"
    }
  }
}
```

## In Summary

In this chapter, we created our JSON:API server and added our first resource
to it by creating a `PostSchema` class. We also learnt how to register JSON:API
routes and how authentication works.

In the [next chapter](04-relationships.md), we'll add relationships to our
`posts` resource.
