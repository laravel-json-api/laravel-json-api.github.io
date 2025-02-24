# JSON:API Compliance

## Content Negotiation

The JSON:API defines client and server responsibilities for negotiation
of request and response content.
[You can read about them here.](https://jsonapi.org/format/#content-negotiation)

### Accept Header

A client defines the content it wants in the `Accept` header. The media type
of this header is checked by our query request classes. For example, the
`PostQuery` and `PostCollectionQuery` classes.

If the client specifies a media-type other than the JSON:API media-type
(`application/vnd.api+json`), they will receive a `406 Not Acceptable`
response.

For example, this request:

```http
GET /api/v1/posts/1 HTTP/1.1
Accept: application/json
```

Would result in the following response:

```http
HTTP/1.1 406 Not Acceptable
Content-Type: application/json

{
  "message": "The requested resource is capable of generating only content not acceptable according to the Accept headers sent in the request."
}
```

:::tip
As the client has not requested JSON API content, your application's
exception handler will render the response. In the example above the
client has asked for JSON, so the client receives Laravel's JSON
rendering of the HTTP exception.
:::

### Content-Type Header

Any request that involves the client sending a JSON:API document in the
request is processed by the resource request class. For example, our
`posts` resource will have a `PostRequest` class.

A client specifies the media type of request content in the `Content-Type`
header. If the client specifies a media-type other than the JSON:API
media-type (`application/vnd.api+json`), they will receive a
`415 Unsupported Media Type` response.

For example this request:

```http
POST /api/v1/posts HTTP/1.1
Content-Type: application/json
Accept: application/vnd.api+json

{
  "title": "Hello World",
  "content": "..."
}
```

Would result in the following response:

```http
HTTP/1.1 415 Unsupported Media Type
Content-Type: application/vnd.api+json

{
  "errors": [
    {
      "title": "Unsupported Media Type",
      "status": "415",
      "detail": "The request entity has a media type which the server or resource does not support."
    }
  ],
  "jsonapi": {
    "version": "1.0"
  }
}
```

:::tip
In the example above, the client has requested JSON API content via the
`Accept` header, so the response contains JSON API errors.
:::

## Document Compliance

For any request in which the client sends a JSON:API document, we parse
the document for compliance with the JSON:API specification. This
parsing occurs within the resource's request class, e.g. `PostRequest`
for our `posts` resource.

This parsing occurs *after* authorization, and *before* your
application-specific validation occurs. It requires no configuration or
setup on your part.

For example, this request:

```http
POST /api/v1/posts HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "title": "Hello World",
}
```

Would be rejected with the following response:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/vnd.api+json

{
  "errors": [
    {
      "title": "Bad Request",
      "source": {
        "pointer": "/"
      },
      "status": "400",
      "detail": "The data member is required."
    }
  ],
  "jsonapi": {
    "version": "1.0"
  }
}
```
