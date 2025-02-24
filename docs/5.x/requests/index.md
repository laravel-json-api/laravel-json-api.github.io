# The Basics

## Introduction

Laravel JSON:API makes extensive use of Laravel
[Form Requests](https://laravel.com/docs/validation#form-request-validation)
to process client requests in accordance with the JSON:API specification.

Our request classes take care of:

- [Negotiating content](https://jsonapi.org/format/#content-negotiation)
between the client and the server;
- Parsing JSON documents sent by client against the JSON:API specification,
rejecting any non-compliant documents with detailed error messages.
- Validating query parameters and JSON resources against your application's
specific validation logic.

Each resource can have up to three request classes, which are
described in this chapter.

## Resource Request

Our resource request classes are named according to the resource type.
For example the `posts` resource will have a `PostRequest` class.
This class is **required** if you register the `store` and/or `update` actions
for the `posts` resource. It is optional for the `destroy` action.

In other words, the request class is responsible for requests to
create, update or delete a specific resource. Our `PostRequest`:

- authorizes requests to create, update or destroy a `posts` resource;
- ensures the `Content-Type` of the request is acceptable;
- parses the JSON content of the request to ensure it complies with the
JSON:API specification; and
- validates the JSON content according to your application's validation rules.

To generate a resource request, use the `jsonapi:request` Artisan
command:

```bash
php artisan jsonapi:request posts --server=v1
```

This will generate the following request class:
`App\JsonApi\V1\Posts\PostRequest`

:::tip
The `--server` option is not required if you only have one server.
:::

## Resource Query

Our resource query classes are named according to the resource type.
For example, the `posts` resource can have a `PostQuery` class.
This class is used to validate query parameters for whenever a response
can have zero-to-one `posts` resources in it.

This class is optional. If the class does not exist, we use a
generic class to validate the query parameters according to the information
in the resource type's schema.

:::warning
Making this class optional helps to rapidly prototype API
endpoints. However, for production applications we recommend generating
the query request class so that the query parameters are further validated
against your specific application rules.
:::

Resource query classes:

1. authorize requests to read zero-to-one of the specified resource type;
2. ensure the `Accept` header of the request is acceptable;
3. validates the query parameters according to your resource type's schema,
and your application's validation rules.

To generate a resource query, use the `jsonapi:query` Artisan command:

```bash
php artisan jsonapi:query posts --server=v1
```

This will generate the following request class:
`App\JsonApi\V1\Posts\PostQuery`

:::tip
The `--server` option is not required if you only have one server.
:::

## Resource Collection Query

Our resource collection query classes are like the resource query class, except
they are used for requests that will receive a response containing zero-to-many
of a resource type.

They are named according to the resource type. For example, the `posts` resource
can have a `PostCollectionQuery` class.

This class is also optional. If the class does not exist, we use a
generic class to validate the query parameters according to the information
in the resource type's schema.

:::warning
Making this class optional helps to rapidly prototype API
endpoints. However, for production applications we recommend generating
the query collection class so that the query parameters are further validated
against your specific application rules.
:::

To generate a resource collection query, use the `jsonapi:query` Artisan
command with the `--collection` flag:

```bash
php artisan jsonapi:query posts --collection --server=v1
```

This will generate the following request class:
`App\JsonApi\V1\Posts\PostCollectionQuery`

:::tip
The `--server` option is not required if you only have one server.
:::

## Generator Shorthand

If you want to generate all three request classes at once, use the
`jsonapi:requests` Artisan command:

```bash
php artisan jsonapi:requests posts --server=v1
```
:::tip
The `--server` option is not required if you only have one server.
:::
