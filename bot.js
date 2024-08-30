
const TOKEN = ENV_BOT_TOKEN;  // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const WEBHOOK = '/endpoint';
const SECRET = ENV_BOT_SECRET;  // A-Z, a-z, 0-9, _ and -


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
    var user_id = hash(message.chat.id);
    var target = await CHATS.get(user_id);

    if (message.text) {
        if (message.text == '/start' || message.text == '/help') {
            var HELPTXT = "Hi! With this bot you can chat with someone anonymously. (both parties are anonymous)\n" +
                "After you start a chat, anything you send here will be send to them.\n" +
                "Starting a chat is done either by clicking on someone's link or " +
                "by replying to a message. (naturally, the chat that you might've already been in, will end.)\n" +
                // "Every time you reply to someone new, you switch the chat and can continue to talk to them." +
                "You can send all kinds of messages. " +
                "The only drawback is that you can't reply to your own messages.\n" +
                "FYI, clicking the button on messages will react to them with 'thumbs up'.\nHave fun!\n" +
                "\nCommands:\n" +
                "/help: Return this message.\n" +
                "/end: End the ongoing chat with someone.\n"
            return sendPlainText(message.chat.id, HELPTXT, message.message_id)
        } else if (message.text.startsWith('/end')) {
            if (target) {
                await CHATS.delete(user_id);
                return sendPlainText(message.chat.id, 'Chat ended!', message.message_id)
            } else {
                return sendPlainText(message.chat.id, 'You are not in any chats.', message.message_id)
            }
        }
    }

    // await sendPlainText(message.chat.id, JSON.stringify(message.reply_to_message));
    var reply_msg;
    try {
        reply_msg = JSON.parse(message.reply_to_message.reply_markup.inline_keyboard[0][0].callback_data);
    } catch(err) {
        reply_msg = {receiver: null, reply_to: null};
    }

    if (reply_msg.receiver) {
        if (target != reply_msg.receiver) {
            await CHATS.put(user_id, reply_msg.receiver);
        }
        return sendMessage(reply_msg.receiver, message.chat.id, message.message_id, reply_msg.reply_to);
    } else if (target) {
        return sendMessage(target, message.chat.id, message.message_id);
    } else {
        return sendPlainText(message.chat.id, 'Not sent! Please start a chat.', message.message_id);
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
    addInlineKeyboard(params, fromChatId, msgId);
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
function addInlineKeyboard (params, fromChatId, msgId, reacted = false) {
    var text = 'from: ' + hash(fromChatId);
    params.reply_markup = JSON.stringify({
        inline_keyboard: [[{
            text: text,
            callback_data: JSON.stringify({
                receiver: fromChatId,
                reply_to: msgId,
                reacted: reacted,
            }),
        }]]
    })
}

// Generate hash for the id of anon users.
function hash (message) {
    message = 'f_59?Col>b]YfWBYATd^' + message;
    var hash = 0,
      i, chr;
    for (i = 0; i < message.length; i++) {
        chr = message.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash >>>= 0;
    }
    return hash;
}




// Handle incoming callback_query (inline button press)
// https://core.telegram.org/bots/api#message
async function onCallbackQuery (callbackQuery) {
    var msg = JSON.parse(callbackQuery.data);
    const params = {
        chat_id: msg.receiver,
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
    addInlineKeyboard(params, msg.receiver, msg.reply_to, !msg.reacted);
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
