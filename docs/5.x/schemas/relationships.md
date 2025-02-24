# Relationships

## Relationship Fields

In addition to the variety of attributes we've already discussed, Laravel
JSON:API has full support for all of Laravel's Eloquent relationships. To
add a relationship to a schema, we can simply add it to the schema's
`fields` method.

Our relationship fields take care of querying and hydrating
relationships.

To create a relationship, we use the static `make` method, providing the
JSON:API field name as the first argument. For example, if our `Post`
schema had `author` and `tags` relationships:

```php
use LaravelJsonApi\Eloquent\Fields\ID;
use LaravelJsonApi\Eloquent\Fields\Relations\BelongsTo;
use LaravelJsonApi\Eloquent\Fields\Relations\HasMany;

/**
 * @inheritDoc
 */
public function fields(): array
{
    return [
        ID::make(),
        // ...attribute fields
        BelongsTo::make('user'),
        HasMany::make('tags'),
    ];
}
```

## Model Method Names

By default, the field will expect the method for the relationship on the
Eloquent model to be the *camel-case* form of the JSON:API field name.
For example, for a relationship field name of `blog-author`, the
expected method on the Eloquent model would be `blogAuthor`.

To use a different method name than the default, provide the method name
as the second argument to the `make` method:

```php
BelongsTo::make('author', 'blogAuthor');
```

## URI Name

By default we dasherize the JSON:API field name when it appears in
relationship URLs. For example, if the field name was
`blogAuthor`, the links would be:

```json
{
  "links": {
    "self": "http://localhost/api/v1/posts/123/relationships/blog-author",
    "related": "http://localhost/api/v1/posts/123/blog-author"
  }
}
```

If you wanted to keep `blogAuthor` as-is, use the `retainFieldName` method:

```php
BelongsTo::make('blogAuthor')->retainFieldName()
```

Otherwise, if you want to use a different convention, provide the URI
fragment to the `withUriFieldName` method:

```php
BelongsTo::make('blogAuthor')->withUriFieldName('blog_author')
```

## Inverse Type

Every relationship must have an inverse resource type. This is the JSON:API
resource type that is returned by the relationship.

For relationships that return zero-to-one related resources (known as
**to-one** relations), we assume the inverse type is the dasherized and
pluralized form of the Eloquent method name. For example:

```php
BelongsTo::make('blogPost') // assumed 'blog-posts'
BelongsTo::make('author', 'user') // assumed 'users'
```

For relationships that return zero-to-many related resources (known as
**to-many** relations), we assume the inverse type is the dasherized
form of the Eloquent method name. For example:

```php
HasMany::make('postTags') // assumed 'post-tags'
HasMany::make('tags', 'postTags') // assumed 'post-tags'
```

In either case, to use a different inverse resource type, just call the
`type()` method. For example if our `Post` schema has an `author` relationship
field, but the inverse type was `users`:

```php
BelongsTo::make('author')->type('users')
```

## Eager Loading

By default, all relationship field types are allowed as
[include paths](https://jsonapi.org/format/#fetching-includes). This
is the equivalent of Eloquent's eager loading capability.

If you do not want to allow a relationship field to be an include path,
use the `cannotEagerLoad` method:

```php
BelongsTo::make('author')->cannotEagerLoad()
```

For more detail, see the [Eager Loading chapter.](eager-loading.md)

## Sparse Fields

By default, all relationship field types are allowed as
[sparse fields](https://jsonapi.org/format/#fetching-sparse-fieldsets).
If you do not want to allow an relationship to be a sparse field, you should
use the `notSparseField` method:

```php
BelongsTo::make('author')->notSparseField()
```

## Read-Only Fields

The majority of our relationship fields are writeable, with the exception
of the `HasOneThrough` and `HasManyThrough` relationships which are always
read-only.

For the other relationship fields, there are times when you may want to allow
the client to only create or update certain relationships on the resource.
You can do this by using the `readOnly` method, which will prevent the field
from being filled

```php
BelongsTo::make('author')->readOnly()
```

If you need a relationships to only be filled in certain circumstances,
pass a closure to the `readOnly` method. It will receive the current
request as the first argument:

```php
BelongsTo::make('author')->readOnly(
    static fn($request) => !$request->user()->isAdmin()
)
```

If you only want to set the relationship to read only when creating or
updating resources, you may use the `readOnlyOnCreate` or
`readOnlyOnUpdate` methods:

```php
BelongsTo::make('author')->readOnlyOnCreate()
BelongsTo::make('author')->readOnlyOnUpdate()
```

:::danger
The read-only methods on relationships only affect the relationship when
it is being filled as a result of a `POST` or `PATCH` request for a
resource type. For example, the `author` field on a `posts` resource
will have its read-only state checked when the client has submitted a request
to create or update a `posts` resource, i.e. a request to
`POST /api/v1/posts` or `PATCH /api/v1/posts/123`

The read-only methods do not affect changing relationships via relationship
end-points: e.g. `PATCH /api/v1/posts/123/relationships/author`. There is
no need for us to check the read-only status in this circumstance because
this relationship route should not be registered with the Laravel router
if the relationship is read-only.
:::

## Countable Fields

Sometimes a client may want to count the number of related resources for a
given relationship without actually loading the related resources. Our
*to-many* fields allow this using our
[Countable Relationships feature.](../digging-deeper/countable.md)

## Relationship Serialization

Schemas are used to convert models to JSON:API resource objects.
Each relationship you define will appear in the resource JSON.
Each relationship is serialized as a
[JSON:API relationship object](https://jsonapi.org/format/#document-resource-object-relationships).
These relationship objects must contain at least one of `links`,
`data` or `meta`.

By default, relationship objects are serialized with the `links`
member, and will include the `self` and `related` links. The `data`
member will only be included if the relationship data has been
requested by the client using an
[Include Path.](https://jsonapi.org/format/#fetching-includes)

To customise the relation serialization, use the `serializeUsing`
method. This receives the JSON:API relation as its first argument:

```php
BelongsTo::make('author')->serializeUsing(
  static fn($relation) => $relation->withoutSelfLink()
)
```

### Removing Links

If you do not want the relationship object to have a `self` link,
use the `withoutSelfLink` method:

```php
BelongsTo::make('author')->serializeUsing(
  static fn($relation) => $relation->withoutSelfLink()
)
```

Likewise, if you do not want the relationship object to have a `related`
link, use the `withoutRelatedLink` method:

```php
BelongsTo::make('author')->serializeUsing(
  static fn($relation) => $relation->withoutRelatedLink()
)
```

If you want to remove both the `self` and `related` links, you can use the
`withoutLinks` method:

```php
BelongsTo::make('author')->serializeUsing(
  static fn($relation) => $relation->withoutLinks()
)
```

### Showing Data

By default we only show the `data` member of the relationship if the
client has requested it using an include path. This is a sensible
default because the whole point of the JSON:API specification is to
give the client complete control over what it wants include in the
response JSON. If the server made decisions over what is included,
then it will increase the size of the response payload when
the client may have no intent to use the extra JSON content.

If you must override this, we provide two methods on the relation.
Firstly, the `showDataIfLoaded` method will include the relationship
`data` member if the relation is loaded on the model:

```php
BelongsTo::make('author')->serializeUsing(
  static fn($relation) => $relation->showDataIfLoaded()
)
```

Secondly we provide the `alwaysShowData` member to force the `data`
member to be shown. If you are using the `alwaysShowData` method,
you will need to consider adding default eager load paths to your
schema to avoid "N+1" database query problems.

```php
BelongsTo::make('author')->serializeUsing(
  static fn($relation) => $relation->alwaysShowData()
)
```

:::warning
If you use the `alwaysShowData` method, you must ensure that the
relationship is *always* eager loaded. See the
[Eager Loading chapter](eager-loading.md) for details.
:::

### Hiding Fields

When serializing relationships to JSON, you may want to omit a field from
the JSON. To do this, use the `hidden` method:

```php
BelongsTo::make('createdBy')->hidden()
```

To only hide the field in certain circumstances, provide a closure to
the `hidden` method. It will receive the current request as the first
argument:

```php
BelongsTo::make('createdBy')->hidden(
  static fn($request) => !$request->user()->isAdmin()
)
```

Note that if you use JSON:API resources outside of HTTP requests -
for example, queued broadcasting - then your closure should handle
the `$request` parameter being `null`.

:::tip
If you have complex logic for determining what relationships should
appear in the resource's JSON, you should use our
[resource classes](../resources/) which give you complete control over
the serialization.
:::

## Relationship Types

Laravel JSON:API ships with field types that work with all of the
Eloquent relationships. The types are:

| JSON:API Type | Eloquent Type(s) | Writeable |
| --- | --- | --- |
| [Has One](#has-one) | `hasOne`, `morphOne` | Yes |
| [Has Many](#has-many) | `hasMany`, `morphMany` | Yes |
| [Has One Through](#has-one-through) | `hasOneThrough` | No |
| [Has Many Through](#has-many-through) | `hasManyThrough` | No |
| [Belongs To](#belongs-to) | `belongsTo` | Yes |
| [Belongs To Many](#belongs-to-many) | `belongsToMany`, `morphToMany`, `morphedByMany` | Yes |
| [Morph To](#morph-to) | `morphTo` | Yes |
| [Morph to Many](#morph-to-many) | *None* | Yes |

### Has One

The `HasOne` field corresponds to either a `hasOne` or `morphOne` Eloquent
relationship. For example, let's assume a `User` model `hasOne` `Address`
model. We may add the relationship to our `User` schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\HasOne;

HasOne::make('address')
```

As described above, this will assume the method name on the model is `address`.
If this is not the case, the method name can be provided as the second
argument:

```php
HasOne::make('address', 'postalAddress')
```

The inverse resource type is assumed to be the pluralized and dasherized form
of the Eloquent method name. If this is not the case, use the `type`
method:

```php
HasOne::make('address') // assumed 'addresses'
HasOne::make('address')->type('user-addresses')
```

#### Detaching Has-One Models

When modifying this relationship, you will need to consider how you want to
handle a model being detached from the relationship. For example, if a `User`
model already had one `Address` and the client changes the relationship to
`null` or a different `Address`, how should the existing `Address` model be
detached?

The default detach behaviour is to set the relationship columns on the `Address`
model to `null`. I.e. the `Address` model is retained and detached from the
`User` model.

In some cases, you might actually want the `Address` model to be deleted if
it is detached from the relationship. You can configure this behaviour
using the `deleteDetachedModel()` or `forceDeleteDetachedModel()` methods
on the `HasOne` field. For example:

```php
HasOne::make('address')->deleteDetachedModel()
// or
HasOne::make('address')->forceDeleteDetachedModel()
```

### Has Many

The `HasMany` field corresponds to a `hasMany` or a `morphMany` Eloquent
relationship. For example, let's assume that our `Video` model `hasMany`
`Comment` models. We may add the relationship to our `Video` schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\HasMany;

HasMany::make('comments')
```

As described above, this will assume the method name on the model is `comments`.
If this is not the case, the method name can be provided as the second
argument:

```php
HasMany::make('comments', 'userComments')
```

The inverse resource type is assumed to be the dasherized form of the Eloquent
method name. If this is not the case, use the `type` method:

```php
HasMany::make('comments') // assumed 'comments'
HasMany::make('comments')->type('video-comments')
```

#### Detaching Has-Many Models

When modifying this relationship, you will need to consider how you want to
handle models that are detached from the relationship. For example, when
updating the `Video` model's `comments` relationship, `Comment` models may be
detached (removed).

The default detach behaviour is to set the relationship columns on the `Comment`
model to `null`. I.e. each `Comment` model removed from the relationship
is retained and detached from the `Video` model.

In some cases, you might actually want `Comment` models to be deleted when
they are detached from the relationship. You can configure this behaviour
using the `deleteDetachedModels()` or `forceDeleteDetachedModels()` methods
on the `HasMany` field. For example:

```php
HasMany::make('comments')->deleteDetachedModels()
// or
HasMany::make('comments')->forceDeleteDetachedModels()
```


### Has One Through

The `HasOneThrough` field corresponds to a `hasOneThrough` Eloquent
relationship. For example, let's assume a `Mechanic` model has one `Car`,
and each `Car` may have one `Owner`. While the `Mechanic` and the `Owner`
has no direct connection, the `Mechanic` can access the `Owner` through
the `Car` itself.

You can add this relationship to your `Mechanic` schema as follows:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\HasOneThrough;

HasOneThrough::make('owner')
```

As described above, this will assume the method name on the model is `owner`.
If this is not the case, the method name can be provided as the second
argument:

```php
HasOneThrough::make('owner', 'carOwner');
```

The inverse resource type is assumed to be the pluralized and dasherized form
of the Eloquent method name. If this is not the case, use the `type`
method:

```php
HasOneThrough::make('owner') // assumed 'owners'
HasOneThrough::make('owner')->type('car-owners')
```

:::warning
The `HasOneThrough` field **cannot** be hydrated (filled). This is because
the intermediary resource should be created or updated instead.

Using our example, a JSON:API client can create or update a `cars` resource,
and its related owner and mechanic. That would change the `mechanics`
has-one-through `owner` relation.
:::


### Has Many Through

The `HasManyThrough` field corresponds to a `hasManyThrough` Eloquent
relationship. For example, a `Country` model might have many `Post` models
through an intermediate `User` model. In this example, you could easily
gather all blog posts for a given country.

You can add this relationship to your `Country` schema as follows:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\HasManyThrough;

HasManyThrough::make('posts')
```

As described above, this will assume the method name on the model is `posts`.
If this is not the case, the method name can be provided as the second
argument:

```php
HasManyThrough::make('posts', 'blogPosts')
```

The inverse resource type is assumed to be the dasherized form of the Eloquent
method name. If this is not the case, use the `type` method:

```php
HasManyThrough::make('posts') // assumed 'posts'
HasManyThrough::make('posts')->type('blog-posts')
```

:::warning
The `HasManyThrough` field **cannot** be hydrated (filled). This is because
the intermediary resource should be created or updated instead.

Using our example, the contents of the `Country`'s `posts` relationship is
generated by the `User` models that are linked to `Post` models. Therefore a
JSON:API client would create or update a `posts` resource, and/or change the
country linked to a `users` resource, to amend the country's `posts`
relationship.
:::

### Belongs To

The `BelongsTo` field corresponds to a `belongsTo` Eloquent relationship.
For example. let's assume a `Post` model `belongsTo` a `User` model. We
may add the relationship to our `Post` schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\BelongsTo;

BelongsTo::make('user')
```

As described above, this will assume the method name on the model is `user`.
If this is not the case, the method name can be provided as the second
argument:

```php
BelongsTo::make('author', 'user')
```

The inverse resource type is assumed to be the pluralized and dasherized form
of the Eloquent method name. If this is not the case, use the `type`
method:

```php
BelongsTo::make('author', 'user') // assumed 'users'
BelongsTo::make('author')->type('users')
```

### Belongs To Many

The `BelongsToMany` field corresponds to a `belongsToMany`, `morphToMany`
or `morphedByMany` Eloquent relationship. For example, let's assume a
`User` model `belongsToMany` `Role` models. We may add the relationship to
our `User` schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\BelongsToMany;

BelongsToMany::make('roles');
```

As described above, this will assume the method name on the model is `roles`.
If this is not the case, the method name can be provided as the second
argument:

```php
BelongsToMany::make('roles', 'accessRoles')
```

The inverse resource type is assumed to be the dasherized form of the Eloquent
method name. If this is not the case, use the `type` method:

```php
BelongsToMany::make('roles') // assumed 'roles'
BelongsToMany::make('roles')->type('access-roles')
```

#### Pivot Table

If your `BelongsToMany` relationship interacts with additional *pivot* columns
that are stored on the intermediate table of the relationship, you may also
attach these to the relationship.

:::tip
The JSON:API specification does not allow attributes to be sent with relationship
identifiers. It is therefore important to understand that the follow examples
only allow us to add *server-calculated* values to a pivot table.

If you need the client to provide values for a pivot table, then you should
use a pivot model for the intermediary table, and add that model to your API
as its own resource type. So in the following example, we would have a
`RoleUser` model for the intermediary `role_user` table, and have a JSON:API
resource called `role-users`.
:::

For example, let's assume our `User` model `belongsToMany` `Role` models.
On our `role_user` intermediate table, let's imagine that we have an
`approved` column that contains a flag as to whether an administrator
created the relationship between the `User` and the `Role`. We can
store this information by providing a callback to the `fields` method
on the relationship:

```php
BelongsToMany::make('roles')->fields(static fn($parent, $related) => [
  'approved' => \Auth::user()->admin,
]);
```

:::tip
The callback receives two arguments: the parent of the relationship, and
the models that are being attached. In this example, the parent would be
the `User` model, and the related models would be `Role` models.
:::

To provide values that require no calculation, pass an `array` to the `fields`
method:

```php
BelongsToMany::make('roles')->fields(['approved' => false]);
```

Of course we could also add this pivot data on the inverse of the relationship.
So, if we define the `BelongsToMany` field on the `User` schema, we would
also define its inverse on the `Role` schema:

```php
BelongsToMany::make('users')->fields(static fn() => [
  'approved' => \Auth::user()->admin,
]);
```

Since defining the field on both ends of the relationship can cause some
code duplication, we allow you to pass an invokable object to the `fields`
method:

```php
BelongsToMany::make('roles')->fields(new ApprovedPivot())
```

In this example, the `ApprovedPivot` could be a simple, invokable class that
returns the array of pivot fields:

```php
namespace App\JsonApi\Pivots;

use Illuminate\Support\Facades\Auth;
use function boolval;
use function optional;

class ApprovedPivot
{

    /**
     * Get the pivot attributes.
     *
     * @param $parent
     * @param $related
     * @return array
     */
    public function __invoke($parent, $related): array
    {
        return [
            'approved' => boolval(optional(Auth::user())->admin),
        ];
    }

}
```

### Morph To

The `MorphTo` field corresponds to a `morphTo` Eloquent relationship.
For example, let's assume a `Comment` model has a polymorphic relationship
with both the `Post` and `Video` models. We may add the relationship to our
`Comment` schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\MorphTo;

MorphTo::make('commentable')->types('posts', 'videos')
```

As you can see from the above example, the `types` method is used to
instruct the `MorphTo` field what its inverse JSON:API resource types are.

As described above, this will assume the method name on the model is
`commentable`. If this is not the case, the method name can be provided as the
second argument:

```php
MorphTo::make('commentable', 'items')
```

### Morph To Many

The JSON:API `MorphToMany` field helps you construct polymorphic *to-many*
relationships. It's important to note that there is *not* an equivalent relationship
type in Eloquent. (The Eloquent `morphToMany` relationship type is handled by
the [`BelongsToMany` JSON:API field](#belongs-to-many).)

Adding polymorphic to-many relations involves a number of complexities and
limitations. As such, there is a [chapter covering exactly this topic,](../digging-deeper/polymorphic-to-many.md)
where you can find instructions on how to add this relationship to your schema.
