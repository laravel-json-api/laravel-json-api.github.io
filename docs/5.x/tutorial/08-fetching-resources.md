# 8. Fetching Resources

## Introduction

In previous chapters, we've learnt how to use JSON:API requests to create,
read, update and delete a single blog post. In this chapter we'll explore how
you can use the JSON:API specification to fetch multiple blog posts in one
request.

We'll learn how to:

- paginate the resources returned in the response;
- filter resources;
- sort resources; and
- request specific fields per-resource type to reduce the response size.

## Fetching Post Resources

In JSON:API, you can fetch many resources in one request using the `GET` method
against the resource index. For example, we can retrieve many blog posts using
the following request:

```http
GET http://jsonapi-tutorial.test/api/v1/posts HTTP/1.1
Accept: application/vnd.api+json
```

Give this request a go, and you should see the following response:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "Unauthenticated.",
      "status": "401",
      "title": "Unauthorized"
    }
  ]
}
```

This tells us we need to update our authentication logic. Let's do that now.

### Authorization

Open the `app/Policies/PostPolicy.php` file and make the following changes to
the `viewAny()` method:

```diff
 /**
  * Determine whether the user can view any models.
  */
-public function viewAny(User $user): bool
+public function viewAny(?User $user): bool
 {
-    //
+    return true;
 }
```

By making the `$user` parameter nullable, we tell Laravel that guests are
allowed to view any post. This makes sense because we want the public to read
our blog posts.

However, it wouldn't make sense for a guest to see our draft blog posts. If you
remember from an earlier chapter, our authentication logic for accessing a
specific post said that only the author of the post could see a draft post.
That logic is in the `PostPolicy::view()` method.

Laravel JSON:API provides us with a way to filter out any draft posts if there
is no authenticated user. Open the `app/JsonApi/V1/Posts/PostSchema.php` file,
and make the following changes:

```diff
 namespace App\JsonApi\V1\Posts;

 use App\Models\Post;
+use Illuminate\Database\Eloquent\Builder;
+use Illuminate\Http\Request;
 use LaravelJsonApi\Eloquent\Contracts\Paginator;
 use LaravelJsonApi\Eloquent\Fields\DateTime;
 use LaravelJsonApi\Eloquent\Fields\ID;
 use LaravelJsonApi\Eloquent\Fields\Relations\BelongsTo;
 use LaravelJsonApi\Eloquent\Fields\Relations\BelongsToMany;
 use LaravelJsonApi\Eloquent\Fields\Relations\HasMany;
 use LaravelJsonApi\Eloquent\Fields\Str;
 use LaravelJsonApi\Eloquent\Filters\WhereIdIn;
 use LaravelJsonApi\Eloquent\Pagination\PagePagination;
 use LaravelJsonApi\Eloquent\Schema;

 class PostSchema extends Schema
 {

     /**
      * The model the schema corresponds to.
      *
      * @var string
      */
     public static string $model = Post::class;

     /**
      * The maximum include path depth.
      *
      * @var int
      */
     protected int $maxDepth = 3;

     /**
      * Get the resource fields.
      *
      * @return array
      */
     public function fields(): array
     {
         return [
             ID::make(),
             BelongsTo::make('author')->type('users')->readOnly(),
             HasMany::make('comments')->readOnly(),
             Str::make('content'),
             DateTime::make('createdAt')->sortable()->readOnly(),
             DateTime::make('publishedAt')->sortable(),
             Str::make('slug'),
             BelongsToMany::make('tags'),
             Str::make('title')->sortable(),
             DateTime::make('updatedAt')->sortable()->readOnly(),
         ];
     }

     /**
      * Get the resource filters.
      *
      * @return array
      */
     public function filters(): array
     {
         return [
             WhereIdIn::make($this),
         ];
     }

     /**
      * Get the resource paginator.
      *
      * @return Paginator|null
      */
     public function pagination(): ?Paginator
     {
         return PagePagination::make();
     }
+
+    /**
+     * Build an index query for this resource.
+     *
+     * @param Request|null $request
+     * @param Builder $query
+     * @return Builder
+     */
+    public function indexQuery(?Request $request, Builder $query): Builder
+    {
+        if ($user = optional($request)->user()) {
+            return $query->where(function (Builder $q) use ($user) {
+                return $q->whereNotNull('published_at')->orWhere('author_id', $user->getKey());
+            });
+        }
+
+        return $query->whereNotNull('published_at');
+    }
}
```

The `indexQuery()` method is called whenever the `posts` resource is being
fetched via the index route. This logic says that if there is a logged in user
(retrieved via the `$request`), then posts either need to be published (i.e.
have a value in their `published_at` column), or they need to belong to the
user (via the `author_id` column).

If there is no logged in user, then only posts that have a `published_at` value
will be returned.

### Fetching the Resources

Let's try our HTTP request again:

```http
GET http://jsonapi-tutorial.test/api/v1/posts HTTP/1.1
Accpet: application/vnd.api+json
```

This time we should see a success response, containing the one post that is
currently in our database:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "data": [
    {
      "type": "posts",
      "id": "1",
      "attributes": {
        "content": "In our first blog post, you will learn all about Laravel JSON:API...",
        "createdAt": "2024-09-30T17:37:00.000000Z",
        "publishedAt": "2024-09-30T17:37:00.000000Z",
        "slug": "welcome-to-laravel-jsonapi",
        "title": "Welcome to Laravel JSON:API",
        "updatedAt": "2024-09-30T17:37:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1"
      }
    }
  ]
}
```

Notice that the top-level `data` member is an array. This is because when we
are fetching many post resources, the response can have zero-to-many resources
in the `data` array.

## Model Factories

At the moment our blog application only has the one blog post. However, in a
real-life blog application there could be 10s, 100s or even 1000s of blog posts.
To try out the JSON:API features for paginating, filtering and sorting resources,
we will need to fill our database with a lot more `Post` models.

Laravel provides *Model Factories* to help us seed our database with lots of
models. If you open the `database/factories` folder, you'll see that we already
have a `UserFactory.php` file that helps us create `User` models.

Add a factory for our `Post` model using the following command:

```bash
herd php artisan make:factory PostFactory
```

That will create the `database/factories/PostFactory.php` file. Open that up
and make the following changes:

```diff
 namespace Database\Factories;

 use App\Models\Post;
+use App\Models\User;
 use Illuminate\Database\Eloquent\Factories\Factory;

 /**
  * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Post>
  */
 class PostFactory extends Factory
 {
     /**
      * Define the model's default state.
      *
      * @return array<string, mixed>
      */
     public function definition(): array
     {
         return [
-            //
+            'author_id' => User::factory(),
+            'content' => $this->faker->paragraphs(3, true),
+            'published_at' => $this->faker->boolean(75) ? $this->faker->dateTime : null,
+            'slug' => $this->faker->unique()->slug,
+            'title' => $this->faker->words(5, true),
         ];
     }
 }
```

Here the definition tells the factory how to create a `Post` model, using random
data supplied via a package called Faker.

We then need to create a database seed that will use this factory to fill our
`posts` database table with data. Run the following command:

```bash
herd php artisan make:seed PostsSeeder
```

This will create the `database/seeders/PostsSeeder.php` class. Open it and make
the following changes:

```diff
 namespace Database\Seeders;

+use App\Models\Post;
+use App\Models\User;
 use Illuminate\Database\Seeder;

 class PostsSeeder extends Seeder
 {
     /**
      * Run the database seeds.
      */
     public function run(): void
     {
-        //
+       $users = User::factory()->count(5)->create();
+
+       Post::factory()->count(100)->create([
+           'author_id' => fn() => $users->random(),
+       ]);
     }
 }
```

This creates 100 `Post` models, assigned to five different authors. Run the seed
now:

```bash
herd php artisan db:seed --class PostsSeeder
```

Once you've done this, try the HTTP request again:

```http
GET http://jsonapi-tutorial.test/api/v1/posts HTTP/1.1
Accept: application/vnd.api+json
```

You should now see that the top-level `data` member of the response JSON contains
lots of `posts` resources. In fact, it contains all 101 that are in the database.

## Pagination

Retrieving all the `posts` in one request can be quite inefficient. JSON:API
specifies that the `page` query parameter can be used by a client to obtain
a subset of the resources.

If you open your `app/JsonApi/V1/Posts/PostSchema.php` file, you'll notice
it already has a `pagination` method. This means our schema is already
configured to support pagination.

Say we wanted to retrieve the first page, with only 5 posts per-page, we
would use the following request:

```http
GET http://jsonapi-tutorial.test/api/v1/posts?page[number]=1&page[size]=5 HTTP/1.1
Accept: application/vnd.api+json
```

You will see a response like this:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "meta": {
    "page": {
      "currentPage": 1,
      "from": 1,
      "lastPage": 15,
      "perPage": 5,
      "to": 5,
      "total": 72
    }
  },
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "first": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts?page%5Bnumber%5D=1&page%5Bsize%5D=5",
    "last": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts?page%5Bnumber%5D=15&page%5Bsize%5D=5",
    "next": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts?page%5Bnumber%5D=2&page%5Bsize%5D=5"
  },
  "data": [
    {
      "type": "posts",
      "id": "1",
      "attributes": {
        "content": "In our first blog post, you will learn all about Laravel JSON:API...",
        "createdAt": "2024-09-30T17:37:00.000000Z",
        "publishedAt": "2024-09-30T17:37:00.000000Z",
        "slug": "welcome-to-laravel-jsonapi",
        "title": "Welcome to Laravel JSON:API",
        "updatedAt": "2024-09-30T17:37:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1"
      }
    },
    {
      "type": "posts",
      "id": "3",
      "attributes": {
        "content": "Aliquam nihil ipsum ut et ipsa et. Repellat dolore in quod quia accusamus consequatur labore. Optio rerum debitis odio impedit minima minus optio. Omnis ut sed itaque eum delectus.\n\nNumquam enim eius non dolorum. Enim provident et nulla totam. Aut dignissimos minus nihil consectetur cupiditate harum est.\n\nNemo maiores ut eligendi repellat distinctio impedit aspernatur. Possimus est et voluptate facilis harum iure sapiente. Autem et qui delectus voluptatem veritatis minima. Ea velit enim aut.",
        "createdAt": "2024-10-01T18:06:04.000000Z",
        "publishedAt": "1992-07-18T17:26:43.000000Z",
        "slug": "sequi-qui-sit-aut-corporis",
        "title": "quo ut expedita dignissimos est",
        "updatedAt": "2024-10-01T18:06:04.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3"
      }
    },
    {
      "type": "posts",
      "id": "6",
      "attributes": {
        "content": "Accusantium tempore excepturi et unde unde non dolorum. Sed ut et et. Illum corporis quis et debitis dignissimos aut assumenda. Ut unde sint consequatur autem.\n\nNon ex et asperiores soluta est possimus. Aliquam similique nam rerum vel veritatis est qui. In laudantium in reiciendis minus nobis consequatur non. Iusto omnis aut natus dignissimos.\n\nVelit dicta qui hic et quo. Molestias est maiores libero architecto nostrum tempore. Consequatur culpa et quasi.",
        "createdAt": "2024-10-01T18:06:04.000000Z",
        "publishedAt": "1982-06-06T12:25:15.000000Z",
        "slug": "et-dolores-expedita-id-quia-dolorem-rem",
        "title": "itaque possimus eos optio dolor",
        "updatedAt": "2024-10-01T18:06:04.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6"
      }
    },
    {
      "type": "posts",
      "id": "7",
      "attributes": {
        "content": "Beatae voluptas fuga asperiores sint molestiae dignissimos rem. Qui labore atque cumque tenetur sit natus quis. Reprehenderit qui quis quis voluptas dolor hic voluptas. Ipsum quos libero assumenda vel.\n\nEnim sunt aut velit voluptatem veritatis. Id quae voluptatem exercitationem eum. Quam eos ut incidunt sed rerum dolorem ullam.\n\nMagnam magni est ratione dolor. Vel dolor et eligendi qui. Est asperiores optio eos architecto est accusantium sequi et.",
        "createdAt": "2024-10-01T18:06:04.000000Z",
        "publishedAt": "2008-02-25T11:55:21.000000Z",
        "slug": "atque-harum-mollitia-repellendus-molestiae",
        "title": "et reprehenderit aliquam modi quidem",
        "updatedAt": "2024-10-01T18:06:04.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/7\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/7\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/7\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/7\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/7\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/7\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/7"
      }
    },
    {
      "type": "posts",
      "id": "9",
      "attributes": {
        "content": "Sint in ut omnis ratione. Voluptas voluptatum tempore quas voluptate a aut eum distinctio. Repudiandae quae deleniti praesentium nihil quia ut maxime quia.\n\nVitae ad asperiores quisquam quo aperiam nesciunt explicabo est. Debitis quo nam hic vero. Aut nemo neque quia dicta ducimus tenetur praesentium dolorem. Odit ipsam aut ipsa consequuntur culpa beatae.\n\nQuaerat laboriosam sapiente aut cupiditate veritatis quod. Voluptates ipsam aut laboriosam id non quia. Eum consectetur asperiores fugiat. Est commodi repudiandae sit corrupti itaque eaque.",
        "createdAt": "2024-10-01T18:06:04.000000Z",
        "publishedAt": "2014-09-03T17:22:09.000000Z",
        "slug": "consectetur-eius-soluta-soluta-id",
        "title": "totam officiis est repudiandae sit",
        "updatedAt": "2024-10-01T18:06:04.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9"
      }
    }
  ]
}
```

As you can see from the response, there is a top-level `links` member that
provides URLs for the `first`, `next` and `last` pages. We also have a top-level
`meta` member that contains information about the page we've received in the
response.

:::tip
Have a go at modifying the request `page` parameters to retrieve different
pages. You'll find that if you retrieve a page greater than `1`, there will be
a `prev` link - which is a link to the previous page.
:::

## Filtering

The JSON:API specification reserves the `filter` query parameter for filtering
data. The specification is agnostic about how filtering should be implemented -
it is up to each application to decide what filtering strategies they should use.
Laravel JSON:API makes it easy to implement filters via a resource's schema.

If you open the `app/JsonApi/V1/Posts/PostSchema.php` file, you'll notice that
the post schema already has a `filters()` method that looks like this:

```php
/**
 * Get the resource filters.
 *
 * @return array
 */
public function filters(): array
{
    return [
        WhereIdIn::make($this),
    ];
}
```

The `WhereIdIn` filter allows an API client to retrieve posts that have the
specified resource id. For example, if a client wanted to retrieve the `posts`
resources with ids `1`, `3` and `5`, it can use the following request:

```http
GET http://jsonapi-tutorial.test/api/v1/posts?filter[id][]=1&filter[id][]=3&filter[id][]=6 HTTP/1.1
Accept: application/vnd.api+json
```

When you give this request a go, you'll see a response like this:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "data": [
    {
      "type": "posts",
      "id": "1",
      "attributes": {
        "content": "In our first blog post, you will learn all about Laravel JSON:API...",
        "createdAt": "2024-09-30T17:37:00.000000Z",
        "publishedAt": "2024-09-30T17:37:00.000000Z",
        "slug": "welcome-to-laravel-jsonapi",
        "title": "Welcome to Laravel JSON:API",
        "updatedAt": "2024-09-30T17:37:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1"
      }
    },
    {
      "type": "posts",
      "id": "3",
      "attributes": {
        "content": "Aliquam nihil ipsum ut et ipsa et. Repellat dolore in quod quia accusamus consequatur labore. Optio rerum debitis odio impedit minima minus optio. Omnis ut sed itaque eum delectus.\n\nNumquam enim eius non dolorum. Enim provident et nulla totam. Aut dignissimos minus nihil consectetur cupiditate harum est.\n\nNemo maiores ut eligendi repellat distinctio impedit aspernatur. Possimus est et voluptate facilis harum iure sapiente. Autem et qui delectus voluptatem veritatis minima. Ea velit enim aut.",
        "createdAt": "2024-10-01T18:06:04.000000Z",
        "publishedAt": "1992-07-18T17:26:43.000000Z",
        "slug": "sequi-qui-sit-aut-corporis",
        "title": "quo ut expedita dignissimos est",
        "updatedAt": "2024-10-01T18:06:04.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3"
      }
    },
    {
      "type": "posts",
      "id": "6",
      "attributes": {
        "content": "Accusantium tempore excepturi et unde unde non dolorum. Sed ut et et. Illum corporis quis et debitis dignissimos aut assumenda. Ut unde sint consequatur autem.\n\nNon ex et asperiores soluta est possimus. Aliquam similique nam rerum vel veritatis est qui. In laudantium in reiciendis minus nobis consequatur non. Iusto omnis aut natus dignissimos.\n\nVelit dicta qui hic et quo. Molestias est maiores libero architecto nostrum tempore. Consequatur culpa et quasi.",
        "createdAt": "2024-10-01T18:06:04.000000Z",
        "publishedAt": "1982-06-06T12:25:15.000000Z",
        "slug": "et-dolores-expedita-id-quia-dolorem-rem",
        "title": "itaque possimus eos optio dolor",
        "updatedAt": "2024-10-01T18:06:04.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6"
      }
    }
  ]
}
```

:::tip
If you do not see all three posts in the response, remember we have set up our API to only return posts that are
published. As our seeder randomly decided whether a post was published or not, any missing posts from the response will
be in an _unpublished_ state, and therefore not shown as we are connecting to the API as a guest.
:::

### Implementing Filters

Laravel JSON:API ships with a lot of different filter classes you can add to
your schema. It is also easy to write your own filter classes if needed. We'll
demonstrate this now by adding a new filter to our `PostSchema` class.

Let's say we wanted to allow a client to filter `posts` by author. To do this,
we'll add a `WhereIn` filter to our `PostSchema`. Make the following changes to
class:

```diff
 namespace App\JsonApi\V1\Posts;

 use App\Models\Post;
 use Illuminate\Database\Eloquent\Builder;
 use Illuminate\Http\Request;
 use LaravelJsonApi\Eloquent\Contracts\Paginator;
 use LaravelJsonApi\Eloquent\Fields\DateTime;
 use LaravelJsonApi\Eloquent\Fields\ID;
 use LaravelJsonApi\Eloquent\Fields\Relations\BelongsTo;
 use LaravelJsonApi\Eloquent\Fields\Relations\BelongsToMany;
 use LaravelJsonApi\Eloquent\Fields\Relations\HasMany;
 use LaravelJsonApi\Eloquent\Fields\Str;
 use LaravelJsonApi\Eloquent\Filters\WhereIdIn;
+use LaravelJsonApi\Eloquent\Filters\WhereIn;
 use LaravelJsonApi\Eloquent\Pagination\PagePagination;
 use LaravelJsonApi\Eloquent\Schema;

 class PostSchema extends Schema
 {

     /**
      * The model the schema corresponds to.
      *
      * @var string
      */
     public static string $model = Post::class;

     /**
      * The maximum include path depth.
      *
      * @var int
      */
     protected int $maxDepth = 3;

     /**
      * Get the resource fields.
      *
      * @return array
      */
     public function fields(): array
     {
         return [
             ID::make(),
             BelongsTo::make('author')->type('users')->readOnly(),
             HasMany::make('comments')->readOnly(),
             Str::make('content'),
             DateTime::make('createdAt')->sortable()->readOnly(),
             DateTime::make('publishedAt')->sortable(),
             Str::make('slug'),
             BelongsToMany::make('tags'),
             Str::make('title')->sortable(),
             DateTime::make('updatedAt')->sortable()->readOnly(),
         ];
     }

     /**
      * Get the resource filters.
      *
      * @return array
      */
     public function filters(): array
     {
         return [
             WhereIdIn::make($this),
+            WhereIn::make('author', 'author_id'),
         ];
     }

     /**
      * Get the resource paginator.
      *
      * @return Paginator|null
      */
     public function pagination(): ?Paginator
     {
         return PagePagination::make();
     }

     /**
      * Build an index query for this resource.
      *
      * @param Request|null $request
      * @param Builder $query
      * @return Builder
      */
     public function indexQuery(?Request $request, Builder $query): Builder
     {
         if ($user = optional($request)->user()) {
             return $query->where(function (Builder $q) use ($user) {
                 return $q->whereNotNull('published_at')->orWhere('author_id', $user->getKey());
             });
         }

         return $query->whereNotNull('published_at');
     }
 }
```

Here we have added a filter called `author`, which will be applied to the `author_id`
column. Now if our client wants to retrieve `posts` that were written by authors
`1` and `3`, it can send the following request:

```http
GET http://jsonapi-tutorial.test/api/v1/posts?filter[author][]=1&filter[author][]=3&include=author&page[number]=1&page[size]=5 HTTP/1.1
Accept: application/vnd.api+json
```

Notice we've used an `include` path of `author`. We covered include paths in a
previous chapter. Here we include the author so that we can see in the response
that the posts returned belong to the two authors we filtered by. We've also
requested a `page` - so that we get a sensible amount of resources returned.

Give the request a go, and you should see a response like this:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "meta": {
    "page": {
      "currentPage": 1,
      "from": 1,
      "lastPage": 3,
      "perPage": 5,
      "to": 5,
      "total": 12
    }
  },
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "first": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts?filter%5Bauthor%5D%5B0%5D=1&filter%5Bauthor%5D%5B1%5D=3&include=author&page%5Bnumber%5D=1&page%5Bsize%5D=5",
    "last": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts?filter%5Bauthor%5D%5B0%5D=1&filter%5Bauthor%5D%5B1%5D=3&include=author&page%5Bnumber%5D=3&page%5Bsize%5D=5",
    "next": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts?filter%5Bauthor%5D%5B0%5D=1&filter%5Bauthor%5D%5B1%5D=3&include=author&page%5Bnumber%5D=2&page%5Bsize%5D=5"
  },
  "data": [
    {
      "type": "posts",
      "id": "1",
      "attributes": {
        "content": "In our first blog post, you will learn all about Laravel JSON:API...",
        "createdAt": "2024-09-30T17:37:00.000000Z",
        "publishedAt": "2024-09-30T17:37:00.000000Z",
        "slug": "welcome-to-laravel-jsonapi",
        "title": "Welcome to Laravel JSON:API",
        "updatedAt": "2024-09-30T17:37:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "1"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1"
      }
    },
    {
      "type": "posts",
      "id": "9",
      "attributes": {
        "content": "Sint in ut omnis ratione. Voluptas voluptatum tempore quas voluptate a aut eum distinctio. Repudiandae quae deleniti praesentium nihil quia ut maxime quia.\n\nVitae ad asperiores quisquam quo aperiam nesciunt explicabo est. Debitis quo nam hic vero. Aut nemo neque quia dicta ducimus tenetur praesentium dolorem. Odit ipsam aut ipsa consequuntur culpa beatae.\n\nQuaerat laboriosam sapiente aut cupiditate veritatis quod. Voluptates ipsam aut laboriosam id non quia. Eum consectetur asperiores fugiat. Est commodi repudiandae sit corrupti itaque eaque.",
        "createdAt": "2024-10-01T18:06:04.000000Z",
        "publishedAt": "2014-09-03T17:22:09.000000Z",
        "slug": "consectetur-eius-soluta-soluta-id",
        "title": "totam officiis est repudiandae sit",
        "updatedAt": "2024-10-01T18:06:04.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "3"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9"
      }
    },
    {
      "type": "posts",
      "id": "12",
      "attributes": {
        "content": "Necessitatibus hic dolorem aliquid similique. Omnis aperiam hic sequi est quas. Odit molestiae hic sit aut. Doloribus velit aut error delectus. Odit laborum qui consequatur doloribus ipsum.\n\nTempore consequatur tempore quia quia quam officia. Id facilis blanditiis quia officia. Qui nihil officiis beatae. Velit sunt quas distinctio. Ut aut corrupti amet est aut recusandae.\n\nCupiditate sunt ut praesentium nulla. Enim sunt deserunt quae quia et voluptatem ut molestiae. Eius porro ratione molestiae omnis. Facilis quo eveniet consequatur modi nulla commodi qui.",
        "createdAt": "2024-10-01T18:06:04.000000Z",
        "publishedAt": "1983-03-14T06:45:17.000000Z",
        "slug": "eum-ut-unde-quis-est-saepe-voluptate",
        "title": "odio iure non perferendis veniam",
        "updatedAt": "2024-10-01T18:06:04.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/12\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/12\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "3"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/12\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/12\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/12\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/12\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/12"
      }
    },
    {
      "type": "posts",
      "id": "17",
      "attributes": {
        "content": "Maiores aut ea et voluptas placeat. Velit quisquam eum ut delectus sapiente accusamus unde sit.\n\nAut qui ut dignissimos autem. Ullam officia provident inventore doloremque ratione. Tenetur assumenda sed itaque aut quo. Quia quisquam porro est qui labore.\n\nVoluptas cumque a velit voluptate perspiciatis sit ullam. Sed et velit beatae veniam eum. Voluptas quam in non nulla laudantium autem commodi. Modi fugiat est qui inventore.",
        "createdAt": "2024-10-01T18:06:04.000000Z",
        "publishedAt": "2021-10-04T16:30:48.000000Z",
        "slug": "et-delectus-ad-sit-velit",
        "title": "quo sunt at modi quos",
        "updatedAt": "2024-10-01T18:06:04.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/17\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/17\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "3"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/17\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/17\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/17\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/17\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/17"
      }
    },
    {
      "type": "posts",
      "id": "29",
      "attributes": {
        "content": "Veniam impedit quisquam corporis. Quia accusantium sunt id fugit corporis sed et. Alias adipisci fugiat dolor expedita eum sint corrupti cum. Vitae rerum quam delectus consequatur suscipit repellendus.\n\nConsequatur facilis molestias pariatur consequatur placeat. Saepe et id molestiae et sint ut. Enim voluptas voluptates dolores et expedita nihil delectus. Saepe hic quo temporibus neque.\n\nIllum praesentium sed veniam. Eum architecto doloremque dicta minus dicta. Architecto earum sequi sed.",
        "createdAt": "2024-10-01T18:06:04.000000Z",
        "publishedAt": "1992-05-05T03:48:05.000000Z",
        "slug": "et-porro-nam-cum-repellat-natus",
        "title": "eum voluptatibus nam in ratione",
        "updatedAt": "2024-10-01T18:06:04.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/29\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/29\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "3"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/29\/comments",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/29\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/29\/tags",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/29\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/29"
      }
    }
  ],
  "included": [
    {
      "type": "users",
      "id": "1",
      "attributes": {
        "createdAt": "2024-09-30T17:36:59.000000Z",
        "name": "Artie Shaw",
        "updatedAt": "2024-09-30T17:36:59.000000Z"
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/users\/1"
      }
    },
    {
      "type": "users",
      "id": "3",
      "attributes": {
        "createdAt": "2024-10-01T18:06:04.000000Z",
        "name": "Zola Wilderman",
        "updatedAt": "2024-10-01T18:06:04.000000Z"
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/users\/3"
      }
    }
  ]
}
```

You'll notice in the above response that only `posts` written by the `users`
with ids of `1` and `3` have been returned.

## Sorting

The JSON:API specification reserves the `sort` query parameter for clients to
request resource in a specific order. Our `PostSchema` already has a few fields
configured to be sortable in the `fields()` method:

```php
public function fields(): array
{
    return [
        ID::make(),
        BelongsTo::make('author')->type('users')->readOnly(),
        HasMany::make('comments')->readOnly(),
        Str::make('content'),
        DateTime::make('createdAt')->sortable()->readOnly(),
        DateTime::make('publishedAt')->sortable(),
        Str::make('slug'),
        BelongsToMany::make('tags'),
        Str::make('title')->sortable(),
        DateTime::make('updatedAt')->sortable()->readOnly(),
    ];
}
```

Notice how the `createdAt`, `publishedAt`, `title` and `updatedAt` fields are
marked as sortable via the `sortable()` method.

Let's say our client wanted to retrieve the 3 most recently published blog posts.
We can retrieve these using a `sort` query parameter with a value of `-publishedAt`,
with the `-` denoting a descending order. To get only 3 blog posts, we'll combine
this `sort` query parameter with the `page` query parameter.

Our request looks like this:

```http
GET http://jsonapi-tutorial.test/api/v1/posts?sort=-publishedAt&page[number]=1&page[size]=3 HTTP/1.1
Accept: application/vnd.api+json
```

Give it a go, and you should see the 3 most recently published `posts` resources
in the response.

## Sparse Fieldsets

The JSON:API specification has a feature called *Sparse Fieldsets*. This allows
an API client to request only specific fields in the response on a per-resource
type basis. The `fields` query parameter is used for this feature.

Let's say our API client was a frontend application. In this application, we
might want to display a list of blog posts - but only show the title, author
name and published date.

In this example, our client only needs the `author`, `publishedAt` and `title`
fields of the `posts` resource. For the `users` resource that will be in the
`author` relationship, we only need the `name` field (so that we can display
the author's name).

We can specify this in the request by listing these fields on a per-resource type
basis:

```
fields[posts]=author,publishedAt,title&fields[users]=name
```

As we want the author to be included in the response, we will need to use the
`include` path. We will also add page information so we only retrieve 5 results
at once. Putting these together, our request looks like this:

```http
GET http://jsonapi-tutorial.test/api/v1/posts?fields[posts]=author,publishedAt,title&fields[users]=name&include=author&page[number]=1&page[size]=5 HTTP/1.1
Accept: application/vnd.api+json
```

Give this request a go, and you should see a response like this:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "meta": {
    "page": {
      "currentPage": 1,
      "from": 1,
      "lastPage": 15,
      "perPage": 5,
      "to": 5,
      "total": 72
    }
  },
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "first": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts?fields%5Bposts%5D=author%2CpublishedAt%2Ctitle&fields%5Busers%5D=name&include=author&page%5Bnumber%5D=1&page%5Bsize%5D=5",
    "last": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts?fields%5Bposts%5D=author%2CpublishedAt%2Ctitle&fields%5Busers%5D=name&include=author&page%5Bnumber%5D=15&page%5Bsize%5D=5",
    "next": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts?fields%5Bposts%5D=author%2CpublishedAt%2Ctitle&fields%5Busers%5D=name&include=author&page%5Bnumber%5D=2&page%5Bsize%5D=5"
  },
  "data": [
    {
      "type": "posts",
      "id": "1",
      "attributes": {
        "publishedAt": "2024-09-30T17:37:00.000000Z",
        "title": "Welcome to Laravel JSON:API"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "1"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1"
      }
    },
    {
      "type": "posts",
      "id": "3",
      "attributes": {
        "publishedAt": "1992-07-18T17:26:43.000000Z",
        "title": "quo ut expedita dignissimos est"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "7"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/3"
      }
    },
    {
      "type": "posts",
      "id": "6",
      "attributes": {
        "publishedAt": "1982-06-06T12:25:15.000000Z",
        "title": "itaque possimus eos optio dolor"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "5"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/6"
      }
    },
    {
      "type": "posts",
      "id": "7",
      "attributes": {
        "publishedAt": "2008-02-25T11:55:21.000000Z",
        "title": "et reprehenderit aliquam modi quidem"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/7\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/7\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "4"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/7"
      }
    },
    {
      "type": "posts",
      "id": "9",
      "attributes": {
        "publishedAt": "2014-09-03T17:22:09.000000Z",
        "title": "totam officiis est repudiandae sit"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/author",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "3"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/9"
      }
    }
  ],
  "included": [
    {
      "type": "users",
      "id": "1",
      "attributes": {
        "name": "Artie Shaw"
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/users\/1"
      }
    },
    {
      "type": "users",
      "id": "7",
      "attributes": {
        "name": "Frederique Block IV"
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/users\/7"
      }
    },
    {
      "type": "users",
      "id": "5",
      "attributes": {
        "name": "Dalton Kreiger Jr."
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/users\/5"
      }
    },
    {
      "type": "users",
      "id": "4",
      "attributes": {
        "name": "Hester Beer"
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/users\/4"
      }
    },
    {
      "type": "users",
      "id": "3",
      "attributes": {
        "name": "Zola Wilderman"
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/users\/3"
      }
    }
  ]
}
```

Notice how each `posts` resource now only has the `publishedAt` and `title`
attributes; and in the relationships, only `author` appears. Our `users`
resources that are in the top-level `included` member of the response only
have the `name` field.

This means our frontend application has received only the fields it actually
intends to display, which makes the response more efficient in terms of data
transfer size.

## Validating Query Parameters

When writing HTTP applications, it is important to ensure that data sent by a
client is always validated. In all of the above requests, Laravel JSON:API
performs some basic validation to ensure that the query parameters match what
is in the `PostSchema` class - e.g. ensuring that a provided `sort` parameter
is a field that is actually marked as sortable.

We can improve the validation to ensure there are some more specific rules,
e.g. ensuring the `author` filter only receives integer ids.

Run the following command:

```bash
herd php artisan jsonapi:query posts --collection
```

This will generate the `app/JsonApi/V1/Posts/PostCollectionQuery.php` file. This
is where we need to put the rules that apply to query parameters when the client
is requesting zero-to-many `posts` resources.

Open the file and make the following changes:

```diff
 namespace App\JsonApi\V1\Posts;

 use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;
 use LaravelJsonApi\Validation\Rule as JsonApiRule;

 class PostCollectionQuery extends ResourceQuery
 {

     /**
      * Get the validation rules that apply to the request query parameters.
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
                 JsonApiRule::filter(),
             ],
+            'filter.author' => 'array',
+            'filter.author.*' => 'integer',
+            'filter.id' => 'array',
+            'filter.id.*' => 'integer',
             'include' => [
                 'nullable',
                 'string',
                 JsonApiRule::includePaths(),
             ],
             'page' => [
                 'nullable',
                 'array',
                 JsonApiRule::page(),
             ],
+            'page.number' => ['integer', 'min:1'],
+            'page.size' => ['integer', 'between:1,100'],
             'sort' => [
                 'nullable',
                 'string',
                 JsonApiRule::sort(),
             ],
             'withCount' => [
                 'nullable',
                 'string',
                 JsonApiRule::countable(),
             ],
         ];
     }
 }
```

Here we have done a number of things:

- Our `filter[author]` will now only accept integers.
- Our `filter[id]` will also now only accept integers.
- The `page[number]` is correctly validated as an integer with a mimimum of `1`.
- The `page[size]` is correctly validated as an integer between `1` and `100`.

The following request now has an invalid page size:

```http
GET http://jsonapi-tutorial.test/api/v1/posts?page[number]=1&page[size]=150 HTTP/1.1
Accept: application/vnd.api+json
```

Give it a go, and you'll see this response:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "The page.size field must be between 1 and 100.",
      "source": {
        "parameter": "page.size"
      },
      "status": "400",
      "title": "Invalid Query Parameter"
    }
  ]
}
```

Notice that in the error above there is a `source.parameter` field that points
to where in the query parameters the error has occurred.

## In Summary

In this chapter, we covered fetching many blog posts in one request. We explored
several different JSON:API features - pagination, filtering, sorting and sparse
fieldsets.

That's the end of our tutorial. You should now have a good grasp of JSON:API,
and how Laravel JSON:API makes implementing this specification in Laravel
easy.

Good luck building your first Laravel JSON:API application!
