# Query Parameters

## Introduction

Our query request classes allow you to validate the request
query parameters sent by the client. We provide rules so that
you can validate parameters according to JSON:API semantics, as
well as validating them against your application-specific rules.

Our query request classes are optional. If our implementation
cannot find a query request class, it will validate the request
query parameters using information from your schema.

:::warning
Making the query classes optional helps to rapidly prototype API
endpoints. However, for production applications we recommend generating
the classes so that the query parameters are further validated
against your specific application rules.
:::

### Concept

The query parameters sent by a client affect the response it receives.
Query classes therefore relate to the resource type contained in the
**response document**. For relationship responses, this is often
a different resource type to the resource that is *subject* of the request.

Take for example a `comments` resource. A request to the `comments`
index - `GET /api/v1/comments` - will have `comments` resources in the
response. Likewise, a request to fetch a `posts` resource's `comments`
relationship -  `GET /api/v1/posts/123/comments` - will contain `comments`
responses. The subject of the request is the `posts` resource with an `id`
of `123`, but the response resource type is `comments`.

In both instances, the query parameters that are sent by the client refer
to the `comments` resource type, because that is the resource type that
will be in the response document.

:::tip
This explains why resource types have separate
[resource request](resources.md) and query request classes. It allows
us to use the query class for relationships.
:::

## Query Classes

There are two query classes. For example, a `posts` resource can have
a `PostQuery` and `PostCollectionQuery`.

The `PostQuery` is used for any request that will result in *zero-to-one*
`posts` resources in the response. For example:

| Verb | URI | Action |
| --- | --- | --- |
| POST | `/posts` | store |
| GET | `/posts/{post}` | show |
| PATCH | `/posts/{post}` | update |
| GET | `/likes/{like}/post` | showRelated |
| GET | `/likes/{like}/relationships/post` | showRelationship |
| PATCH | `/likes/{like}/relationships/post` | updateRelationship |

The `PostCollectionQuery` is used for any request that will result in
*zero-to-many* resources in the response. For example:

| Verb | URI | Action |
| --- | --- | --- |
| GET | `/posts` | index |
| GET | `/users/{user}/posts` | showRelated |
| GET | `/users/{user}/relationships/posts` | showRelationship |
| PATCH | `/users/{user}/relationships/posts` | updateRelationship |
| POST | `/users/{user}/relationships/posts` | attachRelationship |
| DELETE | `/users/{user}/relationships/posts` | detachRelationship |

:::tip
The reason these are separate is because the query parameters accepted
are likely to be different for a singular `posts` resource than a collection.
For example, it makes sense to allow pagination for a collection, but
pagination would not make sense for a singular resource.
:::

### Generating Query Classes

To generate a resource query, use the `jsonapi:query` Artisan command:

```bash
php artisan jsonapi:query posts --server=v1
```

This will generate the following request class:
`App\JsonApi\V1\Posts\PostQuery`

:::tip
The `--server` option is not required if you only have one server.
:::

To generate a resource collection query, use the `jsonapi:query` Artisan
command with the `--collection` flag:

```bash
php artisan jsonapi:query posts --collection --server=v1
```

This will generate the following request class:
`App\JsonApi\V1\Posts\PostCollectionQuery`

To generate both at once, use the `--both` flag:

```bash
php artisan jsonapi:query posts --both --server=v1
```

## Validation Approach

Query parameters are validated using
[Laravel form request validators](https://laravel.com/docs/validation#form-request-validation).
If any field fails the validation rules, a `400 Bad Request` response
will be sent. The validator's error messages will be converted to JSON:API
errors, with the rule failure message in the `detail` member of the error
object. Each error will also have a source parameter, identifying
which query parameter has caused the request to fail.

## Validation Rules

### Defining Rules

As our query classes extend Laravel's form requests, you should use the
`rules` method to define your validation rules.

For example, our `PostQuery` rules might look like this:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Validation\Rule as JsonApiRule;
use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;

class PostQuery extends ResourceQuery
{

    /**
     * Get the validation rules that apply to the request.
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
            'include' => [
                'nullable',
                'string',
                JsonApiRule::includePaths(),
            ],
            'page' => JsonApiRule::notSupported(),
            'sort' => JsonApiRule::notSupported(),
        ];
    }
}
```

And our `PostCollectionQuery` rules might look like this:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Validation\Rule as JsonApiRule;
use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;

class PostCollectionQuery extends ResourceQuery
{

    /**
     * Get the validation rules that apply to the request.
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
            'sort' => [
                'nullable',
                'string',
                JsonApiRule::sort(),
            ],
        ];
    }
}
```

:::tip
As these are Laravel Form Requests, you may type-hint any dependencies
you need within the rules method's signature. They will automatically be
resolved via the Laravel service container.
:::

### Accessing Validation Data

If you need to access the validation data in your `rules` method,
call the `validationData` method:

```php
/**
 * @return array
 */
public function rules(): array
{
    $data = $this->validationData();

    return [
        // ...rules
    ];
}
```

### Adding After Hooks

If you would like to add an "after" hook to a form request, you may use the
`withValidator` method. This method receives the fully constructed validator,
allowing you to call any of its methods before the validation rules are
actually evaluated:

```php
/**
 * Configure the validator instance.
 *
 * @param \Illuminate\Validation\Validator $validator
 * @return void
 */
public function withValidator($validator)
{
    $validator->after(function ($validator) {
        if ($this->somethingElseIsInvalid()) {
            $validator->errors()->add(
              'field',
              'Something is wrong with this field!'
            );
        }
    });
}
```

:::tip
You should use the [Helper methods](#helper-methods) described later in this
chapter if you want to add *after* hooks for specific types of requests.
:::

### Complex Conditional Validation

The `withValidator` method shown in the previous example can also be used to add
[complex conditional validation](https://laravel.com/docs/validation#complex-conditional-validation),
using the `sometimes` method on the validator.

## Customising Error Messages

You may customize the error messages used by the form request by overriding
the `messages` method. This method should return an array of attribute / rule
pairs and their corresponding error messages:

```php
/**
 * Get the error messages for the defined validation rules.
 *
 * @return array
 */
public function messages()
{
    return [
        'page.number.required' => 'Pagination is compulsory for this resource.',
    ];
}
```

## Customising The Validation Attributes

If you would like the `:attribute` portion of your validation message to be
replaced with a custom attribute name, you may specify the custom names by
overriding the `attributes` method. This method should return an array of
attribute / name pairs:

```php
/**
 * Get custom attributes for validator errors.
 *
 * @return array
 */
public function attributes()
{
    return [
        'page.size' => 'quantity per-page',
    ];
}
```

## Validated Parameters

To get the validated data, use the `validated` method.

Our query classes also have helper methods for retrieving the JSON:API
query parameters defined in the specification. All of these methods
use the validated data when returning values. The methods are:

- `includePaths`
- `sparseFieldSets`
- `sortFields`
- `page`
- `filter`

:::tip
Our query request classes implement our
`LaravelJsonApi\Contracts\Query\QueryParameters` interface. If you are
writing your own controller actions, this means you can pass the class
directly to repository methods that query the database.
:::

## Available Rules

Laravel JSON:API ships with a number of rule objects to help you validate
query parameters according to JSON:API semantics. You can fluently
construct these from the `LaravelJsonApi\Validation\Rule` class.

:::tip
Typically we import this `Rule` class using an alias of `JsonApiRule`.
This is to avoid collisions with the `Illuminate\Validation\Rule` class.
:::

The available rules are:

- [Boolean](#boolean)
- [Field Sets](#field-sets)
- [Filter](#filter)
- [Include Paths](#include-paths)
- [Not Supported](#not-supported)
- [Page](#page)
- [Sort](#sort)

### Boolean

As query parameters are taken from the string URL, their values are always
strings. Our filters classes have an `asBoolean()` helper method that tells the
filter to parse the string value to a boolean - which internally uses PHP's
`filter_var` function.

To validate a query parameter string value as a boolean, use our `boolean` rule
combined with the `asString()` method to tell the rule that you expect the
boolean to be a string. For example:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

public function rules(): array
{
  return [
      'filter.published' => JsonApiRule::boolean()->asString(),

      // ...
  ];
}
```

This will allow the client to submit `"true"`, `"false"`, `"0"` and `"1"` as
the string boolean values.

:::tip
Laravel does have a `boolean` rule that you could use. However this rule does
not allow `"true"` and `"false"` as values. Therefore we recommend using our
boolean rule for this scenario.
:::

### Field Sets

Our field sets rule validates the `fields` parameter according to
JSON:API semantics. This will ensure that the client is only allowed
to request sparse field sets for:

- valid JSON:API resource types; and
- fields that are defined as sparse fields on the resource type's schema.

It can be added to your rules as follows:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

public function rules(): array
{
  return [
      'fields' => [
        'nullable',
        'array',
        JsonApiRule::fieldSets(),
      ],

      // ...
  ];
}
```

### Filter

Our filter rule validates the `filter` parameter to ensure it only
contains keys for filters that are defined on your resource schema.
It can be added to your rules as follows:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

public function rules(): array
{
  return [
      'filter' => [
        'nullable',
        'array',
        JsonApiRule::filter(),
      ],

      // ...
  ];
}
```

If you want to deny the use of any of your defined filters, use the
`forget` method. For example, if we had `id` and `slug` filters that only
made sense to use when fetching zero-to-many resources.
On our `PostQuery` we would remove them as valid filters like so:

```php
JsonApiRule::filter()->forget('id', 'slug')
```

:::tip
There are also `forgetIf` and `forgetUnless` helper methods. These take
a boolean as the first argument, then a string or array of strings as the
second argument.

The `forgetIf` method forgets the specified filters if the first argument
is `true`. The `forgetUnless` method forgets them if the first argument is
`false`.
:::

It is important to note that this only checks that the keys in the filter
are valid - **it does not validate filter values.** Therefore, we recommend
adding additional rules for each value. For example:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

public function rules(): array
{
  return [
      'filter' => [
        'nullable',
        'array',
        JsonApiRule::filter(),
      ],

      'filter.foo' => [
        'filled',
        'string',
      ],

      // ...
  ];
}
```

### Include Paths

Our include path rule validates that the include paths provided by the client
only match those defined by your resource's schema. It can be added to your
rules as follows:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

public function rules(): array
{
  return [
      'include' => [
        'nullable',
        'string',
        JsonApiRule::includePaths(),
      ],

      // ...
  ];
}
```

If we wanted to deny the use of any of the include paths defined on the schema,
we would use the `forget`, `forgetIf` and/or `forgetUnless` methods to
remove specific paths.

For example:

```php
JsonApiRule::includePaths()
  ->forget('foo.bar', 'baz.bat')
  ->forgetIf($someCondition, ['foobar', 'bazbat']);
```

### Not Supported

Our not supported rule allows you to deny the use of JSON:API query parameter.
For example, it does not make sense to support pagination and sorting on a
request that will only return *zero-to-one* resource.

We would therefore prevent the `page` and `sort` parameters from being used
as follows:


```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

public function rules(): array
{
  return [
      'page' => JsonApiRule::notSupported(),
      'sort' => JsonApiRule::notSupported(),

      // ...
  ];
}
```

### Page

Our page rule validates the `page` parameter to ensure it only has keys
that are allowed by the paginator on your resource's schema. It can be added
to your rules as follows:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

public function rules(): array
{
  return [
      'page' => [
        'nullable',
        'array',
        JsonApiRule::page(),
      ],

      // ...
  ];
}
```

It is important to note that this only checks that the keys in the `page`
parameter are valid - **it does not validate their values.**
Therefore, we recommend adding additional rules for each value.
For example:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

public function rules(): array
{
  return [
      'page' => [
        'nullable',
        'array',
        JsonApiRule::page(),
      ],

      'page.number' => [
        'integer',
        'min:1',
      ],

      'page.size' => [
        'integer',
        'min:1',
      ],

      // ...
  ];
}
```

:::tip
If you want to force a client to always paginate a resource type, add the
`required` rule to your `page` keys - e.g. the `page.number` and
`page.size` in the above example.
:::

### Sort

Our sort rule validates that the sort parameters provided by the client
only match those defined by your resource's schema. It can be added to your
rules as follows:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

public function rules(): array
{
  return [
      'sort' => [
        'nullable',
        'string',
        JsonApiRule::sort(),
      ],

      // ...
  ];
}
```

If we wanted to deny the use of any of the sort paths defined on the schema,
we would use the `forget`, `forgetIf` and/or `forgetUnless` methods to
remove specific paths.

For example:

```php
JsonApiRule::sort()
  ->forget('foo', 'bar')
  ->forgetIf($someCondition, ['baz', 'bat']);
```

:::tip
Note that with sort parameters, we do not need to provide the direction, e.g.
`foo` and `-foo`. The rule allows `foo` in either direction.
:::

## Default Include Paths

The query request classes can be used to specify default include paths that
should be used when a client provides none. Simply add the JSON:API include
paths to the `$defaultIncludePaths` on your query request class. For example:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;

class PostCollectionQuery extends ResourceQuery
{

    /**
     * The default include paths to use if the client provides none.
     *
     * @var array|null
     */
    protected ?array $defaultIncludePaths = ['author', 'tags'];

    // ...
}
```

If you need to programmatically work out the default include paths, overload
the `defaultIncludePaths()` method on the request class.

When you use default include paths, the client will receive a compound document
containing the related resources when they do not provide an `include` query
parameter. In this scenario, if the client wants no resources to be included,
it must specify this using an empty `include` query parameter:

```http
GET /api/v1/posts?include= HTTP/1.1
Accept: application/vnd.api+json
```

## Helper Methods

Our query request classes have some helper methods. You may need to use
these when deciding to forget allowed parameters. The available methods are:

- [isRelationship](#isrelationship)
- [isNotRelationship](#isnotrelationship)
- [isViewingAny](#isviewingany)
- [isViewingOne](#isviewingone)
- [isViewingRelated](#isviewingrelated)
- [isViewingRelationship](#isviewingrelationship)

#### isRelationship

Returns `true` if the resource is being fetched as part of a relationship.
For example, these URLs:

- `GET /api/v1/posts/123/comments`
- `GET /api/v1/posts/123/relationships/comments`
- `PATCH /api/v1/posts/123/relationships/comments`
- `POST /api/v1/posts/123/relationships/comments`
- `DELETE /api/v1/posts/123/relationships/comments`

An example use-case would be to remove an allowed filter when the resource
type appears in a relationship:

```php
JsonApiRule::filter()->forgetIf($this->isRelationship(), [
  'foo',
  'bar',
]);
```

#### isNotRelationship

The opposite of the [`isRelationship`](#isrelationship) helper.

#### isViewingAny

Returns `true` if the request is to view *any* resource, i.e. the `index`
action. For example:

```http
GET /api/v1/posts HTTP/1.1
Accept: application/vnd.api+json
```

#### isViewingOne

Returns `true` if the request is to view *a specific resource*, i.e. the `read`
action. For example:

```http
GET /api/v1/posts/123 HTTP/1.1
Accept: application/vnd.api+json
```

#### isViewingRelated

Returns `true` if the request is to view a related resource or related resources
in a relationship, i.e. the show-related action. For example:

```http
GET /api/v1/posts/123/author HTTP/1.1
Accept: application/vnd.api+json
```

#### isViewingRelationship

Returns `true` if the request is to view a resource identifier or resource
identifiers in a relationship, i.e. the show-relationship action. For example:

```http
GET /api/v1/posts/123/relationships/tags HTTP/1.1
Accept: application/vnd.api+json
```
