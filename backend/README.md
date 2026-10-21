# Backend integrations

## HLP NOW chatbot tag feed

The read-only `GET /api/integrations/chatbot/sites` endpoint returns the latest
successful scrape for tracked `hlpnow.com` sites. It is intended for
server-to-server use; do not call it from a browser or expose its credential to
the frontend.

Configure `CHATBOT_SYNC_TOKEN` in the Tag Fetcher backend deployment and the
chatbot backend deployment with the same randomly generated secret. For
example, generate one locally with:

```sh
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Send it as a bearer token:

```http
Authorization: Bearer <CHATBOT_SYNC_TOKEN>
```

Successful responses have this shape:

```json
{
  "count": 1,
  "sites": [
    {
      "website_id": 1,
      "url": "https://example.hlpnow.com",
      "scrape_run_id": 42,
      "scraped_at": "2026-10-19T12:00:00",
      "tags": [
        {
          "page_url": "https://example.hlpnow.com/",
          "tag_name": "meta_description",
          "tag_type": "meta",
          "content": "Example description"
        }
      ]
    }
  ]
}
```

The endpoint includes only the most recent completed scrape per site and never
triggers a scrape. Sites without a completed scrape are omitted. Responses
aren't cacheable. Missing server configuration returns `503`; missing or
invalid bearer credentials return `401`; database unavailability returns
`503`.
