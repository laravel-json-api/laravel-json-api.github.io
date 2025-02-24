# The Basics

## Introduction

Your Laravel application can have any number of JSON:API compliant
APIs. We refer to each API as a **Server**. Each server has a class
that registers the resources available in the server, and contains
settings that apply to the whole server.

## Defining Servers

By default, servers exist in their own namespace within your
root JSON:API namespace. For example, if your root JSON:API namespace
is `App\JsonApi`, a server called `v1` will exist as
`App\JsonApi\V1\Server`.

You may generate a new server using the `jsonapi:server` Artisan
command:

```bash
php artisan jsonapi:server v1
```

## Registering Servers

Once you have generated a server, you must register it within your
JSON:API configuration file.

To do this, add the server to the `servers` array. The key
must be the name of the server, and the value is the fully-qualified
class name of your server.

For example, to register our newly generated `v1` server:

```php
// config/jsonapi.php

return [
    // ...

    'servers' => [
        'v1' => \App\JsonApi\V1\Server::class,
    ],
];
```

## URI Namespace

An important property of your server is its `baseUri` property. This is
used to generate link URIs that appear in your server's resource
objects. It is the URI prefix that should appear before
the *resource type* in the URI.

Make sure this value is set correctly. For example, if our `v1` server
had a URI namespace of `/api/v1`, we would set it as follows:

```php
/**
 * The base URI namespace for this server.
 *
 * @var string
 */
protected string $baseUri = '/api/v1';
```

::: tip
The value of the `baseUri` property is used as the first argument to
Laravel's `url()` helper. You can therefore include hostnames if you
need. For example, you could set the `baseUri` property to
`https://api.example.com/v1` if desired.
:::

If you need to programmatically work out the base URI, implement the
`baseUri()` method on your server (instead of setting the property).

As there can be a lot of URIs generated in a JSON:API response,
it is recommended that you only do the calculation once if possible.
For example:

```php
/**
 * @return string
 */
protected function baseUri(): string
{
    if ($this->baseUri) {
      return $this->baseUri;
    }

    return $this->baseUri = '...calculated value';
}
```
