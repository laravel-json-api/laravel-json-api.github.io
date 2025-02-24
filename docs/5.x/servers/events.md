# Events

## Resource Events

All JSON:API operations use the typical Eloquent methods you are familiar
with, i.e. `save`, `delete`, `forceDelete` and `restore`. Therefore
it is easy to listen for model events triggered by JSON:API operations and
react to them.

The easiest approach is to simply attach
[model listeners or observers](https://laravel.com/docs/eloquent#events)
to a model:

```php
namespace App\Providers;

use App\User;
use App\Observers\UserObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        User::observe(UserObserver::class);
    }

    /**
     * Register the service provider.
     *
     * @return void
     */
    public function register()
    {
        //
    }
}
```

## API-Only Events

If you would like to attach a listener or observer **only during** JSON:API
related HTTP requests, you may register them using your server's `serving()`
method. This hook is only invoked if the server is handling a HTTP request:

```php
namespace App\JsonApi\V1;

use App\User;
use App\Observers\UserObserver;
use LaravelJsonApi\Core\Server\Server as BaseServer;

class Server extends BaseServer
{

    // ...

    /**
     * Bootstrap the server when it is handling an HTTP request.
     *
     * @return void
     */
    public function serving(): void
    {
        User::observe(UserObserver::class);
    }

}
```

:::tip
You may type-hint any dependencies you need within the `serving` method's
signature. They will automatically be resolved via the Laravel service container.
:::

## Controller Events

If you need to dispatch events, but do not want them dispatched as model events,
you can use our [Controller Hooks](../routing/controllers.md#controller-hooks)
to dispatch custom events.

More details are contained in the linked chapter, but here is an example
of a custom event dispatched by a controller hook:

```php
namespace App\Http\Controllers\Api\V1;

use App\Events\AuthorCreatedPost;
use App\Models\Post;
use LaravelJsonApi\Laravel\Http\Controllers\Actions;

class PostController
{

    use Actions\Store;

    // ...other actions

    public function created(Post $post): void
    {
        AuthorCreatedPost::dispatch($post->author, $post);
    }

}
```
