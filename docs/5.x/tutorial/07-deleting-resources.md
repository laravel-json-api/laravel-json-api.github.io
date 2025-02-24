# 7. Deleting Resources

## Introduction

In this chapter we will learn how to delete a `posts` resource.

## Delete Requests

In JSON:API, requests to delete a resource use the `DELETE` method. This means
we can delete the post resource we created in the previous chapters using the
following request:

```http
DELETE http://jsonapi-tutorial.test/api/v1/posts/2
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
```

Let's give this request a go. You should see the following response:

```http
HTTP/1.0 405 Method Not Allowed
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "The DELETE method is not supported for route api\/v1\/posts\/2. Supported methods: GET, HEAD, PATCH.",
      "status": "405",
      "title": "Method Not Allowed"
    }
  ]
}
```

This tells us we need to update our routing configuration to register the delete
route. Let's do that now.

## Routing

Open the `app/routes/api.php` file and make the following changes:

```diff
 JsonApiRoute::server('v1')->prefix('v1')->resources(function (ResourceRegistrar $server) {
     $server->resource('posts', JsonApiController::class)
-        ->only('index', 'show', 'store', 'update')
         ->relationships(function (Relationships $relations) {
             $relations->hasOne('author')->readOnly();
             $relations->hasMany('comments')->readOnly();
             $relations->hasMany('tags');
         });
 });
```

Here we remove the `only()` method, so that all routes defined by the JSON:API
specification will be registered for our `posts` resource. This means the
`destroy` action will now be registered, which will allow us to delete a
`postas` resource.

Give the same request another go and you should see the following response:

```http
HTTP/1.1 403 Forbidden
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "App\\Policies\\PostPolicy::delete(): Return value must be of type bool, none returned",
      "meta": {
        "exception": "TypeError",
        "file": "\/Users\/Christopher\/Herd\/jsonapi-tutorial\/app\/Policies\/PostPolicy.php",
        "line": 101,
        "trace": [],
      },
      "status": "500",
      "title": "Internal Server Error"
    }
  ]
}
```

This tells us we need to update the authorization logic, so that we can allow
a user to delete a post. Let's do that now.

## Authorization

Open the `app/Policies/PostPolicy.php` file and make the following changes to
the `delete()` method:

```diff
 /**
  * Determine whether the user can delete the model.
  */
 public function delete(User $user, Post $post): bool
 {
-    //
+    return $this->update($user, $post);
 }
```

This says that if a user can update a post, they can also delete it. This makes
sense as our logic allows the author of the post to update it. Now they can
also delete it.

## Deleting a Post

Give this request another go:

```http
DELETE http://jsonapi-tutorial.test/api/v1/posts/2
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
```

You should now see this response:

```http
HTTP/1.1 204 No Content
```

This tells us the resource was successfully deleted. You can check that by
attempting to retrieve the same resource using the following request:

```http
GET http://jsonapi-tutorial.test/api/v1/posts/2
Authorization: Bearer <TOKEN>
Accept: application/vnd.api+json
```

As the post no longer exists, you should see this response:

```http
HTTP/1.1 404 Not Found
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "status": "404",
      "title": "Not Found"
    }
  ]
}
```

## Soft Deleting

Laravel JSON:API allows you to easily add soft-deleting to a resource. This
is documented in the [Soft Deleting chapter.](../schemas/soft-deleting.md)

Soft-deleting is a common feature used by Laravel applications. If it is
something you would like to use, why not use the linked chapter to add
soft-deleting to your `posts` resource?

## In Summary

In this chapter, we learnt how to delete resources using the JSON:API
specification.

In the [next chapter](08-fetching-resources.md), we will learn how to fetch
many resources in one request.
