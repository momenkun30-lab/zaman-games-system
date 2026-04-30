const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const app = express();

// إعدادات البوت - تم إضافة التوكن الخاص بك هنا
const token = '8741320185:AAE2Y5Xv70PJWm4k-GMUO6FYub07wozYI2A'; 
const bot = new TelegramBot(token, { polling: true });

app.use(express.json());
// إخبار السيرفر بمكان ملفات الموقع
app.use(express.static(__dirname));

// تخزين مؤقت للإعلان
let siteConfig = {
    ad: { image: "" }
};

// تشغيل الواجهة الرئيسية (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// استقبال الإشعارات من الموقع وإرسالها لك
app.post('/api/log', (req, res) => {
    const { message } = req.body;
    // تم إضافة الأيدي الخاص بك هنا لتصلك الرسائل
    const chatId = '8305841557'; 
    bot.sendMessage(chatId, message);
    res.sendStatus(200);
});

// جلب إعدادات الموقع (صورة الإعلان)
app.get('/api/config', (req, res) => {
    res.json(siteConfig);
});

// التحكم عبر البوت (تغيير الإعلان عند إرسال صورة)
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    // التأكد أنك أنت فقط من يغير الإعلان
    if (chatId.toString() === '8305841557') {
        const photo = msg.photo[msg.photo.length - 1];
        const fileLink = await bot.getFileLink(photo.file_id);
        
        siteConfig.ad.image = fileLink;
        bot.sendMessage(chatId, "✅ تم تحديث الإعلان في الموقع بنجاح!");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
