# Soft Deleting

## Introduction

Eloquent provides the ability to *soft delete* models. When models are soft
deleted, they are not actually removed from the database. Instead a `deleted_at`
attribute is set on the model indicating the date and time it was soft deleted.
[You can read about this Eloquent feature here.](https://laravel.com/docs/eloquent#soft-deleting)

If a model is soft deletable, you can choose whether or not the soft delete
capability is exposed to the JSON:API client. If you choose not to, then when
a client sends a `DELETE` request to remove a resource, the model will be
soft-deleted and it will no longer appear in the API. Requests to retrieve a
soft-deleted model will result in a `404 Not Found` response.

Alternatively, you can expose the soft delete capability to the client, by
implementing the features described in this chapter. They will mean that a
client can soft-delete and restore resources via `PATCH` requests, and force
delete a resource using a `DELETE` request.

## Implementing Soft-Deleting

To expose soft-deleting capabilities to a client, you need to add two things
to your resource's schema. Firstly, you need to add the
`LaravelJsonApi\Eloquent\SoftDeletes` trait. And secondly, you need to add
a `LaravelJsonApi\Eloquent\Fields\SoftDelete` field to your fields list. Both
are shown in the following example:

```php
use LaravelJsonApi\Eloquent\Fields\SoftDelete;
use LaravelJsonApi\Eloquent\Schema;
use LaravelJsonApi\Eloquent\SoftDeletes;

class PostSchema extends Schema
{

    use SoftDeletes;

    // ...

    public function fields(): array
    {
        return [
            ID::make(),
            SoftDelete::make('deletedAt'),
            // ... other fields
        ];
    }
}
```

When adding the `SoftDelete` field, the field expects the column for the soft
delete value to be the underscored (snake-case) version of the field name. In
the above example, the JSON:API field name is `deletedAt`, and the column name
is expected to be `deleted_at`. If this is not the case, provide the column
name as the second argument to the `SoftDelete::make` method:

```php
SoftDelete::make('deletedAt', 'deleted_date')
```

:::tip
You do not need to call the `unguarded` method on the `SoftDelete` field, as
we assume that the field needs to be unguarded to work correctly.
:::

### Validation

Because we only use validated values when filling models, you will also need
to add a validation rule to your
[resource request class.](../requests/resources.md)

For example, on our `PostRequest` class we would add:

```php
use LaravelJsonApi\Laravel\Http\Requests\ResourceRequest;
use LaravelJsonApi\Validation\Rule as JsonApiRule;

class PostRequest extends ResourceRequest
{

    /**
     * @return array
     */
    public function rules(): array
    {
        return [
            // ...other rules
            'deletedAt' => ['nullable', JsonApiRule::dateTime()],
        ];
    }
}
```

## HTTP Requests

Once you've configured your schema as described above, the client can now send
soft-delete and restore requests by `PATCH`ing the resource, while using a
`DELETE` request to force-delete the resource. In addition, a request to `GET`
a soft-deleted resource will result in that resource being returned to the
client, instead of it receiving a `404 Not Found` response.

### Soft-Deleting a Resource

Using our `posts` resource as an example, a client can soft-delete a `posts`
resource using the following HTTP request:

```http
PATCH /api/v1/posts/1 HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "deletedAt": "2021-03-02T12:00:00Z"
    }
  }
}
```

This will result in the model being soft-deleted in your database. The Eloquent
`deleting` and `deleted` events will fire, as is normal for when an Eloquent
model is soft-deleted.

:::tip
As per any `PATCH` request, the client can provided other attributes and
relationships to modify at the same time as soft-deleting the resource.
:::

### Restoring a Resource

To restore a `posts` resource, the client would use the following request:

```http
PATCH /api/v1/posts/1 HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "deletedAt": null
    }
  }
}
```

This will result in the model being restored in your database. The Eloquent
`restoring` and `restored` events will fire, as is normal for when an Eloquent
model is restored.

:::tip
As per any `PATCH` request, the client can provided other attributes and
relationships to modify at the same time as restoring the resource.
:::

### Force-Deleting a Resource

The client can force delete a resource using the `DELETE` request. For example,
to force-delete a `posts` resource:

```http
DELETE /api/v1/posts/1 HTTP/1.1
Accept: application/vnd.api+json
```

This will result in the model being removed from the database. The Eloquent
`forceDeleted` event will fire, as is normal for when force-deleting an
Eloquent model.

## Using Booleans Instead of Dates

The Eloquent soft delete implementation works using a date time to indicate
whether or not a model is soft-deleted. In your API you may prefer to use a
boolean to indicate whether or not a resource is soft-deleted.

Take for example our `posts` resource. Instead of exposing a `deletedAt` field
in our resource, we might want to use an `archived` attribute that is `true`
for resources that are soft-deleted, and `false` for those that are not.

We can enable this behaviour using the `asBoolean` method on the `SoftDelete`
field:

```php
SoftDelete::make('archived', 'deleted_at')->asBoolean()
```

:::tip
It is important to note that while this changes the value in the JSON from a
date to a boolean, the underlying storage of the value in the database remains
a date. If you'd prefer to store a boolean to indicate if a model is soft-deleted,
see the [Boolean Soft-Deletes section below.](#boolean-soft-deletes)
:::

The client can now send the following request to soft-delete a resource:

```http
PATCH /api/v1/posts/1 HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "archived": true
    }
  }
}
```

And this request will restore a soft-deleted resource:

```http
PATCH /api/v1/posts/1 HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "archived": false
    }
  }
}
```

## Relationships

Once thing to consider when using soft-deletable models is that by default,
Eloquent does not return soft-deleted models from relationships. This can result
in unexpected *empty* relationships.

To illustrate this, imagine we have a `comments` resource with a `post`
relationship - which provides the post resource that the comment belongs to.
Typically our `Comment` model will look like this:

```php
use Illuminate\Database\Eloquent\Model;

class Comment extends Model
{

    public function post()
    {
        return $this->belongsTo(Post::class);
    }
}
```

If our `Post` model used soft-deleting, then given the above example the
comment model would return `null` for its related post, if the post was
soft-deleted. That's because the `belongsTo` relationship will exclude (by
default) models that are soft-deleted when querying the database.

However, an API client might find it strange to receive a `comments` resource
that had no related `post`, if the post was soft-deleted. Typically you would
want the `comments` resource to always belong to a `posts` resource, even
if that `posts` resource was soft-deleted.

To do that, we need to update the `post` relationship on the `Comment` model:

```php
class Comment extends Model
{

    public function post()
    {
        return $this->belongsTo(Post::class)->withTrashed();
    }
}
```

Now the client will always receive the related post, even if that post is
soft-deleted. That applies to both when the client is including the related
post via an `include` query parameter, or when accessing the relationship via
a relationship URL.

## Filters

By default when querying resources that allow soft-deleting, the query results
will **not** contain any soft-deleted resources. This matches the Eloquent
behaviour of excluding soft-deleted models from database queries by default.

To allow the client to filter resources by their soft-deleted status, we provide
two filters that you can add to your schema. These are:

- [WithTrashed](#withtrashed)
- [OnlyTrashed](#onlytrashed)

:::tip
Both filters expect the client to provide a boolean value. The values
accepted are the same as described in the
[boolean values section of the Filters chapter.](filters.md#boolean-values)
:::

### WithTrashed

The `WithTrashed` filter matches the Eloquent `withTrashed()` scope that is
added to the query builder for models that implement soft deleting. Add the
filter to your schema as follows, providing the JSON:API filter key name:

```php
use LaravelJsonApi\Eloquent\Filters\WithTrashed;

WithTrashed::make('with-trashed')
```

Once this is added, the client can provide a boolean value for the filter.
If `true`, the client will receive *all* models, regardless of whether they are
soft-deleted or not. If `false`, then soft-deleted models are excluded.

### OnlyTrashed

The `OnlyTrashed` filter matches the Eloquent `onlyTrashed()` scope that is
added to the query builder for models that implement soft deleting. Add the
filter to your schema as follows, providing the JSON:API filter key name:

```php
use LaravelJsonApi\Eloquent\Filters\OnlyTrashed;

OnlyTrashed::make('trashed')
```

Once this is added, the client can provide a `true` value to receive only
models that are soft-deleted. Providing `false` means only models that are
not soft-deleted will be returned.

## Boolean Soft-Deletes

TenantCloud provide an alternative soft-deletes package called
[tenantcloud/laravel-boolean-softdeletes](https://github.com/tenantcloud/laravel-boolean-softdeletes).
This uses a boolean database value to indicate a model is soft-deleted. When
combined with a database index, this provides a more performant soft-deleting
implementation for high-load applications.

Use of this alternative soft-deleting approach is supported via our
[laravel-json-api/boolean-softdeletes](https://github.com/laravel-json-api/boolean-softdeletes)
package.

Install our package via Composer, which will also install the TenantCloud package:

```bash
composer require laravel-json-api/boolean-softdeletes
```

### Implementing Boolean Soft-Deletes

Support boolean soft-deleting for a resource in two simple steps:

1. Add the `LaravelJsonApi\BooleanSoftDeletes\SoftDeletesBoolean` trait to your schema.
2. Use an **unguarded** `Boolean` field as the attribute on your resource.

For example, our `PostSchema` would look like this:

```php
use LaravelJsonApi\BooleanSoftDeletes\SoftDeletesBoolean;
use LaravelJsonApi\Eloquent\Fields\Boolean;
use LaravelJsonApi\Eloquent\Filters\OnlyTrashed;
use LaravelJsonApi\Eloquent\Filters\WithTrashed;
use LaravelJsonApi\Eloquent\Schema;

class PostSchema extends Schema
{

    use SoftDeletesBoolean;

    // ...

    public function fields(): array
    {
        return [
            ID::make(),
            Boolean::make('isDeleted')->unguarded(),
            // ... other fields
        ];
    }

    public function filters(): iterable
    {
        return [
            OnlyTrashed::make('trashed'),
            WithTrashed::make('withTrashed'),
            // ...other filters
        ];
    }
}
```

:::tip
As shown in the above example, both the `OnlyTrashed` and `WithTrashed` filters
work with the boolean soft-deletes implementation.
:::

Remember that we only fill validated values - so you will need to add a validation
rule for the `isDeleted` attribute:

```php
use LaravelJsonApi\Laravel\Http\Requests\ResourceRequest;
use LaravelJsonApi\Validation\Rule as JsonApiRule;

class PostRequest extends ResourceRequest
{

    /**
     * @return array
     */
    public function rules(): array
    {
        return [
            // ...other rules
            'isDeleted' => 'boolean',
        ];
    }
}
```

The client can now send the following request to soft-delete a resource:

```http
PATCH /api/v1/posts/1 HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "isDeleted": true
    }
  }
}
```

And this request will restore a soft-deleted resource:

```http
PATCH /api/v1/posts/1 HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "isDeleted": false
    }
  }
}
```
