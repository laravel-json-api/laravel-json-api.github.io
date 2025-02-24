# Core Concepts

## Servers

Your Laravel application can have any number of JSON:API compliant
APIs. We refer to each API as a **Server**.

You may opt to not use multiple servers: a simple application will
typically only have one server. However, there are a number of use cases
where you may decide to implement multiple servers. For example:

- If you have a public-facing API, and a private API (e.g. only accessible
by administrators).
- If you want to maintain multiple versions of an API, each version can
have its own server.

## Resources

Every server has a defined set of JSON:API resources. These are the domain
models that clients can access via your API.

For example, a blog application may have `posts`, `comments` and `users`
resources to represent the blog posts, comments on those posts, and the
users who have authored posts or comments.

### Schemas

For each resource in your server, you will have a `Schema` class.
For example, the `posts` resource would have a `PostSchema` class.

The `PostSchema` describes the structure of the `posts` resource and
translates JSON:API requests into database queries to create, read,
update and delete `Post` models.

The design of `Schema` classes is inspired by the
[Laravel Nova](https://nova.laravel.com/docs) approach.

### API Resources

By default, we use the `PostSchema` to serialize a `Post` model to a
JSON:API resource object.

If you need full control over the serialization of a model to JSON,
you can use a `Resource` class to define the JSON structure.

For example, your `posts` resource could have a `PostResource` class
defining the serialization. These resource classes are the JSON:API
equivalent of Laravel's
[Eloquent API Resources](https://laravel.com/docs/eloquent-resources).

## Requests

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

A resource can have up to three request classes. Using the `posts` resource
as an example, the three classes would be:

- **`PostRequest`**: parses the JSON content of a request to create, update,
or delete a `posts` resource. This includes parsing requests to modify
any of the relationships of the `posts` resource.
- **`PostQuery`**: parses query parameters for when the server will respond with
zero-to-one `posts` resources.
- **`PostCollectionQuery`**: parses query parameters for when the server will
respond with zero-to-many `posts` resources.

:::tip
Not all resources will use all three request classes: it depends on what
JSON:API capabilities you allow a client to execute for each resource type.
:::
