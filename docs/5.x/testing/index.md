# Getting Started

## Introduction

Laravel JSON:API is built with testing in mind. We provide an extensive
suite of test helpers: both for constructing test JSON:API requests,
and asserting JSON:API content in test responses.

Our test assertions are also built to provide detailed and human-readable
JSON diffs, so you can spot exactly where a JSON:API document differs
from the expected JSON.

## Setup

As per the [installation instructions](../getting-started/), our test
helpers are installed using Composer:

```bash
composer require --dev laravel-json-api/testing
```

Once installed, you then need to add our `MakesJsonApiRequests` trait
to your application's `TestCase`:

```php
namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use LaravelJsonApi\Testing\MakesJsonApiRequests;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
    use MakesJsonApiRequests;
}
```

## Test Requests

The `MakesJsonApiRequests` trait adds a `jsonApi` method to your
test case. This method is used to initiate test JSON:API requests.
This is explained in the subsequent testing chapters, but as an example:

```php
public function test(): void
{
    $expected = // ... our expected posts resource object.

    $response = $this
        ->jsonApi()
        ->expects('posts')
        ->includePaths('author', 'tags')
        ->get('/api/v1/posts');

    $response->assertFetchedOneExact($expected);
}
```

:::tip
There's two reasons why we've made our request helpers available via the
jsonApi() method.

Firstly, this gives a fluent interface for specifying the different properties
of the test request - from JSON:API content to all the different query
parameters.

Secondly, it avoids any potential collisions with the Laravel methods that
are already added to your test case. This has been a problem in the past.
:::

## Test Responses

The response instance returned by our test request builder extends the
Laravel test response class.

This means that as well as being able to use our JSON:API-specific test
assertions, you can also use any of Laravel's
[response assertion methods.](https://laravel.com/docs/http-tests#response-assertions)

While Laravel provides a number of JSON assertion methods, we prefer to use
the JSON:API ones provided by this package. That's because our
JSON assertions are designed to give detailed and human-readable JSON
diffs when an assertion fails. Our diffs are pretty-printed, and JSON members
(keys) are sorted, which makes it easier to spot differences between the
expected and actual results.
