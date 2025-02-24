# Upgrade Guide

## Upgrading to 5.x from 4.x

Version 5 introduced a breaking change for authorization, which will not affect the majority of applications.
See the details below.

This new major release also supports both Laravel 11 and 12.

### Upgrading

```bash
composer require laravel-json-api/laravel --no-update
composer require laravel-json-api/testing --dev --no-update
```

### Resource and Query Requests

The return type for the `authorizeResource()` method on both resource and query request classes has changed to
`bool|Response` (where response is the Illuminate Auth response). If you are manually calling this method and relying on
the return value being a boolean, this change is breaking. However, the vast majority of applications should be able to
upgrade without any changes.