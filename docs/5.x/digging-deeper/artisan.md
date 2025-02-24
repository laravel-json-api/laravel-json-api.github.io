# Artisan Console

## Generators

Laravel JSON:API ships with a comprehensive set of generators, so that
you can easily create the classes required by the implementation.
These are referred to in the relevant chapters, but a comprehensive
list is provided here for reference.

:::tip
Many generators are shown with the `--server` option. You can omit this
option if you only have one server registered in your `jsonapi.servers`
configuration array.

If you have more than one server, you **MUST** provide the `--server`
option to specify which server the class is being generated for.
:::

### Controller

To generate a JSON:API controller, use the `jsonapi:controller` command:

```bash
php artisan jsonapi:controller Api/V1/PostController
```

This will generate the following controller:
`App\Http\Controllers\Api\V1\PostController`.

Use the `--force` option if you want to overwrite an existing controller.

### Filter

To generate a JSON:API filter, use the `jsonapi:filter` command:

```bash
php artisan jsonapi:filter MyCustomFilter
```

This will generate the following filter:
`App\JsonApi\Filters\MyCustomFilter`.

Use the `--force` option if you want to overwrite an existing filter.

### Query and Collection Query

To generate a JSON:API query parameter request, use the `jsonapi:query` command:

```bash
php artisan jsonapi:query posts --server=v1
```

This will generate the following query request class:
`App\JsonApi\V1\Posts\PostQuery`.

To generate a collection query, use the `--collection` option:

```bash
php artisan jsonapi:query posts --collection --server=v1
```

This will generate the following query request class:
`App\JsonApi\V1\Posts\PostCollectionQuery`.

To generate both the `PostQuery` *and* the `PostCollectionQuery`, use the
`--both` option:

```bash
php artisan jsonapi:query posts --both --server=v1
```

And finally, use the `--force` option if you want to overwrite existing
files.

### Resource Request

To generate a JSON:API resource request, use the `jsonapi:request` command:

```bash
php artisan jsonapi:request posts --server=v1
```

This will generate the following resource request class:
`App\JsonApi\V1\Posts\PostRequest`.

Use the `--force` option if you want to overwrite an existing request class.

### Resource Requests

To generate a JSON:API resource request, query request and query collection
request, use the `jsonapi:requests` command:

```bash
php artisan jsonapi:requests posts --server=v1
```

This will generate all of these classes:

- `App\JsonApi\V1\Posts\PostRequest`
- `App\JsonApi\V1\Posts\PostQuery`
- `App\JsonApi\V1\Posts\PostCollectionQuery`

Use the `--force` option if you need to overwrite existing files.

### Resource

To generate a JSON:API resource class, use the `jsonapi:resource` command:

```bash
php artisan jsonapi:resource posts --server=v1
```

This will generate the following resource class:
`App\JsonApi\V1\Posts\PostResource`.

Use the `--force` option if you need to overwrite existing files.

### Schema

To generate a JSON:API schema class, use the `jsonapi:schema` command:

```bash
php artisan jsonapi:schema posts --server=v1
```

This will generate the following schema class:
`App\JsonApi\V1\Posts\PostSchema`

By default, this generator will assume the model class that the schema
refers to is the singular of the resource type. I.e. in this example,
the `PostSchema` will have its `$model` property set to the `Post` model.

Use the `--model` option to provide a different model class, for example:

```bash
php artisan jsonapi:schema posts --model=BlogPost --server=v1
```

:::tip
Laravel automatically detects the model namespace in your application:
either the `Models` namespace or the root application namespace.

If you use a different convention, provide the fully-qualified model
class name, starting with a `\`, for example:

```bash
php artisan jsonapi:schema posts --model="\App\Foo\Bar\BlogPost" --server=v1
```
:::

If you are generating a schema for a [multi-resource model](proxies.md),
you should use the `--proxy` option when creating a schema for a proxy class.

As with other commands, use the `--force` option if you need to overwrite
an existing file.

### Server

To generate a JSON:API server class, use the `jsonapi:server` command:

```bash
php artisan jsonapi:server v1
```

This will create the following server class:
`App\JsonApi\V1\Server`

The generator will assume that the `$baseUri` property of the server is
`/api/{server_name}` - which would be `/api/v1` in the above example.
To use a different base URI, use the `--uri` flag:

```bash
php artisan jsonapi:server v1 --uri=http://api.example.com/v1
```

Use the `--force` option to overwrite an existing server file.

:::tip
After generating your server class, don't forget to register the class
in your `jsonapi.servers` configuration array.
:::

### Sort Field

To generate a JSON:API sort field class, use the `jsonapi:sort-field` command:

```bash
php artisan jsonapi:sort-field MyCustomSort
```

This will generate the following sort field class:
`App\JsonApi\Sorting\MyCustomSort`.

Use the `--force` option if you want to overwrite an existing sort field.

## Stub Customisation

The console commands described in this chapter that generate classes all
use *"stub"* files that are populated with values based on your input.
However, you may sometimes wish to make small changes to files generated
by Artisan. To accomplish this, you may use the `jsonapi:stubs` command to
publish the stubs for customization:

```bash
php artisan jsonapi:stubs
```

The published stubs will be located within the `/stubs/jsonapi` directory in
the root of your application. Any changes you make to these stubs will be
reflected when you generate their corresponding classes using the
commands described in this chapter.

:::tip
Use the `--force` command option to overwrite any existing JSON:API stub
files.
:::
