# Resource Tests

## Introduction

Laravel JSON:API provides a very fluent API for making JSON:API
HTTP requests to your application, and examining the output.

This chapter provides examples of testing resource actions:
i.e. the `index`, `store`, `show`, `update` and `destroy` actions.
In these examples, our application is a blog with a `posts` resource.

## Index Testing

The `index` action returns *zero-to-many* resources. For our `posts`
resource, we can test this as follows:

```php
use App\Models\Post;

public function test(): void
{
    $posts = Post::factory()->count(3)->create();

    $response = $this
        ->jsonApi()
        ->expects('posts')
        ->get('/api/v1/posts');

    $response->assertFetchedMany($posts);
}
```

In this test, we create a JSON:API request to the `GET /api/v1/posts` route.
The `expects` method tells the test that the response should contain
`posts` resources. This enables us to pass models to the assertions,
as the test will know that the models should be serialized as `posts` resources.

Our assertion - `assertFetchedMany` - checks that the response contains a
JSON:API document that contains a resource collection (i.e. *zero-to-many*).
It uses the provided models to check that they are the only resources
in the response. I.e. in this test, it checks there are 3 `posts` resources
with `id`s that match the provided models.

:::tip
If you provide models to our test assertion methods, the `getRouteKey` method
is used to work out the resource's `id`.
:::

## Store (aka Create) Testing

We can test creating a `posts` resource by using a model factory to `make`
a `Post` model. We use this to build an array of JSON:API data for the test
request:

```php
use App\Models\Post;
use App\Models\Tag;

public function test(): void
{
    $post = Post::factory()->make();
    $tags = Tag::factory()->count(2)->create();

    $data = [
        'type' => 'posts',
        'attributes' => [
            'content' => $post->content,
            'slug' => $post->slug,
            'title' => $post->title,
        ],
        'relationships' => [
            'tags' => [
                'data' => $tags->map(fn(Tag $tag) => [
                    'type' => 'tags',
                    'id' => (string) $tag->getRouteKey(),
                ])->all(),
            ],
        ],
    ];

    $response = $this
        ->actingAs($post->author)
        ->jsonApi()
        ->expects('posts')
        ->withData($data)
        ->includePaths('tags')
        ->post('/api/v1/posts');

    $id = $response
        ->assertCreatedWithServerId('http://localhost/api/v1/posts', $data)
        ->id();

    $this->assertDatabaseHas('posts', [
        'id' => $id,
        'author_id' => $post->author_id,
        'content' => $post->content,
        'slug' => $post->slug,
        'title' => $post->title,
    ]);

    foreach ($tags as $tag) {
        $this->assertDatabaseHas('taggables', [
            'tag_id' => $tag->getKey(),
            'taggable_id' => $id,
            'taggable_type' => Post::class,
        ]);
    }
}
```

In this test, we expect the authenticated user to be stored as the `posts`
resource's `author`. We therefore use Laravel's `actingAs` helper to
authenticate before calling the `jsonApi` method.

The JSON:API specification states that the server must respond to a
create request with a `201 Created` status and a `Location` header.
The `assertCreatedWithServerId` method checks the response for this status
and header, and then checks that the response JSON:API document has the
expected `$data` in it.

Finally, we use the `id` method on our response to read the resource's
`id` from the response. As shown, we can use this when making database
assertions to check the data has been correctly stored.

## Show (aka Read) Testing

We can test reading a specific `posts` resource as follows:

```php
use App\Models\Post;

public function test(): void
{
    $post = Post::factory()->create();
    $self = 'http://localhost/api/v1/posts/' . $post->getRouteKey();

    $expected = [
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
                    'self' => "{$self}/relationships/author",
                    'related' => "{$self}/author",
                ],
            ],
            'comments' => [
                'links' => [
                    'self' => "{$self}/relationships/comments",
                    'related' => "{$self}/comments",
                ],
            ],
            'tags' => [
                'links' => [
                    'self' => "{$self}/relationships/tags",
                    'related' => "{$self}/tags",
                ],
            ],
        ],
        'links' => [
            'self' => $self,
        ],
    ];

    $response = $this
        ->jsonApi()
        ->expects('posts')
        ->get($self);

    $response->assertFetchedOneExact($expected);
}
```

In this test, we are going to check the entire serialized `posts` resource.
Therefore our `$expected` array contains the complete expected resource.
We use `assertFetchedOneExact` to do an exact match with the `/data` member
of the JSON:API response.

:::tip
If our `$expected` array only contained a partial serialization of the `posts`
resource, we would use `assertFetchedOne` instead.
:::

## Update Testing

We can test updating a `posts` resource as follows:

```php
use App\Models\Post;
use App\Models\Tags;

public function test(): void
{
    $post = Post::factory()->create();
    $post->tags()->attach($existing = Tag::factory()->create());
    $tags = Tag::factory()->count(2)->create();

    $data = [
        'type' => 'posts',
        'id' => (string) $post->getRouteKey(),
        'attributes' => [
            'content' => 'This is new article content.',
            'slug' => 'article-is-updated',
            'title' => 'Updated Article',
        ],
        'relationships' => [
            'tags' => [
                'data' => $tags->map(fn(Tag $tag) => [
                    'type' => 'tags',
                    'id' => (string) $tag->getRouteKey(),
                ])->all(),
            ],
        ],
    ];

    $response = $this
        ->actingAs($post->author)
        ->jsonApi()
        ->expects('posts')
        ->includePaths('tags')
        ->withData($data)
        ->patch('/api/v1/posts/' . $post->getRouteKey());

    $response->assertFetchedOne($expected);

    $this->assertDatabaseHas('posts', [
        'id' => $post->getKey(),
        'author_id' => $post->author_id,
        'content' => $data['attributes']['content'],
        'slug' => $data['attributes']['slug'],
        'title' => $data['attributes']['title'],
    ]);

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

In this test, we create an existing `post` and a JSON:API document that will
change both the `posts` resource and its associated `tags`. The
`assertFetchedOne` method checks that the response was a success and contains
a JSON:API document that matches the provided data. We then use database
assertions to ensure that the updated data has been stored in the database.

## Destroy (aka Delete) Testing

We can test deleting a `posts` resource as follows:

```php
use App\Models\Post;

public function test(): void
{
    $post = Post::factory()->create();

    $response = $this
        ->actingAs($post->author)
        ->jsonApi()
        ->delete('/api/v1/posts/' . $post->getRouteKey());

    $response->assertNoContent();

    $this->assertDatabaseMissing('posts', [
        'id' => $post->getKey(),
    ]);
}
```

In this example, we assert that we have received a `204 No Content` response.
We then check that the `Post` model no longer exists in the database.

:::tip
The JSON:API specification says that:

- A server MUST return a 204 No Content status code if a deletion request is
successful and no content is returned.
- A server MUST return a 200 OK status code if a deletion request is
successful and the server responds with only top-level meta data.

Therefore you should use either `assertNoContent` or `assertMetaWithoutData`
in your delete test.
:::
