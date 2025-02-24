# Identifier

## The ID Field

The `LaravelJsonApi\Eloquent\Fields\ID` field describes the ID member of
an Eloquent resource. It must be defined in a schema's `fields` method -
omitting it will cause an exception to be thrown.

The ID is added using the static `make` method, for example:

```php
use LaravelJsonApi\Eloquent\Fields\ID;

/**
 * @inheritDoc
 */
public function fields(): array
{
    return [
        ID::make(),
        // ...other fields
    ];
}
```

## Column Name

If no arguments are provided to the `make` method, the schema will assume
that the column name for the `id` value will be the same as the model's
route key - i.e. the column name returned by the `Model::getRouteKeyName()`
method.

If you need to use a different column to the route key name, provide this
as the first argument to the `make` method. For example:

```php
ID::make('uuid')
```

## Pattern

The `ID` field also defines the regex pattern for the resource's `id` value.
This pattern is used both when registering routes for the resource, and
when parsing values provided by the client.

By default, the `ID` field pattern is `[0-9]+`. Therefore you do not need
to do anything if your Eloquent model has numeric ids.

If your model uses UUIDs, call the `uuid()` method when registering the `ID`
field:

```php
ID::make()->uuid()
```

If your model uses ULID, call the `ulid()` method when registering the `ID`
field:

```php
ID::make()->ulid()
```

To use a custom pattern, call the `matchAs` method:

```php
ID::make()->matchAs('[A-Z_]+')
```

By default `id` pattern matching is **case insensitive**. To use case-sensitive
matching, call the `matchCase` method:

```php
ID::make()->matchAs('[a-z]+')->matchCase()
```

## Client-Generated IDs

The JSON:API specification allows servers to accept
[client-generated IDs](https://jsonapi.org/format/#crud-creating-client-ids)
along with a request to create a resource.

To enable client-generated IDs for a resource type, use the `clientIds`
method on the `ID` field. For example:

```php
ID::make()->clientIds()
```

:::warning
If you enable client-generated IDs for a resource, make sure you always
add [validation rules](../requests/resources.md#client-generated-ids)
for the `id` field to your resource request class.
:::

## Hash IDs

Laravel JSON:API includes support for encoding model keys to resource ids.
This feature can be used to hash model keys using the
[vinkla/hashids](https://github.com/vinkla/laravel-hashids) package, allowing
you to obscure database primary keys from your JSON:API clients.

### Installation

To use this feature you need to install our `laravel-json-api/hashids` package.
This will also install the
[vinkla/hashids](https://github.com/vinkla/laravel-hashids)
package (if not already installed), and you will need to publish the config
from that package.

In summary, run the following commands:

```bash
composer require laravel-json-api/hashids
php artisan vendor:publish --provider="Vinkla\Hashids\HashidsServiceProvider"
```

### Hash ID Field

To use hash IDs, use the `LaravelJsonApi\HashIds\HashId` class instead of the
`ID` class shown above. For example:

```php
use LaravelJsonApi\HashIds\HashId;

/**
 * @inheritDoc
 */
public function fields(): array
{
    return [
        HashId::make(),
        // ...other fields
    ];
}
```

As with the `ID` field, if you need to set the column name to use for the id
value, provide it as the first argument to the `make()` method:

```php
HashId::make('alternative_id')
```

### Hash ID Connection

The `HashId` field will use the default connection from the
[vinkla/hashids](https://github.com/vinkla/laravel-hashids) package. If you
need to use a different default connection, set the default connection name
using the static `withDefaultConnection()` method. For example, in the `boot()`
method of your `AppServiceProvider`:

```php
use LaravelJsonApi\HashIds\HashId;

class AppServiceProvider extends ServiceProvider
{

    public function boot()
    {
        HashId::withDefaultConnection('alternative');
    }
}
```

:::tip
If you have multiple APIs that each use a different hash ID connection, call
the static `withDefaultConnection()` method in your server's `serving()` hook.
:::

If you need to set the connection for a specific schema, this can be done using
the `useConnection()` method. For example:

```php
HashId::make()->useConnection('posts')
```

### Hash ID Pattern

By default the `HashId` field sets the regex pattern for the resource id to
`[a-zA-Z0-9]+`.

If your implementation uses a minimum length for your hash ids, then you can
set this using the `withLength()` method. For example, the following will set
the ID pattern to `[a-zA-Z0-9]{16,}`:

```php
HashId::make()->withLength(16)
```

If you need to use any other pattern, use the `matchAs` method
[as described above.](#pattern)

### Hashing Route Keys

If you are already hashing model keys in the `Model::getRouteKey()` method,
then you will need to set up your `HashId` field to account for this. This is
because if no column is set on the field, the JSON:API implementation
falls back to getting the value from the `Model::getRouteKey()` method,
which in this scenario would already be hashed.

You have two choices if you already hash the model's route key. Firstly, you
could provide the specific column name to the `HashId` field. In this scenario,
the value will be read from the column rather than using the `getRouteKey()`
method. Use this approach as follows:

```php
HashId::make('id')
```

Alternatively, you can mark the `HashId` field as not needing to hash the value
it is provided with. Do this using the `alreadyHashed()` method:

```php
HashId::make()->alreadyHashed()
```

## Custom ID Encoding

If you want to encode JSON:API resource IDs using some other implementation,
this can be easily implemented on your own field using the
`LaravelJsonApi\Contracts\Schema\IdEncoder` interface.

Extend the `ID` field and implement the interface's `encode()` and `decode()`
methods. For example:

```php
namespace App\JsonApi\Fields;

use LaravelJsonApi\Contracts\Schema\IdEncoder;
use LaravelJsonApi\Eloquent\Fields\ID;

class EncodedId extends ID implements IdEncoder
{
    /**
    * Encode the model key to a JSON:API resource ID.
    *
    * @param string|int $modelKey
    * @return string
    */
    public function encode($modelKey): string
    {
        // encode the model key.
    }

    /**
    * Decode the JSON:API resource ID to a model key (id).
    *
    * Implementations must return `null` if the value cannot be
    * decoded to a model key.
    *
    * @param string $resourceId
    * @return string|int|null
    */
    public function decode(string $resourceId)
    {
        // decode the JSON:API resource id
    }
}
```

Then use your `EncodedId` field in your schema instead of the `ID` field.

### Decoding Client-Generated IDs

If your custom ID field supports [Client-Generated IDs](#client-generated-ids),
you will also need to overload the `fill` method on your custom ID class.

For example:

```php
/**
 * Fill the model with the value of the JSON:API field.
 *
 * @param Model $model
 * @param mixed $value
 */
public function fill(Model $model, $value): void
{
    if ($decoded = $this->decode($value)) {
        parent::fill($model, $decoded);
        return;
    }

    throw new RuntimeException('Resource ID did not decode to a model key.');
}
```
