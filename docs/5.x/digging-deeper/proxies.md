# Multi-Resource Models

## Introduction

When writing JSON:API servers, your server will typically map an Eloquent model
to a single JSON:API resource type. For example, your `Post` model will have
a `PostSchema`, that represents the `posts` resource.

Under the hood, the JSON:API encoder uses the model class to work out how to
serialize the model to its JSON:API resource representation. This means that
there is effectively a one-to-one relationship between a model class and a
JSON:API schema/resource type.

There may however be occasions were you need to represent an Eloquent model as
multiple resource types in your API. This is supported by Laravel JSON:API
using a concept of *proxy models*. These are classes that wrap an Eloquent
model so that it can be mapped to an alternative resource type when a JSON:API
compound document is encoded.

## Example Scenario

In this chapter we will demonstrate this capability by imagining that our
`User` model needs to be represented in our API as two different resource types:
a `users` resource and a `user-accounts` resource. The `users` resource will
represent the publicly visible information about a `user`, whereas the
`user-accounts` resource will only be visible to administrators and will provide
private information about the user account.

:::tip
We are using this use-case for illustrative purposes only, and are not suggesting
that this is the only way to handle sensitive user information in your API.
:::

Before we begin, the first thing to consider is that as we have two resources,
one resource can use the Eloquent model directly, and the other will need to
use a *proxy* class. It is sensible to use the Eloquent model for whichever
resource appears more frequently in your API.

In our example, this will be the `users` resource. For this resource we
can follow the standard [Schema instructions.](../schemas/) I.e. there is
nothing different about the schema for our `users` resource.

Our proxy will be used for the `user-accounts` resource. This means for this
resource, we will need to follow the instructions in this chapter.

## Creating Proxies

For our user account, we need to create a proxy that wraps our `User` model.
This can be created in any namespace, but a suggested location would be
`App\JsonApi\Proxies`:

```php
namespace App\JsonApi\Proxies;

use App\Models\User;
use LaravelJsonApi\Eloquent\Proxy;

class UserAccount extends Proxy
{

    /**
     * UserAccount constructor.
     *
     * @param User|null $user
     */
    public function __construct(User $user = null)
    {
        parent::__construct($user ?: new User());
    }

}
```

This class is intentionally simple. It must extend `LaravelJsonApi\Eloquent\Proxy`
class and uses the constructor to define which model the class wraps. Note that
the constructor **must** handle receiving `null` for the model.

### Working with Proxies

When handling proxies, for example in controller actions, you can access the
model that it wraps using the `toBase()` model. So for example:

```php
use App\Models\User;
use App\JsonApi\Proxies\UserAccount;

$user = User::factory()->create();
$account = new UserAccount($user);
$user === $account->toBase(); // true
```

However, the proxy class also forwards calls through to the underlying model.
So, for example the following would save the underlying model:

```php
$account = new UserAccount($user);
$account->name = 'John Smith';
$account->save();
```

## Proxy Schemas

As already mentioned, our schema for our `users` resource is no different from
a normal Eloquent schema. However, for our `user-accounts` resource we need
to create a *proxy schema*.

You may generate a new proxy schema using the `jsonapi:schema` Artisan command
along with the `--proxy` and `--model` options. For example:

```bash
php artisan jsonapi:schema user-accounts --proxy --model "\App\JsonApi\Proxies\UserAccount"
```

This will generate the following schema:

```php
namespace App\JsonApi\V1\UserAccounts;

use App\JsonApi\Proxies\UserAccount;
use LaravelJsonApi\Eloquent\Contracts\Paginator;
use LaravelJsonApi\Eloquent\Fields\DateTime;
use LaravelJsonApi\Eloquent\Fields\ID;
use LaravelJsonApi\Eloquent\Filters\WhereIn;
use LaravelJsonApi\Eloquent\Pagination\PagePagination;
use LaravelJsonApi\Eloquent\ProxySchema;

class UserAccountSchema extends ProxySchema
{

    /**
     * The model the schema corresponds to.
     *
     * @var string
     */
    public static string $model = UserAccount::class;

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
            WhereIn::make('id', $this->idColumn()),
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

There are only a few differences to a regular Eloquent schema. Firstly, notice
the schema extends `LaravelJsonApi\Eloquent\ProxySchema`. Secondly, the model
class is set to our `UserAccount` proxy class instead of an Eloquent model.

Apart from these minor differences, the schema works exactly the same as a
standard Eloquent schema. For example, we can add more fields to this schema:

```php
public function fields(): array
{
    return [
        ID::make(),
        DateTime::make('createdAt')->readOnly(),
        Str::make('email'),
        Str::make('name'),
        HasOne::make('phone'),
        BelongsToMany::make('roles'),
        DateTime::make('updatedAt')->readOnly(),
    ];
}
```

In the above the fields column names will refer to the columns on the `User`
model, as that is the Eloquent class our proxy wraps. Notice we can add
relationships too, meaning that our `user-accounts` resource will support
eager loading and retrieval of those relationships if we register the
relationship routes.

## Routing and Controllers

When registering routes for a proxy resource, there are no differences to the
standard routing implementation. For example, we could register both our
`users` and `user-accounts` resources as follows:

```php
use LaravelJsonApi\Laravel\Http\Controllers\JsonApiController;

JsonApiRoute::server('v1')
    ->prefix('v1')
    ->resources(function ($server) {
        $server->resource('users', JsonApiController::class);
        $server->resources('user-accounts', JsonApiController::class);
    });
```

### Controller Actions

When writing controller actions on a controller for our proxy resource, the
actions will receive the proxy class, *not* the underlying model.

So for example, if we added an `updated` controller action on the controller
for our `user-accounts` resource, it would receive the `UserAccount` class,
not the `User` model.

## Authorization

As described in the [Authorization chapter](../requests/authorization.md) our
authorization implementation relies on Laravel policies. Laravel policies also
use the class of an object to determine which policy is used to authorize the
request. For example, our `User` model will typically be authorized by the
`UserPolicy`, as defined in our application's `AuthServiceProvider` or
auto-discovered by Laravel.

For proxies, you will need to register the policy that should be used on your
application's `AuthServiceProvider`. For example:

```php
namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array
     */
    protected $policies = [
        \App\JsonApi\Proxies\UserAccountProxy::class =>
            \App\Policies\UserAccountPolicy::class,
    ];

    // ...
}
```

:::tip
It is up to you if you want a separate policy class for your proxy, e.g.
`UserAccountPolicy`, or if you want to reuse the policy for the underlying
model, e.g. `UserPolicy`. If you are reusing the model policy, you will need
to adjust the type-hinting of the policy methods so that they allow both a
`User` model and `UserAccount` proxy class to be provided to the methods.
:::

## Resources

As described in the [Resources chapters](../resources/), resource classes are
optional. When one is not defined, we use schemas to automatically convert
models (and proxies) to their JSON:API resource representation.

If you are writing your own resource classes, then there is only one extra
thing to bear in mind when handling proxies. If you have a relationship that
returns values that should be a proxy resource class, you will need to ensure
that the return value is converted to proxy instances.

This can be done by [specifying data](../resources/relationships.md#specifying-data)
when creating the resource relationship.

For example, if we had a `users` relationship on our `roles` resource that
returned `User` models, then without any configuration they would be serialized
to `users` resources. If we wanted them serialized to `user-accounts` resources
instead, we would configure the relationship as follows:

```php
$this->relation('users')->withData(
  static fn(Role $role) => UserAccount::wrap($role->users)
);
```

:::tip
The static `wrap()` helper is available on all proxy classes, and handles
converting a model or models to the proxy class. It can be called with either
a *to-one* value (i.e. a single model or `null`), or a *to-many* value (a
collection of models).
:::
