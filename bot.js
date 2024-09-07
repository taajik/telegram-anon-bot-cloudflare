
const TOKEN = ENV_BOT_TOKEN;  // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const WEBHOOK = '/endpoint';
const SECRET = ENV_BOT_SECRET;  // A-Z, a-z, 0-9, _ and -
const START_LINK = "https://t.me/" + BOT_USERNAME + "?start=";
const HELPTXT_EN = "Hi! With this bot you can chat with someone anonymously.\n" +
    "Reply to someone's message and then you can continue to chat with them.\n" +
    "You can send all kinds of messages. " +
    "The only drawback is that you can't reply to your own messages.\n" +
    "btw, clicking the button on a message will react to it with a 'thumbs up'.\nHave fun!\n" +
    "\nCommands:\n" +
    "/help - Return this message\n" +
    "/end - End the ongoing chat\n" +
    "/mylink - Get your link\n" +
    "/customname - Set your name and link (like a username)\n" +
    "/block - Reply to a message with this, to block the sender. \n" +
    "/unblock - Reply to a message with this, to unblock the sender. \n" +
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
    "/customname - انتخاب اسم و لینک سفارشی (مثل یوزرنیم)\n" +
    "/block - ریپلای با این بلاک می‌کنه \n" +
    "/unblock - ریپلای با این آنبلاک می‌کنه \n" +
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
    // return sendPlainText(message.chat.id, JSON.stringify(message.reply_to_message));
    if (message.pinned_message) {
        return (await fetch(apiUrl('deleteMessage', {
            chat_id: message.chat.id,
            message_id: message.message_id,
        }))).json()
    }
    var user_id = hash(message.chat.id);
    var current_chat = JSON.parse(await CHATS.get(user_id)) || [];
    var target = current_chat[0];
    var use_name = current_chat[1];
    var reply_msg;
    try {
        reply_msg = JSON.parse(message.reply_to_message.reply_markup.inline_keyboard[0][0].callback_data);
    } catch(err) {
        reply_msg = {r: null, rt: null};
    }

    if (message.text) {
        if (message.text.startsWith('/start')) {
            if (message.text.split(' ').length == 1) {
                return sendPlainText(message.chat.id, HELPTXT);
            }
            var cname = message.text.split(' ')[1].toLowerCase();
            target = Number(await LINKS.get(cname));
            if (!target) {
                return sendPlainText(message.chat.id, "Sorry, that user wasn't found. (/help)", message.message_id);
            }
            if (target == message.chat.id) {
                insistent_user += message.chat.id;
                if (insistent_user == message.chat.id*3) {
                    insistent_user = 0;
                    return sendPlainText(message.chat.id, "Well, \"can't\" to first and \"it does\" to second (tell me if it didn't though)", message.message_id);
                }
                return sendPlainText(message.chat.id, "You tryna text yourself or just wanna see if it works? :)", message.message_id);
            }
            if (await isBlocked(hash(target), message.chat.id, 1)) {
                return sendPlainText(message.chat.id, "Sorry, you can't message that user.", message.message_id);
            }
            if (target == current_chat[0] && !use_name) {
                return sendPlainText(message.chat.id, "You don't need to click on the link again. You are alreay in a chat with '" + cname + "'.", message.message_id);
            }
            if (cname == "admin") {
                // distinguish chats with admin from personal
                await sendPlainText(await LINKS.get("admin"), user_id + ' is contacting the admin!');
            }
            await CHATS.put(user_id, JSON.stringify([target, 0]));
            var m = await sendPlainText(message.chat.id, "You are now in a chat with '" + cname + "'.\nMesseges you send here will be sent to them.\nUse /end if you want to close the chat.");
            return changePinnedMessage(message.chat.id, m.result.message_id);

        } else if (message.text == '/mylink') {
            var cname = await CUSTOM_NAMES.get(user_id);
            if (!cname) {
                cname = user_id;
                if (!await LINKS.get(user_id)) {
                    await LINKS.put(user_id, message.chat.id);    // generate a link using the hashed id
                }
            }
            await sendPlainText(message.chat.id, "Here's your link:\nAnyone who clicks it, will see you as '" + cname + "'.", message.message_id);
            return sendPlainText(message.chat.id,  START_LINK + cname);

        } else if (message.text.startsWith('/customname')) {
            if (message.text.split(' ').length == 1) {
                return sendPlainText(message.chat.id, "Choose the value for your name and link in this format:\n/customname VALUE\n\nIf you want to delete your custom name and link, send this:\n/customname reset", message.message_id);
            }
            var cname = message.text.split(' ')[1].toLowerCase();
            if (cname == 'reset') {
                await LINKS.put(user_id, message.chat.id);    // link the hashed id
                await LINKS.delete(await CUSTOM_NAMES.get(user_id));    // delete the custom link to the user's id
                await CUSTOM_NAMES.delete(user_id);    // delete the custom name
                return sendPlainText(message.chat.id, "Your name and link were reseted. Your link is now this:\n" + START_LINK + user_id, message.message_id);
            }
            if (cname == 'delete') {
                await LINKS.delete(user_id);    // delete the hashed id link
                await LINKS.delete(await CUSTOM_NAMES.get(user_id));    // delete the custom link to the user's id
                await CUSTOM_NAMES.delete(user_id);    // delete the custom name
                return sendPlainText(message.chat.id, "Your link was deleted.\nSend /mylink to generate one again.", message.message_id);
            }
            if (await LINKS.get(cname) || !/^[a-z][\da-z_]{3,20}[\da-z]$/i.test(cname) || cname.includes('admin')) {
                return sendPlainText(message.chat.id, "That's invalid or taken! Please choose something else.\n(5 char min. you can use a-z, 0-9, _)", message.message_id);
            }
            await LINKS.put(cname, message.chat.id);    // link the custom link to the user's id
            await LINKS.delete(user_id);    // delete the hashed id link
            await LINKS.delete(await CUSTOM_NAMES.get(user_id));    // delete the old custom link
            await CUSTOM_NAMES.put(user_id, cname);    // save the custom name
            return sendPlainText(message.chat.id, "Done! Your name is now '" + cname + "' and your new link is this:\n" + START_LINK + cname, message.message_id);

        } else if (message.text == '/end') {
            if (target) {
                await closeChat(message.chat.id);
                return sendPlainText(message.chat.id, "Chat closed!", message.message_id);
            } else {
                return sendPlainText(message.chat.id, "You are not in any chat.", message.message_id);
            }

        } else if (message.text == '/block') {
            if (!reply_msg.r) {
                return sendPlainText(message.chat.id, "Please reply to a message of the user you want to block and send this command.", message.message_id);
            }
            var block_list = JSON.parse(await BLOCKS.get(user_id)) || [];
            var blockee = JSON.stringify([Number(reply_msg.r), reply_msg.f&1^1]);
            if (block_list.includes(blockee)) {
                return sendPlainText(message.chat.id, "They are already blocked!", message.message_id);
            } else {
                block_list.push(blockee);
                await BLOCKS.put(user_id, JSON.stringify(block_list));
                if (await CHATS.get(user_id) == blockee) {
                    await closeChat(message.chat.id);
                }
                if (await CHATS.get(hash(reply_msg.r)) == JSON.stringify([message.chat.id, reply_msg.f&1])) {
                    await closeChat(reply_msg.r);
                    await sendPlainText(reply_msg.r, "Sorry, the chat was ended bacause '" + await getUserName(message.chat.id, reply_msg.f&1^1) + "' blocked you.");
                }
                return sendPlainText(message.chat.id, "Blocked!", message.message_id);
            }

        } else if (message.text == '/unblock') {
            if (!reply_msg.r) {
                return sendPlainText(message.chat.id, "Please reply to a message of the user you want to unblock and send this command.", message.message_id);
            }
            var block_list = JSON.parse(await BLOCKS.get(user_id)) || [];
            var blockee = JSON.stringify([Number(reply_msg.r), reply_msg.f&1^1]);
            if (!block_list.includes(blockee)) {
                return sendPlainText(message.chat.id, "They are not blocked!", message.message_id);
            } else {
                block_list.splice(block_list.indexOf(blockee), 1);
                await BLOCKS.put(user_id, JSON.stringify(block_list));
                return sendPlainText(message.chat.id, "Unblocked!", message.message_id);
            }

        } else if (message.text == '/help') {
            return sendPlainText(message.chat.id, HELPTXT, message.message_id);
        }
    }

    if (reply_msg.r && (target != reply_msg.r || use_name == (reply_msg.f&1))) {    // reply to a new user or reply to same user with a different id
        target = Number(reply_msg.r);
        use_name = reply_msg.f&1^1;

        if (await isBlocked(hash(target), message.chat.id, use_name^1)) {
            return sendPlainText(message.chat.id, "Sorry, you can't message that user.", message.message_id);
        }
        await CHATS.put(user_id, JSON.stringify([target, use_name]));
        var m = await sendPlainText(message.chat.id, "You are now in a chat with '" + await getUserName(target, reply_msg.f&1) + "'.", message.message_id);
        await changePinnedMessage(message.chat.id, m.result.message_id);
    }
    if (target) {
        return sendFullMessage(target, message.chat.id, message.message_id, reply_msg.rt);
    }
    return sendPlainText(message.chat.id, "Not sent! Please start a chat (Reply to whomever you want to talk to)", message.message_id);
}

// Copy a message and send it.
// https://core.telegram.org/bots/api#copymessage
async function sendFullMessage (chatId, fromChatId, msgId, replyMsgId = null) {
    const params = {
        chat_id: chatId,
        from_chat_id: fromChatId,
        message_id: msgId,
    }
    await addInlineKeyboard(params, fromChatId, msgId);
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
async function addInlineKeyboard (params, fromChatId, msgId, use_name = null, reacted = false) {
    if (use_name == null) {
        var use_name = JSON.parse(await CHATS.get(hash(fromChatId))) || [];
        use_name = use_name[1];
    }
    var text = "from: " + await getUserName(fromChatId, use_name);
    params.reply_markup = JSON.stringify({
        inline_keyboard: [[{
            text: text,
            callback_data: JSON.stringify({
                r: fromChatId,    // receiver
                rt: msgId,    // reply_to
                f: reacted*2 | use_name,    // flags (by bit)
            }),
        }]]
    })
}

// Get the custom name or hashed id of a user.
async function getUserName (user, use_name = false) {
    var user_name = hash(user);
    if (use_name) {
        user_name = await CUSTOM_NAMES.get(user_name) || user_name;
    }
    return user_name;
}

async function closeChat (chatId) {
    await CHATS.delete(hash(chatId));
    return (await fetch(apiUrl('unpinAllChatMessages', {
        chat_id: chatId,
    }))).json()
}

async function isBlocked (blocker, blockee, use_name) {
    var block_list = JSON.parse(await BLOCKS.get(blocker)) || [];
    return block_list.includes(JSON.stringify([blockee, use_name&1]));
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
    if (!await isBlocked(hash(msg.r), callbackQuery.message.chat.id, msg.f&1)) {
        const params = {
            chat_id: msg.r,
            message_id: msg.rt,
        }
        if (!(msg.f&2)) {
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
        await addInlineKeyboard(params, msg.r, msg.rt, msg.f&1, !(msg.f&2));
        await (await fetch(apiUrl('editMessageReplyMarkup', params))).json()
    }
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
