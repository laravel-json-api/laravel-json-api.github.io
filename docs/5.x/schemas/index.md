# The Basics

## Introduction

Schemas **describe** JSON:API resources that exist within your server.
For Eloquent models, they also describe how the JSON:API server interacts
with the database to query, create, read, update and delete resources.

Schemas are also used to automatically serialize models to JSON:API
resource objects, unless you define your own serialization using our
[resource classes.](../resources/)

## Defining Schemas

By default, schemas exist in a namespace relative to the namespace of
your `Server` class. The pluralized form of the JSON:API resource
type is used as the namespace.

For example, if the `App\JsonApi\V1\Server` has a resource called
`posts`, the schema will exist as `App\JsonApi\V1\Posts\PostSchema`.

You may generate a new schema using the `jsonapi:schema` Artisan command:

```bash
php artisan jsonapi:schema posts --server=v1
```

::: tip
The `--server` option is not required if you only have one server.
:::

The most basic and fundamental property of a schema is its `model`
property. This property tells the server which Eloquent model the schema
corresponds to:

```php
/**
 * The model the schema corresponds to.
 *
 * @var string
 */
public static string $model = \App\Models\Post::class;
```

When generating your schema, we set the `$model` property for you.
The model class is assumed to be the name of the schema - i.e. the
`Post` model for the `PostSchema` class. If you need to use a different
model class, use the `--model` option with the generator:

```bash
php artisan jsonapi:schema posts --server=v1 --model=BlogPost
```

Freshly created schemas only contain `id`, `createdAt` and `updatedAt`
fields. Don't worry, we'll add more fields to our schema soon.

### Parent Classes and Interfaces

Our schemas support setting the `$model` property of a schema to a parent class
or an interface.

When matching models to schemas, a direct match will always be resolved first.
If there is no direct match, we then check whether the model class has a parent
for which a schema is registered. If no parent, we then check whether the model
class implements any interfaces for which a schema is registered.

## Registering Schemas

Before resources are available in your server, they must first be registered
with the server. Resources are registered in the `allSchemas()` method
of your server class.

For example, to register our `PostSchema`:

```php
namespace App\JsonApi\V1;

use LaravelJsonApi\Core\Server\Server as BaseServer;

class Server extends BaseServer
{

    // ...

    /**
     * Get the server's list of schemas.
     *
     * @return array
     */
    protected function allSchemas(): array
    {
        return [
            Posts\PostSchema::class,
        ];
    }
}
```

::: tip
We do not support automatic discovery of schemas intentionally.
Although our directory conventions mean it would be possible to detect
schemas, it is inefficient to run discovery code on every HTTP request.
Manually registering schemas makes your API more efficient.
:::

Once your schema class is registered, your server is able to auto-discover
any additional classes for the resource - for example, `Request` or
`Resource` classes.

## Resource Type

By default, the JSON:API resource type is the plural and dasherized version
of the class name that appears before `Schema`.

For example, the resource type for `PostSchema` will be `posts`. For
`BlogPostSchema` it will be `blog-posts`.

You can easily override this default behaviour if needed. For example,
if we wanted the resource type for our `PostSchema` to be `blog_posts`,
we would implement the static `type()` method on our schema:

```php
class PostSchema extends Schema
{

    /**
     * Get the JSON:API resource type.
     *
     * @return string
     */
    public static function type(): string
    {
        return 'blog_posts';
    }
}
```

### URI Type

When the resource type appears in resource URIs, we use the dash-case form
of the resource type. Therefore `blogPosts` or `blog_posts` will be
`/blog-posts`. This follows our default convention of dash-casing URLs.

This can be customised by setting the `$uriType` property on your
schema. For example, if we wanted to underscore the type in the URI:

```php
class BlogPostSchema extends Schema
{
   /**
    * The resource type as it appears in URIs.
    *
    * @var string|null
    */
    protected ?string $uriType = 'blog_posts';
}
```

If you need to programmatically work out the URI type, then overload
the `uriType()` method. If you're doing this, we recommend caching
the value as it is likely to be used a lot of times. For example:

```php
class BlogPostSchema extends Schema
{
   /**
    * The resource type as it appears in URIs.
    *
    * @return string
    */
    public function uriType(): string
    {
        if ($this->uriType) {
            return $this->uriType;
        }

        return $this->uriType = '...calculated value';
    }
}
```

### Disabling the `Self` Link

When models are serialized to JSON:API resources, a `self` link for the resource
is included in the JSON representation by default.

According the the JSON:API specification, if a resource has a `self` link, a
`GET` request to the link **MUST** return the resource. If you have a resource
that is not retrievable by its resource identifier, then you must disable the
`self` link. To do this, set the `$selfLink` property on your schema to `false`:

```php
class PostSchema extends Schema
{
    /**
     * Whether resources of this type have a self link.
     *
     * @var bool
     */
    protected bool $selfLink = false;

    // ...
}
```

:::warning
If you disable the `self` link on a schema, the resource's relationships will
no longer have `self` and `related` links in the relationship object. This is
because it does not make sense to have relationship endpoints when the resource
itself is not retrievable via a `self` link.
:::

## Fields

In the JSON:API specification, a resource object's attributes and
relationships are collectively called its **fields**.

Fields share a common namespace with each other and with the resource
object's `type` and `id`. This means a resource cannot have an attribute and
a relationship with the same name, nor can there be an attribute or
relationship named `type` or `id`.

Each schema contains a `fields` method. This method returns an array
of fields, which define the ID, attributes and relationships of the
resource that the schema describes. To add a field to a schema, we simply
add it to the schema's `fields` method. Typically fields may be created
using their static `make` method.

Fields are described in more detail in subsequent chapters, but here
is an example for a `posts` resource:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Eloquent\Fields\DateTime;
use LaravelJsonApi\Eloquent\Fields\ID;
use LaravelJsonApi\Eloquent\Fields\Relations\BelongsTo;
use LaravelJsonApi\Eloquent\Fields\Relations\BelongsToMany;
use LaravelJsonApi\Eloquent\Fields\Relations\HasMany;
use LaravelJsonApi\Eloquent\Fields\Str;
use LaravelJsonApi\Eloquent\Schema;

class PostSchema extends Schema
{

    // ...

    /**
     * @inheritDoc
     */
    public function fields(): array
    {
        return [
            ID::make(),
            BelongsTo::make('author')->type('users')->readOnly(),
            HasMany::make('comments')->readOnly(),
            Str::make('content'),
            DateTime::make('createdAt')->sortable()->readOnly(),
            Str::make('slug'),
            Str::make('synopsis'),
            BelongsToMany::make('tags'),
            Str::make('title')->sortable(),
            DateTime::make('updatedAt')->sortable()->readOnly(),
        ];
    }

}
```

## Multi-Resource Models

Typically each model class is represented in your API as a single resource type.
E.g. our `Post` model is represented as a `posts` resource.

There may however be occasions where you need to represent an Eloquent model as
multiple resource types in your API. To do this, follow the instructions in
the [Multi-Resource Models chapter.](../digging-deeper/proxies.md)
