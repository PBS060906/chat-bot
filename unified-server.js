const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');
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

const WECHAT_CONFIG = {
    corpId: process.env.WECHAT_CORP_ID || 'ww88569f731cd42759',
    agentId: process.env.WECHAT_AGENT_ID || '1000002',
    secret: process.env.WECHAT_SECRET || 'F1tkbxlfaAXoe7dzoqWJ75SelVvg8pyq4jd8f70egFo',
    token: process.env.WECHAT_TOKEN || 'PBSSJY1314',
    encodingAESKey: process.env.WECHAT_AES_KEY || 'xNiB8qjDinrsSjWoHcDe1zMV7fRFwbnMP7UY9X3jcSm'
};

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
        '濂界殑锛屾垜鍚噦浜嗐€傝闂繕鏈変粈涔堟兂璇寸殑锛?,
        '鍡棷锛岀户缁鍚э紝鎴戝湪鍚紒',
        '鏄庣櫧浜嗐€備綘甯屾湜鎴戝府浣犲垎鏋愪竴涓嬪悧锛?,
        '鏈夋剰鎬濓紒璁╂垜浠户缁亰鑱娿€?
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

function verifySignature(token, timestamp, nonce, encrypt, signature) {
    const arr = [token, timestamp, nonce, encrypt].sort();
    const str = arr.join('');
    const sha1 = crypto.createHash('sha1').update(str).digest('hex');
    return sha1 === signature;
}

function decrypt(echostr, encodingAESKey) {
    try {
        const aesKey = Buffer.from(encodingAESKey + '=', 'base64');
        const aesIV = aesKey.slice(0, 16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, aesIV);
        decipher.setAutoPadding(false);
        let decrypted = Buffer.concat([decipher.update(Buffer.from(echostr, 'base64')), decipher.final()]);
        const pad = decrypted[decrypted.length - 1];
        if (pad > 0 && pad <= 32) {
            decrypted = decrypted.slice(0, decrypted.length - pad);
        }
        const msgLen = decrypted.readUInt32BE(16);
        return decrypted.slice(20, 20 + msgLen).toString('utf8');
    } catch (e) {
        console.error('Decrypt error:', e.message);
        return null;
    }
}

function encrypt(replyMsg, encodingAESKey, corpId) {
    try {
        const random16 = crypto.randomBytes(16);
        const msgBuffer = Buffer.from(replyMsg, 'utf8');
        const msgLenBuffer = Buffer.alloc(4);
        msgLenBuffer.writeUInt32BE(msgBuffer.length, 0);
        const corpIdBuffer = Buffer.from(corpId, 'utf8');
        const totalBuffer = Buffer.concat([random16, msgLenBuffer, msgBuffer, corpIdBuffer]);
        const padSize = 32 - (totalBuffer.length % 32);
        const padBuffer = Buffer.alloc(padSize, padSize);
        const contentBuffer = Buffer.concat([totalBuffer, padBuffer]);
        const aesKey = Buffer.from(encodingAESKey + '=', 'base64');
        const aesIV = aesKey.slice(0, 16);
        const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, aesIV);
        cipher.setAutoPadding(false);
        return Buffer.concat([cipher.update(contentBuffer), cipher.final()]).toString('base64');
    } catch (e) {
        console.error('Encrypt error:', e.message);
        return null;
    }
}

app.get('/wechat', (req, res) => {
    const msg_signature = req.query.msg_signature;
    const timestamp = req.query.timestamp;
    const nonce = req.query.nonce;
    const echostr = req.query.echostr;

    console.log('WeChat GET:', { msg_signature, timestamp, nonce, echostr });

    if (!msg_signature || !timestamp || !nonce || !echostr) {
        res.end('Shao Ju Yuan AI Service Running...');
        return;
    }

    if (!verifySignature(WECHAT_CONFIG.token, timestamp, nonce, echostr, msg_signature)) {
        console.log('Signature verification failed');
        res.status(400).end('signature failed');
        return;
    }

    const decrypted = decrypt(echostr, WECHAT_CONFIG.encodingAESKey);
    if (decrypted) {
        console.log('Decrypted echostr:', decrypted);
        res.end(decrypted);
    } else {
        res.status(500).end('decrypt failed');
    }
});

app.post('/wechat', (req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        console.log('WeChat POST body:', body);

        const msg_signature = req.query.msg_signature;
        const timestamp = req.query.timestamp;
        const nonce = req.query.nonce;

        const encryptMatch = body.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/);
        const encrypt = encryptMatch ? encryptMatch[1] : null;

        if (!encrypt || !verifySignature(WECHAT_CONFIG.token, timestamp, nonce, encrypt, msg_signature)) {
            res.status(400).end('signature failed');
            return;
        }

        const decrypted = decrypt(encrypt, WECHAT_CONFIG.encodingAESKey);
        console.log('Decrypted message:', decrypted);

        const contentMatch = decrypted ? decrypted.match(/<Content><!\[CDATA\[(.*?)\]\]><\/Content>/) : null;
        const fromUserMatch = decrypted ? decrypted.match(/<FromUserName><!\[CDATA\[(.*?)\]\]><\/FromUserName>/) : null;

        const userContent = contentMatch ? contentMatch[1] : '';
        const fromUser = fromUserMatch ? fromUserMatch[1] : '';

        const replyContent = getBotResponse(userContent);
        console.log('Reply:', replyContent);

        const encrypted = encrypt(replyContent, WECHAT_CONFIG.encodingAESKey, WECHAT_CONFIG.corpId);
        const arr = [WECHAT_CONFIG.token, timestamp, nonce, encrypted].sort();
        const signature = crypto.createHash('sha1').update(arr.join('')).digest('hex');

        const replyXml = `<xml>
<Encrypt><![CDATA[${encrypted}]]></Encrypt>
<MsgSignature><![CDATA[${signature}]]></MsgSignature>
<TimeStamp>${timestamp}</TimeStamp>
<Nonce><![CDATA[${nonce}]]></Nonce>
</xml>`;

        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(replyXml);
    });
});

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
});