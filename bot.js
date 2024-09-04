
const TOKEN = ENV_BOT_TOKEN;  // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const WEBHOOK = '/endpoint';
const SECRET = ENV_BOT_SECRET;  // A-Z, a-z, 0-9, _ and -
const START_LINK = "https://t.me/mybasicanonbot?start=";
const HELPTXT_EN = "Hi! With this bot you can chat with someone anonymously.\n" +
    "Reply to someone's message and then you can continue to chat with them.\n" +
    "You can send all kinds of messages. " +
    "The only drawback is that you can't reply to your own messages.\n" +
    "btw, clicking the button on a message will react to it with a 'thumbs up'.\nHave fun!\n" +
    "\nCommands:\n" +
    "/help - Return this message\n" +
    "/end - End the ongoing chat\n" +
    "/mylink - Get your link\n" +
    "/customlink - Choose a customized link (like a username)\n" +
    "\nIf there were any issues you can contact me here: " + START_LINK + "admin"
const HELPTXT_FA = "سلام! با این بات میتونی ناشناس چت کنی.\n" +
    "وقتی به پیام کسی ریپلای میزنی، بعدش میتونی باهاش چت رو ادامه بدی.\n" +
    "همه جور پیامی میشه فرستاد. " +
    "ولی تنها مشکلش اینه که به پیام‌های خودت نمی‌تونی ریپلای بزنی.\n" +
    "راستی، دکمه‌ی روی پیام‌ها رو اگه کلیک کنی، ری‌اکشن لایک میزنه.\nخوش بگذره!\n" +
    "\nدستورها:\n" +
    "/help - همین پیام رو میفرسته\n" +
    "/end - بستن چت جاری\n" +
    "/mylink - لینک ناشناس خودت\n" +
    "/customlink - انتخاب لینک ناشناس سفارشی (مثل یوزرنیم)\n" +
    "\n مشکلی هم اگه بود، می‌تونی اینجا پیام بدی: " + START_LINK + "admin"
const HELPTXT = HELPTXT_EN + '\n\n\n' + HELPTXT_FA;
var insistent_user = 0;




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
        if (message.text.startsWith('/start')) {
            if (message.text.split(' ').length == 1) {
                return sendPlainText(message.chat.id, HELPTXT);
            }
            target = await LINKS.get(message.text.split(' ')[1].toLowerCase());
            if (!target) {
                return sendPlainText(message.chat.id, "Sorry, that user wasn't found. (/help)", message.message_id);
            }
            if (target == message.chat.id) {
                insistent_user += message.chat.id;
                if (insistent_user == message.chat.id*3) {
                    insistent_user = 0;
                    return sendPlainText(message.chat.id, "Well, \"can't\" to first and \"it does\" to second (actually, I'm just hoping, tell me if it doesn't)", message.message_id);
                }
                return sendPlainText(message.chat.id, "You tryna text yourself or just wanna see if it works? :)", message.message_id);
            }
            await CHATS.put(user_id, target);
            var m = await sendPlainText(message.chat.id, "You are now in a chat with " + hash(target) + ".\nAnything you send will be sent to them.\nSend /end if you want to close the chat.");
            return changePinnedMessage(message.chat.id, m.result.message_id);

        } else if (message.text == '/mylink') {
            var link = await CUSTOM_LINKS.get(user_id);
            if (!link) {
                link = user_id;
                if (!await LINKS.get(user_id)) {
                    await LINKS.put(user_id, message.chat.id);    // create a link using the hashed id
                }
            }
            await sendPlainText(message.chat.id, "Here you go:\nShare this with people so they can start an anonymous chat with you.", message.message_id);
            return sendPlainText(message.chat.id,  START_LINK + link);

        } else if (message.text.startsWith('/customlink')) {
            if (message.text.split(' ').length == 1) {
                return sendPlainText(message.chat.id, "Choose the value for your link in this format:\n/customlink VALUE\n\nIf you want to delete your custom link, send this:\n/customlink reset", message.message_id);
            }
            var link = message.text.split(' ')[1].toLowerCase();
            if (link == 'reset') {
                await LINKS.put(user_id, message.chat.id);    // link the hashed id
                await LINKS.delete(await CUSTOM_LINKS.get(user_id));    // delete the custom link to the user's id
                await CUSTOM_LINKS.delete(user_id);    // delete the custom link
                return sendPlainText(message.chat.id, "Your link was reseted to this:\n" + START_LINK + user_id, message.message_id);
            }
            if (link == 'delete') {
                await LINKS.delete(user_id);    // delete the hashed id link
                await LINKS.delete(await CUSTOM_LINKS.get(user_id));    // delete the custom link to the user's id
                await CUSTOM_LINKS.delete(user_id);    // delete the custom link
                return sendPlainText(message.chat.id, "Your link was deleted.", message.message_id);
            }
            if (await LINKS.get(link) || !/^[a-z][\da-z_]{4,20}$/i.test(link) || link.includes('admin')) {
                return sendPlainText(message.chat.id, "That's invalid or taken! Please choose something else.\n(5 char min, a-z, 0-9, _)", message.message_id);
            }
            await LINKS.put(link, message.chat.id);    // link the custom link to the user's id
            await LINKS.delete(user_id);    // delete the hashed id link
            await LINKS.delete(await CUSTOM_LINKS.get(user_id));    // delete the old custom link
            await CUSTOM_LINKS.put(user_id, link);    // save the custom link
            return sendPlainText(message.chat.id, "Done! Your new link is this:\n" + START_LINK + link, message.message_id);

        } else if (message.text == '/end') {
            if (target) {
                await CHATS.delete(user_id);
                await (await fetch(apiUrl('unpinAllChatMessages', {
                    chat_id: message.chat.id
                }))).json()
                return sendPlainText(message.chat.id, "Chat closed!", message.message_id);
            } else {
                return sendPlainText(message.chat.id, "You are not in any chat.", message.message_id);
            }

        } else if (message.text == '/help') {
            return sendPlainText(message.chat.id, HELPTXT, message.message_id);
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
            target = reply_msg.receiver;
            await CHATS.put(user_id, target);
            var m = await sendPlainText(message.chat.id, "You are now in a chat with " + hash(target), message.message_id);
            await changePinnedMessage(message.chat.id, m.result.message_id);
        }
        return sendMessage(target, message.chat.id, message.message_id, reply_msg.reply_to);
    } else if (target) {
        return sendMessage(target, message.chat.id, message.message_id);
    } else {
        return sendPlainText(message.chat.id, "Not sent! Please start a chat (Reply to whomever you want to talk to)", message.message_id);
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

// Unpin the last pinned message and pin the new one.
// https://core.telegram.org/bots/api#pinchatmessage
async function changePinnedMessage (chatId, msgId) {
    const params = {
        chat_id: chatId,
    }
    await (await fetch(apiUrl('unpinChatMessage', params))).json()
    params.message_id = msgId;
    return (await fetch(apiUrl('pinChatMessage', params))).json()
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

// Generate hash of the user ids.
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
