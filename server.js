const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const app = express();

const token = '8741320185:AAE2Y5Xv70PJWm4k-GMUO6FYub07wozYI2A'; 
const bot = new TelegramBot(token, { polling: true });
const myId = '8305841557';

app.use(express.json());
app.use(express.static(__dirname));

// نظام تخزين الإعلانات والصور المتطور
let adsDatabase = []; // مصفوفة لتخزين عدة إعلانات
let siteImages = [];  // مصفوفة لتخزين صور الموقع وتعديلها
let userState = {};   // لتتبع خطوات المدير عند الرفع

// تشغيل الواجهة
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// إرسال الإعلانات النشطة فقط بناءً على الوقت والتاريخ للموقع
app.get('/api/config', (req, res) => {
    const now = new Date();
    const currentTime = now.getHours() + ":" + now.getMinutes();
    
    // تصفية الإعلانات التي يجب أن تظهر الآن
    let activeAds = adsDatabase.filter(ad => {
        if (!ad.startTime || !ad.endTime) return true;
        return currentTime >= ad.startTime && currentTime <= ad.endTime;
    });

    res.json({ ads: activeAds, images: siteImages });
});

app.post('/api/log', (req, res) => {
    bot.sendMessage(myId, req.body.message);
    res.sendStatus(200);
});

// --- لوحة التحكم (الرئيسية) ---
bot.onText(/\/start/, (msg) => {
    if (msg.chat.id.toString() !== myId) return;
    const opts = {
        reply_markup: {
            keyboard: [
                ['➕ إضافة إعلان جديد', '🖼️ خيارات أكثر'],
                ['📊 إحصائيات', '⚙️ إعدادات أخرى']
            ],
            resize_keyboard: true
        }
    };
    bot.sendMessage(myId, "🛠️ لوحة تحكم نظام ألعاب الزمان المطور\nاختر من القائمة:", opts);
});

// --- معالجة الأزرار والقوائم ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    if (chatId !== myId) return;
    const text = msg.text;

    if (text === '➕ إضافة إعلان جديد') {
        userState[chatId] = { step: 'WAITING_FOR_AD_PHOTO' };
        bot.sendMessage(chatId, "📸 من فضلك أرسل صورة الإعلان الآن:");
    }

    if (text === '⚙️ إعدادات أخرى') {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🗑️ حذف جميع الإعلانات", callback_data: "clear_ads" }],
                    [{ text: "⏱️ ضبط وقت الإعلانات", callback_data: "set_time" }]
                ]
            }
        };
        bot.sendMessage(chatId, "⚙️ خيارات الإعلانات المتقدمة:", opts);
    }

    if (text === '🖼️ خيارات أكثر') {
        const opts = {
            reply_markup: {
                keyboard: [
                    ['📤 إضافة/تعديل صورة الموقع', '🗑️ حذف صورة'],
                    ['✏️ تعديل اسم صورة', '🔢 تحديد مرات الظهور'],
                    ['🔙 العودة للرئيسية']
                ],
                resize_keyboard: true
            }
        };
        bot.sendMessage(chatId, "🖼️ قائمة التحكم في صور المحتوى:", opts);
    }

    if (text === '🔙 العودة للرئيسية') {
        bot.sendMessage(chatId, "تم العودة للقائمة الرئيسية.", {
            reply_markup: { keyboard: [['➕ إضافة إعلان جديد', '🖼️ خيارات أكثر'], ['📊 إحصائيات', '⚙️ إعدادات أخرى']], resize_keyboard: true }
        });
    }

    // منطق استقبال الصور والبيانات
    if (msg.photo && userState[chatId]) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const link = await bot.getFileLink(fileId);

        if (userState[chatId].step === 'WAITING_FOR_AD_PHOTO') {
            adsDatabase.push({ image: link, startTime: "00:00", endTime: "23:59", days: 7 });
            bot.sendMessage(chatId, "✅ تم رفع الإعلان بنجاح بنظام الترتيب!");
            delete userState[chatId];
        } 
        else if (userState[chatId].step === 'WAITING_FOR_SITE_IMG') {
            userState[chatId].link = link;
            userState[chatId].step = 'WAITING_FOR_IMG_NAME';
            bot.sendMessage(chatId, "📝 أرسل الآن اسماً لهذه الصورة:");
        }
    } else if (userState[chatId] && userState[chatId].step === 'WAITING_FOR_IMG_NAME') {
        const imgName = text;
        const newImg = { name: imgName, url: userState[chatId].link, id: siteImages.length + 1, views: 100 };
        siteImages.push(newImg);
        bot.sendMessage(chatId, `✅ تم حفظ الصورة باسم: ${imgName}\nرقم الصورة في الموقع: ${newImg.id}`);
        delete userState[chatId];
    }
});

// معالجة الأزرار المخفية (Inline)
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'clear_ads') {
        adsDatabase = [];
        bot.sendMessage(chatId, "🗑️ تم حذف جميع الإعلانات من السيرفر.");
    }
    if (query.data === 'set_time') {
        bot.sendMessage(chatId, "قم بإرسال الوقت بالتنسيق التالي لتعديل آخر إعلان:\nمثال: 08:00-22:00");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`System running on port ${PORT}`); });
