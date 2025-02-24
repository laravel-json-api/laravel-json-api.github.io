# Meta

## Introduction

A resource object may have a [meta object](https://jsonapi.org/format/#document-meta)
containing non-standard meta-information about a resource that cannot be
represented as an attribute or relationship.

## Resource Meta

To define a resource object's meta, use the `meta` method, and return
an array of meta information.

In the following example, we will serialize the model's `created_at` and
`updated_at` values as meta, rather than as attributes:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Core\Resources\JsonApiResource;

class PostResource extends JsonApiResource
{

    /**
     * Get the resource's attributes.
     *
     * @param \Illuminate\Http\Request|null $request
     * @return iterable
     */
    public function attributes($request): iterable
    {
        return [
            'content' => $this->content,
            'slug' => $this->slug,
            'synopsis' => $this->synopsis,
            'title' => $this->title,
        ];
    }

    /**
     * Get the resource's meta.
     *
     * @param \Illuminate\Http\Request|null $request
     * @return iterable
     */
    public function meta($request): iterable
    {
        return [
            'createdAt' => $this->created_at,
            'updatedAt' => $this->updated_at,
        ];
    }

}
```

This would result in the following resource object:

```json
{
  "type": "posts",
  "id": "123",
  "attributes": {
    "content": "...",
    "slug": "hello-world",
    "synopsis": "My first article.",
    "title": "Hello World!"
  },
  "meta": {
    "createdAt": "2020-07-10T12:42:17.000000Z",
    "updatedAt": "2020-07-10T13:53:01.000000Z"
  }
}
```

### Conditional Meta

Sometimes you may wish to only include certain meta in a resource response
if a given condition is met. For example, you may wish to only include
a value if the current user is an "administrator". The meta method therefore
supports using the `when()` and `mergeWhen()` methods to add conditional
meta - in exactly the same way as
[conditional attributes.](attributes.md#conditional-attributes)

For example:

```php
public function meta($request): iterable
{
    return [
        'secret' => $this->when($request->user()->isAdmin(), 'secret-value'),
    ];
}
```

## Identifier Meta

In addition to resource `meta`, a resource identifier may have a `meta`
member. A resource identifier is used when a resource appears in a relationship.

If you would like a resource to have `meta` when it is serialized as a
resource identifier, implement the `identifierMeta` method on your
resource class:

```php
/**
 * Get meta for the resource's identifier.
 *
 * @return array
 */
protected function identifierMeta(): array
{
    return ['foo' => 'bar'];
}
```

If the resource then appeared in a *to-one* relation, the relationship
`data` would serialize as follows:

```json
{
  "data": {
    "type": "posts",
    "id": "123",
    "meta": {
      "foo": "bar"
    }
  }
}
```

And if it appeared in a *to-many* relation:

```json
{
  "data": [
    {
      "type": "posts",
      "id": "123",
      "meta": {
        "foo": "bar"
      }
    }
  ]
}
```
