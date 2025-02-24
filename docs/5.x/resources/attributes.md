# Attributes

## Introduction

The `attributes` member on a resource object represents information about
the model that it is serializing. Typically this will be the values of
database columns, excluding those that represent relationships.

Attributes may contain any JSON value.

Complex data structures involving JSON objects and array are allowed as
attribute values. However, any object that constitutes or is contained
in an attribute **must not** contain a `relationships` or `links` member.

## Field Names

The members of a resource's `attributes` and `relationships` objects are
collectively called a resource object's **fields**. Fields share common
namespace with each other and the `type` and `id` members. In other words,
a resource cannot have an attribute or relationship with the same name, nor
can it have an attribute or relationship named `type` or `id`.

### Field Name Case

The JSON:API specification places [hard restrictions](https://jsonapi.org/format/#document-member-names)
on what names you are allowed to use for the `attributes` member names.

To summarize, you are allowed snake-case, camel-case and dash-case member
name. However, the specification does
[recommend that camel-case is used.](https://jsonapi.org/recommendations/#naming)

## Defining Attributes

To add attributes to your resource object, list them in the `attributes`
method. For example, a `posts` resource might look like this:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Core\Resources\JsonApiResource;

class PostResource extends JsonApiResource
{

    /**
     * Get the resource's attributes.
     *
     * @param \Illuminate\Http\Request|null $request
     * @return iterable
     */
    public function attributes($request): iterable
    {
        return [
            'content' => $this->content,
            'createdAt' => $this->created_at,
            'slug' => $this->slug,
            'synopsis' => $this->synopsis,
            'title' => $this->title,
            'updatedAt' => $this->updated_at,
        ];
    }

    // ...

}
```

Notice that we can access model properties from the `$this` variable. This
is because a resource class will automatically proxy property and method
access down to the underlying model for convenient access.

## Conditional Attributes

Sometimes you may wish to only include an attribute in a resource
response if a given condition is met. For example, you may wish to only
include a value if the current user is an "administrator". Our API resource
class provides a variety of helper methods to assist you in this situation.

The `when` method may be used to conditionally add an attribute to a
resource response. In the following example, the `secret` member will only
be serialized in the `attributes` of a `users` resource if the
authenticated user's `isAdmin` method returns `true`:

```php
public function attributes($request): iterable
{
    return [
        'createdAt' => $this->created_at,
        'email' => $this->email,
        'name' => $this->name,
        'secret' => $this->when($request->user()->isAdmin(), 'secret-value'),
        'updatedAt' => $this->updated_at,
    ];
}
```

The `when` method also accepts a `Closure` as its second argument, allowing
you to only calculate the resulting value if the given condition is `true`:

```php
'secret' => $this->when($request->user()->isAdmin(), fn() => 'secret-value'),
```

### Merging Conditional Attributes

Sometimes you may have several attributes that should only be included
in the resource object based on the same condition. In this case,
you may use the `mergeWhen` method to include the attributes
only when the given condition is `true`:

```php
public function attributes($request): iterable
{
    return [
        'createdAt' => $this->created_at,
        'email' => $this->email,
        'name' => $this->name,
        $this->mergeWhen($request->user()->isAdmin(), [
            'firstSecret' => 'value',
            'secondSecret' => 'value',
        ]),
        'updatedAt' => $this->updated_at,
    ];
}
```

Again, if the given condition is `false`, these attributes will not appear
in the serialized JSON:API resource object.

The `mergeWhen` method also allows values to be `Closure` instances, allowing
you to only calculate values if they will be in the serialized resource
object:

```php
$this->mergeWhen($request->user()->isAdmin(), [
    'firstSecret' => fn() => 'value',
    'secondSecret' => 'value',
]),
```

And finally, the `mergeWhen` method also accepts a `Closure` as its
second argument:

```php
$this->mergeWhen($request->user()->isAdmin(), fn() => [
    'firstSecret' => 'value',
    'secondSecret' => 'value',
]),
```

## Array Attributes

In JSON there is a distinction between array lists (zero-indexed arrays),
and JSON objects (PHP associative arrays). It is important for API clients
that values are returned in a consistent format.

### Array Lists

Always ensure that array lists are serialized as zero-indexed arrays.
If you use Laravel's `Collection` class to process arrays when serializing
them, it is important to remember that some methods, such as `filter` or
`reject`, may result in the array having non-sequential keys.

For example, let's say our `users` resource has a `permissions` attribute
that we want to be a JSON array of string permissions. Given the following:

```php
'permissons' => collect($this->permissions)
  ->reject('bar')
  ->all(),
```

If the value of permissions was `['foo', 'bar', 'baz']`, the above example
would result in a JSON object: `{"0":"foo","2":"baz"}`. This would be
unexpected for the client, that expects a zero-indexed JSON array.

To fix, we should call the `values` method before `all`:

```php
'permissons' => collect($this->permissions)
  ->reject('bar')
  ->values()
  ->all(),
```

### Associative Arrays

When serializing PHP associative arrays, there are two things to consider:
avoiding empty values and being consistent with the key *case*.

To illustrate both, let's say our `users` resource has an `options`
attribute. In PHP this is an associative array stored in a JSON database
column.

#### Empty Values

If the array stored in our database column is empty, then the following
attribute:

```php
'options' => $this->options,
```

Would actually be serialized as an empty JSON array, i.e. `[]`. This
would be an unexpected value for the client, which is expecting the `options`
attribute to be a JSON object.

To fix, we should cast the value to `null` if it is empty:

```php
'options' => $this->options ?: null,
```

#### Key Case

When serializing associative arrays, you should also consider the key case
that is used.

Say for example our `users` resource follows the JSON:API recommendation of
camel-case member names. It would make sense for the `options` JSON object
to also use camel-case keys. However, when storing the `options` we might
be following the Eloquent convention of snake-casing key names.

In such a scenario we would need to transform the keys of the `options`
array when serializing it. Luckily we provide some array helpers to
recursively transform array keys. For example:

```php
use LaravelJsonApi\Core\Support\Arr;

'options' => Arr::camelize($this->options) ?: null,
```

Our `Arr` helper class has the following methods to recursively transform
keys:

- `camelize`: recursively camel-case all keys in the provided array.
- `dasherize`: recursively dash-case all keys in the provided array.
- `underscore`: recursively convert camel-case and dash-case keys to
underscore (snake) case.

:::tip
The `underscore` method differs from Laravel's `snake` case, in that it will
convert both camel-cased and dasherized strings to snake case with
a `_` delimiter.
:::

Our `Arr` helper also forwards calls to the `Illuminate\Support\Arr` class,
meaning you do not need to import both classes if you want to use methods
on both.
