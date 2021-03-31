import { config, serve } from "./deps.ts";

config({ export: true, safe: true });

const port = Deno.env.get("PORT");
console.log(`server is running on :${port}`);
for await (const req of serve(`:${port}`)) {
  req.respond({ body: "Hello World\n" });
}
