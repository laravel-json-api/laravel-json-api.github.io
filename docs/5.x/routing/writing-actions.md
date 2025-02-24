# Writing JSON:API Actions

## Introduction

Our controllers are designed to allow you to easily write your own
JSON:API actions if desired. Typically this involves removing the action
trait from the controller class, and then implementing the action method
yourself.

This chapter walks you through doing that for each controller action.
It also shows you the typical JSON:API action flow, so that
you are aware of how to build these actions yourself.

:::danger
This is a complex chapter; most applications will never need to write
their own controller actions.

If you are new to Laravel JSON:API, we'd recommend you skip this chapter.
You can return to it if you discover that one of our default action traits
does not work for your specific use-case.
:::

## Resource Actions

### Fetch-Many aka Index

If you want to write your own `index` controller action, remove the
`FetchMany` trait, and implement the `index` method yourself.

The typical JSON:API flow with this action is to:

1. Validate JSON:API query parameters. This is done by type-hinting
the query request class (either `PostCollectionQuery` or
`AnonymousCollectionQuery`).
2. Use the correct schema (e.g. `PostSchema`) to query models using the
JSON:API query parameters.
3. Return a response with the result in the `data` member of the JSON:API
document.

This is an example custom action:

```php
use App\JsonApi\V1\Posts\PostCollectionQuery;
use App\JsonApi\V1\Posts\PostSchema;
use LaravelJsonApi\Core\Responses\DataResponse;

/**
 * Fetch zero to many JSON API resources.
 *
 * @param PostSchema $schema
 * @param PostCollectionQuery $request
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function index(PostSchema $schema, PostCollectionQuery $request)
{
  $models = $schema
    ->repository()
    ->queryAll()
    ->withRequest($request)
    ->firstOrPaginate($request->page());

  // do something custom...

  return new DataResponse($models);
}
```

### Fetch-One aka Show

If you want to write your own `show` controller action, remove the
`FetchOne` trait, and implement the `show` method yourself.

The typical JSON:API flow with this action is to:

1. Validate JSON:API query parameters. This is done by type-hinting
the query request class (either `PostQuery` or `AnonymousQuery`).
2. Use the correct schema (e.g. `PostSchema`) to check whether the
model the route relates to matches any filter parameters.
3. Return a response with the result in the `data` member of the JSON:API
document.

This is an example custom action:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostSchema;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\DataResponse;

/**
 * Fetch zero to one JSON API resource by id.
 *
 * @param PostSchema $schema
 * @param PostQuery $request
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function show(PostSchema $schema, PostQuery $request, Post $post)
{
  $model = $schema
    ->repository()
    ->queryOne($post)
    ->withRequest($request)
    ->first();

  // do something custom...

  return new DataResponse($model);
}
```

### Store

If you want to write your own `store` controller action, remove the
`Store` trait, and implement the `store` method yourself.

The typical JSON:API flow with this action is to:

1. Validate the JSON document to ensure it is valid for the resource
type being created. This is done by type-hinting the specific
request class, e.g. `PostRequest`.
2. Validate JSON:API query parameters. This is done by type-hinting
the query request class (either `PostQuery` or `AnonymousQuery`).
3. Use the correct schema (e.g. `PostSchema`) to create a new
model in the database.
4. Return a response with the new resource in the `data` member of
the JSON:API document.

This is an example custom action:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Posts\PostSchema;
use LaravelJsonApi\Core\Responses\DataResponse;

/**
 * Create a new resource.
 *
 * @param PostSchema $schema
 * @param PostRequest $request
 * @param PostQuery $query
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function store(PostSchema $schema, PostRequest $request, PostQuery $query)
{
  $model = $schema
    ->repository()
    ->create()
    ->withRequest($query)
    ->store($request->validated());

  // do something custom...

  return new DataResponse($model);
}
```

### Update

If you want to write your own `update` controller action, remove the
`Update` trait, and implement the `update` method yourself.

The typical JSON:API flow with this action is to:

1. Validate the JSON document to ensure it is valid for the resource
type being updated. This is done by type-hinting the specific
request class, e.g. `PostRequest`.
2. Validate JSON:API query parameters. This is done by type-hinting
the query request class (either `PostQuery` or `AnonymousQuery`).
3. Use the correct schema (e.g. `PostSchema`) to update the model
with the validated data.
4. Return a response with the updated resource in the `data` member of
the JSON:API document.

This is an example custom action:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Posts\PostSchema;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\DataResponse;

/**
 * Update an existing resource.
 *
 * @param PostSchema $schema
 * @param PostRequest $request
 * @param PostQuery $query
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function update(
  PostSchema $schema,
  PostRequest $request,
  PostQuery $query,
  Post $post
) {
  $model = $schema
    ->repository()
    ->update($post)
    ->withRequest($query)
    ->store($request->validated());

  // do something custom...

  return new DataResponse($model);
}
```

### Destroy

If you want to write your own `destroy` controller action, remove the
`Destroy` trait, and implement the `destroy` method yourself.

The typical JSON:API flow with this action is to:

1. Validate the request to destroy the resource. This is done by
type-hinting the specific request class, e.g. `PostRequest`.
2. Delete the model.
3. Return a response, for example a `204 No Content` response.

This is an example custom action:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\DataResponse;

/**
 * Destroy an existing resource.
 *
 * @param PostRequest $request
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function destroy(PostRequest $request, Post $post)
{
  // do something custom...

  $post->forceDelete();

  // do something custom...

  return \response('', 204);
}
```

## Relationship Actions

### Concept

The logic required to parse generic relationships is complex. We do not
therefore recommend implementing your own generic relationship actions.

Instead, we allow you to register actions for specific relationships. You
can do this via the `ownAction` and `ownActions` methods when registering
relationship routes:

```php
$relationships->hasOne('author')->ownAction('show', 'update');
$relationships->hasMany('tags')->ownActions();
```

The `ownAction` method allows you to register specific actions that should
be routed to their own controller action. Use our action short-hands of
`related`, `show`, `update`, `attach` and `detach`.

The `ownActions` method is a short-hand to specify that all routes for the
relationship should be routed to their own controller actions.

In the above example, the `author` relationship would have its own
`showAuthor` and `updateAuthor` actions. However the `related` route
would still use our generic action of `showRelated`.

As the `tags` relationship has called the `ownActions` method, all of its
actions will be specific. I.e. it will route to `showRelatedTags`,
`showTags`, `updateTags`, `attachTags` and `detachTags`.

### Fetch-Related aka Show-Related

The logic required to parse generic relationships is complex, and we do not
therefore recommend removing our `FetchRelated` trait from your controller.

If you need to write a custom show related action, we recommend doing this
for specific relationships.

Firstly, when registering the relationship routes, use the `ownAction`
method, specifying the `related` action:

```php
$relationships->hasOne('author')->ownAction('related');
$relationships->hasMany('tags')->ownAction('related');
```

This configures the route to call the `showRelatedAuthor` and
`showRelatedTags` actions on the controller.

The typical JSON:API flow with this action is to:

1. Validate JSON:API query parameters. This is done by type-hinting
the query request class for the resource type returned by the
relationship.
2. Use the correct schema (e.g. `PostSchema`) to retrieve the
value of the relationship, taking into account JSON:API query parameters.
3. Return a response with the result in the `data` member of the JSON:API
document.

For example, for our *to-one* `author` relationship:

```php
use App\JsonApi\V1\Posts\PostSchema;
use App\JsonApi\V1\Users\UserQuery;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\RelatedResponse;

/**
 * Fetch zero to one related resources.
 *
 * @param PostSchema $schema
 * @param UserQuery $request
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function showRelatedAuthor(PostSchema $schema, UserQuery $request, Post $post)
{
  $author = $schema
    ->repository()
    ->queryToOne($post, 'author')
    ->withRequest($request)
    ->first();

  // do something custom...

  return new RelatedResponse($post, 'author', $author);
}
```

And for example, for our *to-many* `tags` relationship:

```php
use App\JsonApi\V1\Posts\PostSchema;
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\RelatedResponse;

/**
 * Fetch zero to many related resources.
 *
 * @param PostSchema $schema
 * @param UserQuery $request
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function showRelatedTags(
  PostSchema $schema,
  TagCollectionQuery $request,
  Post $post
) {
  $tags = $schema
    ->repository()
    ->queryToMany($post, 'tags')
    ->withRequest($request)
    ->getOrPaginate($request->page());

  // do something custom...

  return new RelatedResponse($post, 'tags', $tags);
}
```

### Fetch-Relationship aka Show-Relationship

The logic required to parse generic relationships is complex, and we do not
therefore recommend removing our `FetchRelationship` trait from your controller.

If you need to write a custom show relationship action, we recommend doing this
for specific relationships.

Firstly, when registering the relationship routes, use the `ownAction`
method, specifying the `show` action:

```php
$relationships->hasOne('author')->ownAction('show');
$relationships->hasMany('tags')->ownAction('show');
```

This configures the route to call the `showAuthor` and `showTags` actions
on the controller.

The typical JSON:API flow with this action is to:

1. Validate JSON:API query parameters. This is done by type-hinting
the query request class for the resource type returned by the
relationship.
2. Use the correct schema (e.g. `PostSchema`) to retrieve the
value of the relationship, taking into account JSON:API query parameters.
3. Return a response with the resource identifiers in the `data` member of
the JSON:API document.

For example, for our *to-one* `author` relationship:

```php
use App\JsonApi\V1\Posts\PostSchema;
use App\JsonApi\V1\Users\UserQuery;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\RelationshipResponse;

/**
 * Fetch zero to-one user resource identifier.
 *
 * @param PostSchema $schema
 * @param UserQuery $request
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function showAuthor(
  PostSchema $schema,
  UserQuery $request,
  Post $post
) {
  $author = $schema
    ->repository()
    ->queryToOne($post, 'author')
    ->withRequest($request)
    ->first();

  // do something custom...

  return new RelationshipResponse($post, 'author', $author);
}
```

And for example, for our *to-many* `tags` relationship:

```php
use App\JsonApi\V1\Posts\PostSchema;
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\RelationshipResponse;

/**
 * Fetch zero to-many tag resource identifiers.
 *
 * @param PostSchema $schema
 * @param UserQuery $request
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function showTags(
  PostSchema $schema,
  TagCollectionQuery $request,
  Post $post
) {
  $tags = $schema
    ->repository()
    ->queryToMany($post, 'tags')
    ->withRequest($request)
    ->getOrPaginate($request->page());

  // do something custom...

  return new RelationshipResponse($post, 'tags', $tags);
}
```

### Update-Relationship

The logic required to parse generic relationships is complex, and we do not
therefore recommend removing our `UpdateRelationship` trait from your controller.

If you need to write a custom show relationship action, we recommend doing this
for specific relationships.

Firstly, when registering the relationship routes, use the `ownAction`
method, specifying the `update` action:

```php
$relationships->hasOne('author')->ownAction('update');
$relationships->hasMany('tags')->ownAction('update');
```

This configures the route to call the `updateAuthor`
and `updateTags` actions on the controller.

The typical JSON:API flow with this action is to:

1. Validate the JSON:API document provided by the client. This is done
by type-hinting the request class for the resource type that is having
its relationship updated. E.g. the `PostRequest` in this example.
2. Validate JSON:API query parameters. This is done by type-hinting
the query request class for the resource type returned by the
relationship.
3. Use the correct schema (e.g. `PostSchema`) to update the value
of the relationship.
4. Return a response with the resource identifiers in the `data` member of
the JSON:API document.

For example, for our *to-one* `author` relationship:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Posts\PostSchema;
use App\JsonApi\V1\Users\UserQuery;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\RelationshipResponse;

/**
 * Update the to-one author relationship.
 *
 * @param PostSchema $schema
 * @param PostRequest $request
 * @param UserQuery $query
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function updateAuthor(
  PostSchema $schema,
  PostRequest $request,
  UserQuery $query,
  Post $post
) {
  $author = $schema
    ->repository()
    ->modifyToOne($post, 'author')
    ->withRequest($query)
    ->associate($request->validatedForRelation());

  // do something custom...

  return new RelationshipResponse($post, 'author', $author);
}
```

And for example, for our *to-many* `tags` relationship:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Posts\PostSchema;
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\RelationshipResponse;

/**
 * Update the to-many tags relationship.
 *
 * @param PostSchema $schema
 * @param PostRequest $request
 * @param UserQuery $query
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function updateTags(
  PostSchema $schema,
  PostRequest $request,
  TagCollectionQuery $query,
  Post $post
) {
  $tags = $schema
    ->repository()
    ->modifyToMany($post, 'tags')
    ->withRequest($query)
    ->sync($request->validatedForRelation());

  // do something custom...

  return new RelationshipResponse($post, 'tags', $tags);
}
```

### Attach-Relationship

The logic required to parse generic relationships is complex, and we do not
therefore recommend removing our `AttachRelationship` trait from your controller.

If you need to write a custom show relationship action, we recommend doing this
for specific relationships.

Firstly, when registering the relationship routes, use the `ownAction`
method, specifying the `attach` action:

```php
$relationships->hasMany('tags')->ownAction('attach');
```

This configures the route to call the `attachTags` action on the controller.

The typical JSON:API flow with this action is to:

1. Validate the JSON:API document provided by the client. This is done
by type-hinting the request class for the resource type that is having
its relationship updated. E.g. the `PostRequest` in this example.
2. Validate JSON:API query parameters. This is done by type-hinting
the query request class for the resource type returned by the
relationship.
3. Use the correct schema (e.g. `PostSchema`) to update the value
of the relationship.
4. Return a response with the resource identifiers in the `data` member of
the JSON:API document.

For example, for our *to-many* `tags` relationship:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Posts\PostSchema;
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\RelationshipResponse;

/**
 * Update the to-many tags relationship.
 *
 * @param PostSchema $schema
 * @param PostRequest $request
 * @param UserQuery $query
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function attachTags(
  PostSchema $schema,
  PostRequest $request,
  TagCollectionQuery $query,
  Post $post
) {
  $tags = $schema
    ->repository()
    ->modifyToMany($post, 'tags')
    ->withRequest($query)
    ->attach($request->validatedForRelation());

  // do something custom...

  return \response('', 204);
}
```

### Detach-Relationship

The logic required to parse generic relationships is complex, and we do not
therefore recommend removing our `DetachRelationship` trait from your controller.

If you need to write a custom show relationship action, we recommend doing this
for specific relationships.

Firstly, when registering the relationship routes, use the `ownAction`
method, specifying the `detach` action:

```php
$relationships->hasMany('tags')->ownAction('detach');
```

This configures the route to call the `detachTags` action on the controller.

The typical JSON:API flow with this action is to:

1. Validate the JSON:API document provided by the client. This is done
by type-hinting the request class for the resource type that is having
its relationship updated. E.g. the `PostRequest` in this example.
2. Validate JSON:API query parameters. This is done by type-hinting
the query request class for the resource type returned by the
relationship.
3. Use the correct schema (e.g. `PostSchema`) to update the value
of the relationship.
4. Return a response with the resource identifiers in the `data` member of
the JSON:API document.

For example, for our *to-many* `tags` relationship:

```php
use App\JsonApi\V1\Posts\PostRequest;
use App\JsonApi\V1\Posts\PostSchema;
use App\JsonApi\V1\Tags\TagCollectionQuery;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\RelationshipResponse;

/**
 * Update the to-many tags relationship.
 *
 * @param PostSchema $schema
 * @param PostRequest $request
 * @param UserQuery $query
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function detachTags(
  PostSchema $schema,
  PostRequest $request,
  TagCollectionQuery $query,
  Post $post
) {
  $tags = $schema
    ->repository()
    ->modifyToMany($post, 'tags')
    ->withRequest($query)
    ->detach($request->validatedForRelation());

  // do something custom...

  return \response('', 204);
}
```
