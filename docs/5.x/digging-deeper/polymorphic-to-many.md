# Polymorphic To-Many Relations

## Introduction

Laravel JSON:API contains a `MorphToMany` relationship field, that allows you
to add polymorphic *to-many* relationships to your resource schemas. A
polymorphic relationship is a relationship that can contain multiple different
resource types.

Before adding such a relationship to a schema, you need to consider whether the
relationship is better added as a single polymorphic *to-many* relationship, or
whether you expose each related resource type in a separate relationship. This
chapter describes the pros and cons of each approach, so that you can decide
which approach best matches your use case.

If you decide that a polymorphic *to-many* relationship is your preferred approach,
this chapter describes how to add it to your schema and other implementation
details.

### Scenario

Throughout this chapter we will use the following scenario to demonstrate how
a polymorphic relationship can work. We will use a `Post` model, that has
`audio`, `images` and `videos` relationships. Our model looks like this:

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Post extends Model
{

    /**
     * @return BelongsToMany
     */
    public function audio(): BelongsToMany
    {
        return $this->belongsToMany(Audio::class);
    }

    /**
     * @return BelongsToMany
     */
    public function images(): BelongsToMany
    {
        return $this->belongsToMany(Image::class);
    }

    /**
     * @return BelongsToMany
     */
    public function videos(): BelongsToMany
    {
        return $this->belongsToMany(Video::class);
    }
}
```

## Choosing Polymorphism

For our `posts` resource, we have a choice between two approaches. Either
we could have a single `media` relationship containing the values for all three
Eloquent relationships, or we could have three relationships on the resource
that match the Eloquent relationships.

The following provides an example of each, and the pros and cons of each
approach. There is no *correct* choice - which approach you use should depend
on your use-case.

### Polymorphism

In this approach, we add a `media` relationship that contains the values of each
of the Eloquent relationships - i.e. it could contain `audio`, `images` and
`videos` resources.

An example `posts` resource would look like this:

```json
{
  "type": "posts",
  "id": "1",
  "attributes": {
    "content": "...",
    "title": "Hello World!"
  },
  "relationships": {
    "media": {
      "data": [
        { "type": "audio", "id": "123" },
        { "type": "images", "id": "456" },
        { "type": "images", "id": "567" },
        { "type": "videos", "id": "789" }
      ],
      "links": {
        "self": "http://localhost/api/v1/posts/1/relationships/media",
        "related": "http://localhost/api/v1/posts/1/media"
      }
    }
  },
  "links": {
    "self": "http://localhost/api/v1/posts/1"
  }
}
```

The advantage of this approach is the client receives a single set of media,
and does not have to merge the values of multiple relationships. This is
appropriate if we expect the client to only need *all* media at once, for
example with this request:

```http
GET /api/v1/posts?include=media HTTP/1.1
Accept: application/vnd.api+json
```

The disadvantage is that the client cannot request a single set of media. For
example, if the client only wanted to display `images`, it would still receive
all media and have to filter out the `audio` and `videos`. When the server
processes the request, it would be loading all three relationships even though
the client is only going to use one resource type. This is potentially
inefficient, particularly if the response contained a lot of `posts` resources.

### Separate Relationships

The second approach would be to expose each of the Eloquent relationships as a
separate relationship on the resource. I.e. a `audio`, `images` and `videos`
relationship. For example:

```json
{
  "type": "posts",
  "id": "1",
  "attributes": {
    "content": "...",
    "title": "Hello World!"
  },
  "relationships": {
    "audio": {
      "data": [
        { "type": "audio", "id": "123" }
      ],
      "links": {
        "self": "http://localhost/api/v1/posts/1/relationships/audio",
        "related": "http://localhost/api/v1/posts/1/audio"
      }
    },
    "images": {
      "data": [
        { "type": "images", "id": "456" },
        { "type": "images", "id": "567" }
      ],
      "links": {
        "self": "http://localhost/api/v1/posts/1/relationships/images",
        "related": "http://localhost/api/v1/posts/1/images"
      }
    },
    "videos": {
      "data": [
        { "type": "videos", "id": "789" }
      ],
      "links": {
        "self": "http://localhost/api/v1/posts/1/relationships/videos",
        "related": "http://localhost/api/v1/posts/1/videos"
      }
    }
  },
  "links": {
    "self": "http://localhost/api/v1/posts/1"
  }
}
```

The advantage with this approach is the client can now choose to only include
one type of resource. For example, if it was going to show a list of `posts`
and only use their related `images`, it can use the following request:

```http
GET /api/v1/posts?include=images HTTP/1.1
Accept: application/vnd.api+json
```

The disadvantage is if the client wants to use all three types of media, it has
to merge the relationships on the client-side after receiving the response to
this request:

```http
GET /api/v1/posts?include=audio,images,videos HTTP/1.1
Accept: application/vnd.api+json
```

## Morph To Many Field

If you choose to use a polymorphic relationship, you must use the JSON:API
`MorphToMany` field in your schema. This is a *virtual* field: you need to pass
JSON:API fields for each of the Eloquent relationships that the polymorphic
relationship represents. We refer to these as the *sub-relationships*.

In our example, each of the separate relationships is a `belongsToMany`
Eloquent relationship. We therefore use the JSON:API `BelongsToMany` field
for each sub-relationship.

On our `posts` schema, we add the relationship as follows:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\BelongsToMany;
use LaravelJsonApi\Eloquent\Fields\Relations\MorphToMany;

MorphToMany::make('media', [
    BelongsToMany::make('audio'),
    BelongsToMany::make('images'),
    BelongsToMany::make('videos'),
])
```

You can use any JSON:API relationship field for the sub-relationships, including
*to-one* fields. However, if you require the relationship to be modifiable,
then you can only use modifiable *to-many* JSON:API relationship fields: i.e.
all *to-many* fields except `HasManyThrough`.

In addition, a modifiable `MorphToMany` relationship **must** have only one
sub-relationship per JSON:API resource type. This is the case in our example
`media` relationship - the sub-relationships return `audio`, `images` and
`videos` resource types. When modifying the relationship, this means we can
map each resource identifier to the correct sub-relationship.

### Inverse Type

Each of the sub-relationships must have the correct JSON:API resource type set,
as described in the [chapter on relationships.](../schemas/relationships.md#inverse-type)
In our example, the inverse type of each of the sub-relationships is expected
to be `audio`, `images` and `videos`. If this was not correct, we would need
to set it on each sub-relationship field using the `type` method:

```php
MorphToMany::make('media', [
    BelongsToMany::make('audio')->type('media-audio'),
    BelongsToMany::make('images')->type('media-images'),
    BelongsToMany::make('videos')->type('media-videos'),
])
```

### Read Only

If the `media` relationship is read-only, you should call the `readOnly` on the
`MorphToMany` relationship. For example:

```php
MorphToMany::make('media', [
    BelongsToMany::make('audio'),
    BelongsToMany::make('images'),
    BelongsToMany::make('videos'),
])->readOnly()
```

Note that calling `readOnly` on the sub-relationships has no effect.

### Include Paths

Once the `MorphToMany` field is added to our `posts` schema, we can then use
the `media` include path. For example:

```http
GET /api/v1/posts/1?include=media HTTP/1.1
Accept: application/vnd.api+json
```

Behind the scenes, our implementation takes care of eager loading each
sub-relationship on the Eloquent model. Our implementation also enables the
client to include relationships *through* the `MorphToMany` relationship.
Say for example, the `videos` resource had a `tags` relationship, the following
request will work if you have enabled an [include depth](../schemas/eager-loading.md)
of at least 2 on your `posts` schema:

```http
GET /api/v1/posts/1?include=media.tags HTTP/1.1
Accept: application/vnd.api+json
```

Behind the scenes our implementation works out what paths to eager load on
the `Post` model. If only the `videos` resource had a `tags` relationship,
then for this request the implementation maps the `media.tags` JSON:API
include path to the `audio`, `images` and `videos.tags` Eloquent eager load
paths.

If we wanted to not allow the `media` relationship to be eager loaded, we
would use the `cannotEagerLoad` method on the field:

```php
MorphToMany::make('media', [
    BelongsToMany::make('audio'),
    BelongsToMany::make('images'),
    BelongsToMany::make('videos'),
])->cannotEagerLoad()
```

## Relationship Endpoints

The `MorphToMany` field can also work as a relationship endpoint, though there
are a few additional steps to follow to get this working.

### Query Parameters

When receiving a request for a *to-many* relationship, our implementation
validates the request query parameters using a collection query class.
For example, if a relationship returned `comments` resources, the
`CommentCollectionQuery` class would be used to validate the request,
[as described in the query parameters chapter.](../requests/query-parameters.md)
If that class does not exist, it falls back to validating the query parameters
using information derived from the `comments` schema.

For our polymorphic relationship, this approach does not work - because the
relationship can contain multiple different resource types. As such, we must
write and register a collection query class to validate query parameters for
the polymorphic relationship.

The `MorphToMany` field has a *fake* inverse resource type, which is the plural
of the relationship name. So for our `media` relationship, the plural is `media`
so the *fake* inverse resource type is `media`. We therefore need to write a
`MediaCollectionQuery` class to validate the request:

```php
namespace App\JsonApi\V1\Media;

use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;
use LaravelJsonApi\Validation\Rule as JsonApiRule;

class MediaCollectionQuery extends ResourceQuery
{

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules(): array
    {
        return [
            'fields' => [
                'nullable',
                'array',
                JsonApiRule::fieldSets(),
            ],
            'filter' => [
                'nullable',
                'array',
                JsonApiRule::filter(['id']),
            ],
            'include' => [
                'nullable',
                'string',
                JsonApiRule::includePathsForPolymorph(),
            ],
            'page' => [
                'nullable',
                'array',
                JsonApiRule::notSupported(),
            ],
            'sort' => [
                'nullable',
                'string',
                JsonApiRule::notSupported(),
            ],
        ];
    }
}
```

This then needs to be registered for use. To do that, we must add the following
in our server's `serving()` method:

```php
use App\JsonApi\V1\Media\MediaCollectionQuery;
use LaravelJsonApi\Laravel\LaravelJsonApi;

/**
 * Bootstrap the server when it is handling an HTTP request.
 *
 * @return void
 */
public function serving(): void
{
    LaravelJsonApi::registerCollectionQuery(MediaCollectionQuery::class, 'media');
}
```

:::tip
If you want to change the name of the *fake* inverse resource type for the
`MorphToMany` field, use the `type` method. For example:

```php
MorphToMany::make('media', [...])->type('fake-media');
```

We would then need to register our collection query class using the `fake-media`
resource type.
:::

### Routing

Once we've set up our query collection class, we can then register the
relationship route in exactly the same way as any other relationship:

```php
$server->resource('posts')->relationships(function ($relationships) {
  $relationships->hasMany('media');
});
```

And then the following request will work:

```http
GET /api/v1/posts/1/media HTTP/1.1
Accept: application/vnd.api+json
```

Refer to the [routing chapter](../routing/) for more information on relationship
routes.

### Include Paths

Include paths are supported on the relationship route. So for example, if our
`videos` resource had a `tags` relationship, the following request would
return all the post's `media` and include each video's tags:

```http
GET /api/v1/posts/1/media?include=tags HTTP/1.1
Accept: application/vnd.api+json
```

When validating include paths in our `MediaCollectionQuery`, we use the
`includePathsForPolymorph` helper method. I.e. our rules look like this:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

return [
  // ...other rules

  'include' => [
      'nullable',
      'string',
      JsonApiRule::includePathsForPolymorph(),
  ],
];
```

### Filters

Filters are supported, but for them to work properly you should only allow
the client to send filters that work with **all** related resource types.
Allow-list the filters that can be used in your validation rules:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

return [
  // ...other rules

  'filter' => [
      'nullable',
      'array',
      JsonApiRule::filter(['id', 'slug']),
  ],
];
```

### Pagination

Pagination is not supported. This is because the relationship value is constructed
from multiple database queries, so pagination would not make sense.

### Sorting

Sort parameters are not currently supported. This is because sorting would have
to be executed *after* the results are retrieved from multiple database queries.

:::tip
This feature is theoretically implementable by sorting the values after they
have been retrieved from the database. We would accept a Pull Request adding
this feature.
:::
