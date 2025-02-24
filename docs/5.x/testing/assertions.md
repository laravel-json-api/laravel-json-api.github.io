# Test Assertions

## Introduction

This chapter provides details of the available JSON:API response assertions.
Our test assertions are built to provide detailed and human-readable
JSON diffs, so you can spot exactly where a JSON:API document differs
from the expected JSON.

## Resource Objects

You should use the following assertions when you expect *zero-to-one*
resource object in the response:

- [assertFetchedOne](#assertfetchedone)
- [assertFetchedOneExact](#assertfetchedoneexact)
- [assertFetchedNull](#assertfetchednull)
- [assertCreatedWithServerId](#assertcreatedwithserverid)
- [assertCreatedWithClientId](#assertcreatedwithclientid)
- [assertCreatedNoContent](#assertcreatednocontent)

### assertFetchedOne

The `assertFetchedOne` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document matches the expected resource.

You can provide either an `array` representation of the expected resource,
or a model.

Providing a model just matches the resource based on the expected `type`
and the model's route key.

If providing an `array`, you can provide a *partial* representation
of the expected resource - i.e. you do not need to provide every `attribute`,
`relationship` and `link`. The assertion will just match those you provided.

For example:

```php
use App\Models\Post;

$model = Post::factory()->create();

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->get('/api/v1/posts/' . $post->getRouteKey());

$response->assertFetchedOne($model);

// or...

$response->assertFetchedOne([
    'type' => 'posts',
    'id' => (string) $post->getRouteKey(),
    'attributes' => [
        'slug' => $post->slug,
        'title' => $post->title,
    ],
]);
```

### assertFetchedOneExact

The `assertFetchedOneExact` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document **exactly** matches the
provided array.

When providing the expected array, you will need to provide the *entire*
expected resource object. For example:

```php
use App\Models\Post;

$model = Post::factory()->create();

$uri = "http://localhost/api/v1/posts/{$post->getRouteKey()}";

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->get($uri);

$response->assertFetchedOneExact([
    'type' => 'posts',
    'id' => (string) $post->getRouteKey(),
    'attributes' => [
        'content' => $post->content,
        'createdAt' => $post->created_at,
        'slug' => $post->slug,
        'title' => $post->title,
        'updatedAt' => $post->updated_at,
    ],
    'relationships' => [
        'author' => [
            'links' => [
                'self' => "{$uri}/relationships/author",
                'related' => "{$uri}/author",
            ],
        ],
        'tags' => [
            'links' => [
                'self' => "{$uri}/relationships/tags",
                'related' => "{$uri}/tags",
            ],
        ],
    ],
    'links' => [
        'self' => $uri,
    ],
]);
```

### assertFetchedNull

The `assertFetchedNull` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is `null`.

For example:

```php

$model = Post::factory()->create(['slug' => 'foo-bar']);

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->filter(['slug' => 'baz-bat'])
    ->get('/api/v1/posts/' . $post->getRouteKey());

$response->assertFetchedNull();
```

### assertCreatedWithServerId

The `assertCreatedWithServerId` method asserts that:

- The response has a `201 Created` response status;
- The response content type is `application/vnd.api+json`;
- The response has a `Location` header set to the resource's URI; AND
- The `data` member of the JSON:API document has the expected resource
object.

The first argument to the method is the expected `Location` URI. As
the server issues the `id`, you provide the expected URI *without* an
ID. The second argument is an array of the expected resource object.

For example:

```php
$post = Post::factory()->make();

$data = [
    'type' => 'posts',
    'attributes' => [
        'content' => $post->content,
        'slug' => $post->slug,
        'title' => $post->title,
    ],
];

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->withData($data)
    ->post('/api/v1/posts', $data);

$response->assertCreatedWithServerId(
    'http://localhost/api/v1/posts',
    $data
);
```

### assertCreatedWithClientId

The `assertCreatedWithClientId` method asserts that:

- The response has a `201 Created` response status;
- The response content type is `application/vnd.api+json`;
- The response has a `Location` header set to the resource's URI; AND
- The `data` member of the JSON:API document has the expected resource
object.

The first argument to the method is the expected `Location` URI,
**excluding** the client id. The second argument is an array of the expected
resource object - which must have the `id` member set.

For example:

```php
$post = Post::factory()->make();

$data = [
    'type' => 'posts',
    'id' => '7088eccc-a7cd-46f6-81f9-c553c9065dbd',
    'attributes' => [
        'content' => $post->content,
        'slug' => $post->slug,
        'title' => $post->title,
    ],
];

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->withData($data)
    ->post('/api/v1/posts', $data);

$response->assertCreatedWithClientId(
    'http://localhost/api/v1/posts',
    $data
);
```

### assertCreatedNoContent

The `assertCreatedNoContent` method asserts that:

- The response has a `204 No Content` response status; AND
- The response has a `Location` header set to the resource's URI.

This assertion method receives the expected `Location` header as its only
argument. The expected `Location` URI **must** include the expected
resource `id`.

For example:

```php
$post = Post::factory()->make();

$data = [
    'type' => 'posts',
    'id' => '7088eccc-a7cd-46f6-81f9-c553c9065dbd',
    'attributes' => [
        'content' => $post->content,
        'slug' => $post->slug,
        'title' => $post->title,
    ],
];

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->withData($data)
    ->post('/api/v1/posts', $data);

$response->assertCreatedNoContent(
    'http://localhost/api/v1/posts/7088eccc-a7cd-46f6-81f9-c553c9065dbd'
);
```

:::warning
This assertion only works with resources that allow client ids.
This is because a server issued `id` should result in a response
with content that contains a JSON:API document of the resource with its
server-issued `id`.
:::

## Resource Collections

You should use the following assertions when you expect *zero-to-many*
resource objects in the response:

- [assertFetchedMany](#assertfetchedmany)
- [assertFetchedManyExact](#assertfetchedmanyexact)
- [assertFetchedManyInOrder](#assertfetchedmanyinorder)
- [assertFetchedNone](#assertfetchednone)

### assertFetchedMany

The `assertFetchedMany` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is an array matching
the expected resources.

:::tip
The order of the expected resources is not considered when matching with
the actual resources. This makes this assertion useful for tests where
you want to check the right resources were returned, but do not care about
the order.

If you do care about matching the order, use the
[assertFetchedManyInOrder](#assertfetchedmanyinorder) assertion.
:::

You can provide either an `array` representation of the expected resources,
or a collection of models.

Providing models just matches the resources based on the expected `type`
and each model's route key.

If providing an `array`, you can provide a *partial* representation
of each expected resource - i.e. you do not need to provide every `attribute`,
`relationship` and `link`. The assertion will just match those you provided.

For example:

```php
use App\Models\Post;

$models = Post::factory()->count(2)->create();

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->get('/api/v1/posts');

$response->assertFetchedMany($models);

// or...

$response->assertFetchedMany([
    [
        'type' => 'posts',
        'id' => (string) $models[0]->getRouteKey(),
        'attributes' => [
            'slug' => $models[0]->slug,
            'title' => $models[0]->title,
        ],
    ],
    [
        'type' => 'posts',
        'id' => (string) $models[1]->getRouteKey(),
        'attributes' => [
            'slug' => $models[1]->slug,
            'title' => $models[1]->title,
        ],
    ],
]);
```

### assertFetchedManyExact

The `assertFetchedManyExact` assertion does the same as the
[assertFetchedMany](#assertfetchedmany) method, except it does an *exact*
match on each expected resource objects. I.e. it asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is an array *exactly* matching
the provided resources.

This means you cannot provide models, and your array representation of each
expected resource would need to include all `attributes`, `relationships` and
`links`.

### assertFetchedManyInOrder

The `assertFetchedManyInOrder` assertion does the same as the
[assertFetchedMany](#assertfetchedmany) method, except that it also asserts
that the actual resources appear in the same order as the expected resources.
I.e. it asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is an array matching
the expected resources, in the same order.

For example, this is useful when testing the `sort` query parameter:

```php
use App\Models\Post;

$posts = Post::factory()->count(3)->create();

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->sort('-publishedAt')
    ->get('/api/v1/posts');

$response->assertFetchedManyInOrder($posts->sortByDesc('published_at'));
```

### assertFetchedNone

The `assertFetchedNone` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is an empty `array`.

For example:

```php
use App\Models\Post;

Post::factory()->count(3)->create(['published_at' => null]);

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->filter(['published' => 'true'])
    ->get('/api/v1/posts');

$response->assertFetchedNone();
```

## Resource Identifiers (Relationships)

You should use the following asserts when you expect resource identifiers
in the response - typically for relationship end-points:

- [assertFetchedToOne](#assertfetchedtoone)
- [assertFetchedToMany](#assertfetchedtomany)
- [assertFetchedToManyInOrder](#assertfetchedtomanyinorder)

### assertFetchedToOne

The `assertFetchedToOne` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is a resource identifier.

Typically you would use this for a *to-one* relationship end-point,
for example:

```php
use App\Models\Post;

$post = Post::factory()->create();

$response = $this
    ->jsonApi()
    ->expects('users')
    ->get("/api/v1/posts/{$post->getRouteKey()}/relationships/author");

$response->assertFetchedToOne($post->author);
```

:::tip
Note how in this example the expected resource type is `users`, as that
is the resource type returned by the relationship.
:::

### assertFetchedToMany

The `assertFetchedToMany` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is a collection (array) of
resource identifiers.

:::tip
The order of the expected resource identifiers is not considered when
matching with the actual resource identifiers. This makes this assertion
useful for tests where you want to check the right resources were returned,
but do not care about the order.

If you do care about matching the order, use the
[assertFetchedToManyInOrder](#assertfetchedtomanyinorder) assertion.
:::

Typically you would use this for a *to-many* relationship end-point,
for example:

```php
use App\Models\Post;
use App\Models\Tag;

$post = Post::factory()->create();
$post->tags()->attach(
  $tags = Tag::factory()->count(3)->create()
);

$response = $this
    ->jsonApi()
    ->expects('tags')
    ->get("/api/v1/posts/{$post->getRouteKey()}/relationships/tags");

$response->assertFetchedToMany($tags);
```

:::tip
Note how in this example the expected resource type is `tags`, as that
is the resource type returned by the relationship.
:::

### assertFetchedToManyInOrder

The `assertFetchedToManyInOrder` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is a collection (array) of
resource identifiers, that has the same order as the expected value.

Typically you would use this for a *to-many* relationship end-point,
combined with the `sort` query parameter. For example:

```php
use App\Models\Post;
use App\Models\Tag;

$post = Post::factory()->create();
$post->tags()->attach(
  $tags = Tag::factory()->count(3)->create()
);

$response = $this
    ->jsonApi()
    ->expects('tags')
    ->sort('-name')
    ->get("/api/v1/posts/{$post->getRouteKey()}/relationships/tags");

$response->assertFetchedToMany($tags->sortByDesc('name'));
```

## Included Resources

You should use the following asserts when you expect the top-level `included`
member to contain resources:

- [assertIsIncluded](#assertisincluded)
- [assertIncluded](#assertincluded)
- [assertDoesntHaveIncluded](#assertdoesnthaveincluded)

### assertIsIncluded

The `assertIsIncluded` method asserts that the provided model is contained
within the top-level `included` member. This means that the `included` member
might also contain other resources - the assertion will just check for the
existence of the provided resource.

Note that because the expected resource type is likely to be different from
the resource type you asserted in the `data` member, you provide the
resource type as the first argument to the `assertIsIncluded` method.

For example, with models:

```php
use App\Models\Post;

$post = Post::factory()->create();

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->includePaths('author')
    ->get('/api/v1/posts' . $post->getRouteKey());

$response->assertFetchedOne($post)
    ->assertIsIncluded('users', $post->author);
```

### assertIncluded

The `assertIncluded` method asserts that the `included` top-level member
contains only the provided resources. The order of these resource is not
considered because there is no significance to the order of the `included`
resources.

As the `included` member can contain a mixture of resource types, you must
provide the resource type per resource. For example:

```php
use App\Models\Post;
use App\Models\Tag;

$post = Post::factory()->create();
$post->tags()->attach($tag = Tag::factory()->create());

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->includePaths('author', 'tags')
    ->get('/api/v1/posts' . $post->getRouteKey());

$response->assertFetchedOne($post)->assertIncluded([
  ['type' => 'users', 'id' => $post->author],
  ['type' => 'tags', 'id' => $tag],
]);
```

### assertDoesntHaveIncluded

The `assertDoesntHaveIncluded` method asserts that the `included` top-level
member is not present in the JSON:API document. For example:

```php
use App\Models\Post;

// post that does not have any tags.
$post = Post::factory()->create();

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->includePaths('tags')
    ->get('/api/v1/posts' . $post->getRouteKey());

$response
    ->assertFetchedOne($post)
    ->assertDoesntHaveIncluded();
```

## Top-Level Meta

You should use the following assertions when you expect top-level `meta`
in the response:

- [assertMetaWithoutData](#assertmetawithoutdata)
- [assertExactMetaWithoutData](#assertexactmetawithoutdata)
- [assertMeta](#assertmeta)
- [assertExactMeta](#assertexactmeta)
- [assertDoesntHaveMeta](#assertdoesnthavemeta)

### assertMetaWithoutData

The `assertMetaWihoutData` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The JSON:API document is a *meta-only* response, i.e. that it has a
top-level `meta` member and the `data` member *does not exist*.

This method allows partial matching when checking if the response `meta`
matches the provided expected meta.

For example:

```php
$response->assertMetaWithoutData([
    'foo' => 'bar',
    'baz' => 'bat',
]);
```

### assertExactMetaWithoutData

The `assertExactMetaWihoutData` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The JSON:API document is a *meta-only* response, i.e. that it has a
top-level `meta` member and the `data` member *does not exist*.

This method does an exact match when checking if the response `meta` matches
the provided expected meta.

For example:

```php
$response->assertExactMetaWithoutData([
    'foo' => 'bar',
    'baz' => 'bat',
]);
```

### assertMeta

The `assertMeta` method asserts that there is a top-level `meta` member
in the JSON:API document, and it matches the expected meta.

This method allows partial matching when checking if the response `meta`
matches the provided expected meta.

Combine this with our `assertFetched*` methods to assert top-level `meta`,
for example:

```php
$response->assertFetchedMany($expected)->assertMeta([
    'page' => [
        'number' => 1,
        'size' => 10,
    ],
]);
```

### assertExactMeta

The `assertExactMeta` method asserts that there is a top-level `meta` member
in the JSON:API document, and it matches the expected meta.

This method does an exact match when checking if the response `meta`
matches the provided expected meta.

Combine this with our `assertFetched*` methods to assert top-level `meta`,
for example:

```php
$response->assertFetchedMany($expected)->assertExactMeta([
    'page' => [
        'number' => 1,
        'size' => 10,
    ],
]);
```

### assertDoesntHaveMeta

The `assertDoesntHaveMeta` method asserts that the top-level `meta` member is not
present in the JSON:API document. For example:

```php
$response
    ->assertFetchedOne($post)
    ->assertDoesntHaveMeta();
```

## Top-Level Links

You should use the following assertions when you expect top-level `links`
in the response:

- [assertLinks](#assertlinks)
- [assertExactLinks](#assertexactlinks)
- [assertDoesntHaveLinks](#assertdoesnthavelinks)

### assertLinks

The `assertLinks` method asserts that there is a top-level `links` member
in the JSON:API document, and it matches the expected links.

This method allows partial matching when checking if the response `links`
matches the provided expected links.

Combine this with our `assertFetched*` methods to assert top-level `links`,
for example:

```php
$response->assertFetchedOne($expected)->assertLinks([
    'self' => 'http://localhost/api/v1/posts/123/relationships/author',
    'related' => 'http://localhost/api/v1/posts/123/author'
]);
```

### assertExactLinks

The `assertExactLinks` method asserts that there is a top-level `links` member
in the JSON:API document, and it matches the expected links.

This method does an exact match when checking if the response `links`
matches the provided expected links.

Combine this with our `assertFetched*` methods to assert top-level `links`,
for example:

```php
$response->assertFetchedOne($expected)->assertExactLinks([
    'self' => 'http://localhost/api/v1/posts/123/relationships/author',
    'related' => 'http://localhost/api/v1/posts/123/author'
]);
```

### assertDoesntHaveLinks

The `assertDoesntHaveLinks` method asserts that the top-level `links` member is
not present in the JSON:API document. For example:

```php
$response
    ->assertFetchedMany($expected)
    ->assertDoesntHaveLinks();
```

## Errors

You should use the following assertions when you expect top-level `errors`
in the response:

- [assertErrorStatus / assertError](#asserterrorstatus-asserterror)
- [assertExactErrorStatus / assertExactError ](#assertexacterrorstatus-assertexacterror)
- [assertErrors](#asserterrors)
- [assertExactErrors](#assertexacterrors)
- [assertHasError](#asserthaserror)
- [assertHasExactError](#asserthasexacterror)

### assertErrorStatus / assertError

The `assertErrorStatus` method asserts that:

- The response has a response status that matches the `status` member of
the expected error object;
- The response has a content type of `application/vnd.api+json`; AND
- The response document has a top-level `errors` member that contains a
**single** JSON:API error object that matches the expected error object.

This method uses partial matching when checking the expected error object.

In the following example, the assertion checks that the response status
is `400`, as well as checking that `errors` member has a single error
matching the expected error:

```php
$response->assertErrorStatus([
    'source' => ['parameter' => 'filter'],
    'status' => '400',
    'title' => 'Bad Request',
]);
```

If you expect the HTTP status code to be different from the `status` member of
the error object, use `assertError()` instead. In the following example, the
assertion checks the HTTP status code is `400` and that the `errors` member
has a single error matching the expected one:

```php
$expected = [
  'source' => ['pointer' => '/data/attributes/title'],
  'status' => '422',
  'title' => 'Invalid Attribute',
];

$response->assertError(400, $expected);
```

### assertExactErrorStatus / assertExactError

The `assertExactErrorStatus` method asserts that:

- The response has a response status that matches the `status` member of
the expected error object;
- The response has a content type of `application/vnd.api+json`; AND
- The response document has a top-level `errors` member that contains a
**single** JSON:API error object that matches the expected error object.

This method uses exact matching when checking the expected error object.

In the following example, the assertion checks that the response status
is `400`, as well as checking that `errors` member has a single error
exactly matching the expected error:

```php
$response->assertExactErrorStatus([
    'source' => ['parameter' => 'filter'],
    'status' => '400',
    'title' => 'Bad Request',
]);
```

If you expect the HTTP status code to be different from the `status` member of
the error object, use `assertExactError()` instead. In the following example,
the assertion checks the HTTP status code is `400` and that the `errors` member
has a single error exactly matching the expected one:

```php
$expected = [
  'source' => ['pointer' => '/data/attributes/title'],
  'status' => '422',
  'title' => 'Invalid Attribute',
];

$response->assertExactError(400, $expected);
```

### assertErrors

The `assertErrors` method asserts that:

- The response has a response status matching the provided expected status;
- The response has a content type of `application/vnd.api+json`; and
- The response document has a top-level errors member that matches the
provided expected errors.

This method is useful for asserting that the response document has multiple
error objects. You must provide the expected status as the first argument,
and the expected error objects as the second argument.

This method allows partial matching when checking the expected errors.

For example:

```php
$response->assertErrors(400, [
    [
        'source' => ['pointer' => '/data/attributes/slug'],
        'status' => '422',
    ],
    [
        'source' => ['parameter' => 'filter'],
        'status' => '400',
    ],
]);
```

### assertExactErrors

The `assertExactErrors` method asserts that:

- The response has a response status matching the provided expected status;
- The response has a content type of `application/vnd.api+json`; and
- The response document has a top-level errors member that matches the
provided expected errors.

This method is useful for asserting that the response document has multiple
error objects. You must provide the expected status as the first argument,
and the expected error objects as the second argument.

This method performs exact matching when checking the expected errors.

For example:

```php
$response->assertErrors(400, [
    [
        'detail' => 'The chosen slug is already taken.',
        'source' => ['pointer' => '/data/attributes/slug'],
        'status' => '422',
        'title' => 'Unprocessable Entity',
    ],
    [
        'detail' => 'The foo filter is not recognised.',
        'source' => ['parameter' => 'filter'],
        'status' => '400',
        'title' => 'Bad Request',
    ],
]);
```

### assertHasError

The `assertHasError` method asserts that:

- The response has a response status matching the provided expected status;
- The response has a content type of `application/vnd.api+json`; and
- The response document has a top-level errors member that contains an error
matching the supplied error.

This is useful when a response document contains multiple errors, but for your
test you only want to assert that the errors list contains a specific error.

For example:

```php
$response->assertHasError(400, [
    'detail' => 'The chosen slug is already taken.',
    'source' => ['pointer' => '/data/attributes/slug'],
    'status' => '422',
    'title' => 'Unprocessable Entity',
]);
```

### assertHasExactError

The `assertHasExactError` method asserts that:

- The response has a response status matching the provided expected status;
- The response has a content type of `application/vnd.api+json`; and
- The response document has a top-level errors member that contains an error
matching the supplied error.

This is useful when a response document contains multiple errors, but for your
test you only want to assert that the errors list contains a specific error.

This method performs exact matching when checking the expected error.

For example:

```php
$response->assertHasExactError(400, [
    'detail' => 'The chosen slug is already taken.',
    'source' => ['pointer' => '/data/attributes/slug'],
    'status' => '422',
    'title' => 'Unprocessable Entity',
]);
```
