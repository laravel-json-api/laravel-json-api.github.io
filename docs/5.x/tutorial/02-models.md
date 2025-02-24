# 2. Models

## Introduction

In this first chapter, we'll set up the models we need to represent the posts,
users, comments and tags that our blog comprises of. Models are found in almost
every Laravel application, and Laravel JSON:API uses them to represent the
JSON:API resources in your API.

## Creating Models

Laravel persist data to the database using classes called Eloquent models. Laravel
JSON:API uses the same models, so to start building our app we'll create models
in the typical Laravel way.

For our blog application, we need the following models:

- User: who will be the author of a blog and/or a comment.
- Post: the articles in our blog.
- Tag: the tags that are used to categorise our posts.
- Comment: the comments that users attach to posts.

Models are stored in the `/app/Models` folder of your application. If you take a
look at that now, you will see that there is already a `User` model. So we just
need to add our other three models.

To do this, we will run the following commands:

```bash
herd php artisan make:model Post --migration
herd php artisan make:model Tag --migration
herd php artisan make:model Comment --migration
```

You'll see output like the following:

```
INFO  Model [app/Models/Post.php] created successfully.

INFO  Migration [database/migrations/2024_09_30_171953_create_posts_table.php] created successfully.
```

These generator commands created a number of files; let's take a look at a few
of them. First, open the file in `/database/migrations` that ends with
`_create_posts_table` - the date on the file shows you the time that the
command was run.

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
```

This file contains a *migration*, a class that tells Laravel how to make a change
to a database. `Schema::create()` will create the `posts` table. The function
passed to `Schema::create()` is passed the `$table` argument, representing the
database table. It's already set to create an `id` and `timestamps`. Let's add
a few more columns:

```diff
 Schema::create('posts', function (Blueprint $table) {
     $table->id();
     $table->timestamps();
+    $table->foreignId('author_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
+    $table->timestamp('published_at')->nullable();
+    $table->string('title');
+    $table->string('slug')->unique();
+    $table->text('content');
 });
```

This adds columns for the `title` and text `content` of the blog post, and a
unique `slug` for each post. We've also added a timestamp called `published_at`
which is nullable: this indicates whether the author has published the blog
post. If `null`, it will be considered a draft blog post. Finally there is an
`author_id` column that holds the `id` of the `User` model that created the post.

At the moment the `posts` database table does not exist. By adding the above,
we've told Laravel *how* to create the table. However it will not be created
until we've run our migrations.

Before we do that, we'll also add some code to the two other migrations that
were created: the `_create_tags_table` and the `_create_comments_table` migrations.

In the `_create_tags_table` migration, we will add the following:

```diff
 return new class extends Migration
 {
     /**
      * Run the migrations.
      */
     public function up(): void
     {
         Schema::create('tags', function (Blueprint $table) {
             $table->id();
             $table->timestamps();
+            $table->string('name');
         });
+
+        Schema::create('post_tag', function (Blueprint $table) {
+            $table->foreignId('post_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
+            $table->foreignId('tag_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
+            $table->primary(['post_id', 'tag_id']);
+        });
     }

     /**
      * Reverse the migrations.
      */
     public function down(): void
     {
+        Schema::dropIfExists('post_tag');
         Schema::dropIfExists('tags');
     }
 };
```

Notice we've added the `name` column to the `tags` table. Then we also create
another table - `post_tag` - which will allow us to associate `Tag` models to
`Post` models. Finally, we've added `Schema::dropIfExists('post_tag');` to the
`down()` method so that this additional table is dropped if we are reversing
our migrations.

Finally, we update the `_create_comments_table` file so that it the
`Schema::create()` call looks like this:

```diff
 Schema::create('comments', function (Blueprint $table) {
     $table->id();
     $table->timestamps();
+    $table->foreignId('post_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
+    $table->foreignId('user_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
+    $table->text('content');
 });
```

Here we are adding a column to store the user that made the comment (`user_id`),
the post the comment is about (`post_id`) and the text `content` of the comment.

Now that we've updated all the migrations, we can run them to create our
database tables:

```bash
herd php artisan migrate
```

You should see output like the following, which includes a few standard
Laravel migrations and the migrations we have added:

```
INFO  Running migrations.

2024_09_30_171953_create_posts_table ......................... 2.00ms DONE
2024_09_30_171959_create_tags_table .......................... 1.73ms DONE
2024_09_30_172006_create_comments_table ...................... 0.35ms DONE
```

Now we can look at the model classes. Take a look at the `/app/Models/Post.php`
file, which will look like this:

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use HasFactory;
}
```

That's pretty empty, so we need to start adding information about the database
columns that exist on the `posts` table. We'll do this by adding the `$fillable`
property, which describes the columns that can be filled with values. We use the
`$casts` property to tell the model that the value of the `published_at` column
is a `datetime`.

We also need to add relationship methods to describe the following relationships:

- `author`: the user that created the post.
- `comments`: the comments that have been made by users on this post.
- `tags`: the tags that categorise this post.

Our `Post` model will look like this:

```diff
 namespace App\Models;

 use Illuminate\Database\Eloquent\Factories\HasFactory;
 use Illuminate\Database\Eloquent\Model;
+use Illuminate\Database\Eloquent\Relations\BelongsTo;
+use Illuminate\Database\Eloquent\Relations\BelongsToMany;
+use Illuminate\Database\Eloquent\Relations\HasMany;

 class Post extends Model
 {
     use HasFactory;
+
+    /**
+     * @var string[]
+     */
+    protected $fillable = ['content', 'published_at', 'slug', 'title'];
+
+    /**
+     * @var array
+     */
+    protected $casts = [
+        'published_at' => 'datetime',
+    ];
+
+    /**
+     * @return BelongsTo
+     */
+    public function author(): BelongsTo
+    {
+        return $this->belongsTo(User::class);
+    }
+
+    /**
+     * @return HasMany
+     */
+    public function comments(): HasMany
+    {
+        return $this->hasMany(Comment::class);
+    }
+
+    /**
+     * @return BelongsToMany
+     */
+    public function tags(): BelongsToMany
+    {
+        return $this->belongsToMany(Tag::class);
+    }
}
```

We also add our column information to the `/app/Models/Tag.php` file, plus
we can add a relationship method to the `posts` that the tag is linked to.
Our `Tag` class will look like this:

```diff
 namespace App\Models;

 use Illuminate\Database\Eloquent\Factories\HasFactory;
 use Illuminate\Database\Eloquent\Model;
+use Illuminate\Database\Eloquent\Relations\BelongsToMany;

 class Tag extends Model
 {
     use HasFactory;
+
+    /**
+     * @var string[]
+     */
+    protected $fillable = ['name'];
+
+    /**
+     * @return BelongsToMany
+     */
+    public function posts(): BelongsToMany
+    {
+        return $this->belongsToMany(Post::class);
+    }
 }
```

And finally, we will update the `/app/Models/Comment.php` file, adding both
column information and a two relationships:

```diff
 namespace App\Models;

 use Illuminate\Database\Eloquent\Factories\HasFactory;
 use Illuminate\Database\Eloquent\Model;
+use Illuminate\Database\Eloquent\Relations\BelongsTo;

 class Comment extends Model
 {
     use HasFactory;
+
+    /**
+     * @var string[]
+     */
+    protected $fillable = ['content'];
+
+    /**
+     * @return BelongsTo
+     */
+    public function post(): BelongsTo
+    {
+        return $this->belongsTo(Post::class);
+    }
+
+    /**
+     * @return BelongsTo
+     */
+    public function user(): BelongsTo
+    {
+        return $this->belongsTo(User::class);
+    }
 }
```

## Seeding Data

Now that our models are setup, we can create some records in the database. To
do this, we use Laravel's database seeders to define how initial data should be
populated into the database.

Generate a seeder file using the following command:

```bash
herd php artisan make:seeder PostSeeder
```

This will create a file `PostSeeder.php` in the `/database/seeders` folder.
The code to populate the database is added to the `run()` method. Update your
seeder so it looks like this:

```diff
 namespace Database\Seeders;

+use App\Models\Comment;
+use App\Models\Post;
+use App\Models\Tag;
+use App\Models\User;
-use Illuminate\Database\Console\Seeds\WithoutModelEvents;
 use Illuminate\Database\Seeder;

 class PostSeeder extends Seeder
 {
     /**
      * Run the database seeds.
      */
     public function run(): void
     {
-        //
+        $author = User::create([
+            'name' => 'Artie Shaw',
+            'email' => 'artie.shaw@jsonapi-tutorial.test',
+            'password' => bcrypt('password'),
+            'email_verified_at' => now(),
+        ]);
+
+        $commenter = User::create([
+            'name' => 'Benny Goodman',
+            'email' => 'benny.goodman@jsonapi-tutorial.test',
+            'password' => bcrypt('password'),
+            'email_verified_at' => now(),
+        ]);
+
+        $tag1 = Tag::create(['name' => 'Laravel']);
+        $tag2 = Tag::create(['name' => 'JSON:API']);
+
+        $post = new Post([
+            'title' => 'Welcome to Laravel JSON:API',
+            'published_at' => now(),
+            'content' => 'In our first blog post, you will learn all about Laravel JSON:API...',
+            'slug' => 'welcome-to-laravel-jsonapi',
+        ]);
+
+        $post->author()->associate($author)->save();
+        $post->tags()->saveMany([$tag1, $tag2]);
+
+        $comment = new Comment([
+            'content' => 'Wow! Great first blog article. Looking forward to more!',
+        ]);
+
+        $comment->post()->associate($post);
+        $comment->user()->associate($commenter)->save();
     }
 }
```

In the above, we are creating two users in our database, one to be the author
of our first blog post, and the other to be a commenter on this post. We then
also create two tags that we will use to categorise our first blog post.

Once we've done that setup, we create the post itself, attaching the author
before we save the post via `$post->author()->associate()`. One the post is saved,
we then attach both tags using the `$post->tags()->saveMany()` method.

Finally, we create a comment that is linked to both the post we just created,
and the second user (the commenter) that we also created earlier.

Next, call our `PostSeeder` from the main `DatabaseSeeder.php` class that is
in the same directory:

```diff
 namespace Database\Seeders;

 use Illuminate\Database\Seeder;

 class DatabaseSeeder extends Seeder
 {
     /**
      * Seed the application's database.
      */
     public function run(): void
     {
-        // User::factory(10)->create();
-
-        User::factory()->create([
-            'name' => 'Test User',
-            'email' => 'test@example.com',
-        ]);
+        $this->call(PostSeeder::class);
     }
 }
```

Then all we need to do is run the seed command to populate the database:

```bash
herd php artisan db:seed
```

## In Summary

In this chapter we created the models that represent our blog application, and
created the database tables required to store the model data.

In the [next chapter](03-server-and-schemas.md), we will add the JSON:API
package and start to create our JSON:API compliant backend server.
