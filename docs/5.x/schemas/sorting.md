# Sorting

## Introduction

The JSON:API specification reserves the `sort` query parameter for
[sorting resources.](https://jsonapi.org/format/#fetching-sorting)
Sorting allows clients to specify the order in which resources are to be
returning in JSON:API responses.

In Laravel JSON:API, you can mark attributes that represent database columns
as sortable. You can also attach additional sort fields, that give you complete
control over how models should be sorted. This chapter explains these
capabilities.

## Example Requests

Sorting is applied when:

- Fetching resources, e.g. `GET /api/posts`
- Fetching related resources in a to-many relationship, e.g.
  `GET /api/v1/users/1/posts`.
- Fetching relationship identifiers in a to-many relationship, e.g
  `GET /api/v1/users/1/relationships/posts`.

As an example, imagine our `posts` resource has `title` and `createdAt` sort
parameters.

This request would return `posts` resources with the most recently created
first (descending order):

```http
GET /api/v1/posts?sort=-createdAt HTTP/1.1
Accept: application/vnd.api+json
```

This request would return `posts` resources that were authored by user `1`,
sorted by `title` ascending, then `createdAt` ascending:

```http
GET /api/v1/users/1/posts?sort=title,createdAt HTTP/1.1
Accept: application/vnd.api+json
```

This request would return the resource identifiers of any post that was authored
by user `1`, sorted by the post's `createdAt` attribute in ascending order:

```http
GET /api/v1/users/1/relationships/posts?sort=createdAt HTTP/1.1
Accept: application/vnd.api+json
```

## Defining Sort Fields

### ID Field

When attaching the `ID` field to a schema, we assume that you want to allow
an API client to sort your resources by the `id`. Therefore resources that
represent Eloquent models are always sortable by using the `id` sort field,
for example:

```http
GET /api/v1/posts?sort=id HTTP/1.1
Accept: application/vnd.api+json
```


If you do not want your resource to be sortable by `id`, use the `notSortable()`
method to remove sorting:

```php
ID::make()->notSortable()
```

### Attributes

When attaching an attribute to a schema, you may use the `sortable` method
to indicate that the resource can be sorted by the given field. For example:

```php
DateTime::make('createdAt')->sortable(),
Str::make('title')->sortable(),
```

This works for attributes that relate to a database column that can be sorted.

### Sortable Fields

Our sort field classes can be used to describe additional sort fields that a
client is allowed to send for a particular resource type. To add a sort field to
a schema, we can simply add it to the shcema's `sortables()` method.

To create a sort field, we use the static `make` method. For example, if we
wanted to add a sort field to our `posts` resource:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Eloquent\Schema;
use LaravelJsonApi\Eloquent\Sorting\SortCountable;

class PostSchema extends Schema
{

    // ...

    public function sortables(): iterable
    {
        return [
            SortCountable::make($this, 'comments'),
        ];
    }

}
```

The available sort field classes are described below, along with how to write
your own sort fields as needed.

## Default Sort Order

If desired, you can set a default sort order for a specific resource via the
`$defaultSort` property on the schema. This sort order will be used as the
sort order when none is specified by the client.

For example, if we wanted our `posts` to be returned in descending created date
by default:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Eloquent\Schema;

class PostSchema extends Schema
{

    protected $defaultSort = '-createdAt';

    // ...

}
```

:::tip
Note that the sort order is the JSON:API sort field, not the Eloquent column
name. We also use a minus prefix (`-`) to denote descending order, as per the
JSON:API specification.
:::

You can also set multiple default sort fields by using an array:

```php
protected $defaultSort = ['-createdAt', 'title'];
```

## Available Sort Fields

Laravel JSON:API ships with the following sort field classes:

- [SortColumn](#sortcolumn)
- [SortCountable](#sortcountable)
- [SortWithCount](#sortwithcount)

:::tip
If you want to add additional sort field classes, submit a Pull Request to the
[`laravel-json-api/eloquent`](https://github.com/laravel-json-api/eloquent)
repository.
:::

### SortColumn

The `SortColumn` class adds a sort field that relates to a database column.
Typically database columns will be exposed as JSON:API resource
attributes, in which case you should use the `sortable()` method on the
attribute field class. The `SortColumn` class is therefore intended for use
when you need to allow a client to sort by a database column that is **not**
exposed as a resource attribute.

Use the static `make()` method to add the field to your `sortables()` method.
For example:

```php
use LaravelJsonApi\Eloquent\Sorting\SortColumn;

SortColumn::make('publishedAt')
```

The first argument provided to the `make()` method is the JSON:API sort field
name. The database column is expected to be the underscored version of the field
name - so `published_at` in our above example. If the column name does not
follow this convention, provide it as the second argument to the `make()` method:

```php
SortColumn::make('publishedAt', 'published')
```

### SortCountable

The `SortCountable` class allows a client to sort resources by a countable
*to-many* relation **that exists on your schema**. Provide the schema
and the relationship name to the static `make()` method. For example:

```php
use LaravelJsonApi\Eloquent\Sorting\SortCountable;

SortCountable::make($this, 'comments')
```

The client can then sort `posts` using the `comments` sort field:

```http
GET /api/v1/posts?sort=-comments HTTP/1.1
Accept: application/vnd.api+json
```

In this example, the `SortCountable` class expects the `comments` relationship
to be defined on the schema, and for the JSON:API sort field to also be called
`comments`. If you want the JSON:API field name to be something different from
the relationship name, use the third argument to specify the JSON:API sort field
name:

```php
SortCountable::make($this, 'comments', 'totalComments')
```

In this example, the schema expects the relationship to be called `comments`,
while the client must use the `totalComments` JSON:API sort field.

### SortWithCount

The `SortWithCount` class allows a client to sort resources by a relationship on
the Eloquent model the resource represents. As the
[`SortCountable`](#sortcountable) class should be used for a relationship that
exists on your schema, the `SortWithCount` class is used for relationships that
exist on the model but **not** on the resource schema.

For example, let's imaging our `Post` model has a `likes` relationship. We can
allow a client to sort `posts` by the number of likes by adding the
`SortWithCount` class:

```php
use LaravelJsonApi\Eloquent\Sorting\SortWithCount;

SortWithCount::make('likes')
```

In this example, the relationship name of the model is expected to be `likes`,
and the JSON:API sort field is also `likes`. The client can then sort
`posts` using the `likes` sort field:

```http
GET /api/v1/posts?sort=-likes HTTP/1.1
Accept: application/vnd.api+json
```

If you want the JSON:API sort field name to be different from the relationship
name, provide it as the second function argument:

```php
SortWithCount::make('likes', 'totalLikes')
```

Laravel allows you to alias the relationship count, which is typically used
when there might be a collision with a column name or you are using multiple
counts for the same relationship. Use the `countAs()` method if you need to
alias the count for the sort:

```php
SortWithCount::make('likes')->countAs('total_likes')
```

Finally, you can also constrain the count by providing a closure to the
`using()` method. This receives the query builder instance that is used for
the count:

```php
SortWithCount::make('likes')
    ->countAs('approved_likes_count')
    ->using(function ($query) {
        $query->where('approved', true);
    });
```

## Writing Sort Fields

As your implementation grows, you will probably find scenarios where you need
to write your own sort fields. Our sort field classes are designed to be easy
to construct.

To generate a sort field, use the `jsonapi:sort-field` Artisan command as
follows:

```bash
php artisan jsonapi:sort-field CustomSort
```

This will generate the `App\JsonApi\Sorting\CustomSort` class:

```php
namespace App\JsonApi\Sorting;

use LaravelJsonApi\Eloquent\Contracts\SortField;

class CustomSort implements SortField
{

    /**
     * @var string
     */
    private string $name;

    /**
     * Create a new sort field.
     *
     * @param string $name
     * @param string|null $column
     * @return CustomSort
     */
    public static function make(string $name): self
    {
        return new static($name);
    }

    /**
     * CustomSort constructor.
     *
     * @param string $name
     */
    public function __construct(string $name)
    {
        $this->name = $name;
    }

    /**
     * Get the name of the sort field.
     *
     * @return string
     */
    public function sortField(): string
    {
        return $this->name;
    }

    /**
     * Apply the sort order to the query.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $direction
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function sort($query, string $direction = 'asc')
    {
        // @TODO
    }

}
```

All you need to do now is update the `make()` method and constructor if there
are any other variables your class needs. Then add your query logic to the
`sort` method. This method receives the query builder instance and the direction
provided by the client. The direction will either be `asc` (ascending) or
`desc` (descending).

Once you have written the sort logic for your sort field, you can then use it
in your schemas:

```php
use App\JsonApi\Sorting\CustomSort;

CustomSort::make('name')
```
