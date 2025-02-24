# 5. Creating Resources

## Introduction

In this chapter, we will learn how to create resources using the JSON:API
specification. By the end of the chapter, you will be able to create a `posts`
resource.

## Create Requests

In JSON:API, requests to create a resource use the `POST` method. The request
must have a `Content-Type` header of `application/vnd.api+json` - which is the
JSON:API media type.

The request body must be a JSON:API document, with the new resource contained
in the `data` member of the JSON body. The resource contained in the `data`
member must have a `type` indicating the resource type it represents, and then
can have `attributes` and `relationships` representing the resource's fields.

Putting this all together, our request to create a new post in our blog
application will look like this:

```http
POST http://jsonapi-tutorial.test/api/v1/posts?include=author,tags HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "attributes": {
      "content": "In our second blog post, you will learn how to create resources using the JSON:API specification.",
      "publishedAt": null,
      "slug": "creating-jsonapi-resources",
      "title": "How to Create JSON:API Resources"
    },
    "relationships": {
      "tags": {
        "data": [
          {
            "type": "tags",
            "id": "2"
          }
        ]
      }
    }
  }
}
```

:::tip
Notice that for the relationships, all we need to do is send the *resource identifier*
of the related resource we want to associate to this new post. The resource
identifier is the `type` and `id` of the related resource.
:::

Before we attempt this request, there's a few things we need to setup for our
`posts` resource so that it can handle the create request.

## Validation

When receiving the request to create a resource, one thing our server will need
to do is validate the JSON that the client has sent. In Laravel JSON:API,
we do this using a request class - which will be `PostRequest` for our `posts`
resource.

Generate the request class by running the following command:

```bash
herd php artisan jsonapi:request posts
```

This will generate the `app/JsonApi/V1/Posts/PostRequest.php` file, which looks
like this:

```php
namespace App\JsonApi\V1\Posts;

use Illuminate\Validation\Rule;
use LaravelJsonApi\Laravel\Http\Requests\ResourceRequest;
use LaravelJsonApi\Validation\Rule as JsonApiRule;

class PostRequest extends ResourceRequest
{

    /**
     * Get the validation rules for the resource.
     *
     * @return array
     */
    public function rules(): array
    {
        return [
            // @TODO
        ];
    }

}
```

All we need to do is add our validation rules to the `rules()` method. Update
that in your `PostRequest` class to look like this:

```diff
 public function rules(): array
 {
     return [
-        // @TODO
+        'content' => ['required', 'string'],
+        'publishedAt' => ['nullable', JsonApiRule::dateTime()],
+        'slug' => ['required', 'string', Rule::unique('posts', 'slug')],
+        'tags' => JsonApiRule::toMany(),
+        'title' => ['required', 'string'],
     ];
 }
```

Notice that the keys of our validation rules do not need to specify the full
path of each field. E.g. instead of `data.attributes.title` we just use `title`.
The same applies to relationships. Instead of `data.relationships.tags.data`
we just use `tags`.

And that's all we need to do to setup our validator. It's worth mentioning that
in Laravel JSON:API you **must always** create validation rules for any
resource that can be created or modified. This is because only validated data
will be filled into the model - which is standard best practice for any
Laravel application.

## The Author Relationship

You may remember that our `Post` model has an `author` relationship, that
represents the user who wrote the blog post. However, in our create request
(above) we have not specified the `author` relationship in the JSON body.

This is because it would make sense for the application to automatically assign
the authenticated user as the author of a post when the model is created. This
is easy to add in our application using the model `creating` event.

Open the `app/JsonApi/V1/Server.php` class, and update it as follows:

```diff
 namespace App\JsonApi\V1;

+use App\Models\Post;
+use Illuminate\Support\Facades\Auth;
 use LaravelJsonApi\Core\Server\Server as BaseServer;

 class Server extends BaseServer
 {

     /**
      * The base URI namespace for this server.
      *
      * @var string
      */
     protected string $baseUri = '/api/v1';

     /**
      * Bootstrap the server when it is handling an HTTP request.
      *
      * @return void
      */
     public function serving(): void
     {
-       // no-op
+       Post::creating(static function (Post $post): void {
+           $post->author()->associate(Auth::user());
+       });
     }

     /**
      * Get the server's list of schemas.
      *
      * @return array
      */
     protected function allSchemas(): array
     {
         return [
             Comments\CommentSchema::class,
             Posts\PostSchema::class,
             Tags\TagSchema::class,
             Users\UserSchema::class,
         ];
     }
 }
```

## Creating a Post Resource

Let's give the request a go:

```http
POST http://jsonapi-tutorial.test/api/v1/posts?include=author,tags HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "attributes": {
      "content": "In our second blog post, you will learn how to create resources using the JSON:API specification.",
      "publishedAt": null,
      "slug": "creating-jsonapi-resources",
      "title": "How to Create JSON:API Resources"
    },
    "relationships": {
      "tags": {
        "data": [
          {
            "type": "tags",
            "id": "2"
          }
        ]
      }
    }
  }
}
```

You'll see we get the following response:

```http
HTTP/1.0 405 Method Not Allowed
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "The POST method is not supported for route api\/v1\/posts. Supported methods: GET, HEAD.",
      "status": "405",
      "title": "Method Not Allowed"
    }
  ]
}
```

This tells us there is no `POST` route defined - so we need to add this to our
routes.

### Routing

Open the `app/routes/api.php` file and make the following changes:

```diff
 JsonApiRoute::server('v1')->prefix('v1')->resources(function (ResourceRegistrar $server) {
     $server->resource('posts', JsonApiController::class)
-        ->readOnly()
+        ->only('index', 'show', 'store')
         ->relationships(function (Relationships $relations) {
             $relations->hasOne('author')->readOnly();
             $relations->hasMany('comments')->readOnly();
             $relations->hasMany('tags')->readOnly();
         });
 });
```

The `readOnly()` method we were previously using is a short-hand for only
registering the `index` and `show` routes. (We haven't looked at the `index`
route yet, but we will in a future chapter.) So we've removed this and instead
used `only()` to allow the `index`, `show` and `store` actions - with `store`
being the action to create a resource.

Retry your request, and you should now see the following response:

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

### Authentication

Open the `app/Policies/PostPolicy.php` file, and make the following changes to
the `create()` method:

```diff
 /**
  * Determine whether the user can create models.
  */
 public function create(User $user): bool
 {
-    //
+    return true;
 }
```

This says that any user can create a blog. Notice the `$user` parameter is **not**
type-hinted as nullable. This means that there **must** be an authenticated user.
I.e. if a guest attempted to create a post, the request would be rejected.

That's sensible logic for our blog application, because we must have an authenticated
user to set the `author` relationship on the `Post` model when it is created.

When reattempting our request to create the post, we will need to be authenticated.
The Laravel application you created has Laravel's Sanctum package installed.
You can read up on that package in the Laravel documentation - all we need to
know here is it allows us to send a token with our request to authenticate a
user.

Firstly, we need to tell our API to use the `sanctum` guard when authenticating
requests. To do this, open the `app/JsonApi/V1/Server.php` class and modify
the `serving()` method:

```diff
 public function serving(): void
 {
+    Auth::shouldUse('sanctum');
+
     Post::creating(static function(Post $post): void {
         $post->author()->associate(Auth::user());
     });
 }
```

:::tip
It's worth noting that we're not using Laravel's `authenticate` middleware because
we still want to allow guests to access our API. However, as we're not using
that middleware we need to tell Laravel to use `sanctum` as the default guard
for our API requests - which is what the above change does.
:::

Now we need to update our `User` model so that it can issue Laravel Sanctum tokens. Make the following change in your
`app/Models/User.php` file:

```diff
 use Illuminate\Database\Eloquent\Factories\HasFactory;
 use Illuminate\Foundation\Auth\User as Authenticatable;
 use Illuminate\Notifications\Notifiable;
+use Laravel\Sanctum\HasApiTokens;

 class User extends Authenticatable
 {
-    use HasFactory, Notifiable;
+    use HasFactory, Notifiable, HasApiTokens;
 
     // ...other code   
 }
```

To get a token, run the following command:

```bash
herd php artisan tinker
Psy Shell v0.12.4 (PHP 8.3.12 — cli) by Justin Hileman
> $user = User::find(1);
> $token = $user->createToken('Test');
> $token->plainTextToken
= "1|f6rQIIeVZ3sWhxtFNzOIKVWDIpEpXp8Kqq4WVrXBcaa5e592"
> exit
```

Your `plainTextToken` will look different to the above, as it is a randomly
generated string. Make sure you copy that value and paste it somewhere where
you can reuse it.

### Creating the Resource

We're now ready to create our resource. Add the token to the request as a
`Bearer` token in the `Authorization` header. Using the above randomly
generated string, our request will look like this:

```http
POST http://jsonapi-tutorial.test/api/v1/posts?include=author,tags HTTP/1.1
Authorization: Bearer 1|f6rQIIeVZ3sWhxtFNzOIKVWDIpEpXp8Kqq4WVrXBcaa5e592
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "attributes": {
      "content": "In our second blog post, you will learn how to create resources using the JSON:API specification.",
      "publishedAt": null,
      "slug": "creating-jsonapi-resources",
      "title": "How to Create JSON:API Resources"
    },
    "relationships": {
      "tags": {
        "data": [
          {
            "type": "tags",
            "id": "2"
          }
        ]
      }
    }
  }
}
```

Try that request - making sure you use your token in the `Authorization` header.
You should see the following response:

```http
HTTP/1.1 201 Created
Content-Type: application/vnd.api+json
Location: http://jsonapi-tutorial.test/api/v1/posts/2

{
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2"
  },
  "data": {
    "type": "posts",
    "id": "2",
    "attributes": {
      "content": "In our second blog post, you will learn how to create resources using the JSON:API specification.",
      "createdAt": "2024-09-30T19:27:24.000000Z",
      "publishedAt": null,
      "slug": "creating-jsonapi-resources",
      "title": "How to Create JSON:API Resources",
      "updatedAt": "2024-09-30T19:27:24.000000Z"
    },
    "relationships": {
      "author": {
        "links": {
          "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/author",
          "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/relationships\/author"
        },
        "data": {
          "type": "users",
          "id": "1"
        }
      },
      "comments": {
        "links": {
          "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/comments",
          "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/relationships\/comments"
        }
      },
      "tags": {
        "links": {
          "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/tags",
          "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/relationships\/tags"
        },
        "data": [
          {
            "type": "tags",
            "id": "2"
          }
        ]
      }
    },
    "links": {
      "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2"
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
      "type": "tags",
      "id": "2",
      "attributes": {
        "createdAt": "2024-09-30T17:37:00.000000Z",
        "name": "JSON:API",
        "updatedAt": "2024-09-30T17:37:00.000000Z"
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/tags\/2"
      }
    }
  ]
}
```

:::tip
Notice that because we used `include=author,tags` in the request URL, the
response has an `included` member that contains the user and the tags that are
associated to our new post.

We've used the `include` path here so that you can see the relationships were
populated. However, using an `include` path in a create request is optional -
i.e. the above request would have worked without it. If it wasn't used, then
the response wouldn't have included the related author and tags - but the
relationships would have been created correctly on the model.
:::

### Invalid Responses

Earlier in this chapter, we added the validation rules for our post resource in
the `PostRequest` class. One of those rules ensured that the `slug` field on
the resource was unique - i.e. so we cannot create multiple post resources with
the same `slug`.

When a validation rule fails, a client will receive a `422 Unprocessable Entity`
response - with JSON:API errors indicating what the problem is. We can see that
if you reattempt the same request that you used to create the post resource.
You'll see this response:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "The slug has already been taken.",
      "source": {
        "pointer": "\/data\/attributes\/slug"
      },
      "status": "422",
      "title": "Unprocessable Entity"
    }
  ]
}
```

As we're reattempting exactly the same request with the same `slug` field, this
second request is rejected. Notice the error `detail` tells us the slug is already
taken, and a JSON pointer in the `source.pointer` member tells us the error was
caused by the `/data/attributes/slug` value.

## In Summary

In this chapter we learnt how to create a resource using JSON:API. We ensured
the client JSON was validated correctly, and we used Sanctum's token
authentication to create the post as an authenticated user.

In the [next chapter](06-modifying-resources.md), we'll learn how to modify
existing resources.
