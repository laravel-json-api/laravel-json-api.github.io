# Test Requests

## Introduction

This chapter documents the test helpers that are available via the
`jsonApi()` method that the `MakesJsonApiRequests` trait adds to your
test class. These test helpers are designed to help you fluently create
test JSON:API requests.

## Expected Resource Type

When calling the `jsonApi` method, it is important to provide the
resource type that you expect in the response. This allows you to then
pass models to our test assertions, as the assertions will use the expected
resource type when checking if the models are in the response JSON.

The expected resource type can be set using the `expects` method.
For example:

```php
$response = $this->jsonApi()->expects('posts')->get('/api/v1/posts');
```

If you prefer, you can also provide the expected resource type to the
`jsonApi` method:

```php
$response = $this->jsonApi('posts')->get('/api/v1/posts');
```

## Query Parameters

The following methods allow you to set query parameters when creating
test JSON:API requests:

- [Query](#query)
- [Include Paths](#include-paths)
- [Sparse Fields](#sparse-fields)
- [Filter](#filter)
- [Sort](#sort)
- [Page](#page)

### Query

The `query` method allows you to set multiple query parameters in a
single method:

```php
$response = $this->jsonApi()->expects('posts')->query([
    'include' => 'author,tags',
    'page' => ['number' => 1, 'size' => 10],
])->get('/api/v1/posts');
```

This is equivalent to the following request:

```http
GET /api/v1/posts?include=author,tags&page[number]=1&page[size]=10 HTTP/1.1
Accept: application/vnd.api+json
```

### Include Paths

The `includePaths` method allows you to fluently set the `include` query
parameter:

```php
$response = $this
    ->jsonApi()
    ->expects('posts')
    ->includePaths('author', 'tags')
    ->get('/api/v1/posts');
```

This is equivalent to the following request:

```http
GET /api/v1/posts?include=author,tags HTTP/1.1
Accept: application/vnd.api+json
```

### Sparse Fields

The `sparseFields` method allows you to fluently set the `fields` query
parameter for a specific resource type. For example:

```php
$response = $this
    ->jsonApi()
    ->expects('posts')
    ->sparseFields('posts', ['title', 'slug', 'author'])
    ->sparseFields('users', ['name'])
    ->get('/api/v1/posts');
```

This is equivalent to the following request:

```http
GET /api/v1/posts?fields[posts]=title,slug,author&fields[users]=name HTTP/1.1
Accept: application/vnd.api+json
```

### Filter

The `filter` method allows you to fluently set the `filter` query parameter:

```php
$response = $this
    ->jsonApi()
    ->expects('posts')
    ->filter(['published' => 'true'])
    ->get('/api/v1/posts');
```

This is equivalent to the following request:

```http
GET /api/v1/posts?filter[published]=true HTTP/1.1
Accept: application/vnd.api+json
```

If you provide models as filter values, these will be converted to their route
keys. For example:

```php
$posts = Post::factory()->count(3)->create();

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->filter(['id' => $posts])
    ->get('/api/v1/posts');
```

### Sort

The `sort` method allows you to fluently set the `sort` query parameter:

```php
$response = $this
    ->jsonApi()
    ->expects('posts')
    ->sort('-publishedAt', 'title')
    ->get('/api/v1/posts');
```

This is equivalent to the following request:

```http
GET /api/v1/posts?sort=-publishedAt,title HTTP/1.1
Accept: application/vnd.api+json
```

:::tip
You should pair the `sort` method with our ordered assertions - for example,
`assertFetchedManyInOrder`.
:::

### Page

The `page` method allows you to fluently set the `page` query parameter:

```php
$response = $this
    ->jsonApi()
    ->expects('posts')
    ->page(['number' => 1, size => 10])
    ->get('/api/v1/posts');
```

This is equivalent to the following request:

```http
GET /api/v1/posts?page[number]=1&page[size]=10 HTTP/1.1
Accept: application/vnd.api+json
```

If you provide models as page values, these will be converted to their route
keys. For example:

```php
$posts = Post::factory()->count(3)->create();

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->page(['after' => $posts[0]])
    ->get('/api/v1/posts');
```

## Request Body and Headers

The following methods allow you to set request body content when creating
test JSON:API requests:

- [withData](#withdata)
- [withJson](#withjson)
- [withPayload](#withpayload)
- [contentType](#contenttype)
- [asFormUrlEncoded](#asformurlencoded)
- [asMultiPartFormData](#asmultipartformdata)
- [withHeaders and withHeader](#withheaders-and-withheader)

### withData

The `withData` method allows you to set the request content to a JSON document,
that contains the provided value as the `data` member.

For example:

```php
$response = $this->jsonApi()->withData([
    'type' => 'posts',
    'attributes' => [
        'content' => '...',
        'title' => 'Hello World!',
        'slug' => 'hello-world',
    ],
])->post('/api/v1/posts');
```

Is equivalent to the following request:

```http
POST /api/v1/posts HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "attributes": {
      "content": "...",
      "title": "Hello World!",
      "slug": "hello-world"
    }
  }
}
```

### withJson

The `withJson` method allows you to set the entire JSON body content.
For example:

```php
$response = $this->jsonApi()->withJson([
    'meta' => [
        'foo' => 'bar',
    ],
])->post('/api/v1/posts');
```

Is equivalent to the following request:

```http
POST /api/v1/posts HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "meta": {
    "foo": "bar"
  }
}
```

### withPayload

The `withPayload` method should be used when you are sending request content
that is *not* JSON:API content. This should be used in combination with any
of the helper methods that allow you to set an alternative content type.

For example:

```php
$response = $this->jsonApi()->asFormUrlEncoded()->withPayload([
    'foo' => 'bar',
    'baz' => 'bat',
])->post('/api/v1/posts');
```

Is equivalent to the following request:

```http
POST /api/v1/posts HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/x-www-form-urlencoded

foo=bar&baz=bat
```

### contentType

The `contentType` method allows you to set an alternative `Content-Type`
header. This is useful when testing requests that send non-JSON:API content,
but expect a JSON:API response.

Typically you would pair this with the [withPayload](#withpayload) method
to set the non-JSON:API request body.

For example:

```php
$response = $this
    ->jsonApi()
    ->contentType('application/x-www-form-urlencoded')
    ->withPayload(['foo' => 'bar', 'baz' => 'bat'])
    ->post('/api/v1/posts');
```

Is equivalent to the following request:

```http
POST /api/v1/posts HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/x-www-form-urlencoded

foo=bar&baz=bat
```

### asFormUrlEncoded

The `asFormUrlEncoded` method is a short-hand for setting the `Content-Type`
header to `application/x-www-form-urlencoded`.

### asMultiPartFormData

The `asMultiPartFormData` method is a short-hand for setting the
`Content-Type` header to `multipart/form-data`.

### withHeaders and withHeader

The `withHeaders` method allows you to fluently set multiple headers when
constructing your test request. The `withHeader` method sets a single header.

For example:

```php
$response = $this->jsonApi()->expects('posts')->withHeaders([
  'X-Foo' => 'Bar',
  'X-Baz' => 'Bat',
])->get('/api/v1/posts');

// is equivalent to:

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->withHeader('X-Foo', 'Bar')
    ->withHeader('X-Baz', 'Bat')
    ->get('/api/v1/posts');
```

## HTTP Verbs

Methods exist for the following HTTP verbs:

- `get`
- `post`
- `patch`
- `put`
- `delete`

All these methods expect the first argument to be a string URI, and the
second argument is an optional array of headers.

This makes these methods different from the Laravel equivalents, which
accept an array of data for verbs such as `post`. You should instead
use our fluent [Request Body helpers](#request-body-and-headers) to set the request
content *before* calling the HTTP verb method.
