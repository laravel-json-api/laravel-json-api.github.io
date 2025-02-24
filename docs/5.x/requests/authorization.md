# Authorization

## Introduction

Typically requests to your API will need to be authorized. Thankfully,
Laravel JSON:API takes a simple approach to authorization that leverages
many of the Laravel features you are already familiar with.

And if our authorization pattern doesn't work for your use-case, we've
made it exceptionally simple to disable our authorization and implement
your own.

## Policies

To limit which users may view, create, update or delete resources,
Laravel JSON:API leverages Laravel's
[authorization policies](https://laravel.com/docs/authorization#creating-policies).
Policies are simple PHP classes that organize authorization logic for a
particular model or resource. For example, if your application is a blog,
you may have a `Post` model and a corresponding `PostPolicy` within your
application.

When processing API requests, Laravel JSON:API will automatically check
the policy's relevant authorization methods before performing the requested
action. The authorization is triggered by our resource request and query
request classes.

### Resource Authorization

The following table shows the policy authorization method for each resource
request defined by the JSON:API specification:

| Verb   | URI             | Authorization Method |
|--------|-----------------|----------------------|
| GET    | `/posts`        | viewAny              |
| POST   | `/posts`        | create               |
| GET    | `/posts/{post}` | view                 |
| PATCH  | `/posts/{post}` | update               |
| DELETE | `/posts/{post}` | delete               |

The `viewAny` and `create` policy methods
[will not receive a model](https://laravel.com/docs/authorization#methods-without-models).
The `view`, `update` and `delete` authorization methods will receive the model
that is subject of the request, for example:

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{

    /**
     * Authorize a user to update a post.
     *
     * @param User $user
     * @param Post $post
     * @return bool
     */
    public function update(User $user, Post $post): bool
    {
        return $user->is($post->author);
    }
}
```

:::warning
If a policy exists but is missing a method for a particular action, the user
will not be allowed to perform that action. So, if you have defined a policy,
don't forget to define all of its relevant authorization methods.
:::

### Gate Responses

If you want to return a custom error message when a user is not authorized
or based on the result of the authorization, you can use the
`Illuminate\Auth\Access\Response` class. This class allows you to return a
custom response when the user is not authorized or when the authorization
fails.

:::tip
See the [Laravel documentation on Gate Responses](https://laravel.com/docs/authorization#gate-responses)
for more details.
:::

For example, if you want to return a custom error message when a user is not
authorized to update a post, you can use the `deny` method:

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class PostPolicy
{

    /**
     * Authorize a user to update a post.
     *
     * @param User $user
     * @param Post $post
     * @return Response
     */
    public function update(User $user, Post $post): Response
    {
        if ($user->is($post->author)) {
            return Response::allow();
        }

        return Response::deny(
            'You are not the author of this post. You cannot update it.'
        );
    }
}
```

This will return a `403 Forbidden` response with the custom error message
when the user is not authorized to update the post.

### Relationship Authorization

Laravel JSON:API also expects policy methods to be defined for each relationship
request defined in the specification. Below we detail the policy methods that
are invoked for each *to-one* and *to-many* relationship request defined by the
specification.

When authorizing relationships, it is important to understand that this
authorization protects the **relationship endpoint**, i.e. the controller
action. It does not protect the relationship from modification within a request
to update the top-level resource.

For example, the `updateAuthor()` policy method is checked when the client calls
the `POST /posts/{post}/relationships/author` endpoint. The relationship
authorization **is not called** if the author relationship is modified when
updating the post resource, i.e. `PATCH /posts/{post}`.

Likewise, viewing relationship authorization protects the relationship endpoints.
It does not protect the relationship from being eager-loaded (i.e. being listed
in an include path).

For example, the `viewAuthor()` policy method is checked when the client calls
the `GET /posts/{post}/author` endpoint. However, it is not called when the
client calls the resource endpoint with an include path, i.e.
`GET /posts/{post}?include=author`.

:::tip
Why is our implementation designed this way?

This implementation works for most use-cases, where access to the resource is
controlled at the **resource-level**. I.e. if the user can access a `posts`
resource, they can see all attributes and relationships belonging to the
individual post. Likewise, if a user can modify a `posts` resource, they can
modify any writeable attribute or relationship.

In this scenario, the use-case for a relationship endpoint having different
access rights would be when a relationship is read-only when updating the
resource, and instead can only be modified via the relationship endpoints. In
such a case, the access rights can be different for the `PostPolicy::update()`
method and the `PostPolicy::updateTags()` method.

A more complex use-case is to control read/write access at the **field-level**,
i.e. access can vary across different resource attributes and/or relationships.
We cannot support this out-of-the-box because such use-cases tend to have very
specific application logic to how the authorization should be implemented.
However, you can implement such an authorization strategy by
[writing your own authorizer, as described later in this chapter.](#customising-authorization)
:::

#### To-One

The following table shows the request class and the policy authorization
method for each *to-one* relationship request defined by the JSON:API
specification.

In this example, we have an `author` relationship on a `posts` resource.
The authorization method is invoked on the `PostPolicy`:

| Verb  | URI                                  | Authorization Method |
|-------|--------------------------------------|----------------------|
| GET   | `/posts/{post}/author`               | viewAuthor           |
| GET   | `/posts/{post}/relationships/author` | viewAuthor           |
| PATCH | `/posts/{post}/relationships/author` | updateAuthor         |

The `viewAuthor` authorization method receives the `Post` model that is
subject of the request. For example:

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{

    /**
     * Authorize a user to view a post's author.
     *
     * @param User $user
     * @param Post $post
     * @return bool
     */
    public function viewAuthor(User $user, Post $post): bool
    {
        return true;
    }
}
```

The `updateAuthor` authorization method receives both the `Post` model,
and a relation object that allows you to safely check the value the
relationship is being changed to. For example:

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\User;
use LaravelJsonApi\Core\Store\LazyRelation;

class PostPolicy
{

    /**
     * Authorize a user to change a post's author.
     *
     * @param User $user
     * @param Post $post
     * @param LazyRelation $relation
     * @return bool
     */
    public function updateAuthor(
      User $user,
      Post $post,
      LazyRelation $relation
    ): bool
    {
        /** @var User|null $author */
        $author = $relation->get();

        return $user->is($post->author) && !!$author;
    }
}
```

:::tip
Because authorization occurs **before** validation, the `LazyRelation` class
is designed to safely resolve the value that the relation is being changed to,
ignoring the value if it is invalid.

It is also designed so that the cost of resolving the relation value is only
incurred if you actually need to check the value - in this case by calling
the `get` method.
:::

#### To-Many

The following table shows the request class and the policy authorization
method for each *to-many* relationship request defined by the JSON:API
specification.

In this example, we have a `tags` relationship on a `posts` resource.
The authorization method is invoked on the `PostPolicy`:

| Verb   | URI                                | Authorization Method |
|--------|------------------------------------|----------------------|
| GET    | `/posts/{post}/tags`               | viewTags             |
| GET    | `/posts/{post}/relationships/tags` | viewTags             |
| PATCH  | `/posts/{post}/relationships/tags` | updateTags           |
| POST   | `/posts/{post}/relationships/tags` | attachTags           |
| DELETE | `/posts/{post}/relationships/tags` | detachTags           |

The `viewTags` authorization method receives the `Post` model that is
subject of the request. For example:

```php
namespace App\Policies;

use App\Models\User;
use App\Models\Post;

class PostPolicy
{

    /**
     * Authorize a user to view a post's tags.
     *
     * @param User $user
     * @param Post $post
     * @return bool
     */
    public function viewTags(User $user, Post $post): bool
    {
        return true;
    }
}
```

The `updateTags`, `attachTags` and `detachTags` authorization methods
receive both the `Post` model, and a relation object that allows you to safely
check the value provided by the client. For example:

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\Tag;
use App\Models\User;
use LaravelJsonApi\Core\Store\LazyRelation;

class PostPolicy
{

    /**
     * Authorize a user to change a post's tags.
     *
     * @param User $user
     * @param Post $post
     * @param LazyRelation $relation
     * @return bool
     */
    public function updateTags(
      User $user,
      Post $post,
      LazyRelation $relation
    ): bool
    {
        $check = $relation
            ->collect()
            ->every(fn (Tag $tag) => $tag->bloggable);

        return $user->is($post->author) && $check;
    }
}
```

:::tip
Because authorization occurs **before** validation, the `LazyRelation` class
is designed to safely resolve the value provided by the client,
skipping any invalid values.

It is also designed so that the cost of resolving the relation value is only
incurred if you actually need to check the value - in this case by calling
the `collect` method or iterating over the object.
:::

### Guests

If your API can be accessed without users authenticating, then remember
that you can use Laravel's
[Guest Users](https://laravel.com/docs/authorization#guest-users)
feature. This allows you to type-hint the `User` as nullable in your
policy authentication methods.

### Form Request Authorization

Our default authorization strategy is triggered by our form request classes -
i.e. the `PostRequest`, `PostQuery` and `PostCollectionQuery` classes.

On any of these classes, if you implement the
[form request's `authorize` method](https://laravel.com/docs/validation#authorizing-form-requests)
you will prevent our authorization from running.

However, we provide an ability to implement your own authorization plus
run our default authorization if needed. If you return a `boolean` from
the `authorize` method, our default authorization **will not** run.
If you return `null` we will run our default authorization.

For example:

```php
namespace App\JsonApi\V1\Posts\PostRequest;

use LaravelJsonApi\Laravel\Http\Requests\ResourceRequest;

class PostRequest extends ResourceRequest
{

    // ...

    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool|null
     */
    public function authorize(): ?bool
    {
        if ($this->isMethod('DELETE')) {
          // default authorization will NOT run as we're returning a boolean.
          return false;
        }

        // default authorization will run...
        return null;
    }
}
```

### Disabling Authorization

We provide the ability to disable our default authorization strategy at either
a resource or server level.

If you do not want a specific JSON:API resource to be authorized, then you can
override the `authorizable` method on the JSON:API schema:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Eloquent\Schema;

class PostSchema extends Schema
{

    // ...

    /**
     * Determine if the resource is authorizable.
     *
     * @return bool
     */
    public function authorizable(): bool
    {
        return false;
    }
}
```

If you do not want our authorization logic to run for an entire server,
then you can override the `authorizable` method on the server:

```php
namespace App\JsonApi\V1;

use LaravelJsonApi\Core\Server\Server as BaseServer;

class Server extends BaseServer
{
    // ...

    /**
     * Determine if the server is authorizable.
     *
     * @return bool
     */
    public function authorizable(): bool
    {
        return false;
    }
}
```

:::tip
An example of when you might want to disable authorization for an entire server
would be as follows.

If your API can only be accessed by a user, and a user only has access to their
own models in the API. You could disable our authorization on the server class,
and instead use Laravel's
[`auth` middleware](https://laravel.com/docs/8.x/authentication#protecting-routes)
to protect the entire API.
:::

## Hiding Entire Resources

There may be times when you need to hide certain resources when a user
accesses your API. This is easily achieved using
[global scopes](https://laravel.com/docs/eloquent#global-scopes) that
are applied to your server.

To illustrate this we will use an example of a blog application that has
a `posts` resource in its API. All published posts should be visible to
guests and authenticated users. However, draft posts should only be
visible to the author of the post.

To achieve this, we will use the following global scope:

```php
namespace App\JsonApi\V1\Posts;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class PostScope implements Scope
{

    /**
     * @inheritDoc
     */
    public function apply(Builder $builder, Model $model)
    {
        /**
         * If there is no authenticated user, then we just
         * need to ensure only published posts are returned.
         */
        if (Auth::guest()) {
            $builder->whereNotNull(
                $model->qualifyColumn('published_at')
            );
            return;
        }

        /**
         * If there is an authenticated user, then they
         * can see either published posts OR posts
         * where they are the author.
         */
        $builder->where(function ($query) use ($model) {
            return $query
                ->whereNotNull($model->qualifyColumn('published_at'))
                ->orWhere($model->qualifyColumn('author_id'), Auth::id());
        });
    }

}
```

To add this scope to our API, we use the `serving` method on our `Server`
class:

```php
namespace App\JsonApi\V1;

use App\JsonApi\V1\Posts\PostScope;
use App\Models\Post;
use Illuminate\Support\Facades\Auth;
use LaravelJsonApi\Core\Server\Server as BaseServer;

class Server extends BaseServer
{

    // ...

    /**
     * Bootstrap the server when it is handling an HTTP request.
     *
     * @return void
     */
    public function serving(): void
    {
        Post::addGlobalScope(new PostScope());

        Post::creating(static function (Post $post): void {
            $post->author()->associate(Auth::user());
        });
    }

}
```

:::tip
Notice that we also attach a `creating` event to our `Post` class.
This will automatically add the authenticated user as the author
of a post.
:::

As a result, draft `posts` are now hidden from users, unless they
are the author of the post. If a guest or user attempts to
access a draft `posts` resource for which they are not the author,
they will receive a `404 Not Found` response. Also, when they view
lists of `posts` resources (e.g. by requesting
`GET /api/v1/posts`), they will not see any draft `posts` for which
they are not the author.

## Index Filtering

You may notice that returning `false` from a policy's `view` method does not
stop a given resource from appearing in the resource index. To filter models
from the resource index query, you may override the `indexQuery` method on
your schema.

For example, if we wanted a user to only be able to list their own models when
executing an index query:

```php
/**
 * Build an "index" query for the given resource.
 *
 * @param \Illuminate\Http\Request|null $request
 * @param \Illuminate\Database\Eloquent\Builder  $query
 * @return \Illuminate\Database\Eloquent\Builder
 */
public function indexQuery(?Request $request, Builder $query): Builder
{
    return $query->where('user_id', $request->user()->id);
}
```

Unlike [hiding entire resources](#hiding-entire-resources), using index
filtering only prevents the resource from appearing in the resource index. This
means that the API client will still be able to request a resource they do not
have access to - and will receive a `403 Forbidden` response instead of the
`404 Not Found` that the hiding entire resources approach would return.

:::tip
Index filtering does not affect include paths. If you need to hide resources
from appearing via an include path, you should use the hiding entire resources
approach described above.
:::

## Relatable Filtering

If you would like to filter the resources when they appear in a *to-many*
relation, you may override the `relatableQuery` method on your schema.

For example:

```php
/**
 * Build a "relatable" query for this resource.
 *
 * @param \Illuminate\Http\Request|null $request
 * @param \Illuminate\Database\Eloquent\Relations\Relation $query
 * @return Illuminate\Database\Eloquent\Relations\Relation
 */
public function relatableQuery(?Request $request, Relation $query): Relation
{
    return $query;
}
```

## Customising Authorization

Our authorization implementation is designed to be customised if needed.
You can either customise it for a specific resource type or types,
or override the entire implementation.

For both, you will need to write an `Authorizer` class, that implements
our `LaravelJsonApi\Contracts\Auth\Authorizer` interface. The interface
is self-explanatory: it has a method to authorize each JSON:API controller
action.

To generate an authorizer, use the `jsonapi:authorizer` Artisan command.
You will need to specify if you are generating a per-resource `Authorizer`
or a general use `Authorizer`.

For a per-resource authorizer:

```bash
php artisan jsonapi:authorizer posts --resource --server=v1
```

This will generate an authorizer for our `posts` resource. It will be
placed in the same namespace as the `PostSchema` and will be called
`PostAuthorizer`.

For a general-use authorizer:

```bash
php artisan jsonapi:authorizer blog --server=v1
```

This will generate a `BlogAuthorizer` in the following namespace:
`App\JsonApi\Authorizers`.

:::tip
In both examples, you do not need to use the `--server` option if you only
have one server.
:::

### Per-Resource Customisation

If you want to fully customise the authorization logic for a specific
resource type, create an `Authorizer` class in the same namespace as the
resource's `Schema`.

For example, if our `posts` resource's schema is
`App\JsonApi\V1\Posts\PostSchema`, create an authorizer as
`App\JsonApi\V1\Posts\PostAuthorizer`. This class will be automatically
detected, and used instead of our default implementation to authorize
`posts` requests.

### Multi-Resource Customisation

If you want to customise the authorization logic for a group of resources,
create an `Authorizer` class containing the logic. You will then
need to register it as the class for the specific resource types.

To do this, use the `register` method in your `AuthServiceProvider`.
For example, if we have generated a `App\JsonApi\Authorizers\BlogAuthorizer`,
we can register it for multiple resource types as follows:

```php
use App\JsonApi\Authorizers\BlogAuthorizer;
use LaravelJsonApi\Laravel\LaravelJsonApi;

public function register(): void
{
    LaravelJsonApi::registerAuthorizer(BlogAuthorizer::class, [
      \App\JsonApi\V1\Posts\PostSchema::class,
      \App\JsonApi\V1\Tags\TagSchema::class,
    ]);
}
```

As you can see from the example, the first argument is the fully-qualified
class of the `Authorizer` we are registering. The second argument is an array
of the `Schema` classes that the authorizer should be used for.

### Full Customisation

If you want to entirely replace our default implementation, register
a default `Authorizer` class. This will be used as the default implementation
for all resources, unless you've used the per-resource and multi-resource
customisation described above.

To register your default implementation, use the `register` method of your
`AuthServiceProvider`. For example:

```php
use App\JsonApi\Authorizers\DefaultAuthorizer;
use LaravelJsonApi\Laravel\LaravelJsonApi;

public function register(): void
{
    LaravelJsonApi::defaultAuthorizer(DefaultAuthorizer::class);
}
```

:::tip
If you have multiple APIs, and need a different default authorizer for each,
then use the `serving` method on the `Server` class to register the
correct authorizer class for the server.
:::
