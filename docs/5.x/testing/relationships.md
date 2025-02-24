# Relationship Tests

## Introduction

This chapter provides examples of testing relationship routes:
i.e. the `related`, `show`, `update`, `attach` and `detach`
relationship actions.

The examples involve both *to-one* relations, and *to-many*
relations.

## To-One

To demonstrate tests for a *to-one* relation, we will imagine that
our `posts` resource has an `image` relation.

### Related Resource Testing

To test that we can read the related `images` resource, we will
use the following test:

```php
use App\Models\Image;
use App\Models\Post;

public function test(): void
{
    $post = Post::factory()->for(Image::factory())->create();
    $image = $post->image;

    $expected = [
        'type' => 'images',
        'id' => (string) $image->getRouteKey(),
        'attributes' => [
            'url' => $image->url,
        ],
    ];

    $response = $this
        ->jsonApi()
        ->expects('images')
        ->get("/api/v1/posts/{$post->getRouteKey()}/image");

    $response->assertFetchedOne($expected);
}
```

We are expecting the `GET /api/v1/posts/{post}/image` route to return the
related `images` resource. We therefore ensure our `$expected` data includes
at least one attribute or relationship. We use `assertFetchedOne` to ensure
the response is a `200 OK` response with our expected data in the `data`
member of the JSON:API document.

:::tip
If we wanted to test an empty relationship, we would use the
`assertFetchedNull` assertion.
:::

### Show To-One Testing

To test that we can read the related `images` resource identifier, we will
use the following test:

```php
use App\Models\Image;
use App\Models\Post;

public function test(): void
{
    $post = Post::factory()->for(Image::factory())->create();
    $image = $post->image;

    $response = $this
        ->jsonApi()
        ->expects('images')
        ->get("/api/v1/posts/{$post->getRouteKey()}/relationships/image");

    $response->assertFetchedToOne($image);
}
```

We are expecting the `GET /api/v1/posts/{post}/relationships/image` route
to return the resource identifier of the related `images` resource.
The `assertFetchedToOne` assertion does this: it will check that a resource
identifier for the provided `Image` model in the `/data` member of the
response.

:::tip
If we wanted to test an empty relationship, we would use the
`assertFetchedNull` assertion.
:::

### Update To-One Testing

We can also test updating the relationship as follows:

```php
use App\Models\Image;
use App\Models\Post;

public function test(): void
{
    $post = Post::factory()->create();
    $image = Image::factory()->create();

    $data = [
        'type' => 'images',
        'id' => (string) $image->getRouteKey(),
    ];

    $response = $this
        ->jsonApi()
        ->expects('images')
        ->withData($data)
        ->patch("/api/v1/posts/{$post->getRouteKey()}/relationships/image");

    $response->assertFetchedToOne($image);

    $this->assertDatabaseHas('posts', [
        'id' => $post->getKey(),
        'image_id' => $image->getKey(),
    ]);
}
```

In this request, we provide a resource identifier for the `Image` model
as our request data. The expected outcome is that the `Image` is attached
to the `Post` model. We use a database assertion to check this has happened.

## To-Many

To demonstrate tests for a *to-many* relation, we will imagine that
our `posts` resource has a `tags` relation.

### Related Resources Testing

To test that we can read the related `tags` resources, we will
use the following test:

```php
use App\Models\Post;
use App\Models\Tag;

public function test(): void
{
    $post = Post::factory()->create();
    $tags = Tag::factory()->count(2)->create();
    $post->tags()->attach($tags);

    $expected = $tags->map(fn(Tag $tag) => [
        'type' => 'tags',
        'id' => (string) $tag->getRouteKey(),
        'attributes' => [
            'name' => $tag->name,
        ],
    ])->all();

    $response = $this
        ->jsonApi()
        ->expects('tags')
        ->get("/api/v1/posts/{$post->getRouteKey()}/tags");

    $response->assertFetchedMany($expected);
}
```

We are expecting the `GET /api/v1/posts/{post}/tags` route to return the
related `tags` resources. We therefore ensure our `$expected` data includes
at least one attribute or relationship. We use `assertFetchedMany` to ensure
the response is a `200 OK` response with our expected data in the `data`
member of the JSON:API document.

:::tip
If we wanted to test an empty relationship, we would use the
`assertFetchedNone` assertion.
:::

### Show To-Many Testing

To test that we can read the related `tags` resource identifiers, we will
use the following test:

```php
use App\Models\Post;
use App\Models\Tag;

public function test(): void
{
    $post = Post::factory()->create();
    $tags = Tag::factory()->count(2)->create();
    $post->tags()->attach($tags);

    $response = $this
        ->jsonApi()
        ->expects('tags')
        ->get("/api/v1/posts/{$post->getRouteKey()}/relationships/tags");

    $response->assertFetchedToMany($tags);
}
```

We are expecting the `GET /api/v1/posts/{post}/relationships/tags` route
to return the resource identifiers of the related `tags` resources.
The `assertFetchedToMany` assertion does this: it will check that resource
identifiers for the provided `Tag` models are in the `/data` member of the
response.

:::tip
If we wanted to test an empty relationship, we would use the
`assertFetchedNone` assertion.
:::

### Update To-Many Testing

The follow example tests updating a *to-many* relation:

```php
use App\Models\Post;
use App\Models\Tag;

public function test(): void
{
    $post = Post::factory()->create();
    $post->tags()->attach($existing = Tag::factory()->create());
    $tags = Tag::factory()->count(2)->create();

    $data = $tags->map(fn(Tag $tag) => [
        'type' => 'tags',
        'id' => (string) $tag->getRouteKey(),
    ])->all();

    $response = $this
        ->jsonApi()
        ->expects('tags')
        ->withData($data)
        ->patch("/api/v1/posts/{$post->getRouteKey()}/relationships/tags");

    $response->assertFetchedToMany($tags);

    /** The existing tag should have been detached. */
    $this->assertDatabaseMissing('taggables', [
        'tag_id' => $existing->getKey(),
        'taggable_id' => $post->getKey(),
        'taggable_type' => Post::class,
    ]);

    /** These tags should have been attached. */
    foreach ($tags as $tag) {
        $this->assertDatabaseHas('taggables', [
            'tag_id' => $tag->getKey(),
            'taggable_id' => $post->getKey(),
            'taggable_type' => Post::class,
        ]);
    }
}
```

In this request, we provide resource identifiers for the `Tag` models
as our request data. The expected outcome is that the existing
`Tag` model is detached, and the new `Tag` models are attached.
This is because a `PATCH` request for a *to-many* relationship must
**replace** the contents of the relationship. I.e. it is a *sync*
operation.

Our database assertions check the database has been updated correctly.

### Attach To-Many Testing

The follow example tests attaching new records to a *to-many* relation:

```php
use App\Models\Post;
use App\Models\Tag;

public function test(): void
{
    $post = Post::factory()->create();
    $post->tags()->attach($existing = Tag::factory()->create());
    $tags = Tag::factory()->count(2)->create();

    $data = $tags->map(fn(Tag $tag) => [
        'type' => 'tags',
        'id' => (string) $tag->getRouteKey(),
    ])->all();

    $response = $this
        ->jsonApi()
        ->expects('tags')
        ->withData($data)
        ->post("/api/v1/posts/{$post->getRouteKey()}/relationships/tags");

    $response->assertNoContent();

    /** The existing tag should still be attached. */
    $this->assertDatabaseHas('taggables', [
        'tag_id' => $existing->getKey(),
        'taggable_id' => $post->getKey(),
        'taggable_type' => Post::class,
    ]);

    /** These tags should have been attached. */
    foreach ($tags as $tag) {
        $this->assertDatabaseHas('taggables', [
            'tag_id' => $tag->getKey(),
            'taggable_id' => $post->getKey(),
            'taggable_type' => Post::class,
        ]);
    }
}
```

In this request, we provide resource identifiers for the new `Tag`
models as our request data. The expected outcome of the `POST` method
is that the new tags are attached, and the existing tag remains attached.
Our database assertions check the database has been updated correctly.

### Detach To-Many Testing

The follow example tests detaching records to a *to-many* relation:

```php
use App\Models\Post;
use App\Models\Tag;

public function test(): void
{
    $post = Post::factory()->create();
    $post->tags()->attach($keep = Tag::factory()->create());
    $post->tags()->attach($detach = Tag::factory()->count(2)->create());

    $data = $detach->map(fn(Tag $tag) => [
        'type' => 'tags',
        'id' => (string) $tag->getRouteKey(),
    ])->all();

    $response = $this
        ->jsonApi()
        ->expects('tags')
        ->withData($data)
        ->delete("/api/v1/posts/{$post->getRouteKey()}/relationships/tags");

    $response->assertNoContent();

    /** The existing tag should still be attached. */
    $this->assertDatabaseHas('taggables', [
        'tag_id' => $keep->getKey(),
        'taggable_id' => $post->getKey(),
        'taggable_type' => Post::class,
    ]);

    /** These tags should have been detached. */
    foreach ($detach as $tag) {
        $this->assertDatabaseMissing('taggables', [
            'tag_id' => $tag->getKey(),
            'taggable_id' => $post->getKey(),
            'taggable_type' => Post::class,
        ]);
    }
}
```

In this request, we provide resource identifiers for the `Tag`
models we want to detach as our request data. The expected outcome of the
`DELETE` method is that these tags are detached - and any other already
attached `tags` are retained. Our database assertions check the database has
been updated correctly.
