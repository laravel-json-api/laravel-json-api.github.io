# Resource Validation

## Introduction

Our resource request classes allow you to validate the JSON:API document
sent by the client against your application-specific validation rules.
You can also define validation rules to determine whether a resource can be
deleted.

For any resource type that you allow to be created and/or updated
(including updating relationships), you will need to create
a resource request class. To generate a resource request, use the
`jsonapi:request` Artisan command:

```bash
php artisan jsonapi:request posts --server=v1
```

This will generate the following request class:
`App\JsonApi\V1\Posts\PostRequest`

:::tip
The `--server` option is not required if you only have one server.
:::

## Validation Approach

Resource objects are validated using
[Laravel form request validators](https://laravel.com/docs/validation#form-request-validation).
If any field fails the validation rules, a `422 Unprocessable Entity` response
will be sent. The validator's error messages will be converted to JSON:API
errors, with the rule failure message in the `detail` member of the error
object. Each error will also have a JSON source pointer set identifying
the location in the request content of the validation failure.

:::tip
**Why are validation rules not defined on schema fields, like Nova resources?**

This is a good question. Although at first it would seem like a good idea
for our schema fields to implement
[Nova-style validation rules](https://nova.laravel.com/docs/3.0/resources/validation.html),
we do not believe this is a good fit for validating JSON. Whereas Nova is tying
its validation to HTML input fields, your JSON:API resource objects can contain
complex structures, such as arrays and nested JSON objects.

This makes it far more complex to attach validation rules to specific fields,
so we therefore opted for the simplicity of defining rules using
[Laravel's form request](https://laravel.com/docs/validation#form-request-validation)
approach.
:::

## Validation Data

### Creating Resources

Validators are provided with the
[resource fields](http://jsonapi.org/format/#document-resource-object-fields)
that were submitted by the client. Collectively these are the
`type`, `id`, `attributes` and `relationships` of the resource.
To make it easier to write validation rules, we set the value of relationship
fields to the `data` member of the relationship.

This is best illustrated with an example. Given this request:

```http
POST /api/v1/posts HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "attributes": {
      "content": "...",
      "slug": "hello-world",
      "title": "Hello World"
    },
    "relationships": {
      "author": {
        "data": {
          "type": "users",
          "id": "123"
        }
      },
      "tags": {
        "data": [
          {
            "type": "tags",
            "id": "1"
          },
          {
            "type": "tags",
            "id": "3"
          }
        ]
      }
    }
  }
}
```

Your validator will be provided with the following array of data:

```php
[
    "author" => [
      "type" => "users",
      "id" => "123",
    ],
    "content" => "...",
    "id" => null,
    "slug" => "hello-world",
    "tags" => [
        ["type" => "tags", "id" => "1"],
        ["type" => "tags", "id" => "3"],
    ],
    "title" => "Hello World",
    "type" => "posts",
];
```

### Updating Resources

When updating resources, the JSON:API specification says:

> If a request does not include all of the attributes for a resource,
the server MUST interpret the missing attributes as if they were included
with their current values. The server MUST NOT interpret missing attributes
as null values.

The same applies to relationships.

As Laravel provides validation rules that allow you to compare values that
are being validated (e.g. a date that must be `before` another value),
we take the existing field values of your resource and merge the values
provided by the client over the top.

For example, in the following `PATCH` request the client has not provided
values for the `content`, `slug` and `author` fields:


```http
PATCH /api/v1/posts/1 HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "title": "Hello World"
    },
    "relationships": {
      "tags": {
        "data": [
          {
            "type": "tags",
            "id": "1"
          }
        ]
      }
    }
  }
}
```

To comply with the JSON:API specification we must assume that the missing fields
are the current values stored on the resource. We therefore get the current
resource values and then merge the client values on-top. In the above example,
this means that the validator receives the following data:

```php
[
    "author" => [
        "type" => "users",
        "id" => "345",
    ],
    "content" => "...",
    "id" => "1",
    "slug" => "hello-world",
    "tags" => [
        ["type" => "tags", "id" => "1"],
    ],
    "title" => "Hello World",
    "type" => "posts",
];
```

When working out the current values, we only take the values of `BelongsTo`
and `MorphTo` relations. This is because it  would be extremely inefficient for
us to read the value of every relation. For example, our `posts` resource could
have hundreds of `comments`, which are not required for validation.

If you need the values of a relationship that is not included by default,
use the `mustValidate()` method on the field in your schema. For example,
if we wanted the current value of `tags` to be used:

```php
class PostSchema extends Schema
{
    // ...

    public function fields(): array
    {
        return [
            ID::make(),
            // ...attribute fields
            BelongsTo::make('author'),
            HasMany::make('comments'),
            HasMany::make('tags')->mustValidate(),
        ];
    }
}
```

If you want to exclude a `BelongsTo` or `MorphTo` relation that we automatically
include, use the `notValidated()` method on the field in your schema. For
example, if we wanted to exclude the `author` relationship:

```php
BelongsTo::make('author')->notValidated()
```

#### Customising Existing Values

If you want to adjust any current values *before* the client-provided values
are merged, implement the `withExisting()` method on your request class.
This method receives the model and the JSON:API resource representation
as its arguments.

```php
class PostRequest extends ResourceRequest
{
    // ...

    /**
     * Modify the existing resource before it is merged with client values.
     *
     * @param \App\Models\Post $model
     * @return array|null
     */
    protected function withExisting(Post $model, array $resource): ?array
    {
        unset($resource['attributes']['foobar']);

        return $resource;
    }
}
```

You **must** return the array that you want the validator to use. If you
return `null`, then the validator will assume you did not modify the resource
and will use it as-is.

### Modifying Relationships

The JSON:API specification provides relationship endpoints for modifying
resource relations. *To-one* and *to-many* relationships can be replaced
using a `PATCH` request. For *to-many* relationships, resources can be
attached via a `POST` request or detached using a `DELETE` request.

Given this request:

```http
PATCH /api/v1/posts/123/relationships/tags HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": [
    {
      "type": "tags",
      "id": "1"
    },
    {
      "type": "tags",
      "id": "6"
    }
  ]
}
```

Your validator will be provided with the following array of data:

```php
[
    "type" => "posts",
    "id" => "1",
    "tags" => [
        ["type" => "tags", "id" => "1"],
        ["type" => "tags", "id" => "3"],
    ],
];
```

:::tip
In this scenario, we filter the resource rules returned from your `rules`
method to only include rules that have a key starting with `tags`.
:::

## Validation Rules

### Defining Resource Rules

To validate this data, you define the validation rules in the `rules`
method of your resource request class. We use the validated data to
fill models, so you **must** validate every attribute and relationship
that you expect to be filled into your model.

For example, our `PostRequest` rules might look like this:

```php
namespace App\JsonApi\V1\Posts;

use App\Models\Post;
use Illuminate\Validation\Rule;
use LaravelJsonApi\Laravel\Http\Requests\ResourceRequest;
use LaravelJsonApi\Validation\Rule as JsonApiRule;

class PostRequest extends ResourceRequest
{

    /**
     * @return array
     */
    public function rules(): array
    {
        return [
            'author' => JsonApiRule::toOne(),
            'content' => ['required', 'string'],
            'slug' => ['required', 'string'],
            'tags' => JsonApiRule::toMany(),
            'title' => ['required', 'string'],
        ];
    }
}
```

:::tip
You may type-hint any dependencies you need within the rules method's
signature. They will automatically be resolved via the Laravel service
container.
:::

### Relationship Rules

In the example above, you'll notice that the `exists` rule is not used in
the validation for the `author` or `tags` relationships. This is because
the package complies with the JSON:API spec and validates all resource
identifiers in relationships to check that they exist. If any do not exist,
the request will be rejected when the document is
[parsed for compliance](./compliance#document-compliance)
with the JSON:API specification.

Instead for relationships all we need to do is provide the
`LaravelJsonApi\Validation\Rule::toOne()` and
`toMany()` rules. These use the
schema for the request resource type to ensure that the relationships contain
the correct *type* of resource.

Remember you **must** validate every relationship that you expect to be
filled into your model.

### Client-Generated IDs

If your resource accepts
[client-generated IDs](../schemas/identifier.md#client-generated-ids)
you must add validation rules for the `id` field, for example:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

public function rules(): array
{
    return [
        'id' => ['required', JsonApiRule::clientId()],
        // ... other rules
    ];
}
```

The client ID rule ensures that the ID provided matches the
[identifier pattern](../schemas/identifier.md#pattern) set in your schema.
There is therefore no need to use Laravel's `regex` validation rule.

If you *always* expect a client to provide an `id`, use Laravel's `required`
rule as shown in the example above. If your server handles the client
*not* providing an ID (for example, if you automatically generate a random
UUID if one is not provided), then use the `nullable` rule
instead of `required`.

:::tip
As shown in the example, there is no need to use the `exists` rule to check
whether the client-generated ID already exists. This is because the JSON:API
specification defines that servers should send a `409 Conflict` response
when creating a resource with a client-generated ID that already exists.
We therefore reject this scenario when checking if the
[document complies with the specification.](compliance.md#document-compliance)
:::

### Accessing the Model

If you need to access the model when determining your validation rules,
use the `model` method. As your rules are used for both create and update
requests, this method will return `null` for a create request, and the
model for an update request.

For example:

```php
use Illuminate\Validation\Rule;

/**
 * @return array
 */
public function rules(): array
{
    $unique = Rule::unique('posts');

    /** @var \App\Models\Post|null $post */
    if ($post = $this->model()) {
        $unique->ignore($post);
    }

    return [
        'slug' => ['required', 'string', $unique],
        // other rules...
    ];
}
```

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
    if ($this->isCreatingOrUpdating()) {
        $validator->after(function ($validator) {
            if ($this->somethingElseIsInvalid()) {
                $validator->errors()->add(
                  'field',
                  'Something is wrong with this field!'
                );
            }
        });
    }
}
```

:::warning
When adding after hooks, you will need to use the request's
[helper methods](#helper-methods) to determine what type of request
it is. The example above checks whether the request is creating or updating a
resource.

You need to do this because the `withValidator` method will be called for *all*
the different request types described in this chapter, i.e. creating/updating
a resource, modifying a relationship and deleting a resource.
:::

### Complex Conditional Validation

The `withValidator` method can also be used to add
[complex conditional validation](https://laravel.com/docs/validation#complex-conditional-validation),
using the `sometimes` method on the validator. For example:

```php
/**
 * Configure the validator instance.
 *
 * @param \Illuminate\Validation\Validator $validator
 * @return void
 */
public function withValidator($validator)
{
    if ($this->isCreatingOrUpdating()) {
        $validator->sometimes(['reason', 'cost'], 'required', function ($input) {
            return $input->games >= 100;
        });
    }
}
```

:::warning
When adding conditional validation, you will need to use the request's
[helper methods](#helper-methods) to determine what type of request
it is. The example above checks whether the request is creating or updating a
resource before applying the conditional validation rules.

You need to do this because the `withValidator` method will be called for *all*
the different request types described in this chapter, i.e. creating/updating
a resource, modifying a relationship and deleting a resource.
:::

### Validating Booleans

In JSON, a boolean is always `true` or `false`. However Laravel's `boolean`
validation rule is _loosely typed_ - i.e. it will accept `true`, `false`, `0`,
`1`, `"0"`, and `"1"` as valid values.

For JSON it is better to by _strictly typed_ for boolean values. Use our
`boolean` rule to enforce only accepting `true` and `false` as valid values:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

return [
    'published' => JsonApiRule::boolean(),
];
```

### Validating Dates

JSON:API
[recommends using the ISO 8601 format for date and time strings in JSON](https://jsonapi.org/recommendations/#date-and-time-fields).
This is not possible to validate using Laravel's `date_format` validation rule,
because W3C state that a number of date and time formats are valid.
For example, all of the following are valid:

- `2018-01-01T12:00Z`
- `2018-01-01T12:00:00Z`
- `2018-01-01T12:00:00.123Z`
- `2018-01-01T12:00:00.123456Z`
- `2018-01-01T12:00+01:00`
- `2018-01-01T12:00:00+01:00`
- `2018-01-01T12:00:00.123+01:00`
- `2018-01-01T12:00:00.123456+01:00`

To accept any of the valid formats for a date field, this package provides a
rule object. This can be used as follows:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

return [
    'publishedAt' => ['nullable', JsonApiRule::dateTime()]
];
```

### Validating Numbers

Laravel's `integer` and `numeric` rules are _loosely typed_ - that is, they will
accept integers, floats and string representations of numbers. JSON however
can be _strictly typed_ - i.e. when JSON decoded we can expect a value to be
a PHP integer or float.

If you have a field that can accept an integer or float, use our `number`
validation rule to ensure it is strictly typed:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

return [
    'published' => JsonApiRule::number(),
];
```

To only accept integers, use the `integer` rule:

```php
use LaravelJsonApi\Validation\Rule as JsonApiRule;

return [
    'published' => JsonApiRule::integer(),
];
```

### Required Rule

Using the `required` rule can result in a JSON:API error object with a JSON
pointer to either `/data` or the actual field that is required,
e.g. `/data/attributes/content`. This will vary based on whether the client
omits the field or sends an empty value for the field.

If you always want the pointer to relate to the actual field,
e.g. `/data/attributes/content`, ensure your client *always* sends a value
for the field, even if that value is empty (e.g. `null`).

To illustrate this, here are two requests that fail the `required` rule and
the resulting error response:

#### Field Omitted

```http
POST /api/v1/posts HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "attributes": {
      "title": "Hello World"
    }
  }
}
```

In this scenario, a JSON pointer of `/data/attributes/content` cannot be
used as it would point at a field that does not exist in the request JSON.
Instead, the `/data` pointer indicates the error is caused by the
resource object held in the top-level `data` member:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/vnd.api+json

{
  "errors": [
    {
      "detail": "The content field is required.",
      "source": {
        "pointer": "/data"
      },
      "status": "422",
      "title": "Unprocessable Entity"
    }
  ],
  "jsonapi": {
    "version": "1.0"
  }
}
```

#### Field Empty

```http
POST /api/v1/posts HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "attributes": {
      "content": null,
      "title": "Hello World"
    }
  }
}
```

In this scenario, the pointer can be `/data/attributes/content` as the
field actually exists in the request JSON:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/vnd.api+json

{
  "errors": [
    {
      "status": "422",
      "title": "Unprocessable Entity",
      "detail": "The content field is required.",
      "source": {
        "pointer": "/data/attributes/content"
      }
    }
  ],
  "jsonapi": {
    "version": "1.0"
  }
}
```

### Confirmed Rule

Laravel's `confirmed` rule expects there to be a field with the same name
and `_confirmation` on the end. For example, if using the `confirmed` rule on
the `password` field, it expects there to be a `password_confirmation` field.

If you are not using underscores in your field names, this means the
`confirmed` rule will not work. For example if using camel-case your extra
field will be called `passwordConfirmation`. Unfortunately Laravel does not
provide a way of customising the expected confirmation field name.

In this scenario you will need to use the following rules to get
`passwordConfirmation` working:

```php
public function rules(): array
{
    return [
        'name' => 'required|string',
        'password' => "required|string",
        'passwordConfirmation' => "required_with:password|same:password",
    ];
}
```

Remember to note [the guidance above about update requests](#updating-resources),
where the server must assume that missing values have the current value.
For password scenarios, your validator will not have access to the current
value.

You would therefore need to adjust your use of the `required` and
`required_with` rules to only add them if the client has sent a password.
For example:

```php
public function rules(): array
{
    $model = $this->model();

    $rules = [
        'name' => 'required|string',
        'password' => [
            $model ? 'filled' : 'required',
            'string',
        ],
    ];

    // when creating, we do expect the password confirmation to always exist
    if (!$model) {
        $rules['passwordConfirmation'] = 'required_with:password|same:password';
    }

    return $rules;
}

public function withValidator($validator)
{
    if ($this->isUpdating()) {
      $validator->sometimes(
        'passwordConfirmation',
        'required_with:password|same:password',
        fn($input) => isset($input['password']),
      );
    }
}
```

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
        'title.required' => 'A title is required',
        'body.required' => 'A message is required',
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
        'email' => 'email address',
    ];
}
```

## Validated Data

Laravel form requests allow you to retrieve the data that was validated
using the `validated` method. On our request class, this returns the
data that was validated for a resource create or update request.

For relationship requests, you should use the `validatedForRelation`
method to retrieve the validated value.

## Accessing Related Models

For requests that modify a relationship, it is possible to access the related
model (for a to-one relationship) or models (for a to-many relationship). These
are the models that are referenced in the `data` member of the request JSON.

:::warning
As the request JSON is _untrusted_ input, you should only access the related
model or models _after_ validation has successfully completed.
:::

For to-one relationships, use the `toOne()` method. This method returns either
the related model or `null`, depending on what is in the request JSON. For
example:

```php
/** @var \App\Models\User|null $author */
$author = $request->toOne();
```

For to-many relationships, use the `toMany()` method. This method returns a
collection of the related models referenced in the request JSON. For example:

```php
/** @var \Illuminate\Support\Collection $tags */
$tags = $request->toMany();
```

## Deleting Resources

It is possible to add validation rules for deleting resources. This is useful
if you want to prevent the deletion of a resource in certain circumstances.
**This validation is optional**. If your validators class does not define any
delete rules, the delete request will be allowed.

For example, if you did not want to allow API clients to delete `posts` that
have `comments`:

```php
class PostRequest extends ResourceRequest
{

    // ...

    /**
     * @return array
     */
    public function deleteRules(): array
    {
        return [
            'meta.no_comments' => 'accepted',
        ];
    }

    /**
     * @return array
     */
    public function deleteMessages(): array
    {
        return [
            'meta.no_comments.accepted' =>
              'You cannot delete a post with comments.',
        ];
    }

    /**
     * @param \App\Models\Post $post
     * @return array
     */
    public function metaForDelete(Post $post): array
    {
        return [
            'no_comments' => $post->comments()->doesntExist(),
        ];
    }
}
```

### Deletion Validation Data

By default we pass the resource's current field values to the delete validator.
This is the same process as
[described above for updating resources](#updating-resources),
although we allow you to add specific data for the delete request.

To add data for the delete validation, use the `metaForDelete` method
to return an array of values. This is then available to validate using rules
for the `meta` value.

In the above example, the `metaForDelete` method is used to add a boolean
to indicate that `posts` resource has no comments. This is then validated
using the `meta.no_comments` path.

### Deletion Validation Rules

Define delete validation rules in your validators `deleteRules` method,
as shown in the above example.

As with the `rules` method, you may type-hint any dependencies you need within
the rules method's signature. They will automatically be resolved via the
Laravel service container.

You can also access the model being deleted via the `model` method.

### Deletion Error Messages

To add any custom error messages for your delete resource rules, implement
the `deleteMessages` method. This should return an array of custom messages,
which will be merged with your resources custom error messages.

### Deletion Attribute Names

To add any custom attribute names for your delete resource rules, implement
the `deleteAttributes` method. This should return an array of custom
attributes, which will be merged with your resource's custom attributes.

## Helper Methods

Our resource request class has a number of helper methods, to enable you
to determine what *type* of request the class is handling. The available
methods are:

- [isCreating](#iscreating)
- [isUpdating](#isupdating)
- [isCreatingOrUpdating](#iscreatingorupdating)
- [isDeleting](#isdeleting)
- [getFieldName](#getfieldname)
- [isUpdatingRelationship](#isupdatingrelationship)
- [isAttachingRelationship](#isattachingrelationship)
- [isDetachingRelationship](#isdetachingrelationship)
- [isModifyingRelationship](#ismodifyingrelationship)

:::tip
We recommend using these methods instead of using the `isMethod` method,
because the HTTP verb can be used for both resource and relationship requests.
E.g. `POST` is used both for creating a resource and replacing the contents
of a relationship.
:::

#### isCreating

Returns `true` if the request will create a new resource.
For example:

```http
POST /api/v1/posts HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  ...
}
```

#### isUpdating

Returns `true` if the request will update an existing resource.
For example:

```http
PATCH /api/v1/posts/123 HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  ...
}
```

#### isCreatingOrUpdating

Returns `true` if the request will create or update a resource, i.e.:

```php
$request->isCreatingOrUpdating() ===
    ($request->isCreating() || $request->isUpdating());
```

#### isDeleting

Returns `true` if the request will delete an existing resource.
For example:

```http
DELETE /api/v1/posts/123 HTTP/1.1
Accept: application/vnd.api+json
```

#### getFieldName

For a relationship request, returns the field name of the relationship
that is being modified. Otherwise returns `null`.

#### isUpdatingRelationship

Returns `true` if the request will replace the contents of relationship on
an existing resource. For example:

```http
PATCH /api/v1/posts/123/relationships/tags HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  ...
}
```

#### isAttachingRelationship

Returns `true` if the request will attach resources to a *to-many* relation.
For example:

```http
POST /api/v1/posts/123/relationships/tags HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  ...
}
```

#### isDetachingRelationship

Returns `true` if the request will detach resources from a *to-many* relation.
For example:

```http
DELETE /api/v1/posts/123/relationships/tags HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  ...
}
```

#### isModifyingRelationship

Returns `true` if the request is for *any* of the following:

- updating a relationship;
- attaching resources to a relationship;
- detaching resources from a relationship.
