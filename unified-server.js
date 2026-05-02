const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Telegraf } = require('telegraf');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const messages = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getBotResponse(userMessage) {
    const msg = userMessage.toLowerCase().trim();

    if (msg.includes('浣犲ソ') || msg.includes('hi') || msg.includes('hello')) {
        return '浣犲ソ锛佹湁浠€涔堟垜鍙互甯姪浣犵殑鍚楋紵';
    }
    if (msg.includes('澶╂皵')) {
        return '浠婂ぉ澶╂皵寰堜笉閿欏憿锛佽櫧鐒舵垜娌℃湁瀹炴椂澶╂皵鏁版嵁锛屼絾寤鸿浣犲嚭鍘昏蛋璧帮綖';
    }
    if (msg.includes('鍚嶅瓧') || msg.includes('浣犳槸璋?)) {
        return '鎴戞槸涓€涓櫤鑳借亰澶╂満鍣ㄤ汉锛屼綘鍙互鍙垜灏忔櫤锛?;
    }
    if (msg.includes('甯姪')) {
        return '浣犲彲浠ュ拰鎴戣亰澶╋紝鎴栬€呭彂閫佸浘鐗囩粰鎴戠湅銆傛垜浼氬敖閲忓府鍔╀綘锛?;
    }
    if (msg.includes('璋㈣阿')) {
        return '涓嶅姘旓紒寰堥珮鍏磋兘甯埌浣狅綖';
    }
    if (msg.includes('鍥剧墖') || msg.includes('鐓х墖')) {
        return '浣犲彲浠ョ洿鎺ュ彂閫佸浘鐗囩粰鎴戯紒';
    }
    if (msg.includes('绗戣瘽') || msg.includes('璁蹭釜绗戣瘽')) {
        return '鏈変竴澶╋紝绋嬪簭鍛樼殑濂虫湅鍙嬪浠栬锛?浜茬埍鐨勶紝浣犱粖澶╄兘淇ソ鎴戠殑鐢佃剳鍚楋紵"绋嬪簭鍛樿锛?褰撶劧鍙互锛屼笉杩囨垜闇€瑕佸厛閲嶅惎涓€涓嬫垜浠殑鍏崇郴銆?馃槃';
    }
    if (msg.includes('鏃堕棿') || msg.includes('鐜板湪鍑犵偣')) {
        return `鐜板湪鏄?${new Date().toLocaleString('zh-CN')}`;
    }
    if (msg === '?' || msg === '锛?) {
        return '浣犲彲浠ラ棶鎴戝ぉ姘斻€佹椂闂淬€佹垨鑰呴殢渚胯亰鑱婏紒';
    }

    const responses = [
        '杩欐槸涓湁瓒ｇ殑璇濋锛佽兘鍛婅瘔鎴戞洿澶氬悧锛?,
        '鎴戠悊瑙ｄ綘鐨勬剰鎬濄€傛湁浠€涔堝叿浣撴兂鑱婄殑鍚楋紵',
        '濂界殑锛屾垜鍚噦浜嗐€傝闂繕鏈変粈涔堟兂璇寸殑鍚楋紵',
        '鍡棷锛岀户缁鍚э紝鎴戝湪鍚紒',
        '鏄庣櫧浜嗐€備綘甯屾湜鎴戝府浣犲垎鏋愪竴涓嬪悧锛?,
        '鏈夋剰鎬濓紒璁╂垜浠户缁亰鑱娿€?
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

let bot;
if (TELEGRAM_BOT_TOKEN) {
    bot = new Telegraf(TELEGRAM_BOT_TOKEN);

    bot.start((ctx) => {
        ctx.reply('娆㈣繋锛佹垜鏄亰澶╂満鍣ㄤ汉灏忔櫤锛佹湁浠€涔堟垜鍙互甯姪浣犵殑鍚楋紵');
    });

    bot.help((ctx) => {
        ctx.reply('浣犲彲浠ュ拰鎴戣亰澶╋紝鎴栬€呭彂閫佸浘鐗囩粰鎴戠湅銆傛垜浼氬敖閲忓府鍔╀綘锛?);
    });

    bot.on('text', (ctx) => {
        const userMessage = ctx.message.text;
        const response = getBotResponse(userMessage);
        ctx.reply(response);
    });

    bot.on('photo', (ctx) => {
        ctx.reply('鏀跺埌鍥剧墖浜嗭紒杩欏紶鍥剧墖寰堟湁鎰忔€濓紒');
    });

    bot.launch();
    console.log('Telegram Bot started successfully!');

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.emit('loadMessages', messages);

    socket.on('sendMessage', (data) => {
        const { sender, type, content, fileUrl } = data;
        const message = {
            id: uuidv4(),
            sender,
            type: type || 'text',
            content: content || '',
            fileUrl: fileUrl || null,
            timestamp: Date.now()
        };

        messages.push(message);
        if (messages.length > 100) messages.shift();

        io.emit('newMessage', message);

        if (sender !== 'bot' && type === 'text') {
            io.emit('botTyping', true);

            setTimeout(() => {
                const botMessage = {
                    id: uuidv4(),
                    sender: 'bot',
                    type: 'text',
                    content: getBotResponse(content),
                    fileUrl: null,
                    timestamp: Date.now()
                };

                messages.push(botMessage);
                if (messages.length > 100) messages.shift();

                io.emit('newMessage', botMessage);
                io.emit('botTyping', false);
            }, 1000 + Math.random() * 1500);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (!TELEGRAM_BOT_TOKEN) {
        console.log('Warning: TELEGRAM_BOT_TOKEN not set - Telegram Bot will not start');
    }
});