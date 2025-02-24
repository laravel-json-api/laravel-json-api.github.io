# Controllers

## Introduction

Laravel JSON:API's resource routing assigns routes for a specific
resource type to a single controller. As described in the
[Routing section on controllers](./#controllers-and-namespaces),
the controller name is either inferred from the resource type,
or can be explicitly specified when registering resource routes.

## Generating Controllers

JSON:API controllers should be generated using the `jsonapi:controller`
command, instead of using Laravel's `make:controller` command. This
is so that we can generate a controller that has all the actions
required for JSON:API routing. For example:

```bash
php artisan jsonapi:controller Api/V1/PostController
```

This will generate a controller at
`app/Http/Controllers/Api/V1/PostController.php`. This means the controller's
fully-qualified class name will be `App\Http\Controllers\Api\V1\PostController`.

The generated controller will look like this:

```php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use LaravelJsonApi\Laravel\Http\Controllers\Actions;

class PostController extends Controller
{

    use Actions\FetchMany;
    use Actions\FetchOne;
    use Actions\Store;
    use Actions\Update;
    use Actions\Destroy;
    use Actions\FetchRelated;
    use Actions\FetchRelationship;
    use Actions\UpdateRelationship;
    use Actions\AttachRelationship;
    use Actions\DetachRelationship;

}
```

As you can see, the methods needed for all the JSON:API route actions
are added via traits. Our action traits handle requests and generate
responses that conform with the JSON:API specification. They also
allow you to specify controller hooks that are called during the action
methods.

These actions and hooks are described later in this chapter. However, it
is important to explain at this point that we use traits so that it is
easier for you to implement custom actions if you need to deviate from our
default implementation.

For example, say we only needed a custom implementation for the `show` route.
We would remove the `Actions\FetchOne` trait, but leave all the other traits.
Then we would just need to write our own `show` method on the controller.

See the next chapter for a complete guide to
[writing your own controller actions.](writing-actions.md)

## JSON:API Controller

If you have a resource type that does not need to use any controller hooks,
and does not need to override any of our default action implementations,
you can use our `JsonApiController`. This removes the need for you to
generate a controller for a resource type. This can be registered as follows:

```php
use LaravelJsonApi\Laravel\Http\Controllers\JsonApiController;

JsonApiRoute::server('v1')
    ->prefix('v1')
    ->resources(function ($server) {
        $server->resource('posts', JsonApiController::class);
    });
```

If you are using controller namespacing, you will need to fully-qualify the
generic controller when registering it. For example:

```php
use LaravelJsonApi\Laravel\Http\Controllers\JsonApiController;

JsonApiRoute::server('v1')
    ->prefix('v1')
    ->namespace('Api\V1')
    ->resources(function ($server) {
        $server->resource('posts', '\\' . JsonApiController::class);
    });
```

## Controller Hooks

Each of our default controller actions will invoke methods on the controller
if they are implemented. For example, the `store` action will invoke the
`saving`, `creating`, `created` and `saved` hooks, if they are implemented
on the controller.

These hooks allow you to easily implement application specific actions,
such as firing events or dispatching jobs. They also allow you to return
customised responses. If you return a response from any hook, the controller
action will stop executing and immediately return the response.

## Resource Hooks

### Fetch-Many aka Index

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\FetchMany` trait
implements the `index` controller action. This fetches a list of resources.

This action has two hooks: `searching` and `searched`.

The `searching` hook will be called with the validated query parameters
for the resource collection. This will either be an instance of
`LaravelJsonApi\Laravel\Http\Requests\AnonymousCollectionQuery`, or
the specific class if you have generated one for your resource,
for example:

```php
use App\JsonApi\V1\Posts\PostCollectionQuery;

public function searching(PostCollectionQuery $query): void
{
  // do something...
}
```

:::tip
Both the `AnonymousCollectionQuery` and `PostCollectionQuery` extend
Laravel's `FormRequest` class. More details are available in the
[Requests](../requests/) chapters.
:::

The `searched` hook will be called once models have been retrieved from
the database. The first argument will be the result of the query,
and the second will be the query request class. For example:

```php
use App\JsonApi\V1\Posts\PostCollectionQuery;

public function searched($data, PostCollectionQuery $query): void
{
  // e.g. dispatch a job.
}
```

The `searched` hook can return a response to override the default response
created by the `FetchMany` trait.

:::warning
The `$data` argument provided to the `searched` hook could be a mixture
of types. For example, it could be an Eloquent collection or a JSON:API
page object - or even a model or null if a singular filter was used.
It is therefore likely you will need to check the type before taking
action within your `searched` hook.
:::

### Fetch-One aka Show

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\FetchOne` trait
implements the `show` controller action. This fetches a specified
resource.

This action has two hooks: `reading` and `read`.

The `reading` hook will be called with the validated query parameters
for the resource. This will either be an instance of
`LaravelJsonApi\Laravel\Http\Requests\AnonymousQuery`, or
the specific class if you have generated one for your resource,
for example:

```php
use App\JsonApi\V1\Posts\PostQuery;

public function reading(PostQuery $query): void
{
  // do something...
}
```

:::tip
Both the `AnonymousQuery` and `PostQuery` classes extend
Laravel's `FormRequest` class. More details are available in the
[Requests](../requests/) chapters.
:::

The `read` hook will be called once model has been retrieved from
the database. The first argument will be the model,
and the second will be the query request class. For example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\Models\Post;

public function read(?Post $post, PostCollectionQuery $query): void
{
  // e.g. dispatch a job.
}
```

The `read` hook can return a response to override the default response
created by the `FetchOne` trait.

:::warning
The `$model` argument provided to the `read` hook is `nullable` for a
reason. If the client provides filter query parameters, the model
may not match the filters and therefore the result of retrieving
it from the database will be `null`.

Whatever you do in the `read` hook,
you should ensure that it handles a `null` value safely.
:::

### Store

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\Store` trait
implements the `store` controller action. This creates a new resource.

This action has four hooks: `saving`, `creating`, `created` and `saved`.
Note that the `saving` and `saved` hooks are also called by the
[Update action.](#update)

The `saving` hook will be called with three arguments:

1. `null` to indicate that this is a create, not an update.
2. The JSON:API request class for the resource, which will have validated
the JSON document in the request, e.g. `PostRequest`.
3. The validated query parameters - either an instance of
`LaravelJsonApi\Laravel\Http\Requests\AnonymousQuery`, or
the specific class if you have generated one for your resource
(e.g. `PostQuery`).

For example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;
use App\Models\Post;

public function saving(?Post $post, PostRequest $request, PostQuery $query): void
{
  // do something on creating and updating...
}
```

The `creating` hook will only receive the request classes, for example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;

public function creating(PostRequest $request, PostQuery $query): void
{
  // do something only on creating...
}
```

:::tip
All the `PostRequest`, `AnonymousQuery` and `PostQuery` classes extend
Laravel's `FormRequest` class. More details are available in the
[Requests](../requests/) chapters.
:::

The `saved` and `created` hooks will be called once model has been created
and stored in the database. They both receive three arguments:

1. The model that was created.
2. The JSON:API request class for the resource.
3. The validated query parameters.

For example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;
use App\Models\Post;

public function saved(Post $post, PostRequest $request, PostQuery $query): void
{
  // do something on created and updated...
}

public function created(Post $post, PostRequest $request, PostQuery $query): void
{
  // do something only on created...
}
```

Both the `saved` and `created` hooks can return a response to override
the default response created by the `Store` trait. Note that if the
`saved` hook returns a response, the `created` hook **will not** be
invoked.

### Update

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\Update` trait
implements the `update` controller action. This updates an existing resource.

This action has four hooks: `saving`, `updating`, `updated` and `saved`.
Note that the `saving` and `saved` hooks are also called by the
[Store action.](#store)

The `saving` and `updating` hooks will be called with three arguments:

1. The model that is being updated.
2. The JSON:API request class for the resource, which will have validated
the JSON document in the request, e.g. `PostRequest`.
3. The validated query parameters - either an instance of
`LaravelJsonApi\Laravel\Http\Requests\AnonymousQuery`, or
the specific class if you have generated one for your resource
(e.g. `PostQuery`).

For example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;
use App\Models\Post;

public function saving(?Post $post, PostRequest $request, PostQuery $query): void
{
  // do something on creating and updating...
}

public function updating(Post $post, PostRequest $request, PostQuery $query): void
{
  // do something only on updating...
}
```

:::tip
All the `PostRequest`, `AnonymousQuery` and `PostQuery` classes extend
Laravel's `FormRequest` class. More details are available in the
[Requests](../requests/) chapters.
:::

The `saved` and `updated` hooks will be called once model has been updated
and stored in the database. They both receive the same three arguments.

For example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;
use App\Models\Post;

public function saved(Post $post, PostRequest $request, PostQuery $query): void
{
  // do something on created and updated...
}

public function updated(Post $post, PostRequest $request, PostQuery $query): void
{
  // do something only on created...
}
```

Both the `saved` and `updated` hooks can return a response to override
the default response created by the `Update` trait. Note that if the
`saved` hook returns a response, the `updated` hook **will not** be
invoked.

### Destroy

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\Destroy` trait
implements the `destroy` controller action. This deletes an existing resource.

This action has two hooks: `deleting` and `deleted`. These hooks
will be called with two arguments:

1. The model that is being deleted.
2. The JSON:API request class for the resource, which will validated
the delete request, e.g. `PostRequest`.

For example:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\Models\Post;

public function deleting(Post $post, PostRequest $request): void
{
  // do something...
}

public function deleted(Post $post, PostRequest $request): void
{
  // do something...
}
```

:::tip
The `PostRequest` class extends from Laravel's `FormRequest` class.
More details are available in the [Requests](../requests/) chapters.
:::

The default response returned by the `Destroy` trait is a
`204 No Content` response. The `deleted` hook can return a response to
override this default response.

## Relationship Hooks

### Concept

An important concept to highlight with relationship actions is that the
JSON:API query parameters relate to the resource type *returned* by the
relationship, not the resource type on which the relationship exists.

The type of query parameters class is also determined by whether the
relation is a *to-one* or *to-many* relationship.

For *to-one*, the query class will be for a zero-to-one response.
For example, if we have an `author` relationship on a `posts` resource,
that returns zero-to-one `users` resources. The query class will
either be the `UserQuery` class if it exists, or our
`LaravelJsonApi\Laravel\Http\Requests\AnonymousQuery` class.

For *to-many*, the query class will be for a zero-to-many response.
For example, if we have a `tags` relationship on a `posts` resource,
that returns zero-to-many `tags` resource. The query class will
either be the `TagCollectionQuery` class if it exists, or our
`LaravelJsonApi\Laravel\Http\Requests\AnonymousCollectionQuery` class.

### Fetch-Related aka Show-Related

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\FetchRelated` trait
implements the `showRelated` controller action. This fetches the
related resource(s) for a relationship.

This action has two hooks: `readingRelated{Field}` and `readRelated{Field}`.
The field is the field-name for the relationship.

The `readingRelated{Field}` hook receives two arguments:

1. The model on which the relationship exists.
2. The query class for the resource type returned by the relationship.

For example if a `posts` resource has a *to-one* `author` relationship,
and a *to-many* `tags` relationship, the following `readingRelated` hooks
can exist:

```php
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\JsonApi\V1\Users\UserQuery;
use App\Models\Post;

public function readingRelatedAuthor(Post $post, UserQuery $query): void
{
  // do something...
}

public function readingRelatedTags(Post $post, TagCollectionQuery $query): void
{
  // do something...
}
```

:::tip
Both the `AnonymousQuery`, `AnonymousCollectionQuery` and specific classes
(e.g. `UserQuery` and `TagCollectionQuery`) extend Laravel's `FormRequest`
class. More details are available in the [Requests](../requests/) chapters.
:::

The `readRelated{Field}` hook recieves three arguments:

1. The model on which the relationship exists.
2. The data returned by the relationship. For a *to-one* relation, this will
be the related model or `null`. For a *to-many*, this will be of mixed type
depending on the request filter and page parameters.
3. The query class for the resource type returned by the relationship.

Using our example of an `author` and a `tags` relation on a `posts` resource:

```php
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\JsonApi\V1\Users\UserQuery;
use App\Models\Post;
use App\Models\User;

public function readRelatedAuthor(Post $post, ?User $user, UserQuery $query): void
{
  // do something...
}

public function readRelatedTags(Post $post, $data, TagCollectionQuery $query): void
{
  // do something...
}
```

The `readRelated{Field}` hook can return a response to override the default
response created by the `FetchRelationship` trait.

:::warning
The `$user` argument provided to the `readRelatedAuthor` hook is
`nullable` for a reason. If the client provides filter query parameters,
the model may not match the filters and therefore the result of retrieving
the relation it from the database will be `null`.

For *to-many* relations, the `$data` argument provided to the `readRelatedTags`
hook will be of mixed type. It could be an Eloquent collection or a JSON:API
page object - or even a model or null if a singular filter was used.
You will need to check the type before taking action with it.
:::

### Fetch-Relationship aka Show-Relationship

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\FetchRelationship` trait
implements the `showRelationship` controller action. This fetches the
related resource(s) for a relationship and returns their resource identifiers.

This action has two hooks: `reading{Field}` and
`read{Field}`. The field is the field-name for the relationship.

The `reading{Field}` hook receives two arguments:

1. The model on which the relationship exists.
2. The query class for the resource type returned by the relationship.

For example if a `posts` resource has a *to-one* `author` relationship,
and a *to-many* `tags` relationship, the following hooks can exist:

```php
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\JsonApi\V1\Users\UserQuery;
use App\Models\Post;

public function readingAuthor(Post $post, UserQuery $query): void
{
  // do something...
}

public function readingTags(Post $post, TagCollectionQuery $query): void
{
  // do something...
}
```

:::tip
Both the `AnonymousQuery`, `AnonymousCollectionQuery` and specific classes
(e.g. `UserQuery` and `TagCollectionQuery`) extend Laravel's `FormRequest`
class. More details are available in the [Requests](../requests/) chapters.
:::

The `read{Field}` hook receives three arguments:

1. The model on which the relationship exists.
2. The data returned by the relationship. For a *to-one* relation, this will
be the related model or `null`. For a *to-many*, this will be of mixed type
depending on the request filter and page parameters.
3. The query class for the resource type returned by the relationship.

Using our example of an `author` and a `tags` relation on a `posts` resource:

```php
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\JsonApi\V1\Users\UserQuery;
use App\Models\Post;
use App\Models\User;

public function readAuthorRelationship(Post $post, ?User $user, UserQuery $query): void
{
  // do something...
}

public function readTagsRelationship(Post $post, $data, TagCollectionQuery $query): void
{
  // do something...
}
```

The `read{Field}` hook can return a response to override the default
response created by the `FetchRelationship` trait.

:::warning
The `$user` argument provided to the `readAuthor` hook is `nullable` for
a reason. If the client provides filter query parameters,
the model may not match the filters and therefore the result of retrieving
the relation it from the database will be `null`.

For *to-many* relations, the `$data` argument provided to the
`readTags` hook will be of mixed type. It could be an Eloquent
collection or a JSON:API page object - or even a model or null if a singular
filter was used. You will need to check the type before taking action with it.
:::

### Update-Relationship

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\UpdateRelationship` trait
implements the `updateRelationship` controller action. This completely
replaces the contents of a relationship, and then returns the
resource identifiers of the new relationship value.

This action has two hooks: `updating{Field}` and
`updated{Field}`. The field is the field-name for the relationship.

The `updating{Field}` hook receives three arguments:

1. The model on which the relationship exists.
2. The JSON:API request class for the resource that is having its relationship
updated, e.g. `PostRequest` when updating a `posts` `author` relationship.
3. The query class for the resource type returned by the relationship.

For example if a `posts` resource has a *to-one* `author` relationship,
and a *to-many* `tags` relationship, the following hooks can exist:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\JsonApi\V1\Users\UserQuery;
use App\Models\Post;

public function updatingAuthor(
  Post $post,
  PostRequest $request,
  UserQuery $query
): void
{
  // do something...
  // to access the author use:
  /** @var \App\Models\User|null $author */
  $author = $request->toOne();
}

public function updatingTags(
  Post $post,
  PostRequest $request,
  TagCollectionQuery $query
): void
{
  // do something...
  // to access the tags, use:
  /** @var \Illuminate\Support\Collection $tags */
  $tags = $request->toMany();
}
```

:::tip
Both the `AnonymousQuery`, `AnonymousCollectionQuery` and specific classes
(e.g. `UserQuery` and `TagCollectionQuery`) extend Laravel's `FormRequest`
class. More details are available in the [Requests](../requests/) chapters.
:::

The `updated{Field}` hook receives four arguments:

1. The model on which the relationship exists.
2. The data that replaced the relationship. For a *to-one* relation, this will
be the related model or `null`. For a *to-many*, this will typically
be an Eloquent collection.
3. The JSON:API request class for the resource that had its relationship
updated.
4. The query class for the resource type returned by the relationship.

Using our example of an `author` and a `tags` relation on a `posts` resource:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\JsonApi\V1\Users\UserQuery;
use App\Models\Post;
use App\Models\User;

public function updatedAuthor(
  Post $post,
  ?User $user,
  PostRequest $request,
  UserQuery $query
): void
{
  // do something...
  // to access the author use:
  /** @var \App\Models\User|null $author */
  $author = $request->toOne();
}

public function updatedTags(
  Post $post,
  $tags,
  PostRequest $request,
  TagCollectionQuery $query
): void
{
  // do something...
  // to access the tags, use:
  /** @var \Illuminate\Support\Collection $tags */
  $tags = $request->toMany();
}
```

The `updated{Field}` hook can return a response to override the default
response created by the `UpdateRelationship` trait.

### Attach-Relationship

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\AttachRelationship` trait
implements the `attachRelationship` controller action. This action
attaches models to a *to-many* relationship.

This action has two hooks: `attaching{Field}` and `attached{Field}`.
The field is the field-name for the relationship.

The `attaching{Field}` hook receives three arguments:

1. The model on which the relationship exists.
2. The JSON:API request class for the resource that is having its relationship
updated, e.g. `PostRequest` when updating a `posts` `tags` relationship.
3. The query class for the resource type returned by the relationship.

For example if a `posts` resource has *to-many* `tags` relationship,
the `attachingTags` hook can exist:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\Models\Post;

public function attachingTags(
  Post $post,
  PostRequest $request,
  TagCollectionQuery $query
): void
{
  // do something...
  // to access the tags, use:
  /** @var \Illuminate\Support\Collection $tags */
  $tags = $request->toMany();
}
```

:::tip
Both the `AnonymousCollectionQuery` and specific classes
(e.g. `TagCollectionQuery`) extend Laravel's `FormRequest`
class. More details are available in the [Requests](../requests/) chapters.
:::

The `attached{Field}` hook receives four arguments:

1. The model on which the relationship exists.
2. The data that was attached to the relationship, as an Eloquent collection.
3. The JSON:API request class for the resource that had its relationship
updated.
4. The query class for the resource type returned by the relationship.

Using our example of a `tags` relation on a `posts` resource:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\Models\Post;

public function attachedTags(
  Post $post,
  $tags,
  PostRequest $request,
  TagCollectionQuery $query
): void
{
  // do something...
  // to access the tags, use:
  /** @var \Illuminate\Support\Collection $tags */
  $tags = $request->toMany();
}
```

The `attached{Field}` hook can return a response to override the default
`204 No Content` created by the `AttachRelationship` trait.

### Detach-Relationship

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\DetachRelationship` trait
implements the `detachRelationship` controller action. This action
detaches models from a *to-many* relationship.

This action has two hooks: `detaching{Field}` and `detached{Field}`.
The field is the field-name for the relationship.

The `detaching{Field}` hook receives three arguments:

1. The model on which the relationship exists.
2. The JSON:API request class for the resource that is having its relationship
updated, e.g. `PostRequest` when updating a `posts` `tags` relationship.
3. The query class for the resource type returned by the relationship.

For example if a `posts` resource has *to-many* `tags` relationship,
the `detachingTags` hook can exist:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\Models\Post;

public function detachingTags(
  Post $post,
  PostRequest $request,
  TagCollectionQuery $query
): void
{
  // do something...
  // to access the tags, use:
  /** @var \Illuminate\Support\Collection $tags */
  $tags = $request->toMany();
}
```

:::tip
Both the `AnonymousCollectionQuery` and specific classes
(e.g. `TagCollectionQuery`) extend Laravel's `FormRequest`
class. More details are available in the [Requests](../requests/) chapters.
:::

The `detached{Field}` hook receives four arguments:

1. The model on which the relationship exists.
2. The data that was detached from the relationship, as an Eloquent collection.
3. The JSON:API request class for the resource that had its relationship
updated.
4. The query class for the resource type returned by the relationship.

Using our example of a `tags` relation on a `posts` resource:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\Models\Post;

public function detachedTags(
  Post $post,
  $tags,
  PostRequest $request,
  TagCollectionQuery $query
): void
{
  // do something...
  // to access the tags, use:
  /** @var \Illuminate\Support\Collection $tags */
  $tags = $request->toMany();
}
```

The `detached{Field}` hook can return a response to override the default
`204 No Content` created by the `DetachRelationship` trait.
