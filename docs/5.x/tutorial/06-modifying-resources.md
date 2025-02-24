# 6. Modifying Resources

## Introduction

In this chapter we will learn how to modify the `posts` resource we created in
the previous chapter. As well as updating the resource, we will also learn how
to use relationship endpoints to modify a resource's relationships.

## Update Requests

In JSON:API, requests to update a resource use the `PATCH` method. The request
must have a `Content-Type` header of `application/vnd.api+json` - which is the
JSON:API media type.

The request body must be a JSON:API document, with the modified resource
contained in the `data` member of the JSON body. The resource contained in the
`data` member must have a `type` and `id` fields, indicating the exact resource
that is being updated. It also contains any `attributes` and `relationships` that
are to be modified, along with their new values.

In the previous chapter we created a `posts` resource, that had an `id` of `2`.
We now want to modify this resource - to change its `title`, `publishedAt` date
and the `tags` associated to it. Our request will look like this:

```http
PATCH http://jsonapi-tutorial.test/api/v1/posts/2?include=tags
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "2",
    "attributes": {
      "publishedAt": "2024-10-01T18:39:00.000000Z",
      "title": "How to Create and Update JSON:API Resources"
    },
    "relationships": {
      "tags": {
        "data": [
          {
            "type": "tags",
            "id": "1"
          },
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

One important concept is that we do not need to send all the resource's fields
when doing an update request. If we omit any fields, the JSON:API specification
states that the server **must** retain the existing value for the omitted fields.
That's why in the above request we only need to send the fields we want to change.

Before we attempt the request, we will need to make some changes to our
validation rules.

## Validation

In the previous chapter we created a `app/JsonApi/V1/Posts/PostRequest.php` class
that contained our validation logic. It currently looks like this:

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
            'content' => ['required', 'string'],
            'publishedAt' => ['nullable', JsonApiRule::dateTime()],
            'slug' => ['required', 'string', Rule::unique('posts', 'slug')],
            'tags' => JsonApiRule::toMany(),
            'title' => ['required', 'string'],
        ];
    }

}
```

The same `rules()` method is used when updating a resource. This means there
is one rule we need to update - the unique `slug` rule. On an update, we need
that rule to ignore the `Post` model that is being updated.

Make the following changes to that method:

```diff
 public function rules(): array
 {
+    $post = $this->model();
+    $uniqueSlug = Rule::unique('posts', 'slug');
+
+    if ($post) {
+        $uniqueSlug->ignoreModel($post);
+    }

     return [
         'content' => ['required', 'string'],
         'publishedAt' => ['nullable', JsonApiRule::dateTime()],
-        'slug' => ['required', 'string', Rule::unique('posts', 'slug')],
+        'slug' => ['required', 'string', $uniqueSlug],
         'tags' => JsonApiRule::toMany(),
         'title' => ['required', 'string'],
     ];
 }
```

In these changes, we get the `Post` model that is subject of the request using
the `model()` method. This will return `null` for a create request or the model
for an update request. We can then use that to ignore the model on the unique
rule.

Notice that we do not make any changes to the `required` rules for an update
request, even though our request may not contain the values. This is because
Laravel JSON:API follows the specification in assuming that omitted fields
have the current values of those fields. When validating an update request,
the JSON:API validator will add the existing values of any omitted
fields to the data that is validated. This means the `required` rule will still
pass, even if the client has omitted that field.

## Updating a Post Resource

Let's give the update request a go. (Remember to add your authentication token
to the `Authorization` header!)

```http
PATCH http://jsonapi-tutorial.test/api/v1/posts/2?include=tags
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "2",
    "attributes": {
      "publishedAt": "2024-10-01T18:39:00.000000Z",
      "title": "How to Create and Update JSON:API Resources"
    },
    "relationships": {
      "tags": {
        "data": [
          {
            "type": "tags",
            "id": "1"
          },
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

You should see the following response:

```http
HTTP/1.0 405 Method Not Allowed
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "The PATCH method is not supported for route api\/v1\/posts\/2. Supported methods: GET, HEAD.",
      "status": "405",
      "title": "Method Not Allowed"
    }
  ]
}
```

This tells us there is no `PATCH` route defined - so we need to add this to our
routes.

### Routing

Open the `app/routes/api.php` file and make the following changes:

```diff
 JsonApiRoute::server('v1')->prefix('v1')->resources(function (ResourceRegistrar $server) {
     $server->resource('posts', JsonApiController::class)
-        ->only('index', 'show', 'store')
+        ->only('index', 'show', 'store', 'update')
         ->relationships(function (Relationships $relations) {
             $relations->hasOne('author')->readOnly();
             $relations->hasMany('comments')->readOnly();
             $relations->hasMany('tags')->readOnly();
         });
 });
```

This adds the update action for the `posts` resource.

Retry your request, and you should now see the following response:

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "App\\Policies\\PostPolicy::update(): Return value must be of type bool, none returned",
      "meta": {
        "exception": "TypeError",
        "file": "\/Users\/Christopher\/Herd\/jsonapi-tutorial\/app\/Policies\/PostPolicy.php",
        "line": 69,
        "trace": [],
      },
      "status": "500",
      "title": "Internal Server Error"
    }
  ]
}
```

When we generated our `PostPolicy`, Laravel added an `update()` method but without adding any logic to it. This method
has been called to authorise the update request, so we now need to add some logic to that method.

### Authentication

Open the `app/Policies/PostPolicy.php` file, and make the following changes to
the `update()` method:

```diff
 /**
  * Determine whether the user can update the model.
  */
 public function update(User $user, Post $post): bool
 {
-    //
+    return $user->is($post->author);
 }
```

This says that the user can only update the blog post if they are the author
of the post.

### Updating the Resource

We're now ready to update the resource. Retry the request and you should see
the following response:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

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
      "publishedAt": "2024-10-01T18:39:00.000000Z",
      "slug": "creating-jsonapi-resources",
      "title": "How to Create and Update JSON:API Resources",
      "updatedAt": "2024-10-01T17:41:18.000000Z"
    },
    "relationships": {
      "author": {
        "links": {
          "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/author",
          "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/relationships\/author"
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
            "id": "1"
          },
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
      "type": "tags",
      "id": "1",
      "attributes": {
        "createdAt": "2024-09-30T17:37:00.000000Z",
        "name": "Laravel",
        "updatedAt": "2024-09-30T17:37:00.000000Z"
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/tags\/1"
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
In the above request, we used the `include` query parameter to tell the server
we wanted the `tags` relationship included in the response. We did this so that
you can see the relationship has been updated - it now contains the two tags we
sent in the request.

Using the `include` path on an update request is **optional**. If we didn't use
it, the relationship would still be updated. The only difference is the related
tags would not be included in the response JSON.
:::

## Modifying Relationships

Hopefully you noticed in the above request we were able to modify the `tags`
relationship. Sending data for the `tags` relationship when `PATCH`'ing a
resource replaces the relationship with the provided data.

The JSON:API specification also allows us to use relationship endpoints to
modify a relationship.

The following request would replace the entire contents of a relationship with
the provided `data` - in this case, as it is an empty array, the `tags`
relationship would be emptied:

```http
PATCH http://jsonapi-tutorial.test/api/v1/posts/2/relationships/tags
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "data": []
}
```

If you give this request a go, you'll receive the following response:

```http
HTTP/1.0 405 Method Not Allowed
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "The PATCH method is not supported for route api\/v1\/posts\/2\/relationships\/tags. Supported methods: GET, HEAD.",
      "status": "405",
      "title": "Method Not Allowed"
    }
  ]
}
```

This tells us we need to update our route configuration. Let's do that now.

### Routing

Open the `app/routes/api.php` file and make the following changes:

```diff
 JsonApiRoute::server('v1')->prefix('v1')->resources(function (ResourceRegistrar $server) {
     $server->resource('posts', JsonApiController::class)
         ->only('index', 'show', 'store', 'update')
         ->relationships(function (Relationships $relations) {
             $relations->hasOne('author')->readOnly();
             $relations->hasMany('comments')->readOnly();
-            $relations->hasMany('tags')->readOnly();
+            $relations->hasMany('tags');
         });
 });
```

We remove the `readOnly()` call on the `tags` relationship, which means all the
methods to modify the relationship will now be registered as routes.

Give the request another go, and this time you should see the following response:

```http
HTTP/1.1 403 Forbidden
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "This action is unauthorized.",
      "status": "403",
      "title": "Forbidden"
    }
  ]
}
```

This tells use we need to update our authorization logic. Let's do that now.

### Authorization

The `tags` relationship is a *to-many* relationship. The JSON:API specification
defines three relationship actions that allow us to modify a to-many relationship:

- update, i.e. completely replace the relationship with the provided data;
- attach, i.e. add the provided data to the relationships - retaining existing
  related resources; and
- detach, i.e. remove the provided data from the relationship - retaining any
  existing related resources.

You will need to open the `app/Policies/PostPolicy.php` class and make the
following changes to authorize all three of these relationship actions:

```diff
 namespace App\Policies;

 use App\Models\Post;
 use App\Models\User;
 use Illuminate\Auth\Access\HandlesAuthorization;

 class PostPolicy
 {
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        //
    }

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

    /**
     * Determine whether the user can view the post's author.
     */
    public function viewAuthor(?User $user, Post $post): bool
    {
        return $this->view($user, $post);
    }

    /**
     * Determine whether the user can view the post's comments.
     */
    public function viewComments(?User $user, Post $post): bool
    {
        return $this->view($user, $post);
    }

    /**
     * Determine whether the user can view the post's tags.
     */
    public function viewTags(?User $user, Post $post): bool
    {
        return $this->view($user, $post);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Post $post): bool
    {
        return $user->is($post->author);
    }

+
+    /**
+     * Determine whether the user can update the model's tags relationship.
+     */
+    public function updateTags(User $user, Post $post): bool
+    {
+        return $this->update($user, $post);
+    }
+
+    /**
+     * Determine whether the user can attach tags to the model's tags relationship.
+     */
+    public function attachTags(User $user, Post $post): bool
+    {
+        return $this->update($user, $post);
+    }
+
+    /**
+     * Determine whether the user can detach tags from the model's tags relationship.
+     */
+    public function detachTags(User $user, Post $post): bool
+    {
+        return $this->update($user, $post);
+    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Post $post): bool
    {
        //
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Post $post): bool
    {
        //
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Post $post): bool
    {
        //
    }
 }
```

This logic says that if the user can update the post, they can update the `tags`
relationship. This makes sense as we would expect a user that is authoring the
post to set that tags for the blog post.

### Replacing Tags

Try this request again:

```http
PATCH http://jsonapi-tutorial.test/api/v1/posts/2/relationships/tags
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "data": []
}
```

You should see this response:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "related": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/tags",
    "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/relationships\/tags"
  },
  "data": []
}
```

This tells us the relationship has been emptied - we can see that as the `data`
member is now an empty array.

Before trying the other relationship routes, let's update the relationship so
that it has a single tag in it. Use the following request:

```http
PATCH http://jsonapi-tutorial.test/api/v1/posts/2/relationships/tags
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "data": [
    {
      "type": "tags",
      "id": "1"
    }
  ]
}
```

You will see from the response that we now have single tag in the post's `tags`
relationship.

### Attaching Tags

Say we want to attach an extra tag to the relationship, while retaining the
existing associated tags. The JSON:API specification allows us to do this using
the following request:

```http
POST http://jsonapi-tutorial.test/api/v1/posts/2/relationships/tags
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "data": [
    {
      "type": "tags",
      "id": "2"
    }
  ]
}
```

Notice this is the same endpoint, but now we are using the `POST` method. Give
the above request a go, and you should see this response:

```http
HTTP/1.1 204 No Content
```

This tells us the relationship has updated - the tags that were provided have
been attached to the relationship. This means the relationship should now have
two tags attached. Let's check that using the following request:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/2/tags
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
```

As you can see from the response, we now have two tags associated to this post:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/tags"
  },
  "data": [
    {
      "type": "tags",
      "id": "1",
      "attributes": {
        "createdAt": "2024-09-30T17:37:00.000000Z",
        "name": "Laravel",
        "updatedAt": "2024-09-30T17:37:00.000000Z"
      },
      "links": {
        "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/tags\/1"
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

### Detaching Tags

Say we want to detach a specific tag from the relationship, while retaining the
other associated tags. The JSON:API specification allows us to do this using the
following request:

```http
DELETE http://jsonapi-tutorial.test/api/v1/posts/2/relationships/tags
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
  "data": [
    {
      "type": "tags",
      "id": "1"
    }
  ]
}
```

Notice this is the same endpoint, but now we are using the `DELETE` method. Give
the above request a go, and you should see this response:

```http
HTTP/1.1 204 No Content
```

This tells us the relationship has updated - the tags that were provided have
been detached from the relationship. This means the relationship should now have
one related tag. Let's check that using the following request:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/2/tags
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
```

As you can see from the response, we now have one tag attached to this post:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "self": "http:\/\/jsonapi-tutorial.test\/api\/v1\/posts\/2\/tags"
  },
  "data": [
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

## In Summary

In this chapter, we learnt how to update a JSON:API resource. We also saw that
updating a resource allows us to modify a relationship at the same time. However,
we can also use JSON:API relationship endpoints to modify a specific
relationship on a resource.

In the [next chapter](07-deleting-resources.md), we'll learn how to delete
resources.
