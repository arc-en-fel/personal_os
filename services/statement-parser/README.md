# Statement Parser Worker

This is an ephemeral private worker for password-protected PDF and Excel statements. It keeps the source bytes and password in memory for one request and returns transaction candidates only.

Run locally:

```powershell
docker build -t personal-os-statement-parser services/statement-parser
docker run --rm -p 8080:8080 -e STATEMENT_PARSER_TOKEN=local-secret personal-os-statement-parser
```

Deploy it behind HTTPS and set `STATEMENT_PARSER_URL` and `STATEMENT_PARSER_TOKEN` as Supabase Edge Function secrets. Do not expose this service publicly without the token and TLS.

The repository includes `render.yaml` for a straightforward Render deployment. After deployment, use the generated service URL and the generated `STATEMENT_PARSER_TOKEN` in Supabase secrets.
