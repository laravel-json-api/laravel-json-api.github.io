# Pagination

## Introduction

Laravel JSON:API paginators allow you to return a subset ("page") of results
using the [JSON:API `page` query parameter.](https://jsonapi.org/format/#fetching-pagination)

This package supports two approaches to pagination:

- **Page-based**: Laravel's `paginate()` and `simplePaginate()` pagination
implementations, that use a page number and size query parameters.
- **Cursor-based**: cursor pagination inspired by Stripe's implementation.
This implementation pre-dates Laravel's `cursorPaginate()` feature, and
requires the installation of the `laravel-json-api/cursor-pagination` package.

You can choose which approach to use for each resource type, so your API
can use different approaches for different resource types if needed. If you
want to allow clients to use either of the two approaches, you can use our
[multi-paginator implementation](#multi-pagination) that is described later
in this chapter.

## Page-Based Pagination

The page-based approach provided by this package matches Laravel's standard
paging implementation.

Our implementation uses the `number` and `size` page parameters:

| Parameter | Description |
| :--- | :--- |
| `number` | The page number that the client is requesting. |
| `size` | The number of resources to return per-page. |

To use page-based pagination, return our `PagePagination` class from your
schema's `pagination` method. For example:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Eloquent\Pagination\PagePagination;
use LaravelJsonApi\Eloquent\Schema;

class PostSchema extends Schema
{
    // ...

    /**
     * Get the resource paginator.
     *
     * @return PagePagination
     */
    public function pagination(): PagePagination
    {
        return PagePagination::make();
    }
}
```

This means the following request:

```http
GET /api/v1/posts?page[number]=2&page[size]=15 HTTP/1.1
Accept: application/vnd.api+json
```

Will receive a paged response:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "meta": {
    "page": {
      "currentPage": 2,
      "from": 16,
      "lastPage": 4,
      "perPage": 15,
      "to": 30,
      "total": 50
    }
  },
  "links": {
    "first": "http://localhost/api/v1/posts?page[number]=1&page[size]=15",
    "last": "http://localhost/api/v1/posts?page[number]=4&page[size]=15",
    "next": "http://localhost/api/v1/posts?page[number]=3&page[size]=15",
    "prev": "http://localhost/api/v1/posts?page[number]=1&page[size]=15"
  },
  "data": [...]
}
```

:::tip
The query parameters in the above examples would be URL encoded, but are shown
without encoding for readability.
:::

### Customising the Page Parameters

To change the default page parameters of `"number"` and `"size"`, use the
`withPageKey` and `withPerPageKey` methods.

For example, to change them to `"page"` and `"limit"`:

```php
public function pagination(): PagePagination
{
    return PagePagination::make()
        ->withPageKey('page')
        ->withPerPageKey('limit');
}
```

With this change, the client would need to send the following request to
page the `posts` resource:

```http
GET /api/v1/posts?page[page]=2&page[limit]=15 HTTP/1.1
Accept: application/vnd.api+json
```

### Simple Pagination

By default the page-based approach uses Laravel's length-aware pagination.
To use simple pagination instead, call the `withSimplePagination` method:

```php
public function pagination(): PagePagination
{
    return PagePagination::make()->withSimplePagination();
}
```

:::warning
Using simple pagination means the HTTP response content will not contain
details of the last page and total resources available.
:::

## Cursor-Based Pagination

The cursor-based pagination provided by this package is inspired by
[Stripe's pagination implementation](https://stripe.com/docs/api#pagination).
Install via Composer:

```bash
composer require laravel-json-api/cursor-pagination
```

Cursor-based pagination is based on the paginator being given a context as to
what results to return next. So rather than an API client saying it wants
page number 2, it instead says it wants the items in the list after the
last item it received. This is ideal for infinite scroll implementations, or
for resources where rows are regularly inserted (which would affect page
numbers if you used paged-based pagination).

Cursor-based pagination works by keeping the list in a fixed order. This means
that if you use cursor-based pagination for a resource type, you should not
support sort parameters as this can have adverse effects on the cursor
pagination.

Our implementation utilizes cursor-based pagination via the `"after"` and
`"before"` page parameters. Both parameters take an existing resource ID
value (see below) and return resources in a fixed order. By default this
fixed order is reverse chronological order (i.e. most recent first,
oldest last). The `"before"` parameter returns resources listed before the
named resource. The `"after"` parameter returns resources listed after the
named resource. If both parameters are provided, only `"before"`is used.
If neither parameter is provided, the first page of results will be returned.

| Parameter | Description |
| :--- | :--- |
| `after` | A cursor for use in pagination. `after` is a resource ID that defines your place in the list. For instance, if you make a paged request and receive 100 resources, ending with resource with id `foo`, your subsequent call can include `page[after]=foo` in order to fetch the next page of the list. |
| `before` | A cursor for use in pagination. `before` is a resource ID that defines your place in the list. For instance, if you make a paged request and receive 100 resources, starting with resource with id `bar` your subsequent call can include `page[before]=bar` in order to fetch the previous page of the list. |
| `limit` | A limit on the number of resources to be returned, i.e. the per-page amount. |

To use cursor-based pagination, return our `CursorPagination` class from your
schema's `pagination` method. For example:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\CursorPagination\CursorPagination;
use LaravelJsonApi\Eloquent\Schema;

class PostSchema extends Schema
{
    // ...

    /**
     * Get the resource paginator.
     *
     * @return CursorPagination
     */
    public function pagination(): CursorPagination
    {
        return CursorPagination::make();
    }
}
```

This means the following request:

```http
GET /api/v1/posts?page[limit]=10&page[after]=03ea3065-fe1f-476a-ade1-f16b40c19140 HTTP/1.1
Accept: application/vnd.api+json
```

Will receive a paged response:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "meta": {
    "page": {
      "from": "bfdaa836-68a3-4427-8ea3-2108dd48d4d3",
      "hasMore": true,
      "perPage": 10,
      "to": "df093f2d-f042-49b0-af77-195625119773"
    }
  },
  "links": {
    "first": "http://localhost/api/v1/posts?page[limit]=10",
    "prev": "http://localhost/api/v1/posts?page[limit]=10&page[before]=bfdaa836-68a3-4427-8ea3-2108dd48d4d3",
    "next": "http://localhost/api/v1/posts?page[limit]=10&page[after]=df093f2d-f042-49b0-af77-195625119773"
  },
  "data": [...]
}
```

:::tip
The query parameters in the above examples would be URL encoded, but are shown
without encoding for readability.
:::

### Customising the Cursor Parameters

To change the default parameters of `"limit"`, `"after"` and `"before"`, use
the `withLimitKey`, `withAfterKey` and `withBeforeKey` methods as needed.

For example:

```php
public function pagination(): CursorPagination
{
    return CursorPagination::make()
        ->withLimitKey('size')
        ->withAfterKey('starting-after')
        ->withBeforeKey('ending-before');
}
```

The client would need to send the following request:

```http
GET /api/v1/posts?page[size]=25&page[starting-after]=df093f2d-f042-49b0-af77-195625119773 HTTP/1.1
Accept: application/vnd.api+json
```

### Customising the Cursor Column

By default the cursor-based approach uses a model's created at column in
descending order for the list order. This means the most recently created
model is the first in the list, and the oldest is last. As the created at
column is not unique (there could be multiple rows created at the same time),
it uses the resource's route key column as a secondary sort order, as this
column must always be unique.

To change the column that is used for the list order use the `withCursorColumn`
method. If you prefer your list to be in ascending order, use the
`withAscending` method. For example:

```php
public function pagination(): CursorPagination
{
    return CursorPagination::make()
        ->withCursorColumn('published_at')
        ->withAscending();
}
```

### Validating Cursor Parameters

You should always validate page parameters that sent by an API client.
This is described in the [query parameters chapter.](../requests/query-parameters.md)

For the cursor-based approach, you **must** validate that the identifier
provided by the client for the `"after"` and `"before"` parameters are valid
identifiers, because invalid identifiers cause an error in the cursor.
It is also recommended that you validate the `limit` so that it is within an
acceptable range.

As the cursor relies on the list being in a fixed order (that it controls),
you **must** also disable sort parameters.

For example:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Validation\Rule as JsonApiRule;
use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;

class PostCollectionQuery extends ResourceQuery
{

    public function rules(): array
    {
        return [
            // ...other rules

            'sort' => JsonApiRule::notSupported(),

            'page' => [
              'nullable',
              'array',
              JsonApiRule::page(),
            ],

            'page.limit' => ['filled', 'numeric', 'between:1,100'],

            'page.after' => ['filled', 'string', 'exists:posts,id'],

            'page.before' => ['filled', 'string', 'exists:posts,id'],
        ];
    }
}
```

## Page Size

Both the page-based and cursor-based pagination approaches have a page
size, i.e. the maximum number of resources that can appear on each page.
For the page-based approach, this is controlled via the `size` parameter;
for the cursor-based approach the `limit` parameter is used.

In both implementations it is possible for a client to send page parameters,
but omit the page size. For example:

```http
GET /api/v1/posts?page[number]=1 HTTP/1.1
Accept: application/vnd.api+json
```

In this scenario the client will receive a paged response, with the size
defaulting to the per-page value specified on the Eloquent model. This is set
on the `Model::$perPage` property, and returned from the `Model::getPerPage()`
method.

**By default, Laravel sets this value to 15.**

If you want your JSON:API resource to have a different default page size, use
the `withDefaultPerPage()` method. This works on both the page-based and
cursor-based paginators. For example, to change the default to 25
per-page:

```php
public function pagination(): PagePagination
{
    return PagePagination::make()->withDefaultPerPage(25);
}
```

:::tip
Generally you will want to limit the maximum number of resources a client
can request per-page, so that they do not request too many resources in one
request. Use the `between` validation rule when validating the `page.size`
or `page.limit` query parameters. For example, `between:1,100`.
:::


## Page Meta

Both the page-based and cursor-based pagination approaches add information
about the page to the response document's top-level `meta` member. This
is useful for API clients to understand the properties of the page.

### Key Case

As shown in the response examples in this chapter, by default the meta
information about the page uses camel-case keys.

If you want to snake-case the meta keys (e.g. `current_page`), use the
`withSnakeCaseMeta` method:

```php
public function pagination(): PagePagination
{
    return PagePagination::make()->withSnakeCaseMeta();
}
```

If you need to dash-case the meta keys (e.g. `current-page`), use the
`withDashCaseMeta` method:

```php
public function pagination(): PagePagination
{
    return PagePagination::make()->withDashCaseMeta();
}
```

### Nesting

As shown in the response examples in this chapter, by default the page meta is
nested under a `"page"` key. This is to prevent any collisions with other
meta you may add either now or in the future.

If you want to use a different key for the nested page meta, then use the
`withMetaKey` method:

```php
public function pagination(): PagePagination
{
    return PagePagination::make()->withMetaKey('paginator');
}
```

This would result in the following meta in your HTTP response
(using the page-based approach as an example):

```json
{
    "meta": {
        "paginator": {
              "currentPage": 2,
              "from": 16,
              "lastPage": 4,
              "perPage": 15,
              "to": 30,
              "total": 50
        }
    },
    "data": [...]
}
```
If you want to disable nesting of the page details in the top-level
`meta`, you can use the `withoutNestedMeta` method:

```php
public function pagination(): PagePagination
{
    return PagePagination::make()->withoutNestedMeta();
}
```

This will result in the following:

```json
{
    "meta": {
        "currentPage": 2,
        "from": 16,
        "lastPage": 4,
        "perPage": 15,
        "to": 30,
        "total": 50
    },
    "data": [...]
}
```

### Removing Meta

If you do not want page meta added to your response document, use the
`withoutMeta` method:

```php
public function pagination(): PagePagination
{
    return PagePagination::make()->withoutMeta();
}
```

## Default Customisation

If you want to override the defaults for many resource types, then you can
extend either the page-based or cursor-based approaches. For example:

```php
namespace App\JsonApi\V1;

use LaravelJsonApi\Eloquent\Pagination\PagePagination as BasePagination;

class PagePagination extends BasePagination
{

    public function __construct()
    {
        parent::__construct();
        $this->withPageKey('page')
          ->withPerPageKey('limit')
          ->withoutNestedMeta();
    }
}
```

Then in your schema:

```php
use App\JsonApi\V1\PagePagination;

public function pagination(): ?Paginator
{
    return PagePagination::make();
}
```

## Forcing Pagination

There are some resources that you will always want to be paginated - because
without pagination, your API would return too many resources in one request.

For example, if the client sends this request:

```http
GET /api/v1/posts HTTP/1.1
Accept: application/vnd.api+json
```

This would return all `posts` resources. In a large blog, that would potentially
result in a response with hundreds or thousands of `posts` resources. In this
scenario, we would want to *always* return a paginated response.

We can use one of two approaches to achieve this:

- Specify default pagination parameters that the server uses when **none** are
  provided by the client; or
- Force the client to provide page parameters by making them **required** in our
  validation rules.

### Default Pagination

Default pagination parameters allow the client to send a request *without* page
parameters, but ensure the server *always* returns a paged response.

To do this we set the page parameters that the server should use when none are
provided by the client, using the `$defaultPagination` property on the
schema. For example, if our `posts` resource used page-based pagination:

```php
class PostSchema extends Schema
{

    protected ?array $defaultPagination = ['number' => 1];

    // ...

}
```

Or if it used the cursor-based approach:

```php
class PostSchema extends Schema
{

    protected ?array $defaultPagination = ['limit' => 15];

    // ...

}
```

If you need to programmatically work out the default paging parameters,
overload the `defaultPagination()` method. For example, if you had written a
custom date-based pagination approach:

```php
class PostSchema extends Schema
{

    // ...

    protected function defaultPagination(): ?array
    {
        return [
            'start' => now()->subMonth(),
            'end' => now(),
        ];
    }

}
```

#### Default Pagination for To-Many Relationships

When you set default pagination on a schema, the default values will also
be used when querying the resource in a *to-many* relationship.

There may be times when you do not want the default pagination to be used
on a specific relationship. For example, imagine you have a `comments`
resource. When querying all the `comments` resource, you may want to force
pagination as your API could contain hundreds of comments. However, when
retrieving a `posts` resource's `comments` relationship, you may not
want the `comments` resource to be paginated, as a single `post` may not
be expected to have a lot of related `comments`.

In this scenario, you can remove default pagination from the relationship
by calling the relationship's `withoutDefaultPagination` method.
We would configure this scenario with the following on our `posts` schema:

```php
class PostSchema extends Schema
{

    protected array $defaultPagination = ['number' => 1];

    public function fields(): iterable
    {
        return [
            // ...other fields

            HasMany::make('comments')->withoutDefaultPagination(),
        ];
    }

    public function pagination(): PagePagination
    {
        return PagePagination::make();
    }

}
```

### Requiring Page Parameters

The alternative to using default pagination parameters is to force the client
to *always* provide page parameters. We do this via our validation
rules on the [collection query class](../requests/query-parameters.md),
for example our `PostCollectionQuery`.

For the page-based approach:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Validation\Rule as JsonApiRule;
use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;

class PostCollectionQuery extends ResourceQuery
{

    public function rules(): array
    {
        return [
            // ...other rules

            'page.number' => ['required', 'integer', 'min:1'],
            'page.size' => ['integer', 'between:1,200'],
        ];
    }
}
```

Or for the cursor-based approach:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Validation\Rule as JsonApiRule;
use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;

class PostCollectionQuery extends ResourceQuery
{

    public function rules(): array
    {
        return [
            // ...other rules

            'page.limit' => ['required', 'integer', 'between:1,200'],
        ];
    }
}
```

#### Required Page Parameters for To-Many Relationships

When requiring page parameters in your validation, this will also apply when
querying the resource in a *to-many* relationship.

Imagine our `users` resource has a `posts` relationship. The validation rules
shown in the above examples would apply when the client makes this request,
which would fail the validation:

```http
GET /api/v1/users/123/posts HTTP/1.1
Accept: application/vnd.api+json
```

If we wanted to allow the client to omit page parameters when retrieving
`posts` resources via a relationship, we would need to conditionally add the
`required` rule:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Validation\Rule as JsonApiRule;
use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;

class PostCollectionQuery extends ResourceQuery
{

    public function rules(): array
    {
        return [
            // ...other rules

            'page.limit' => array_filter([
                $this->isNotRelationship() ? 'required' : null,
                'integer',
                'between:1,200'
            ]),
        ];
    }
}
```

## Disallowing Pagination

If your resource does not support pagination, you should reject any request
that contains the `page` parameter. This can easily be done by using our
not supported rule in your
[query parameters validation.](../requests/query-parameters.md)

For example, if we wanted to prevent pagination on our `posts` resource:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Validation\Rule as JsonApiRule;
use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;

class PostCollectionQuery extends ResourceQuery
{

    public function rules(): array
    {
        return [
            // ...other rules

            'page' => JsonApiRule::notSupported(),
        ];
    }
}
```

On your schema, you can then return `null` from the `pagination` method:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Contracts\Pagination\Paginator;
use LaravelJsonApi\Eloquent\Schema;

class PostSchema extends Schema
{
    // ...

    /**
     * Get the resource paginator.
     *
     * @return Paginator|null
     */
    public function pagination(): ?Paginator
    {
        return null;
    }
}
```

## Multi-Pagination

If you would like clients to have the option of using either
page-based or cursor-based pagination, you can use our
`MultiPagination` class. For example:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\CursorPagination\CursorPagination;
use LaravelJsonApi\Eloquent\Pagination\MultiPagination;
use LaravelJsonApi\Eloquent\Pagination\PagePagination;
use LaravelJsonApi\Eloquent\Schema;

class PostSchema extends Schema
{
    // ...

    /**
     * Get the resource paginator.
     *
     * @return MultiPagination
     */
    public function pagination(): MultiPagination
    {
        return new MultiPagination(
            PagePagination::make(),
            CursorPagination::make(),
        );
    }
}
```

:::tip
If you need to customise either the page pagination or the
cursor pagination (as described in this chapter), then just
call methods on the page- or cursor-paginator when passing
them into the `MultiPagination` constructor.
:::

The multi-pagination will use the page parameters supplied
by the client to decide which paginator to use for the
request. This means you must have at least one unique page
parameter per paginator you provide to the `MultiPagination`
class.
