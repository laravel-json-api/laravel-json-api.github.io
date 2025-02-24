# Installation

## Requirements

- PHP - `^8.2`
- Laravel - `^11.0` or `^12.0`

## Installation

Require this package in the `composer.json` of your Laravel project.
This will download the package and its dependent packages.

We also recommend you install our testing package as a development
dependency. This adds test helpers as described in the
[Testing Chapter.](../testing/)

Install both packages using [Composer](https://getcomposer.org):

```bash
composer require laravel-json-api/laravel
composer require --dev laravel-json-api/testing
```

The `LaravelJsonApi\Laravel\ServiceProvider` is auto-discovered and registered
by default.

### Facades

Two facades are also auto-discovered:

- `LaravelJsonApi\Core\Facades\JsonApi`
- `LaravelJsonApi\Laravel\Facades\JsonApiRoute`

## Configuration

Publish the package configuration using the following Artisan command:

```bash
php artisan vendor:publish --provider="LaravelJsonApi\Laravel\ServiceProvider"
```

This will create a `config/jsonapi.php` file.

## Exception Handler

To ensure that clients receive a JSON:API error response for exceptions
thrown by your application, you need to add the package exception renderer
to your application's exception handler.

Open your `bootstrap/app.php` file and add the following to the `withExceptions()` call:

```php
->withExceptions(function (Exceptions $exceptions) {
    $exceptions->dontReport(
        \LaravelJsonApi\Core\Exceptions\JsonApiException::class,
    );
    $exceptions->render(
        \LaravelJsonApi\Exceptions\ExceptionParser::renderer(),
    );
})
```

For more information on exception rendering and reporting, see the
[errors chapter.](../responses/errors.md#error-rendering)
