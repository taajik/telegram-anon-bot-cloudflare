# Telegram Bot on Cloudflare Workers

A Telegram anonymous chat bot running on Cloudflare Workers.

## Setup

1. Create a new bot and get its token from [@BotFather](https://t.me/botfather): https://core.telegram.org/bots#6-botfather
2. Sign up to Cloudflare Workers: https://workers.cloudflare.com/
3. In the Cloudflare Dashboard go to "Workers & Pages", then click "Create" and then "Create worker".
4. Choose a name and click "Deploy" to create the worker.
5. In you worker's config page, click on "Settings" tab and then "Variables".
6. Add a new environment variable with the name `ENV_BOT_TOKEN` and the value of your bot token that [@BotFather](https://t.me/botfather) gave you. (you can encrypt these variables)
7. Add another environment variable with the name `ENV_BOT_SECRET` and set the value to a random secret. See https://core.telegram.org/bots/api#setwebhook
8. Add yet another environment variable with the name `ENV_BOT_USERNAME` and set the value to your bot's username (without the @).
9. Create four KV database. see https://developers.cloudflare.com/kv/get-started/#create-a-kv-namespace-via-the-dashboard
10. Add four binding variable with the names `CHATS`, `LINKS`, `CUSTOM_LINKS` and `BLOCKS` and bind them to the KV databases you just created. see https://developers.cloudflare.com/kv/concepts/kv-namespaces/#bind-your-kv-namespace-via-the-dashboard
11. Click on "Edit Code" to change the source code of your new worker.
12. Replace the code in editor with the code from [bot.js](bot.js).
13. Optional: Change the `WEBHOOK` variable to a different path. See https://core.telegram.org/bots/api#setwebhook
14. Optional: Add the `HASH_SALT` environment variable and set it to a different random value.
15. Click on "Deploy" and then "Save and deploy".
16. In the HTTP panel append `/registerWebhook` to the url. For example: https://my-worker-123.username.workers.dev/registerWebhook
17. Click "Send". In the Preview panel should appear `Ok`. If 401 Unauthorized appears, there might be a problem with the environment variables.
18. Congrats, now you can share the username of your Telegram bot with people.
