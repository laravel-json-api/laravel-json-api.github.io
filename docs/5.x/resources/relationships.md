# Relationships

## Introduction

The `relationships` member on a resource object is a *relationships*
object, as defined by the JSON:API specification. Members of the
relationships object represent references from the resource object
in which it is defined to other resource objects.

A *relationship object* must contain at least one of the following:

- `links`
- `data`
- `meta`

## Field Names

As noted in the [Attributes chapter](attributes.md#field-names), members on the
relationships object share a common namespace with attribute members,
and the resource object's `type` and `id`. In other words,
a resource cannot have an attribute or relationship with the same name, nor
can it have an attribute or relationship named `type` or `id`.

It is recommended that the field name case of relationships follows the
same convention as a resource's attributes. In other words, if you are using
camel-case for attributes, you should also use camel-case for relationships.

## Defining Relationships

Relationships are defined on resources by creating a relationship object
via the `relation` method. To add relationships to your resource object,
add them to the `relationships` method.

For example, a `posts` resource may have the following relationships:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Core\Resources\JsonApiResource;

class PostResource extends JsonApiResource
{

    /**
     * Get the resource's relationships.
     *
     * @param \Illuminate\Http\Request|null $request
     * @return iterable
     */
    public function relationships($request): iterable
    {
        return [
            $this->relation('author'),
            $this->relation('comments'),
            $this->relation('tags'),
        ];
    }

    // ...

}
```

:::tip
Note that there is no distinction between to-one relationships (`author` in
this example) or to-many relationships (`comments`, `tags`). This is because here
we are defining the JSON:API *relationship object*, and whether it is a *to-one*
or *to-many* relation can be determined by the `data` member.
:::

When calling the `relation` method, we provide the JSON:API field name as
the first argument. The relationship object will assume that the relationship
name on the model is the camel-case form of the field name. For example,
if we were using dash-case for our field names, a field name of `blog-tags`
would assume the model's relationship is called `blogTags`.

If the model relationship name is different from this convention, provide
it as the second argument. For example, if our JSON:API field name was `author`
but the relationship on the model was `user`, we would define our relation
as follows:

```php
$this->relation('author', 'user')
```

### Conditional Relationships

Just as with [conditional attributes](attributes.md#conditional-attributes),
you can also define conditional relationships. To do this, use the `when()`
and `mergeWhen()` methods. For example:

```php
public function relationships($request): iterable
{
    return [
        $this->relation('author'),
        $this->when($request->user()->isAdmin(), $this->relation('publishedBy')),
        $this->mergeWhen($request->user()->isOwner(), [
            $this->relation('foo'),
            $this->relation('bar'),
        ]),
    ];
}
```

## Default Serialization

By default, relationship objects are serialized with the `links` member,
and will include the `self` and `related` links.

Given our `posts` example above, the resultant JSON:API relationships
object will be:

```json
{
  "author": {
    "links": {
      "self": "http://localhost/api/v1/posts/123/relationships/author",
      "related": "http://localhost/api/v1/posts/123/author"
    }
  },
  "comments": {
    "links": {
      "self": "http://localhost/api/v1/posts/123/relationships/comments",
      "related": "http://localhost/api/v1/posts/123/comments"
    }
  },
  "tags": {
    "links": {
      "self": "http://localhost/api/v1/posts/123/relationships/tags",
      "related": "http://localhost/api/v1/posts/123/tags"
    }
  }
}
```

The `data` member of each relationship object will only be included if
the relationship data has been requested by the client using an
[Include Path](https://jsonapi.org/format/#fetching-includes).

For example, if the client requested that the `author` and `tags` relationships
were included, the resultant JSON:API relationships object would be:

```json
{
  "author": {
    "data": {
      "type": "users",
      "id": "456"
    },
    "links": {
      "self": "http://localhost/api/v1/posts/123/relationships/author",
      "related": "http://localhost/api/v1/posts/123/author"
    }
  },
  "comments": {
    "links": {
      "self": "http://localhost/api/v1/posts/123/relationships/comments",
      "related": "http://localhost/api/v1/posts/123/comments"
    }
  },
  "tags": {
    "data": [
      {
        "type": "tags",
        "id": "1"
      },
      {
        "type": "tags",
        "id": "3"
      }
    ],
    "links": {
      "self": "http://localhost/api/v1/posts/123/relationships/tags",
      "related": "http://localhost/api/v1/posts/123/tags"
    }
  }
}
```

The rest of this chapter describes how to customise the relationship
serialization.

## Links

The `self` and `related` links are automatically included in the serialized
relationship object. The URL is calculated by appending the either
`/relationships/{FIELD-NAME}` (for the `self` link) or `/{FIELD-NAME}`
(for the `related` link) to the resource's `self` URL.

:::tip
The resource's `self` URL is calculated on the resource class, i.e.
`PostResource` in our example. See the [Links Chapter](links.md)
if you need to customise the URL.

The relationship's URL field name is obtained from the schema
field. By default, we dash-case the field name when using it in
URLs.
[You can override this on your schema if needed.](../schemas/relationships.md#uri-name)
:::

### Removing Links

If you do not want the relationship object to have a `self` link,
use the `withoutSelfLink` method:

```php
$this->relation('author')->withoutSelfLink()
```

Likewise, if you do not want the relationship object to have a `related`
link, use the `withoutRelatedLink` method:

```php
$this->relation('author')->withoutRelatedLink()
```

If you want to remove both the `self` and `related` links, you can use the
`withoutLinks` method:

```php
$this->relation('author')->withoutLinks()
```

## Data

By default, we only include the `data` member in the relationship object
if the client has requested it via the
[Include Path](https://jsonapi.org/format/#fetching-includes) query parameter.
This is because the `data` member provides resource linkage in a JSON:API
[Compound Document.](https://jsonapi.org/format/#document-compound-documents)
It allows a client to link together all of the included resource objects
within the document. Therefore the `data` member is only required in
a relationship object if the related resource will be in the
top-level `included` member of the *Compound Document*.

If the `data` member is being serialized because of an include path,
our schema classes will already have taken care of eager loading the
related models, so that you do not get "N+1" query problems.

### Specifying Data

By default we return the value of the model relationship to calculate
the `data` member of the relationship. If you need the data to be something
else, use the `withData` method:

```php
$this->relation('author')->withData($this->someOtherValue)
```

Typically you would probably want to defer the calculation of data,
so that it is only calculated if it will be serialized in the relationship.
To do this, provide a `Closure` to the `withData` method:

```php
$this->relation('author')->withData(fn() => $this->someOtherValue)
```

:::tip
Relationship `data` may be omitted if the client has not requested it
via an include path. Additionally, a relationship may not be serialized if
a client requests
[Sparse Fieldsets](https://jsonapi.org/format/#fetching-sparse-fieldsets)
and does not request the named relationship field.
:::

When manually returning data, you need to return a value that our encoder
can convert to a JSON:API resource identifier. For a *to-one* relationship,
this means you need to return either a related model or `null`.
For a *to-many* relation, you need to return an iterable of related models.

### Showing Eager Loaded Data

By default `data` will only be included if it was requested via an include
path query parameter. However, you may want to include the data if the
related model is eager loaded.

For example, on our `posts` resource the related `author` may have already
been loaded during authorization (e.g. to check whether the related author
is the current signed-in user).

In this scenario we can show the eager loaded `data` by using the
`showDataIfLoaded` method:

```php
$this->relation('author')->showDataIfLoaded()
```

Note that this will not include the related resource in the `included`
member of the JSON:API document. The `included` resources are always
determined by the include path query parameter.

### Always Including Data

If you would always like your relationship object to have the `data`
member, use the `alwaysShowData` method:

```php
$this->relation('author')->alwaysShowData()
```

Note that this will not include the related resource in the `included`
member of the JSON:API document. The `included` resources are always
determined by the include path query parameter.

:::warning
If you are using the `alwaysShowData` method, you will need to ensure
that the relation is always eager loaded to avoid "N+1" database query
problems. See the [Eager Loading chapter](../schemas/eager-loading.md)
for details.
:::

## Meta

Relationship objects may also contain a `meta` member. This contains any
non-standard meta-information about the relationship.

To add `meta` to the relationship object, use the `withMeta` method to
provide an array:

```php
$this->relation('author')->withMeta(['foo' => 'bar'])
```

If the meta needs to be calculated, it is best to provide a `Closure` so
that the calculation is only incurred if the relationship is being
serialized:

```php
$this->relation('author')->withMeta(fn() => ['foo' => 'bar'])
```

:::tip
A relationship may not be serialized if a client requests
[Sparse Fieldsets](https://jsonapi.org/format/#fetching-sparse-fieldsets)
and does not request the named relationship field.
:::
