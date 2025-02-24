# Custom Actions

## Introduction

As well as registering routes defined by the JSON:API specification, our
implementation also allows you to register custom resource actions. This
allows you to implement capabilities that are not defined by the specification.

In this chapter, we will demonstrate how to do this using two actions:

- A *purge* action, that allows an adminstrator to delete all `posts` resources.
- A *publish* action, that allows the author of a specific `posts` resource
  to publish it.

## Routing

### Registering Actions

To register custom actions, use the `actions()` method when registering
resource routes. For example, we can add our *purge* and *publish* actions
to our `posts` resource as follows:

```php
use LaravelJsonApi\Laravel\Routing\ActionRegistrar;

$server->resource('posts')->actions('-actions', function (ActionRegistrar $actions) {
    $actions->delete('purge');
    $actions->withId()->post('publish');
});
```

This would register the following routes:

| Verb | URI | Action | Route Name |
| --- | --- | --- | --- |
| DELETE | `/posts/-actions/purge` | purge | posts.purge |
| POST | `/posts/{post}/-actions/publish` | publish | posts.publish |

:::tip
Notice that we used the `withId()` method to indicate that the `publish`
action relates to a specific resource.
:::

The `$actions` helper supports all the typical HTTP verbs:

- `get`
- `post`
- `patch`
- `put`
- `delete`
- `options`

#### Actions without a URL Prefix

:::warning
When adding custom actions, we recommend thinking carefully about the naming
of the URLs for the actions. As additions may be made to the JSON:API
specification in the future, it is important to choose a URL that will
avoid any potential future conflicts with the specification.

For this reason, we recommend using a prefix. We also recommend choosing one
like `/-actions` instead of `/actions`. This will help prevent any future
conflicts with additions to the specification.
:::

As the above example shows, the `actions()` method was provided with a URL
prefix and a callback. The prefix is optional, for example:

```php
$server->resource('posts')->actions(function (ActionRegistrar $actions) {
    $actions->delete('purge');
    $actions->withId()->post('publish');
});
```

Would register the following routes:

| Verb | URI | Action | Route Name |
| --- | --- | --- | --- |
| DELETE | `/posts/purge` | purge | posts.purge |
| POST | `/posts/{post}/publish` | publish | posts.publish |

When adding actions without a URL prefix, you need to ensure you avoid colliding
with any of the JSON:API routes that are registered for a resource. Typically
this means ensuring your action does not match the ID pattern for a resource.

This is best illustrated with an example. Say for example we wanted to register
a `me` action for the `users` resource. This would return the current signed-in
user, and the routing would look like this:

```php
$server->resource('users')->actions(function (ActionRegistrar $actions) {
    $actions->get('me');
});
```

In this example, the following routes will exist:

- `GET /users/{user}`
- `GET /users/me`

This will work if the `users` resource `id` pattern does not match for `me`, e.g.
if the pattern was `\d+`. However, if `me` did match the pattern - for example
if it were `[a-zA-Z0-9]+`, then the custom `me` action **will not match**.
Instead the implementation will attempt to find a `users` resource with an `id`
of `me`.

**Registering actions that conflict with the default JSON:API routes are not
supported.** If you are registering actions without a URL prefix, you must ensure
that you avoid registering actions that collide.

### Controller Action

By default we camel-case the action URI to get the controller method name.
For example:

```php
$actions->post('bulk-import');
```

Will expect the controller method name to be `bulkImport`. If you need to
use a different controller method name, pass it as the second argument:

```php
$actions->post('bulk-import', 'import');
```

### Route Name

By default we use the controller method name as the route name. So as shown
in the examples above, the route names were `posts.purge` and `posts.publish`.

All the action methods return the Laravel route object, so if you want to use
a different route name, use the `name()` method:

```php
// route name will be posts.deleteAll
$actions->delete('purge')->name('deleteAll');
```

## Authorization

Typically when writing custom actions, you can authorize the request using
[Controller authorization helpers.](https://laravel.com/docs/authorization#via-controller-helpers)
This is shown in both the examples below.

There is however an alternative. If you are injecting a
[query parameter class](../requests/query-parameters.md) into your controller
action, you can put the authorization logic in the query class.

The reason you might do this is if you want the action to support
JSON:API query parameters - e.g. enabling the client to send an `include`
parameter when using your custom action.

For example, if we were injecting the `PostQuery` class into our custom
controller action, we could add our authorization logic to that class:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;
use LaravelJsonApi\Validation\Rule as JsonApiRule;

class PostQuery extends ResourceQuery
{

    /**
     * Authorize the request.
     *
     * @return bool|null
     */
    public function authorize(): ?bool
    {
        if ($this->is('*-actions*')) {
            return (bool) optional($this->user())->can(
                'update',
                $this->model()
            );
        }

        return null;
    }

    // ...other methods
}
```

:::tip
As described in [Form Request Authorization](../requests/authorization.md#form-request-authorization),
returning `null` from the `authorize()` method tells the form request to run
the default JSON:API authorization.
:::

## Resources Example

In this example, we want to add a route that will allow an administrator to
delete all `posts` resources.

Firstly we will register the action in our routing:

```php
JsonApiRoute::server('v1')
    ->prefix('v1')
    ->resources(function (ResourceRegistrar $server) {
        $server->resource('posts', PostController::class)
            ->relationships(function (Relationships $relationships) {
                $relationships->hasOne('author')->readOnly();
                $relationships->hasMany('tags');
            })->actions('-actions', function (ActionRegistrar $actions) {
                $actions->delete('purge');
            });

        // ...other resources
    });
```

Next we need to write our controller action. This is expected to be on the
resource's `PostController`:

```php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use LaravelJsonApi\Laravel\Http\Controllers\Actions;

class PostController extends Controller
{

    // ...

    /**
     * @return \Illuminate\Http\Response
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function purge(): \Illuminate\Http\Response
    {
        $this->authorize('deleteAll', Post::class);

        Post::query()->delete();

        return response('', 204);
    }

}
```

As we are authorizing the request using the `deleteAll` ability, we will also
need to add that to our `PostPolicy`:

```php
namespace App\Policies;

use App\Models\User;

class PostPolicy
{

    // ... other methods

    /**
     * @param User|null $user
     * @return bool
     */
    public function deleteAll(?User $user): bool
    {
        return $user && $user->isAdmin();
    }

}
```

Once this is done, the following HTTP request by an administrator will delete
all the `posts` resources (bearing in mind that how you authenticate the
request will depend on your authentication implementation):

```http
DELETE /api/v1/posts/-actions/purge HTTP/1.1
Accept: application/vnd.api+json
Authorization: Bearer <API_TOKEN>
```

Which will receive the following response if successful:

```http
HTTP/1.1 204 No Content
```

## Resource Example

In this example, we want to add a route that must be hit for an author to
publish a specific `posts` resource.

Firstly we will register the action in our routing, using the `withId()` method
to indicate that the URL relates to a specific resource:

```php
JsonApiRoute::server('v1')
    ->prefix('v1')
    ->resources(function (ResourceRegistrar $server) {
        $server->resource('posts', PostController::class)
            ->relationships(function (Relationships $relationships) {
                $relationships->hasOne('author')->readOnly();
                $relationships->hasMany('tags');
            })->actions('-actions', function (ActionRegistrar $actions) {
                $actions->withId()->post('publish');
            });

        // ...other resources
    });
```

Next we need to write our controller action. This is expected to be on the
resource's `PostController`:

```php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Events\PostPublished;
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostSchema;
use App\Models\Post;
use LaravelJsonApi\Laravel\Http\Controllers\Actions;

class PostController extends Controller
{

    // ...

    /**
     * Publish a post.
     *
     * @param PostSchema $schema
     * @param PostQuery $query
     * @param Post $post
     * @return Responsable
     */
    public function publish(
        PostSchema $schema,
        PostQuery $query,
        Post $post
    ): Responsable
    {
        $this->authorize('update', $post);

        abort_if($post->published_at, 403, 'Post is already published.');

        $post->update(['published_at' => now()]);

        PostPublished::dispatch($post);

        $model = $schema
            ->repository()
            ->queryOne($post)
            ->withRequest($query)
            ->first();

        return new DataResponse($model);
    }
}
```

As we want to support JSON:API query parameters on this action, we inject
both the `PostSchema` and the `PostQuery` classes. The schema allows us
to ensure the model is configured correctly if the client has used any
JSON:API query parameters, while the `PostQuery` validates any parameters
provided by the client.

As we are authorizing the request using the `update` ability, we will also need
to add that to our `PostPolicy`:

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{

    // ... other methods

    /**
     * @param User|null $user
     * @return bool
     */
    public function update(?User $user, Post $post): bool
    {
        return $user && $user->is($post->author);
    }

}
```

Once this is done, the following HTTP request by the post's author will
publish the post (bearing in mind that how you authenticate the
request will depend on your authentication implementation):

```http
POST /api/v1/posts/1/-actions/publish?include=tags HTTP/1.1
Accept: application/vnd.api+json
Authorization: Bearer <API_TOKEN>
```

Which will receive the following response if successful:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "content": "...",
      "publishedAt": "2021-01-04T15:37:00.000000Z",
      "title": "Hello World!"
    },
    "relationships": {
      "author": {
        "links": {
          "related": "http://localhost/api/v1/posts/123/author",
          "self": "http://localhost/api/v1/posts/123/relationships/author"
        }
      },
      "tags": {
        "data": [
          {
            "type": "tags",
            "id": "4"
          }
        ],
        "links": {
          "related": "http://localhost/api/v1/posts/123/tags",
          "self": "http://localhost/api/v1/posts/123/relationships/tags"
        }
      }
    },
    "links": {
      "self": "http://localhost/api/v1/posts/123"
    }
  },
  "included": [
    {
      "type": "tags",
      "id": "4",
      "attributes": {
        "displayName": "Laravel"
      }
    }
  ]
}
```
