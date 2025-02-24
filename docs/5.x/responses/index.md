# JSON:API Documents

## Introduction

Our default controller actions take care of returning JSON:API responses
for you. However, there may be some scenarios where you want to customise
the response.

Our [Controller Hooks](../routing/controllers.md#controller-hooks)
allow you to return a customised response for each of our action traits.

Alternatively, if you are [implementing your own actions](../routing/writing-actions.md)
then you will also need to construct responses.

## Response Server

Laravel JSON:API supports applications having multiple JSON:API servers. To
correctly encode a JSON:API compound document, the implementation needs to know
which server to use.

Our JSON:API middleware takes care of setting the JSON:API server that is in
use. This means if you are returning any response classes *after* this
middleware has run, you **do not** need to tell the response which server must
be used to encode the response.

If your application returns any of our JSON:API response classes in routes that
either *do not* have the JSON:API middleware, or middleware that run *before*
that middleware, **you must explicitly set the server on the response**.
This can easily be done using the [`withServer()` helper method.](#withserver)
For example:

```php
return DataResponse::make($model)->withServer('v1');
```

## Response Classes

We provide the following JSON:API response classes for returning responses that
contain a JSON:API document in their body:

- [Data Response](#data-response)
- [Related Response](#related-response)
- [Relationship Response](#relationship-response)
- [Meta Response](#meta-response)

We also provide the [Error Response](errors.md#responses) class, which
is covered in the [errors chapter](errors.md).

All these response classes have static `make` methods, so that you can fluently
construct them. They also all implement our response
[helper methods](./#helper-methods), as described later in this chapter.

### Data Response

Our `LaravelJsonApi\Core\Responses\DataResponse` class is used when you
need to return a resource, resources or `null`  as the `data` member of a
JSON:API document.

This response takes care of converting values to the correct `JsonApiResource`
class. For example, if you provide an `App\Models\Post` model, it will
convert this to a `App\JsonApi\V1\Posts\PostResource` to serialize it to
the JSON:API format.

The same applies to any iterable value you provide. For example, if you
provided a collection of `Post` models, it will take care of converting
these models to the `PostResource` class when iterating over them.

To create a `DataResponse`, pass the value of the `data` member to the
constructor, or the static `make` method if you need to chain any of our
helper methods. For example:

```php
use LaravelJsonApi\Core\Responses\DataResponse;

return new DataResponse($model);
// or
return DataResponse::make($model)
    ->withHeader('X-Foo', 'Bar')
    ->withMeta(['foo' => 'bar']);
```

### Create Resource Response

The JSON:API specification says that a response to a create resource
request must have a `Location` header, and use the `201 Created` HTTP
response code.

For Eloquent models, we automatically detect this using the model's
`$wasRecentlyCreated` property. When this is `true`, we add the `Location`
header and set the status to `201`.

If you need to manually force a `DataResponse` to be a create resource
response, use the `didCreate` method:

```php
return DataResponse::make($model)->didCreate();
```

### Related Response

Our `LaravelJsonApi\Core\Responses\RelatedResponse` class is used for the
response to read the related resources in a relationship. E.g.
`GET /api/v1/posts/123/tags` would read the related `tags` resources.

Like our other response classes, this class takes care of converting the value
provided to the correct resource class, or converting values when iterating
over them.

To create a related response, you need to provide three arguments:

1. The model to which the relationship belongs;
2. The JSON:API field name of the relationship; and
3. The related value: either a model, models or `null`.

For example, given a `post` model, with a `tags` relationship:

```php
use LaravelJsonApi\Core\Responses\RelatedResponse;

return new RelatedResponse($post, 'tags', $post->tags);
// or
return RelatedResponse::make($post, 'tags', $post->tags)
    ->withHeader('X-Foo', 'Bar')
    ->withMeta(['foo' => 'bar']);
```

By default this class will merge the relationship's `meta` into the top-level
`meta` member of the JSON:API document. If you do not want this merging to occur,
use the `withoutRelationshipMeta()` method, for example:

```php
return RelatedResponse::make($post, 'tags', $post->tags)
  ->withoutRelationshipMeta();
```

### Relationship Response

Our `LaravelJsonApi\Core\Responses\RelationshipResponse` class is used
for the response to a relationship endpoint, e.g.
`GET /api/v1/posts/123/relationships/tags`. These endpoints return
resource identifiers instead of resources.

Like other response classes, this class takes care of converting the value
provided to the correct resource class, or converting values when iterating over
them. It also adds the top-level relationship links to the JSON:API document in
the response.

To create a relationship response, you need to provide three arguments:

1. The model to which the relationship belongs;
2. The JSON:API field name of the relationship; and
3. The related value: either a model, models or `null`.

For example, given a `post` model, with a `tags` relationship:

```php
use LaravelJsonApi\Core\Responses\RelationshipResponse;

return new RelationshipResponse($post, 'tags', $post->tags);
// or
return RelationshipResponse::make($post, 'tags', $post->tags)
    ->withHeader('X-Foo', 'Bar')
    ->withMeta(['foo' => 'bar']);
```

By default this class will merge the relationship's `meta` into the top-level
`meta` member of the JSON:API document. If you do not want this merging to occur,
use the `withoutRelationshipMeta()` method, for example:

```php
return RelationshipResponse::make($post, 'tags', $post->tags)
  ->withoutRelationshipMeta();
```

### Meta Response

Our `LaravelJsonApi\Core\Responses\MetaResponse` class allows you to return a
a JSON:API response that has a top-level `meta` member, but no `data` member.
This is allowed by the specification.

To use this class, you just need to provide the meta value to either the
constructor or the static `make` method. The meta value can be an array or
a Laravel collection.

For example:

```php
use LaravelJsonApi\Core\Responses\MetaResponse;

return new MetaResponse(['foo' => 'bar']);
// or
return MetaResponse::make(['foo' => 'bar'])
    ->withHeader('X-Foo', 'Bar');
```

## JSON:API Object

The JSON:API specification defines a `jsonapi` top-level member of a document.
This can contain the JSON:API version the server is using, and may also
include `meta`.

The content of this member is defined on your `Server` class. By default,
it will generate the following `jsonapi` member:

```json
{
  "jsonapi": {
    "version": "1.0"
  }
}
```

To customise this value, override the `jsonApi` method on your `Server`
class:

```php
namespace App\JsonApi\V1\Server;

use LaravelJsonApi\Core\Server\Server as BaseServer;

class Server extends BaseServer
{

    // ...

    public function jsonApi(): JsonApi
    {
      return JsonApi::make('1.0')->setMeta([
        'foo' => 'bar',
      ]);
    }
}
```

This would result in the following `jsonapi` member in your response
documents:

```json
{
  "jsonapi": {
    "version": "1.0",
    "meta": {
      "foo": "bar"
    }
  }
}
```

:::tip
If you need to customise the `jsonapi` member for a specific response,
use the [`withJsonApi` helper method](#withjsonapi).
:::

## Helper Methods

Our response classes have a number of helper methods, to enable you to
customise the response. The available methods are:

- [withServer](#withserver)
- [withJsonApi](#withjsonapi)
- [withMeta](#withmeta)
- [withLinks](#withlinks)
- [withEncodeOptions](#withencodeoptions)
- [withHeader](#withheader)
- [withHeaders](#withheaders)

#### withServer

This method sets the JSON:API server that must be used when encoding the
response to a JSON:API compound document. You *do not* need to use this method
if the response is being returned *after* the JSON:API middleware has run. This
is because the JSON:API middleware sets the server to use for all responses.
Instead, use the `withServer()` method if you are returning a JSON:API response
from a route that *does not* have the JSON:API middleware applied.

For example:

```php
return DataResponse::make($model)->withServer('v1');
```

The string provided to the `withServer()` method is the server name used when
registering servers in your JSON:API config file - as described in the
[Servers chapter.](../servers/)

#### withJsonApi

The `withJsonApi` method allows you to override the default `jsonapi` object
provided by your [`Server` class.](#json-api-object)

For example:

```php
use LaravelJsonApi\Core\Document\JsonApi;

return DataResponse::make($model)->withJsonApi(
  JsonApi::make('1.0')->withMeta(['foo' => 'bar'])
);
```

#### withMeta

The `withMeta` method allows you to attach top-level `meta` to the JSON:API
document. For example:

```php
return DataResponse::make($model)->withMeta(['foo' => 'bar']);
```

#### withLinks

The `withLinks` method allows you to attach top-level `links` objects
to the JSON:API document. For example:

```php
use LaravelJsonApi\Core\Document\Link;

return DataResponse::make($model)->withLinks(
    new Link('docs', 'https://www.example.com/api/docs')
);
```

As you can see from this example, the `withLinks` method will take
a single `Link` object. If you want to set multiple links, use
our `Links` object:

```php
use LaravelJsonApi\Core\Document\Link;
use LaravelJsonApi\Core\Document\Links;

return DataResponse::make($model)->withLinks(new Links(
    new Link('docs', 'https://www.example.com/api/docs'),
    new Link('misc', 'https://www.example.com/api/misc')
));
```

:::warning
The JSON:API specification is not entirely clear as to what links are
actually allowed at the top-level, beyond a `self` link and pagination
links (`first`, `last`, `prev`, `next`). More links might be added to the
specification in the future, so it is potentially risky adding your own
links at the current time.
:::

#### withEncodeOptions

The `withEncodeOptions` sets the JSON encoding option flags. These are
the flags used by [PHP's `json_encode` function.](https://www.php.net/manual/en/function.json-encode.php).

For example:

```php
return DataResponse::make($model)
    ->withEncodeOptions(JSON_UNESCAPED_UNICODE);
```

#### withHeader

The `withHeader` method allows you to set a single header on the response:

```php
return DataResponse::make($model)->withHeader('X-Foo', 'Bar');
```

#### withHeaders

The `withHeaders` method allows you to set multiple headers on the response. These headers are merged with any existing
headers.

```php
return DataResponse::make($model)->withHeaders([
  'X-Foo' => 'Bar',
  'X-Baz' => 'Bat',
]);
```

#### withoutHeaders

The `withoutHeaders` method allows you to remove headers from the response:

```php
return DataResponse::make($model)->withoutHeaders('X-Foo', 'X-Bar');
```