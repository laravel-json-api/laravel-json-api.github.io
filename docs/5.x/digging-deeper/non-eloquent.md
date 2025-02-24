# Non-Eloquent Resources

## Introduction

Some application may have objects that are not Eloquent models, that need to be
represented in your API as JSON:API resources. This is possible
using our `laravel-json-api/non-eloquent` package. This chapter describes
how to use that package to add *Non-Eloquent Resources* to your API.

:::tip
If you are using non-Eloquent resources, we assume you are comfortable with
exploring classes and interfaces via your IDE. This chapter does not document
everything you can do with non-Eloquent resources: so you will need to explore
the classes and interfaces as you build your non-Eloquent resources.
:::

### Example Scenario

To illustrate the capability in this chapter, we are going to use the following
example scenario. Imagine our Laravel application has a `Site` class which looks
something like this:

```php
namespace App\Entities;

use Illuminate\Contracts\Support\Arrayable;

class Site implements Arrayable
{

    /**
     * @var string
     */
    private string $slug;

    /**
     * @var string|null
     */
    private ?string $domain;

    /**
     * @var string|null
     */
    private ?string $name;

    /**
     * Create a new site entity from an array.
     *
     * @param string $slug
     * @param array $values
     * @return Site
     */
    public static function fromArray(string $slug, array $values)
    {
        $site = new self($slug);
        $site->setDomain($values['domain'] ?? null);
        $site->setName($values['name'] ?? null);

        return $site;
    }

    /**
     * Site constructor.
     *
     * @param string $slug
     */
    public function __construct(string $slug)
    {
        $this->slug = $slug;
    }

    /**
     * Get the site slug.
     *
     * @return string
     */
    public function getSlug(): string
    {
        return $this->slug;
    }

    /**
     * Get the site domain.
     *
     * @param string|null $domain
     * @return $this
     */
    public function setDomain(?string $domain): self
    {
        $this->domain = $domain ?: null;

        return $this;
    }

    /**
     * Get the site domain.
     *
     * @return string|null
     */
    public function getDomain(): ?string
    {
        return $this->domain;
    }

    /**
     * Set the site name.
     *
     * @param string|null $name
     * @return $this
     */
    public function setName(?string $name): self
    {
        $this->name = $name ?: null;

        return $this;
    }

    /**
     * Get the site's name.
     *
     * @return string|null
     */
    public function getName(): ?string
    {
        return $this->name;
    }

    // ...Other Getters & Setters...

    /**
     * @inheritDoc
     */
    public function toArray()
    {
        return [
            'domain' => $this->getDomain(),
            'name' => $this->getName(),
        ];
    }

}
```

You'll notice the `Site` entity is `Arrayable`. This is because our application
stores the site entities in a file in our application's `storage` directory.
Retrieving and storing `Site` entities occurs via a `SiteStorage` class,
which might look something like this:

```php

namespace App\Entities;

use Illuminate\Contracts\Filesystem\Filesystem;

class SiteStorage
{

    /**
     * @var Filesystem
     */
    private Filesystem $files;

    /**
     * @var array
     */
    private array $sites;

    /**
     * SiteStorage constructor.
     *
     * @param Filesystem $files
     */
    public function __construct(Filesystem $files)
    {
        $this->files = $files;
        $this->sites = json_decode($files->get('sites.json'), true);
    }

    /**
     * Find a site by its slug.
     *
     * @param string $slug
     * @return Site|null
     */
    public function find(string $slug): ?Site
    {
        if (isset($this->sites[$slug])) {
            return Site::fromArray($slug, $this->sites[$slug]);
        }

        return null;
    }

    /**
     * @return \Generator
     */
    public function cursor(): \Generator
    {
        foreach ($this->sites as $slug => $values) {
            yield $slug => Site::fromArray($slug, $values);
        }
    }

    /**
     * Get all sites.
     *
     * @return array
     */
    public function all(): array
    {
        return iterator_to_array($this->cursor());
    }

    /**
     * Store a site.
     *
     * @param Site $site
     * @return void
     */
    public function store(Site $site): void
    {
        $this->sites[$site->getSlug()] = $site->toArray();

        $this->write();
    }

    /**
     * Remove a site.
     *
     * @param Site|string $site
     * @return void
     */
    public function remove($site): void
    {
        if ($site instanceof Site) {
            $site = $site->getSlug();
        }

        unset($this->sites[$site]);

        $this->write();
    }

    /**
     * @return void
     */
    private function write(): void
    {
        $this->files->put('sites.json', json_encode($this->sites));
    }

}
```

## Installation

The first thing we need to do is add the `laravel-json-api/non-eloquent`
package to our application, via Composer:

```bash
composer require laravel-json-api/non-eloquent
```

## Concept & Initial Setup

For each *Non-Eloquent resource*, we need a `Schema` and a `Resource`.
We are also likely to need a `Repository`.

In our Eloquent implementation, the `Resource` class is optional. This is
because we can use the information from the Eloquent schema to serialize a model
to its JSON:API resource representation. However, this is not possible for a
non-Eloquent resource, because we do not know how to get values from your
non-Eloquent class. This means the `Resource` class is compulsory.

The `Repository` class allows our implementation to retrieve objects by their
JSON:API resource `id`. It is also used for validating any JSON:API resource
identifiers that occur within JSON:API documents received from an API client.

In our Eloquent implementation, you do not need a repository class - because
we have implemented a generic repository that works with any Eloquent model.
However, this is not the case with non-Eloquent resources, as we do not know
how to retrieve your non-Eloquent class using a JSON:API resource id.

The `Repository` class is therefore compulsory if your non-Eloquent resource
can be retrieved by its JSON:API resource `id`. The only circumstance in which
you will not have a repository will be if your non-Eloquent resource can
**never** be retrieved by its `id`, and **never** referenced in a JSON:API
document by its resource identifier.

We will now create these three classes for our `Site` entity.

### Schema

To generate a schema for a non-Eloquent resource, using the `jsonapi:schema`
generator command with the `--non-eloquent` flag. For example:

```bash
php artisan jsonapi:schema sites --non-eloquent --model "\App\Entities\Site"
```

This will generate the following schema, which we will add some attributes to:

```php

namespace App\JsonApi\V1\Sites;

use App\Entities\Site;
use LaravelJsonApi\Core\Schema\Schema;
use LaravelJsonApi\NonEloquent\Fields\Attribute;
use LaravelJsonApi\NonEloquent\Fields\ID;
use LaravelJsonApi\NonEloquent\Fields\ToMany;
use LaravelJsonApi\NonEloquent\Fields\ToOne;
use LaravelJsonApi\NonEloquent\Filters\Filter;

class SiteSchema extends Schema
{

    /**
     * The model the schema corresponds to.
     *
     * @var string
     */
    public static string $model = Site::class;

    /**
     * @inheritDoc
     */
    public function fields(): iterable
    {
        return [
            ID::make(),
            Attribute::make('domain'),
            Attribute::make('name'),
            ToOne::make('owner'),
            ToMany::make('tags'),
        ];
    }

    /**
     * @inheritDoc
     */
    public function filters(): iterable
    {
        return [
            Filter::make('slugs'),
        ];
    }

}
```

There are a few things to note about this class. Unlike the Eloquent schema,
this schema extends `LaravelJsonApi\Core\Schema\Schema`, which is our base
abstract schema. Notice also that the fields use classes from the
`LaravelJsonApi\NonEloquent\Fields` namespace. These help you to define the
JSON:API fields for a non-Eloquent resource. You can use the following fields:

- `ID`: Similar to the Eloquent `ID` class, you can call `matchAs()` to set the
  ID pattern.
- `Attribute`: A generic attribute that takes the JSON:API field name for the
  attribute.
- `ToOne`: A generic relationship field for a *to-one* relationship.
- `ToMany`: A generic relationship field for a *to-many* relationship.

We also use the `LaravelJsonApi\NonEloquent\Filters\Filter` class to list
any filters that our resource supports. Note that this class is very basic: it
just lists the JSON:API filter key that is supported. You will need to implement
filtering yourself, as shown in the [Query All Capability](#query-all-capability)
later in this chapter.

### Resource

Generate a `Resource` class for your non-Eloquent resource using the
`jsonapi:resource` command:

```bash
php artisan jsonapi:resource sites
```

Our `SiteResource` will look like this:

```php
namespace App\JsonApi\V1\Sites;

use Illuminate\Http\Request;
use LaravelJsonApi\Core\Resources\JsonApiResource;

class SiteResource extends JsonApiResource
{

    /**
     * Get the resource id.
     *
     * @return string
     */
    public function id(): string
    {
        return $this->resource->getSlug();
    }

    /**
     * Get the resource's attributes.
     *
     * @param Request|null $request
     * @return iterable
     */
    public function attributes($request): iterable
    {
        return [
            'domain' => $this->resource->getDomain(),
            'name' => $this->resource->getName(),
        ];
    }

    /**
     * Get the resource's relationships.
     *
     * @param Request|null $request
     * @return iterable
     */
    public function relationships($request): iterable
    {
        return [
            $this->relation('owner')->withData($this->resource->getOwner()),
            $this->relation('tags')->withData($this->resource->getTags()),
        ];
    }
}
```

The only significant differences here are to do with the resource `id` and
the relationship `data` member.

In the non-Eloquent resource shown above, we have implemented the `id()` method.
Unlike our Eloquent implementation, the resource class does not know how to read
the `id` value from the `Site` class, so the `id()` method must be implemented.

In the relationships, we have also specified the `data` member of the
relationship using the `withData()` method. Again, this is omitted in Eloquent
resources because the Eloquent implementation knows how to get the value from a
model. However the non-Eloquent relationship does not know how to do this
automatically, so the data must be manually set.

### Repository

The final class we need to implement is our `SiteRepository`. We provide an
`AbstractRepository` for you to extend, so you'll need to create the class
that will look like this for our `sites` resource:

```php
namespace App\JsonApi\V1\Sites;

use App\Entities\SiteStorage;
use LaravelJsonApi\NonEloquent\AbstractRepository;

class SiteRepository extends AbstractRepository
{

    /**
     * @var SiteStorage
     */
    private SiteStorage $storage;

    /**
     * SiteRepository constructor.
     *
     * @param SiteStorage $storage
     */
    public function __construct(SiteStorage $storage)
    {
        $this->storage = $storage;
    }

    /**
     * @inheritDoc
     */
    public function find(string $resourceId): ?object
    {
        return $this->storage->find($resourceId);
    }

}
```

This class is pretty simple because the `AbstractRepository` implements the
majority of the compulsory repository methods. All you need to implement is
the `find` method. This receives a JSON:API resource ID and is expected to
return the object it represents (our `Site` class in this example) or `null`
if the resource with that id does not exist.

For our `Site` class we have used constructor dependency injection to inject
the `SiteStorage` class into our repository, so that we can retrieve the `Site`
object.

:::tip
If your non-Eloquent resource is not retrievable by a resource `id`, just
return `null` from the `find()` method.
:::

Once we have created our `SiteRepository`, we need to register it by adding
it to the `repository()` method on our `SiteSchema`:

```php
class SiteSchema extends Schema
{
    // ...other methods

    public function repository(): SiteRepository
    {
        return SiteRepository::make()
            ->withServer($this->server)
            ->withSchema($this);
    }
}
```

There are a few things to note here. Firstly, the static `make()` method takes
care of using the Laravel container to construct the class,
allowing dependencies to be injected via the constructor. Secondly, we use
the `withServer()` and `withSchema()` methods to inject the JSON:API server
instance and the schema into the repository. This is because these may be
needed by the *Capabilities* that we can add to a repository.

:::tip
It is worth checking the implementation of the `exists()` and `findMany()`
methods on the `AbstractRepository` class. Both these methods are implemented
by using the `find` method. Depending on how you store and retrieve your
non-Eloquent classes (e.g. the `Site` class), you may be able to implement
these methods in a more efficient way. If this is the case, overload the
methods on your repository class.
:::

## Capabilities

Once we have completed the above steps, the following minimum *capabilities*
have been implemented for our `sites` resource:

- Retrieving a resource by its `id`, i.e. `GET /api/v1/sites/{slug}`.
- Retrieving resource relationship values, i.e. `GET /api/v1/sites/{slug}/{field}`
  and `GET /api/v1/sites/{slug}/relationships/{field}`.
- Parsing resource identifiers in JSON:API documents that have the `sites`
  resource `type`.

This is because our implementation now understands how to retrieve a `sites`
resource via the `SiteRepository::find()` method, and can retrieve the value
of a relationship by reading it from the `SiteResource` class.

All other *capabilities*, e.g. creating, updating and deleting a `sites`
resource, can be added to your `SiteRepository` class. You only need to add the
capabilities you want to support. For example, if a `sites` resource can be
created via your API you will need to add the create capability. However, if
you do not need `sites` resources to be deleted via the API, you never need
to implement a delete capability.

:::tip
Adding capabilities to your resource's repository allows you to use our generic
JSON:API controller actions. It is also forward-compatible with our intent to
support [JSON:API Atomic Operations.](https://jsonapi.org/ext/atomic/)

An alternative approach would be to
[write your own JSON:API controller actions](../routing/writing-actions.md)
for your non-Eloquent resource. If you take this approach, you do not need to
use the capabilities listed in this chapter.
:::

## Query All Capability

This capability allows your resource to be retrieved on the index route, i.e.
this request:

```http
GET /api/v1/sites HTTP/1.1
Accept: application/vnd.api+json
```

To implement this capability, create a new class that extends the
`LaravelJsonApi\NonEloquent\Capabilities\QueryAll` class. For example:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use App\Entities\SiteStorage;
use LaravelJsonApi\NonEloquent\Capabilities\QueryAll;

class QuerySites extends QueryAll
{

    /**
     * @var SiteStorage
     */
    private SiteStorage $sites;

    /**
     * QuerySites constructor.
     *
     * @param SiteStorage $sites
     */
    public function __construct(SiteStorage $sites)
    {
        parent::__construct();
        $this->sites = $sites;
    }

    /**
     * @inheritDoc
     */
    public function get(): iterable
    {
        return $this->sites->all();
    }

}
```

Once you have written this class, you must add it to your repository, by:

1. Adding the `LaravelJsonApi\Contracts\Store\QueriesAll` interface to your
repository; AND
2. Returning the capability from the `queryAll()` method.

For example, on our `SiteRepository`:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\QueriesAll;
use LaravelJsonApi\NonEloquent\AbstractRepository;

class SiteRepository extends AbstractRepository implements QueriesAll
{

    // ...

    /**
     * @inheritDoc
     */
    public function queryAll(): Capabilities\QuerySites
    {
        return Capabilities\QuerySites::make()
            ->withServer($this->server())
            ->withSchema($this->schema());
    }

}
```

:::tip
The `make()` method on the capability class takes care of any constructor
dependency injection, and we use the `withServer()` and `withSchema()` methods
to inject the JSON:API server and schema in case these are needed in the
capability.
:::

Our `QuerySites` capability implements the `get()` method. At its most basic
implementation, this returns *all* the resources that should be listed for an
index request. In the above example, we return all the `Site` objects from our
`SiteStorage` class.

You can use the `get()` method to implement other features as needed. For example,
our `SiteSchema` had a `slugs` filter on it. We could implement that in our
`QuerySites` class by updating the `get()` method:

```php
public function get(): iterable
{
    $sites = collect($this->sites->all());
    $filters = $this->queryParameters->filter();

    if ($filters && is_array($slugs = $filters->value('slugs'))) {
        $sites = $sites->filter(
            fn(Site $site) => in_array($site->getSlug(), $slugs)
        );
    }

    return $sites;
}
```

This would mean the following request would be supported:

```http
GET /api/v1/sites?filter[slugs][]=foo&filter[slugs][]=bar HTTP/1.1
Accept: application/vnd.api+json
```

:::tip
The `QuerySites` capability is also where support for pagination is added,
if needed. See the [Pagination](#pagination) section for examples.
:::

## Resource Capabilities

If your resource can be created, updated and/or deleted, you will need to add
a *CRUD* capability to your repository. This capability also allows you to
customise reading a specific resource.

### Writing the CRUD Capability

Firstly you will need to create a new class that extends the
`LaravelJsonApi\NonEloquent\Capabilities\CrudResource` capability class.

For example, we would add the following `CrudSite` class for our `sites`
resource. We inject our `SiteStorage` class using constructor dependency
injection:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use App\Entities\SiteStorage;
use LaravelJsonApi\NonEloquent\Capabilities\CrudResource;

class CrudSite extends CrudResource
{

    /**
     * @var SiteStorage
     */
    private SiteStorage $storage;

    /**
     * CrudSite constructor.
     *
     * @param SiteStorage $storage
     */
    public function __construct(SiteStorage $storage)
    {
        parent::__construct();
        $this->storage = $storage;
    }
}
```

This `CrudSite` class is where we will implement the methods to create,
update and delete a `sites` resource. It is worth noting that we will only
need to add the methods for the capabilities we want to support. For example,
if our resource was not deletable in our API, then we would not need to add
a delete method.

Once this class is created, you will need to add it to your repository, by:

1. Adding the `LaravelJsonApi\NonEloquent\Concerns\HasCrudCapability` trait to
your repository; AND
2. Returning your CRUD class from the `crud()` method.

For example, we would update our `SiteRepository` as follows:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\NonEloquent\AbstractRepository;
use LaravelJsonApi\NonEloquent\Concerns\HasCrudCapability;

class SiteRepository extends AbstractRepository
{

    use HasCrudCapability;

    // ...

    /**
     * @inheritDoc
     */
    protected function crud(): Capabilities\CrudSite
    {
        return Capabilities\CrudSite::make();
    }

}
```

:::tip
As with other capabilities, the `make()` method takes care of constructor
dependency injection. You do not need to use the `withServer()` or
`withSchema()` methods as our `HasCrudCapability` trait takes care of injecting
those dependencies for you.
:::

### Create Capability

This capability allows API clients to create resources, i.e. this request:

```http
POST /api/v1/sites HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
    //...
}
```

To add this capability we need to do two things:

1. Add the `LaravelJsonApi\Contracts\Store\CreatesResources` interface to our
repository; AND
2. Implement the `create()` method on our `CrudSite` capability class.

This is what our updated `SiteRepository` would look like:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\CreatesResources;
use LaravelJsonApi\NonEloquent\AbstractRepository;
use LaravelJsonApi\NonEloquent\Concerns\HasCrudCapability;

class SiteRepository extends AbstractRepository implements CreatesResources
{

    use HasCrudCapability;

    // ...

}
```

And we would add the `create()` method to our `CrudSite` capability class,
for example:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use App\Entities\Site;
use LaravelJsonApi\NonEloquent\Capabilities\CrudResource;

class CrudSite extends CrudResource
{

    // ...

    /**
     * Create a new site.
     *
     * @param array $validatedData
     * @return Site
     */
    public function create(array $validatedData): Site
    {
        $owner = $this->toOne($validatedData['owner'] ?? null);
        $tags = $this->toMany($validatedData['tags'] ?? []);

        $site = new Site($validatedData['slug']);
        $site->setDomain($validatedData['domain'] ?? null);
        $site->setName($validatedData['name'] ?? null);
        $site->setOwner($owner);
        $site->setTags(...$tags);

        $this->storage->store($site);

        return $site;
    }
}
```

The `create()` method receives the validated data sent by the API client,
and returns the created `Site` object.

Note that if the validated data contains JSON:API resource identifiers for
relationships, you can use the `toOne()` and `toMany()` methods to convert
the identifiers to actual instances of the related classes. This makes it
easy to set relationships when creating new resources - as shown in the
`CrudSite::create()` example above.

### Read Capability

This capability is already implemented on the abstract repository class, and
allows a resource to be retrieved using its resource `id`, i.e. this request:

```http
GET /api/v1/sites/<SLUG> HTTP/1.1
Accept: application/vnd.api+json
```

You only need to implement this capability yourself if you want to add
additional features. For example, you might want to support filters, such as
this request:

```http
GET /api/v1/sites/<SLUG>?filter[name]=Test HTTP/1.1
Accept: application/vnd.api+json
```

In this example, the client is asking whether the site with the provided slug
has a name of `Test`. To support this, we will need to implement the `read()`
method on our `CrudSite` capability class. (We do not need to add any
interfaces to our repository, as the abstract repository already implements
the relevant interface.)

Here is our example `read()` method implemented on our `CrudSite` class:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use App\Entities\Site;
use Illuminate\Support\Str;
use LaravelJsonApi\NonEloquent\Capabilities\CrudResource;

class CrudSite extends CrudResource
{

    // ...

    /**
     * Read the supplied site.
     *
     * @param Site $site
     * @return Site|null
     */
    public function read(Site $site): ?Site
    {
        $filters = $this->queryParameters->filter();

        if ($filters && $name = $filters->value('name')) {
            return Str::contains($site->getName(), $name) ? $site : null;
        }

        return $site;
    }
}
```

The `read()` method receives the `Site` object that is subject of the request,
and can return either the `Site` or `null`. In our example, we return `null`
if the `name` filter does not match our `Site` class. Otherwise we return
the `Site` object.

### Update Capability

This capability allows API clients to update resources, i.e. this request:

```http
PATCH /api/v1/sites/<SLUG> HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
    //...
}
```

To add this capability we need to do two things:

1. Add the `LaravelJsonApi\Contracts\Store\UpdatesResources` interface to our
repository; AND
2. Implement the `update()` method on our `CrudSite` capability class.

This is what our updated `SiteRepository` would look like:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\UpdatesResources;
use LaravelJsonApi\NonEloquent\AbstractRepository;
use LaravelJsonApi\NonEloquent\Concerns\HasCrudCapability;

class SiteRepository extends AbstractRepository implements UpdatesResources
{

    use HasCrudCapability;

    // ...

}
```

And we would add the `update()` method to our `CrudSite` capability class,
for example:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use App\Entities\Site;
use LaravelJsonApi\NonEloquent\Capabilities\CrudResource;

class CrudSite extends CrudResource
{

    // ...

    /**
     * Update the site.
     *
     * @param Site $site
     * @param array $validatedData
     * @return Site
     */
    public function update(Site $site, array $validatedData): Site
    {
        if (array_key_exists('domain', $validatedData)) {
            $site->setDomain($validatedData['domain']);
        }

        if (array_key_exists('name', $validatedData)) {
            $site->setName($validatedData['name']);
        }

        if (array_key_exists('owner', $validatedData)) {
            $site->setOwner($this->toOne($validatedData['owner']));
        }

        if (isset($validatedData['tags'])) {
            $site->setTags(...$this->toMany($validatedData['tags']));
        }

        $this->storage->store($site);

        return $site;
    }
}
```

The `update()` method receives the `Site` being updated and the validated data
sent by the API client.

Note that if the validated data contains JSON:API resource identifiers for
relationships, you can use the `toOne()` and `toMany()` methods to convert
the identifiers to actual instances of the related classes. This makes it easy
to set relationships when update resources - as shown in the
`CrudSite::update()` example above.

### Delete Capability

This capability allows API clients to delete resource, i.e. this request:

```http
DELETE /api/v1/sites/<SLUG> HTTP/1.1
Accept: application/vnd.api+json
```

To add this capability we need to do two things:

1. Add the `LaravelJsonApi\Contracts\Store\DeletesResources` interface to our
repository; AND
2. Implement the `delete()` method on our `CrudSite` capability class.

This is what our updated `SiteRepository` would look like:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\DeletesResources;
use LaravelJsonApi\NonEloquent\AbstractRepository;
use LaravelJsonApi\NonEloquent\Concerns\HasCrudCapability;

class SiteRepository extends AbstractRepository implements DeletesResources
{

    use HasCrudCapability;

    // ...

}
```

And we would add the `delete()` method to our `CrudSite` capability class,
for example:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use App\Entities\Site;
use LaravelJsonApi\NonEloquent\Capabilities\CrudResource;

class CrudSite extends CrudResource
{

    // ...

    /**
     * Delete the site.
     *
     * @param Site $site
     * @return void
     */
    public function delete(Site $site): void
    {
        $this->storage->remove($site);
    }
}
```

The `delete()` method receives the `Site` being deleted, and removes it from
storage.

## Relationship Capabilities

If your resource allows relationships to be modified via relationship endpoints,
you will need to add a *CRUD Relations* capability to your repository. This
capability also allows you to customise reading a specific resource's
relationships.

### Writing the CRUD Relations Capability

Firstly you will need to create a new class that extends the
`LaravelJsonApi\NonEloquent\Capabilities\CrudRelations` capability class.

For example, we would add the following `CrudSiteRelations` class for our
`sites` resource. We inject our `SiteStorage` class using constructor
dependency injection:

```php
namespace App\JsonApi\Sites\Capabilities;

use App\Entities\SiteStorage;
use LaravelJsonApi\NonEloquent\Capabilities\CrudRelations;

class CrudSiteRelations extends CrudRelations
{

    /**
     * @var SiteStorage
     */
    private SiteStorage $storage;

    /**
     * ModifySiteRelationships constructor.
     *
     * @param SiteStorage $storage
     */
    public function __construct(SiteStorage $storage)
    {
        parent::__construct();
        $this->storage = $storage;
    }

}
```

The `CrudSiteRelations` class is where we will implement the methods to
read or set a *to-one* relation, and the methods to read, sync, attach or
detach a *to-many* relation. It is worth noting that we only need to add the
methods for the relationships and capabilities that we need to support.

Once this class is created, you will need to add it to your repository, by:

1. Adding the `LaravelJsonApi\NonEloquent\Concerns\HasRelationsCapability`
trait to your repository; AND
2. Returning the CRUD Relations class from the `relations()` method.

For example, we would update our `SiteRepository` as follows:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\NonEloquent\AbstractRepository;
use LaravelJsonApi\NonEloquent\Concerns\HasRelationsCapability;

class SiteRepository extends AbstractRepository
{

    use HasRelationsCapability;

    // ...

    /**
     * @inheritDoc
     */
    protected function relations(): Capabilities\CrudSiteRelations
    {
        return Capabilities\CrudSiteRelations::make();
    }

}
```

:::tip
As with other capabilities, the `make()` method takes care of constructor
dependency injection. You do not need to use the `withServer()` or `withSchema()`
methods as our `HasRelationsCapability` trait takes care of injecting those
dependencies for you.
:::

### Read Relations Capability

This capability is already implemented on the abstract repository, and allows
the value of a resource's relationship to be retrieved by both of these
requests:

```http
GET /api/v1/sites/<SLUG>/<RELATION> HTTP/1.1
Accept: application/vnd.api+json
```

And

```http
GET /api/v1/sites/<SLUG>/relationships/<RELATION> HTTP/1.1
Accept: application/vnd.api+json
```

You only need to implement this capability yourself if you want to add additional
features. For example, you might want to allow a *to-many* relationship to be
filtered.

If we wanted to do this for the `tags` relationship of our `sites` resource,
we would add the `getTags()` method on our `CrudSiteRelations` capability
class. (We do not need to add any interfaces to our repository, as the abstract
repository already implements the relevant interface.)

Here is our example `getTags()` method implemented on our `CrudSiteRelations`
class:

```php
namespace App\JsonApi\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\User;
use LaravelJsonApi\NonEloquent\Capabilities\CrudRelations;

class CrudSiteRelations extends CrudRelations
{

    // ...

    /**
     * Get the tags relationship
     *
     * @param Site $site
     * @return iterable
     */
    public function getTags(Site $site): iterable
    {
        $tags = collect($site->getTags());

        $filters = $this->queryParameters->filter();

        if ($filters && $name = $filters->value('name')) {
            $tags = $tags->filter(
                fn(Tag $tag) => Str::contains($tag->getName(), $name)
            );
        }

        return $tags;
    }
}
```

### Modify To-One Capability

This capability allows API clients to modify a resource's *to-one* relationships
via relationship endpoints. For example:

```http
PATCH /api/v1/sites/<SLUG>/relationships/owner HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
    // ...
}
```

To add this capability we need to do two things:

1. Add the `LaravelJsonApi\Contracts\Store\ModifiesToOne` interface to our
repository; AND
2. Add the `set<Relation>` method to our `CrudSiteRelations` capability class.

This is what our updated `SiteRepository` would look like:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\ModifiesToOne;
use LaravelJsonApi\NonEloquent\AbstractRepository;
use LaravelJsonApi\NonEloquent\Concerns\HasRelationsCapability;

class SiteRepository extends AbstractRepository implements ModifiesToOne
{

    use HasRelationsCapability;

    // ...

}
```

And we would add the `setOwner()` method to our `CrudSiteRelations` capability
class, for example:

```php
namespace App\JsonApi\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\User;
use LaravelJsonApi\NonEloquent\Capabilities\CrudRelations;

class CrudSiteRelations extends CrudRelations
{

    // ...

    /**
     * Set the owner relationship.
     *
     * @param Site $site
     * @param User|null $user
     * @return void
     */
    public function setOwner(Site $site, ?User $user): void
    {
        $site->setOwner($user);

        $this->storage->store($site);
    }
}
```

The `set<Relation>` method receives the `Site` class that the relationship is
on, and the related class that was provided by the client or `null` if an
empty *to-one* relationship was provided.

Our example implementation modifies the relationship and then stores the updated
`Site` object.

### Modify To-Many Capability

This capability allows API clients to modify a resource's *to-many* relationships
via relationship endpoints. For example:

```http
PATCH /api/v1/sites/<SLUG>/relationships/tags HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
    // ...
}
```

To add this capability we need to do two things:

1. Add the `LaravelJsonApi\Contracts\Store\ModifiesToMany` interface to our
repository; AND
2. Add the `set<Relation>`, `attach<Relation>`, `detach<Relation>` methods to
our `CrudSiteRelations` capability class.

This is what our updated `SiteRepository` would look like:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\ModifiesToMany;
use LaravelJsonApi\NonEloquent\AbstractRepository;
use LaravelJsonApi\NonEloquent\Concerns\HasRelationsCapability;

class SiteRepository extends AbstractRepository implements ModifiesToMany
{

    use HasRelationsCapability;

    // ...

}
```

And we would add the following methods to our `CrudSiteRelations` capability
class for the `tags` relationship:

```php
namespace App\JsonApi\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\Tag;
use LaravelJsonApi\NonEloquent\Capabilities\CrudRelations;

class CrudSiteRelations extends CrudRelations
{

    // ...

    /**
     * Set the tags relationship.
     *
     * @param Site $site
     * @param array $tags
     */
    public function setTags(Site $site, array $tags): void
    {
        $tags = collect($tags)->unique(
          fn(Tag $tag) => $tag->getSlug()
        );

        $site->setTags(...$tags);

        $this->storage->store($site);
    }

    /**
     * Attach tags to the provided site.
     *
     * @param Site $site
     * @param array $tags
     */
    public function attachTags(Site $site, array $tags): void
    {
        $all = collect($site->getTags())
            ->merge($tags)
            ->unique(fn(Tag $tag) => $tag->getSlug());

        $site->setTags(...$all);

        $this->storage->store($site);
    }

    /**
     * Detach tags from the provided site.
     *
     * @param Site $site
     * @param array $tags
     * @return void
     */
    public function detachTags(Site $site, array $tags): void
    {
        $remove = collect($tags)
            ->map(fn(Tag $tag) => $tag->getSlug());

        $all = collect($site->getTags())
            ->reject(fn(Tag $tag) => $remove->contains($tag->getSlug()))
            ->unique(fn(Tag $tag) => $tag->getSlug());

        $site->setTags(...$all);

        $this->storage->store($site);
    }
}
```

The `set<Relation>` methods receive the `Site` class that the relationship is
on, and an array of the related classes that the client specified in the
request. In the above example, this is an array of `Tag` classes.

Note that the `setTags()` method completely replaces the entire relationship,
while the `attachTags()` and `detachTags()` just attach and detach tags
respectively. Note that the JSON:API specification says that a related resource
can only appear in the relationship once, so you should ensure there are no
duplicates when attaching and detaching related resources.

## Pagination

If you want to support pagination, you can add this to your
[Query All](#query-all-capability) capability. For ease of use, we provide
an `EnumerablePagination` implementation, that paginates your data using the
Laravel's [collection `forPage()` method](https://laravel.com/docs/collections#method-forpage).
However, you can also use your own pagination implementation if required.

### Enumerable Pagination

This pagination uses Laravel's `Enumerable::forPage()` method to paginate
your resources. Effectively this works by loading all matching resources,
then using the `forPage()` method to reduce the collection to a specific page.

Firstly, you will need to return an instance of the
`LaravelJsonApi\NonEloquent\Pagination\EnumerablePagination` class from
your schema's `pagination` method. For example, on our `SiteSchema`:

```php
use LaravelJsonApi\Core\Schema\Schema;
use LaravelJsonApi\NonEloquent\Pagination\EnumerablePagination;

class SiteSchema extends Schema
{

    // ...

    /**
     * @inheritDoc
     */
    public function pagination(): EnumerablePagination
    {
        return EnumerablePagination::make();
    }

}
```

The `EnumerablePagination` class has the same methods as our Eloquent
`PagePagination` class, so you can refer
[to the documentation for that class](../schemas/pagination.md#page-based-pagination)
for available methods. For example, if we wanted to customise the page keys:

```php
EnumerablePagination::make()
    ->withPageKey('page')
    ->withPerPageKey('limit');
```

Once we've added the paginator to our schema, we then need to update our
*query-all* class, making the following changes:

1. Adding the `LaravelJsonApi\Contracts\Store\HasPagination` interface; AND
2. Adding the `LaravelJsonApi\NonEloquent\Concerns\PaginatesEnumerables` trait.

For example, on our `QuerySites` class:

```php
namespace App\JsonApi\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\SiteStorage;
use LaravelJsonApi\Contracts\Store\HasPagination;
use LaravelJsonApi\NonEloquent\Capabilities\QueryAll;
use LaravelJsonApi\NonEloquent\Concerns\PaginatesEnumerables;

class QuerySites extends QueryAll implements HasPagination
{

    use PaginatesEnumerables;

    /**
     * @var SiteStorage
     */
    private SiteStorage $sites;

    /**
     * QuerySites constructor.
     *
     * @param SiteStorage $sites
     */
    public function __construct(SiteStorage $sites)
    {
        parent::__construct();
        $this->sites = $sites;
    }

    /**
     * @inheritDoc
     */
    public function get(): iterable
    {
        $sites = collect($this->sites->all());
        $filters = $this->queryParameters->filter();

        if ($filters && is_array($slugs = $filters->value('slugs'))) {
            $sites = $sites->filter(
                fn(Site $site) => in_array($site->getSlug(), $slugs)
            );
        }

        return $sites->values();
    }

}
```

Now that our capability is updated, our `sites` resource now supports the
following request:

```http
GET /api/v1/sites?page[number]=1&page[size]=25
Accept: application/vnd.api+json
```

Under the hood, the `PaginatesEnumerables` trait adds methods that use
`QuerySites::get()` to retrieve all of the sites, then the correct page is
pulled out using Laravel's `Enumerable::forPage()` method.

### Custom Pagination

If you need to write your own pagination strategy for your non-Eloquent resource,
you will need to write two classes:

- A paginator class, that implements the `LaravelJsonApi\Contracts\Pagination\Paginator`
interface. This is the class you return from a schema's `pagination()` method.
- A page class, that extends the `LaravelJsonApi\Core\Pagination\AbstractPage`
class.

We strongly recommend taking a look at our `EnumerablePagination` and
`EnumerablePage` classes, to see how we have implemented the enumerable
pagination capability.
[Those classes can be viewed here.](https://github.com/laravel-json-api/non-eloquent/tree/develop/src/Pagination)

Once you have written those classes, you will need to return an instance of the
pagination class from your schema's `pagination()` method. (See the example
`SiteSchema::pagination()` method above, that returns an instance of the
`EnumerablePagination` class.)

Then you will need to update your *query-all* capability class, by:

1. Adding the `LaravelJsonApi\Contracts\Store\HasPagination` interface; AND
2. Adding the `paginate()` and `getOrPaginate()` methods to your query-all capability.

For example:

```php
namespace App\JsonApi\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\SiteStorage;
use LaravelJsonApi\Contracts\Pagination\Page;
use LaravelJsonApi\Contracts\Store\HasPagination;
use LaravelJsonApi\NonEloquent\Capabilities\QueryAll;

class QuerySites extends QueryAll implements HasPagination
{

    // ...

    /**
     * @inheritDoc
     */
    public function get(): iterable
    {
        return $this->sites->all();
    }

    /**
     * @inheritDoc
     */
    public function paginate(array $page): Page
    {
        // an instance of your custom paginator...
        $paginator = $this->schema()->pagination();

        // ...return your custom page class using the settings from the paginator.
    }

    /**
     * @inheritDoc
     */
    public function getOrPaginate(?array $page): iterable
    {
        if (empty($page)) {
            return $this->get();
        }

        return $this->paginate($page);
    }

}
```

As shown in the above example, the `paginate()` method needs to retrieve the
paginator instance from the schema. It then uses the settings on that to return
a page - the logic for doing that will be down to you to implement based on how
your custom pagination works. Typically we implement a method on the paginator
class to execute the pagination.

You also need to implement the `getOrPaginate()` method. Typically you can copy
and paste the example method above. This returns a page if the client has
provided page parameters, otherwise it returns all the results using the
query-all capability's `get()` method.

## Singular Filters

Typically a query-all capability will return *zero-to-many* resources. Singular
filters are filters that change the result of the request to returning
*zero-to-one* resource, i.e. the resource object or `null`.

If you want to support singular filters on your non-Eloquent resource, you
will need to:

1. Add the `LaravelJsonApi\Contracts\Store\HasSingularFilters` to your query-all
capability class; AND
2. Implement the `firstOrMany()` and `firstOrPaginate()` methods to your
capability class.

In this example, we are going to add a `slug` singular filter to our `sites`
resource. We will make these changes to the `QuerySites` class as follows:

```php
namespace App\JsonApi\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\SiteStorage;
use LaravelJsonApi\Contracts\Store\HasPagination;
use LaravelJsonApi\Contracts\Store\HasSingularFilters;
use LaravelJsonApi\NonEloquent\Capabilities\QueryAll;
use LaravelJsonApi\NonEloquent\Concerns\PaginatesEnumerables;

class QuerySites extends QueryAll implements HasPagination, HasSingularFilters
{

    use PaginatesEnumerables;

    /**
     * @var SiteStorage
     */
    private SiteStorage $sites;

    /**
     * QuerySites constructor.
     *
     * @param SiteStorage $sites
     */
    public function __construct(SiteStorage $sites)
    {
        parent::__construct();
        $this->sites = $sites;
    }

    /**
     * @inheritDoc
     */
    public function get(): iterable
    {
        return $this->sites->all();
    }

    /**
     * @inheritDoc
     */
    public function firstOrMany()
    {
        $filters = $this->queryParameters->filter();

        if ($filters && $filters->exists('slug')) {
            return $this->sites->find(
                $filters->value('slug')
            );
        }

        return $this->get();
    }

    /**
     * @inheritDoc
     */
    public function firstOrPaginate(?array $page)
    {
        if (empty($page)) {
            return $this->firstOrMany();
        }

        return $this->paginate($page);
    }

}
```

As you can see from the example, we implement the singular filter in the
`firstOrMany()` method. This checks for the existence of the `slug` filter,
and if it exists, returns the matching `Site` class via the `SiteStorage::find()`
method. Otherwise it returns the value from the `get()` method - i.e. the list
of resources.

You also need to implement the `firstOrPaginate()` method. Typically you can copy
and paste the example method above. This returns the `firstOrMany()` method
if the client has not provided page parameters; otherwise it returns the page
from the `paginate()` method. If your resource **does not** support pagination,
the `firstOrPaginate()` method should always return the result from the
`firstOrMany()` method.
