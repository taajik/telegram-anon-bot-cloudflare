
const TOKEN = ENV_BOT_TOKEN;  // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const WEBHOOK = '/endpoint';
const SECRET = ENV_BOT_SECRET;  // A-Z, a-z, 0-9, _ and -
const OWNER = ENV_OWNER_ID;  // Get it from @userinfobot
var target_anon;


// Wait for requests to the worker.
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


// Handle requests to WEBHOOK.
// https://core.telegram.org/bots/api#update
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

// Handle incoming Update.
// https://core.telegram.org/bots/api#update
async function onUpdate (update) {
    if ('message' in update) {
        await onMessage(update.message)
    }
    if ('callback_query' in update) {
        await onCallbackQuery(update.callback_query)
    }
}




// Handle incoming Message.
// https://core.telegram.org/bots/api#message
async function onMessage (message) {
    var reply_msg;
    // await sendPlainText(OWNER, JSON.stringify(message.reply_to_message));
    try {
        reply_msg = JSON.parse(message.reply_to_message.reply_markup.inline_keyboard[0][0].callback_data);
    } catch(err) {
        reply_msg = {reciever: null, reply_to: null};
    }

    if (message.chat.id == OWNER) {
        if (reply_msg.reciever) {
            target_anon = reply_msg.reciever;
            return sendMessage(reply_msg.reciever, message.chat.id, message.message_id, reply_msg.reply_to);
        } else if (target_anon) {
            return sendMessage(target_anon, message.chat.id, message.message_id);
        } else {
            return sendPlainText(OWNER, 'Not sent! Please reply to the message you want to answer.', message.message_id);
        }
    } else {
        return sendMessage(OWNER, message.chat.id, message.message_id, reply_msg.reply_to);
    }
}

// Copy a message and send it.
// https://core.telegram.org/bots/api#copymessage
async function sendMessage (chatId, fromChatId, msgId, replyMsgId = null) {
    const params = {
        chat_id: chatId,
        from_chat_id: fromChatId,
        message_id: msgId,
    }
    addInlineKeyboard(params, chatId, fromChatId, msgId);
    addReplyParams(params, chatId, replyMsgId);
    return (await fetch(apiUrl('copyMessage', params))).json()
}

// Send plain text.
// https://core.telegram.org/bots/api#sendmessage
async function sendPlainText (chatId, text, replyMsgId = null) {
    const params = {
        chat_id: chatId,
        text,
    }
    addReplyParams(params, chatId, replyMsgId);
    return (await fetch(apiUrl('sendMessage', params))).json()
}

// Add parameters to reply to a message.
// https://core.telegram.org/bots/api#replyparameters
function addReplyParams (params, chatId, replyMsgId) {
    if (replyMsgId) {
        params.reply_parameters = JSON.stringify({
            message_id: replyMsgId,
            chat_id: chatId,
        })
    }
}

// Add (or edit) the inline keyboard to a message.
// https://core.telegram.org/bots/api#inlinekeyboardmarkup
function addInlineKeyboard (params, chatId, fromChatId, msgId, reacted = false) {
    var text = 'Like';
    if (chatId == OWNER) {
        text = hash(fromChatId) + ' (Like)';
    }
    params.reply_markup = JSON.stringify({
        inline_keyboard: [[{
            text: text,
            callback_data: JSON.stringify({
                reciever: fromChatId,
                reply_to: msgId,
                reacted: reacted,
            }),
        }]]
    })
}

// Generate hash for the id of anon users.
function hash (message) {
    message = message + 'z2p!bmR*cQ6QAY1[dn8g';
    var hash = 0,
      i, chr;
    for (i = 0; i < message.length; i++) {
        chr = message.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}




// Handle incoming callback_query (inline button press)
// https://core.telegram.org/bots/api#message
async function onCallbackQuery (callbackQuery) {
    var msg = JSON.parse(callbackQuery.data);
    const params = {
        chat_id: msg.reciever,
        message_id: msg.reply_to,
    }
    if (!msg.reacted) {
        params.reaction = JSON.stringify([{
            type: 'emoji',
            emoji: '👍',
        }])
    }
    await (await fetch(apiUrl('setMessageReaction', params))).json()
    params.chat_id = callbackQuery.message.chat.id;
    params.message_id = callbackQuery.message.message_id;
    await (await fetch(apiUrl('setMessageReaction', params))).json()

    delete params.reaction;
    addInlineKeyboard(params, params.chat_id, msg.reciever, msg.reply_to, !msg.reacted);
    await (await fetch(apiUrl('editMessageReplyMarkup', params))).json()
    return answerCallbackQuery(callbackQuery.id)
}

// Answer callback query (inline button press)
// This stops the loading indicator on the button and optionally shows a message
// https://core.telegram.org/bots/api#answercallbackquery
async function answerCallbackQuery (callbackQueryId, text = null) {
    const params = {
        callback_query_id: callbackQueryId
    }
    if (text) {
        params.text = text
    }
    return (await fetch(apiUrl('answerCallbackQuery', params))).json()
}




// Set webhook to this worker's url
// https://core.telegram.org/bots/api#setwebhook
async function registerWebhook (event, requestUrl, suffix, secret) {
    // https://core.telegram.org/bots/api#setwebhook
    const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`
    const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json()
    return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

// Remove webhook
// https://core.telegram.org/bots/api#setwebhook
async function unRegisterWebhook (event) {
    const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
    return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}




// Return url to telegram api, optionally with parameters added
function apiUrl (methodName, params = null) {
    let query = ''
    if (params) {
        query = '?' + new URLSearchParams(params).toString()
    }
    return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`
}
