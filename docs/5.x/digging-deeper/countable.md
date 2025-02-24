# Countable Relationships

## Introduction

:::danger
Although included in the `3.0` release, the countable relationship feature
**is experimental and is not considered ready for production use.** We will be
making changes to this feature that will be breaking from the perspective of an
API client.

If your API is consumed by third-party clients, then
**you must not use this feature in its current state.**

If you develop the clients that connect to your API, then you could use this
feature *at risk*. Which means when we make breaking changes to the feature,
you will need to also update your client-side code.
:::

Sometimes you may want to count the number of related models for a given
relationship without actually loading the models. Eloquent provides this
feature via its `withCount` method on the query builder, and `loadCount`
method on model instances, as
[documented here.](https://laravel.com/docs/8.x/eloquent-relationships#counting-related-models)

Laravel JSON:API exposes this capability via its *Countable Relationships* feature.
This adds a query parameter that allows a client to specify which relationships
on a model it wants a count for - and then this value is added to the `meta`
member of the relationship.

:::tip
The JSON:API specification allows implementation-specific query parameters,
which we have used to add this capability to Laravel JSON:API.
:::

## Countable Fields

This feature is-opt in, i.e. you must mark a relationship field as being
*countable*. Any *to-many* [relationship fields](../schemas/relationships.md)
can be marked as countable by calling the `canCount()` method on the relationship.
For example:

```php
HasMany::make('comments')->canCount();
```

Once enabled, if the client lists a countable field name in the countable query
parameter, the implementation takes care of ensuring the count value is loaded
on the model (or models) and then added to a relationship's `meta` member.

### Aliasing the Attribute

By default Eloquent will place a `{relation}_count` attribute on models for
which the count is loaded. For example, if we are counting the `comments`
relationship on the `posts` model, the attribute will be `comments_count`.

If this count name conflicts with an existing attribute on the model, you will
need to provide an alias for the attribute. You can do this on the *to-many*
field in your schema using the `countAs()` method. For example, if our comments
relationship used a `HasMany` field in our `posts` schema, we could alias
the count attribute as follows:

```php
HasMany::make('comments')->canCount()->countAs('total_comments');
```

## Query Parameter

The client can request relationship counts using the `withCount` query
parameter. This is a comma-separated list of the relationships that the client
wants a count for. For example, if the client wanted the `comments` and `tags`
relationships of a `post` resource counted, it would set the `withCount` query
parameter to `comments,tags`.

### Customising the Parameter

The query parameter can be customised if you want to use something different
to `withCount`. This can be set in the `boot` method of your
`AppServiceProvider`, for example:

```php
use LaravelJsonApi\Laravel\LaravelJsonApi;

public function boot()
{
    LaravelJsonApi::withCountQueryParameter('with-count');
}
```

If you have multiple APIs that need to use different names for the query
parameter, call the `LaravelJsonApi::withCountQueryParameter` method within
your server's `serving()` hook.

:::warning
The JSON:API specification states that custom query parameters MUST be a legal
member name and contain at least one non a-z character. It is recommended that
a capital letter (i.e. camel-casing) is used, which is why our default is
`withCount`.

When changing the parameter name, you should ensure you comply with the
specification and use a camel-case, snake-case or dash-case parameter name.
:::

### Validation

Our implementation only uses query parameters that are validated. This means
if you have a [query or collection query class](../requests/query-parameters.md)
for a resource type, you must ensure that a rule is added for the
`withCount` query parameter. For example, if we had a `PostQuery` or
`PostCollectionQuery` class, we would add it as follows:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Validation\Rule as JsonApiRule;
use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;

class PostQuery extends ResourceQuery
{

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules(): array
    {
        return [
            // ... other rules
            'withCount' => [
              'nullable',
              'string',
              JsonApiRule::countable(),
            ],
        ];
    }
}
```

If you have a collection query class for a
[polymorphic to-many](polymorphic-to-many.md) relationship, you should use the
`JsonApiRule::countableForPolymorph()` method instead.


## Relationship Meta

The count value will automatically be added to the `meta` member of a
relationship when using a schema to serialize a model to JSON. By default the
value is added as the `count` key, for example:

```json
"relationships": {
  "comments": {
    "links": {
      "self": "http://localhost/api/v1/posts/1/relationships/comments",
      "related": "http://localhost/api/v1/posts/1/comments"
    },
    "meta": {
      "count": 17
    }
  }
}
```

### Customising the Meta Key

You can change the key that is used when serializing the relationship meta
by adding the following to the `boot` method of your `AppServiceProvider`:

```php
use LaravelJsonApi\Laravel\LaravelJsonApi;

public function boot()
{
    LaravelJsonApi::withCountMetaKey('total');
}
```

If you have multiple APIs that need to use different names for the meta
key, call the `LaravelJsonApi::withCountMetaKey()` method within
your server's `serving()` hook.

### Resources Classes

If you have [a resource class](../resources/) then you will need to add the
count value to your relationship. You can do this using the `withMeta()`
method on the resource relationship. For example:

```php
$this->relation('comments')->withMeta(array_filter([
    'count' => $this->comments_count,
], fn($value) => null !== $value));
```

## Requests

### Resource Requests

A client can request that a response includes counts for specified relationships
by adding the `withCount` parameter to the request. For example:

```http
GET /api/v1/posts/1?withCount=comments,tags HTTP/1.1
Accept: application/vnd.api+json
```

Would result in the following response:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "content": "...",
      "title": "Hello World"
    },
    "relationships": {
      "comments": {
        "links": {
          "self": "http://localhost/api/v1/posts/1/relationships/comments",
          "related": "http://localhost/api/v1/posts/1/comments"
        },
        "meta": {
          "count": 17
        }
      },
      "tags": {
        "links": {
          "self": "http://localhost/api/v1/posts/1/relationships/tags",
          "related": "http://localhost/api/v1/posts/1/tags"
        },
        "meta": {
          "count": 4
        }
      }
    },
    "links": {
      "self": "http://localhost/api/v1/posts/1"
    }
  }
}
```

The parameter also works when requesting multiple resources, for example:

```http
GET /api/v1/posts?withCount=comments HTTP/1.1
Accept: application/vnd.api+json
```

### Related Resource Requests

The JSON:API specification allows clients to request the related resources in
a relationship, e.g. `GET /api/v1/posts/1/comments`. The `withCount` parameter
works with these requests and refers to the relationships in the resources
that appear within the response.

So for example, in this request:

```http
GET /api/v1/posts/1/comments?withCount=likes HTTP/1.1
Accept: application/vnd.api+json
```

The `withCount` parameter refers to the `likes` relationship on the `comments`
resources that appear in the response.

However, as the `posts` resource's `comments` relationship is also countable,
we add the number of comments the posts resource has to the top-level `meta`
member of the response document. So for our example request, the response
will be:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "meta": {
    "count": 2
  },
  "data": [
    {
      "type": "comments",
      "id": "123",
      "attributes": {
        "content": "..."
      },
      "relationships": {
        "likes": {
          "links": {
            "self": "http://localhost/api/v1/comments/123/relationships/likes",
            "related": "http://localhost/api/v1/comments/123/likes"
          },
          "meta": {
            "count": 4
          }
        }
      }
    },
    {
      "type": "comments",
      "id": "345",
      "attributes": {
        "content": "..."
      },
      "relationships": {
        "likes": {
          "links": {
            "self": "http://localhost/api/v1/comments/345/relationships/likes",
            "related": "http://localhost/api/v1/comments/345/likes"
          },
          "meta": {
            "count": 0
          }
        }
      }
    }
  ]
}
```

#### Disabling Merging Relationship Meta

If you did not want the `comments` count to appear in the top-level `meta`
member of the related resource response, you can disable this on the `comments`
field in your `posts` schema. Use the `dontCountInRelationship()` method.
For example:

```php
HasMany::make('comments')->canCount()->dontCountInRelationship();
```
