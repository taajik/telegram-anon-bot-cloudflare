# Telegram Bot on Cloudflare Workers

A minimal Telegram anonymous bot running on a Cloudflare Worker.

## Setup:

1. Create a new bot and get its token from [@BotFather](https://t.me/botfather): https://core.telegram.org/bots#6-botfather
2. Sign up to Cloudflare Workers: https://workers.cloudflare.com/
3. In the Cloudflare Dashboard go to "Workers & Pages", then click "Create" and then "Create worker".
4. Choose a name and click "Deploy" to create the worker.
5. In you worker's config page, click on "Settings" tab and then "Variables".
6. Add a new environment variable with the name `ENV_BOT_TOKEN` and the value of your bot token that [@BotFather](https://t.me/botfather) gave you. (you can encrypt these variables)
7. Add another environment variable with the name `ENV_BOT_SECRET` and set the value to a random secret. See https://core.telegram.org/bots/api#setwebhook
8. Click on "Edit Code" to change the source code of your new worker.
9. Copy and paste the code from [bot.js](bot.js) into the editor.
10. Change the `OWNER` variable to the value of your User ID. You can get it from [@userinfobot](https://t.me/userinfobot)
11. Optional: Change the `WEBHOOK` variable to a different path. See https://core.telegram.org/bots/api#setwebhook
12. Click on "Save and Deploy".
13. In the HTTP panel append `/registerWebhook` to the url. For example: https://my-worker-123.username.workers.dev/registerWebhook
14. Click "Send". In the Preview panel should appear `Ok`. If 401 Unauthorized appears, there might be a problem with the environment variables.
15. That's it, now you can share the username of your Telegram bot with people.

## Bot behaviour
