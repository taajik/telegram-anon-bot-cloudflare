/**
 * https://github.com/cvzi/telegram-bot-cloudflare
 */

const TOKEN = ENV_BOT_TOKEN; // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const WEBHOOK = '/endpoint';
const SECRET = ENV_BOT_SECRET; // A-Z, a-z, 0-9, _ and -
const OWNER = 1234;  // replace with your number id (get from @creationdatebot)
var reciever = 0;


/**
 * Wait for requests to the worker
 */
addEventListener('fetch', event => {
    const url = new URL(event.request.url)
    if (url.pathname === WEBHOOK) {
        event.respondWith(handleWebhook(event))
    } else if (url.pathname === '/registerWebhook') {
        event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET))
    } else if (url.pathname === '/unRegisterWebhook') {
        event.respondWith(unRegisterWebhook(event))
    } else {
        event.respondWith(new Response('No handler for this request.'))
    }
})


/**
 * Handle requests to WEBHOOK
 * https://core.telegram.org/bots/api#update
 */
async function handleWebhook (event) {
    // Check secret
    if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
        return new Response('Unauthorized', { status: 403 })
    }

    // Read request body synchronously
    const update = await event.request.json()
    // Deal with response asynchronously
    event.waitUntil(onUpdate(update))

    return new Response('Ok')
}

/**
 * Handle incoming Update
 * https://core.telegram.org/bots/api#update
 */
async function onUpdate (update) {
    if ('message' in update) {
        await onMessage(update.message)
    }
    if ('callback_query' in update) {
        await onCallbackQuery(update.callback_query)
    }
}


/**
 * Handle incoming Message
 * https://core.telegram.org/bots/api#message
 */
function onMessage (message) {
    if (message.chat.id != OWNER) {
        return sendInlineButtonRow(OWNER, message.chat.id + ' said:\n\n' + message.text, [{
            text: 'Reply',
            callback_data: message.chat.id
        }])
    } else if (reciever != 0) {
        return sendPlainText(reciever, message.text);
    } else {
        return sendPlainText(message.chat.id, "Message was NOT sent.");
    }
}

/**
 * Send plain text message
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendPlainText (chatId, text) {
    return (await fetch(apiUrl('sendMessage', {
        chat_id: chatId,
        text
    }))).json()
}

/**
 * Send a message with buttons, `buttonRow` must be an array of button objects
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendInlineButtonRow (chatId, text, buttonRow) {
    return sendInlineButtons(chatId, text, [buttonRow])
}

/**
 * Send a message with buttons, `buttons` must be an array of arrays of button objects
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendInlineButtons (chatId, text, buttons) {
    return (await fetch(apiUrl('sendMessage', {
        chat_id: chatId,
        reply_markup: JSON.stringify({
            inline_keyboard: buttons
        }),
        text
    }))).json()
}


/**
 * Handle incoming callback_query (inline button press)
 * https://core.telegram.org/bots/api#message
 */
async function onCallbackQuery (callbackQuery) {
    reciever = callbackQuery.data;
    return answerCallbackQuery(callbackQuery.id, 'You are now talking to ' + callbackQuery.message.chat.id)
}

/**
 * Answer callback query (inline button press)
 * This stops the loading indicator on the button and optionally shows a message
 * https://core.telegram.org/bots/api#answercallbackquery
 */
async function answerCallbackQuery (callbackQueryId, text = null) {
    const data = {
        callback_query_id: callbackQueryId
    }
    if (text) {
        data.text = text
    }
    return (await fetch(apiUrl('answerCallbackQuery', data))).json()
}


/**
 * Set webhook to this worker's url
 * https://core.telegram.org/bots/api#setwebhook
 */
async function registerWebhook (event, requestUrl, suffix, secret) {
    // https://core.telegram.org/bots/api#setwebhook
    const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`
    const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json()
    return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Remove webhook
 * https://core.telegram.org/bots/api#setwebhook
 */
async function unRegisterWebhook (event) {
    const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
    return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}


/**
 * Return url to telegram api, optionally with parameters added
 */
function apiUrl (methodName, params = null) {
    let query = ''
    if (params) {
        query = '?' + new URLSearchParams(params).toString()
    }
    return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`
}
