# Directory Structure

## Convention

Laravel JSON:API follows the principle of **"Convention is better than configuration"**.
The recommended structure is as follows, demonstrated using a server
named `v1` with `posts` and `users` resources:

```
├── app
|   ├── Http
|   |   ├── Controllers
|   |   |   ├── Api
|   |   |   |   ├── V1
|   |   |   |   |   ├── PostController.php
|   |   |   |   |   ├── UserController.php
|   ├── JsonApi
|   |   ├── Filters
|   |   |   ├── CustomFilter
|   |   ├── V1
|   |   |   ├── Posts
|   |   |   |   ├── PostCollectionQuery.php (optional)
|   |   |   |   ├── PostQuery.php           (optional)
|   |   |   |   ├── PostRequest.php         (required if writable)
|   |   |   |   ├── PostResource.php        (optional)
|   |   |   |   ├── PostSchema.php
|   |   |   ├── Users
|   |   |   |   ├── UserSchema.php
|   |   |   ├── Server.php
```

## Auto-Discovery

As described in the `Schema` documentation, each schema class is registered
in your API's `Server` class.

Once the `Schema` is registered, all the other classes (`Query`, `Request`
and `Resource`) are then auto-discovered. The package expects these
additional classes to be in the same namespace as the `Schema` class.

In the above example, the fully qualified class name for the `posts`
schema is `App\JsonApi\V1\Posts\PostSchema`. The package will therefore
auto-discover the request class as `App\JsonApi\V1\Posts\PostRequest`.

## Customising the Root Namespace

In the above example, the root namespace for JSON:API classes is
`App\JsonApi`. You can customise this namespace by setting the `namespace`
option in your `config/jsonapi.php` file:

```php
// config/jsonapi.php
return [
    /*
    |--------------------------------------------------------------------------
    | Root Namespace
    |--------------------------------------------------------------------------
    |
    | The root JSON:API namespace, within your application's namespace.
    | This is used when generating any class that does not sit *within*
    | a server's namespace. For example, new servers and filters.
    |
    | By default this is set to `JsonApi` which means the root namespace
    | will be `\App\JsonApi`, if your application's namespace is `App`.
    */
    'namespace' => 'JsonApi',
];
```
