# 4. Relationships

## Introduction

In this chapter, we are going to:

- add relationships to our `posts` resource.
- add JSON:API relationship endpoints and access the values of the relationships
  via these endpoints; and
- use the JSON:API `include` query parameter to eager load the post's
  relationships in a single request.

## Relationship Fields

When we created our `Post` model, we added a number of relationships to it -
namely the `author`, the `tags` and the `comments`. Now we need to add these
relationships to our `posts` resource.

Laravel JSON:API provides relationship *fields* that match all of the Eloquent
relationships. All we need to do is add these fields to our `PostSchema` class,
in the `fields()` method.

Make the following changes to your `app/JsonApi/V1/Posts/PostSchema.php` file:

```diff
 namespace App\JsonApi\V1\Posts;

 use App\Models\Post;
 use LaravelJsonApi\Eloquent\Contracts\Paginator;
 use LaravelJsonApi\Eloquent\Fields\DateTime;
 use LaravelJsonApi\Eloquent\Fields\ID;
+use LaravelJsonApi\Eloquent\Fields\Relations\BelongsTo;
+use LaravelJsonApi\Eloquent\Fields\Relations\BelongsToMany;
+use LaravelJsonApi\Eloquent\Fields\Relations\HasMany;
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
      * Get the resource fields.
      *
      * @return array
      */
     public function fields(): array
     {
         return [
             ID::make(),
+            BelongsTo::make('author')->type('users')->readOnly(),
+            HasMany::make('comments')->readOnly(),
             Str::make('content'),
             DateTime::make('createdAt')->sortable()->readOnly(),
             DateTime::make('publishedAt')->sortable(),
             Str::make('slug'),
+            BelongsToMany::make('tags'),
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

 }
```

As you can see, it's easy to add relationships.

## Related Schemas

As these relationships will return `User`, `Comment` and `Tag` models, we now
need to create schemas for all three models. This is so that when Laravel
JSON:API encounters these models, it knows how to serialise them to
JSON:API resources.

Create the schemas by running the following commands:

```bash
herd php artisan jsonapi:schema comments
herd php artisan jsonapi:schema tags
herd php artisan jsonapi:schema user
```

This will create the following three files:

- `app/JsonApi/V1/Comments/CommentSchema.php`
- `app/JsonApi/V1/Tags/TagSchema.php`
- `app/JsonApi/V1/Users/UserSchema.php`

Just as we did with our `PostSchema`, we need to add fields to each of these
schemas so that the resources have the correct fields when serialising to JSON.

Make the following changes to the `CommentSchema`:

```diff
 namespace App\JsonApi\V1\Comments;

 use App\Models\Comment;
 use LaravelJsonApi\Eloquent\Contracts\Paginator;
 use LaravelJsonApi\Eloquent\Fields\DateTime;
 use LaravelJsonApi\Eloquent\Fields\ID;
+use LaravelJsonApi\Eloquent\Fields\Relations\BelongsTo;
+use LaravelJsonApi\Eloquent\Fields\Str;
 use LaravelJsonApi\Eloquent\Filters\WhereIdIn;
 use LaravelJsonApi\Eloquent\Pagination\PagePagination;
 use LaravelJsonApi\Eloquent\Schema;

 class CommentSchema extends Schema
 {

     /**
      * The model the schema corresponds to.
      *
      * @var string
      */
     public static string $model = Comment::class;

     /**
      * Get the resource fields.
      *
      * @return array
      */
     public function fields(): array
     {
         return [
             ID::make(),
+            Str::make('content'),
             DateTime::make('createdAt')->sortable()->readOnly(),
             DateTime::make('updatedAt')->sortable()->readOnly(),
+            BelongsTo::make('user')->readOnly(),
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

 }
```

Then our `TagSchema` needs the following changes:

```diff
 namespace App\JsonApi\V1\Tags;

 use App\Models\Tag;
 use LaravelJsonApi\Eloquent\Contracts\Paginator;
 use LaravelJsonApi\Eloquent\Fields\DateTime;
 use LaravelJsonApi\Eloquent\Fields\ID;
+use LaravelJsonApi\Eloquent\Fields\Str;
 use LaravelJsonApi\Eloquent\Filters\WhereIdIn;
 use LaravelJsonApi\Eloquent\Pagination\PagePagination;
 use LaravelJsonApi\Eloquent\Schema;

 class TagSchema extends Schema
 {

     /**
      * The model the schema corresponds to.
      *
      * @var string
      */
     public static string $model = Tag::class;

     /**
      * Get the resource fields.
      *
      * @return array
      */
     public function fields(): array
     {
         return [
             ID::make(),
             DateTime::make('createdAt')->sortable()->readOnly(),
+            Str::make('name'),
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

 }
```

And finally, our `UserSchema` also needs a `name` field:

```diff
 namespace App\JsonApi\V1\Users;

 use App\Models\User;
 use LaravelJsonApi\Eloquent\Contracts\Paginator;
 use LaravelJsonApi\Eloquent\Fields\DateTime;
 use LaravelJsonApi\Eloquent\Fields\ID;
+use LaravelJsonApi\Eloquent\Fields\Str;
 use LaravelJsonApi\Eloquent\Filters\WhereIdIn;
 use LaravelJsonApi\Eloquent\Pagination\PagePagination;
 use LaravelJsonApi\Eloquent\Schema;

 class UserSchema extends Schema
 {

     /**
      * The model the schema corresponds to.
      *
      * @var string
      */
     public static string $model = User::class;

     /**
      * Get the resource fields.
      *
      * @return array
      */
     public function fields(): array
     {
         return [
             ID::make(),
             DateTime::make('createdAt')->sortable()->readOnly(),
+            Str::make('name'),
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

 }
```

Now we've created these schemas, we need to add them to our API server. Open
the `app/JsonApi/V1/Server.php` class and modify the `allSchemas()` method:

```diff
 protected function allSchemas(): array
 {
     return [
+        Comments\CommentSchema::class,
         Posts\PostSchema::class,
+        Tags\TagSchema::class,
+        Users\UserSchema::class,
     ];
 }
```

## Relationship Endpoints

Now that we've added the relationships and schemas of the related models, we
expect to see the relationships when we request the `posts` resource. Give that
a go now with same request you used in the previous chapter:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/1 HTTP/1.1
Accept: application/vnd.api+json
```

The response JSON now looks like this:

```json
{
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1"
  },
  "data": {
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
}
```

As you can see, our `posts` resource now has a `relationships` member that
contains the three relationships. At the moment, we don't see the content of
each relationship - we see the URLs for the JSON:API defined relationship
endpoints - one called `related` and one called `self`. These links provide
information to the client so that it can programmatically follow these links
to obtain the related resources.

Let's try the `related` link for the `author` relationship, using this request:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/1/author HTTP/1.1
Accept: application/vnd.api+json
```

You should see this response:

```http
HTTP/1.0 404 Not Found
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "The route api\/v1\/posts\/1\/author could not be found.",
      "status": "404",
      "title": "Not Found"
    }
  ]
}
```

This tells us we need to add these routes to the Laravel router. Let's do that
now.

### Routing

Update your `/routes/api.php` to add the following:

```diff
 use Illuminate\Http\Request;
 use Illuminate\Support\Facades\Route;
 use LaravelJsonApi\Laravel\Facades\JsonApiRoute;
 use LaravelJsonApi\Laravel\Http\Controllers\JsonApiController;
 use LaravelJsonApi\Laravel\Routing\ResourceRegistrar;
+use LaravelJsonApi\Laravel\Routing\Relationships;

 Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
     return $request->user();
 });

 JsonApiRoute::server('v1')->prefix('v1')->resources(function (ResourceRegistrar $server) {
-    $server->resource('posts', JsonApiController::class)->readOnly();
+    $server->resource('posts', JsonApiController::class)
+        ->readOnly()
+        ->relationships(function (Relationships $relations) {
+            $relations->hasOne('author')->readOnly();
+            $relations->hasMany('comments')->readOnly();
+            $relations->hasMany('tags')->readOnly();
+        });
 });
```

The `relationships()` method allows us to define relationship routes for the
`posts` resource. It is provided with the `$relations` helper, and we use that
to add our relationships. Notice we use either `hasOne()` or `hasMany()`
depending on whether the relationship is a *to-one* or *to-many* relationship.

At the moment we've marked these as read-only. This adds the following routes:

- `GET /api/v1/posts/<ID>/<RELATION_NAME>`
- `GET /api/v1/posts/<ID>/relationships/<RELATION_NAME>`

The first one of those is the `GET` request we previously tried. Let's try it
again:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/1/author HTTP/1.1
Accept: application/vnd.api+json
```

You should see this response:

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

Just as we saw in the previous chapter, we need to update our authorization
logic to allow this request.

### Authorization

Our authorization logic is contained on our `app/Policies/PostPolicy.php` class.
We need to add new methods to that, to authorize each relationship request. Do
that by adding the following methods after the existing `view()` method:

```diff
 /**
  * Determine whether the user can view the model.
  */
 public function view(?User $user, Post $post): bool
 {
     if ($post->published_at) {
         return true;
     }

     return $user && $user->is($post->author);
 }

+/**
+ * Determine whether the user can view the post's author.
+ */
+public function viewAuthor(?User $user, Post $post): bool
+{
+    return $this->view($user, $post);
+}

+/**
+ * Determine whether the user can view the post's comments.
+ */
+public function viewComments(?User $user, Post $post): bool
+{
+    return $this->view($user, $post);
+}

+/**
+ * Determine whether the user can view the post's tags.
+ */
+public function viewTags(?User $user, Post $post): bool
+{
+    return $this->view($user, $post);
+}
```

These methods determine whether the guest or user can view the post's
relationships. For example, the `viewAuthor()` method determines whether they
can view the post's author. That's why it is on the `PostPolicy` - we are
viewing a specific post's author, so we need to authorize the request for that
specific post.

The above code you added calls the `view()` method, because we want the logic
to be identical to the logic for viewing a specific post.

### The Related Link

Now we've updated the authorization logic, try the request again:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/1/author HTTP/1.1
Accept: application/vnd.api+json
```

Success! We can now see that *Artie Shaw* is the author of the post:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/author"
  },
  "data": {
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
  }
}
```

We can see that because the `related` relationship endpoint shows us the entire
related resource - i.e. we see the `users` resource with all its `attributes`.

:::tip
Have a go at requesting the `related` endpoints for the `comments` and `tags`
relationships.
:::

### The Self Link

The JSON:API specification also defines a `self` link for each relationship,
which you could see in our `posts` resource earlier in the chapter. Let's
try that endpoint with this request:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/1/relationships/author HTTP/1.1
Accept: application/vnd.api+json
```

This time you'll see the following response:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/author",
    "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1\/relationships\/author"
  },
  "data": {
    "type": "users",
    "id": "1"
  }
}
```

Notice this time in the `data` member of the response, we can only see the
`type` and `id` of the related resource. This is because the `self` relationship
link returns just the *resource identifier* - i.e. the `type` and `id` that
uniquely identify the related resource.

:::tip
Have a go at requesting the `self` endpoints for the `comments` and `tags`
relationships.
:::

## Including Related Resources

While these relationships are useful, what happens if our API client wanted to
retrieve a post and its related resources? If we had to use the relationship
endpoints, the client would end up needing to send multiple HTTP requests to
assemble all the data it needed.

Luckily the JSON:API specification provides us with a way to do this - the
`include` query parameter.

Imagine the API client is a frontend Javascript application. If it was going
to display a specific blog post, it would likely want to show the post and the
name of the related author. It would also want to show all the comments that
have been made about the post, plus the name of the user who wrote the comment.

To do this, we need to set the `include` query parameter to:
`author,comments.user`. This says, we want to include the post's author, plus
its comments and each user attached to each comment.

Try that in the following request:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/1?include=author,comments.user HTTP/1.1
Accept: application/vnd.api+json
```

And you'll see the following response:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "Include path comments.user is not allowed.",
      "source": {
        "parameter": "include"
      },
      "status": "400",
      "title": "Invalid Query Parameter"
    }
  ]
}
```

That error message tells us that we cannot include `comments.user`. This is
because by default Laravel JSON:API only allows include paths with a depth of
1 (e.g. our `author`), whereas `comments.user` has a depth of 2. To allow
a depth of 2, we update our `app/JsonApi/V1/Posts/PostSchema.php` class:

```diff
 namespace App\JsonApi\V1\Posts;

 use App\Models\Post;
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

+    /**
+     * The maximum include path depth.
+     *
+     * @var int
+     */
+    protected int $maxDepth = 3;

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

 }
```

Retry the request, and you should now see the following response:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/1"
  },
  "data": {
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
        },
        "data": [
          {
            "type": "comments",
            "id": "1"
          }
        ]
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
      "type": "comments",
      "id": "1",
      "attributes": {
        "content": "Wow! Great first blog article. Looking forward to more!",
        "createdAt": "2024-09-30T17:37:00.000000Z",
        "updatedAt": "2024-09-30T17:37:00.000000Z"
      },
      "relationships": {
        "user": {
          "links": {
            "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/comments\/1\/user",
            "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/comments\/1\/relationships\/user"
          },
          "data": {
            "type": "users",
            "id": "2"
          }
        }
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/comments\/1"
      }
    },
    {
      "type": "users",
      "id": "2",
      "attributes": {
        "createdAt": "2024-09-30T17:37:00.000000Z",
        "name": "Benny Goodman",
        "updatedAt": "2024-09-30T17:37:00.000000Z"
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/users\/2"
      }
    }
  ]
}
```

In this response, our `posts` resource is in the top-level `data` member of the
JSON. Notice that the `author` and `comments` relationships now have a `data`
member in addition to the `links` member. The relationship `data` contains
a JSON:API *resource identifier* - i.e. the `type` and `id` that uniquely
identifies the related author and comments.

The related resources that are referenced by those identifiers are found in the
top-level `included` member of the JSON document. It's an array, containing
all the related resources referenced in the document. In JSON:API this is known
as a *Compound Document*.

This means as well as displaying the post, our frontend would now be able to
display the author's name. It could then also display the comment, and the
name of the user who wrote that comment.

:::tip
Want to see the post and all its tags? Try changing the `include` query
parameter to `tags`.
:::

## In Summary

In this chapter, we added relationships to our `posts` resource and defined
the related resources by adding several new schemas. We then learnt what
JSON:API relationship endpoints are, and also used the `include` query
parameter to request a *compound document* containing the post and its related
resources.

In the [next chapter](05-creating-resources.md) we'll learn how to create a
new `posts` resource.
