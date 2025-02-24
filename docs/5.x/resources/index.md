# The Basics

## Introduction

In the JSON:API specification, [resource objects](https://jsonapi.org/format/#document-resource-objects)
represent resources in JSON. When building a JSON:API compliant API, you
need a transformation layer that sits between your Eloquent models and the
JSON:API resource objects returned to your API clients.

By default, Laravel JSON:API transforms models to JSON:API resource objects
using the information from your [resource's schema](../schemas/).
This allows you to rapidly prototype APIs, and is sufficient for simple
APIs that do not need any further customisation of the resource JSON.

If you need complete control over how a model is converted to a JSON:API
resource object, our resource classes allow you to expressively and easily
transform your models into JSON:API resource objects. They are designed to
be the JSON:API equivalent of Laravel's
[Eloquent API Resources](https://laravel.com/docs/eloquent-resources).

:::tip
If you are new to Laravel JSON:API, then it's best to start by relying
on the automatic serialization of models using your schemas.
That means you can skip this section on resources, and come back to it
in the future if you find you need more control over your model's
JSON.
:::

## Generating Resources

By default, resource classes exist in the same namespace as the schema that
defines the same resource type. For example, if our `v1` server has a
`posts` resource, the `PostResource` class will be placed in the same
namespace as the `PostSchema` - which is `App\JsonApi\V1\Posts`.

To generate a resource class, you may use the `jsonapi:resource` Artisan
command:

```bash
php artisan jsonapi:resource posts --server=v1
```

::: tip
The `--server` option is not required if you only have one server.
:::

### Resource Collections

Laravel's Eloquent API Resources include the ability to generate resource
collection classes, that transform collections of models. In JSON:API this
is not required, because the JSON:API specification defines how to serialize
collections of resources.

The JSON:API specification does allow top-level document `meta` and `links`.
If you need to add these to a collection of resources, you can do this using
our [response classes](../responses/) - rather than having to define a
specific collection class.

## Concept Overview

Before diving into all of the options available when writing resource classes,
let's first take a high-level look at how resources are used.

Firstly, the JSON:API specification says that every resource object must have
`type` and `id` members. Together, these uniquely identify the specific
resource. Our resource classes automatically determine the resource `type`
from the class name, and automatically use the model's `getRouteKey()`
method to obtain the `id`. A generated class therefore does not contain
the `type` and `id` members.

Instead, it will contain two methods: `attributes` and `relationships`.
This allows you to serialize column values in the `attributes` member, and
define how relationships should be represented.

For example, a simple `posts` resource class would look like this:

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

    /**
     * Get the resource's relationships.
     *
     * @param \Illuminate\Http\Request|null $request
     * @return iterable
     */
    public function relationships($request): iterable
    {
        return [
            $this->relation('author'),
            $this->relation('comments'),
            $this->relation('tags'),
        ];
    }

}
```

Notice that we can access model properties from the `$this` variable. This
is because a resource class will automatically proxy property and method
access down to the underlying model for convenient access.

### Request Parameter

Notice also that methods are provided with the current request, in the same
way that Laravel's Eloquent resources receive the current request. The slight
difference in our implementation is that the request can be `null`. This
will be the case when serializing a resource outside of an HTTP request -
for example, during a queued broadcasting job.

## Identification

JSON:API resource objects are identified by their `type` and `id` members.
Together, these uniquely identify the resource.

The resource class is injected with the schema that describes the
model being serialized - and this is used when determining the `type`
and `id` of the resource.

The `type` is determined using class name of the schema, and can
be [overridden on the schema if needed.](../schemas/#resource-type)

By default the `id` will be the value returned by the `Model::getRouteKey()`
method. If this is not the case, you should set the column name
on the [`ID` field of your schema.](../schemas/identifier.md#column-name)
