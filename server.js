
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const app = express();

// إعدادات البوت الأساسية
const token = '8741320185:AAE2Y5Xv70PJWm4k-GMUO6FYub07wozYI2A'; 
const bot = new TelegramBot(token, { polling: true });
const myId = '8305841557';

app.use(express.json());
app.use(express.static(__dirname));

// قواعد البيانات المؤقتة
let adsDatabase = []; 
let siteImages = [];  
let userState = {};   

// --- تشغيل الواجهة الرئيسية ---
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// إرسال البيانات للموقع بناءً على الوقت والترتيب
app.get('/api/config', (req, res) => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // تصفية الإعلانات بناءً على الوقت المحدد لها
    let activeAds = adsDatabase.filter(ad => {
        if (!ad.startTime || !ad.endTime) return true;
        const start = parseInt(ad.startTime.split(':')[0]);
        const end = parseInt(ad.endTime.split(':')[0]);
        return currentHour >= start && currentHour < end;
    });

    res.json({ ads: activeAds, images: siteImages });
});

app.post('/api/log', (req, res) => {
    bot.sendMessage(myId, req.body.message);
    res.sendStatus(200);
});

// --- لوحة التحكم الرئيسية ---
bot.onText(/\/start/, (msg) => {
    if (msg.chat.id.toString() !== myId) return;
    showMainMenu();
});

function showMainMenu() {
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
}

// --- معالجة الرسائل والأوامر ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    if (chatId !== myId) return;
    const text = msg.text;

    // 1. إدارة الإعلانات
    if (text === '➕ إضافة إعلان جديد') {
        userState[chatId] = { step: 'WAITING_FOR_AD_PHOTO' };
        bot.sendMessage(chatId, "📸 أرسل صورة الإعلان الآن:");
    }

    if (text === '⚙️ إعدادات أخرى') {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🗑️ حذف الإعلانات", callback_data: "clear_ads" }],
                    [{ text: "⏱️ وقت ظهور الإعلان", callback_data: "set_ad_time" }]
                ]
            }
        };
        bot.sendMessage(chatId, "⚙️ إعدادات الإعلانات:", opts);
    }

    // 2. خيارات أكثر (إدارة صور الموقع)
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
        bot.sendMessage(chatId, "🖼️ إدارة محتوى الموقع:", opts);
    }

    if (text === '🔙 العودة للرئيسية') { showMainMenu(); }

    // --- منطق معالجة الصور والبيانات المتسلسل ---
    if (msg.photo && userState[chatId]) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const link = await bot.getFileLink(fileId);

        if (userState[chatId].step === 'WAITING_FOR_AD_PHOTO') {
            adsDatabase.push({ image: link, startTime: "00:00", endTime: "23:59", order: adsDatabase.length + 1 });
            bot.sendMessage(chatId, `✅ تم رفع الإعلان بنظام الترتيب رقم: ${adsDatabase.length}`);
            delete userState[chatId];
        } 
        else if (userState[chatId].step === 'WAITING_FOR_SITE_IMG') {
            userState[chatId].link = link;
            userState[chatId].step = 'WAITING_FOR_IMG_NAME';
            bot.sendMessage(chatId, "📝 أدخل الآن اسم الصورة:");
        }
    } 

    else if (text === '📤 إضافة/تعديل صورة الموقع') {
        userState[chatId] = { step: 'WAITING_FOR_SITE_IMG' };
        bot.sendMessage(chatId, "📸 أرسل الصورة التي تريد إضافتها للموقع:");
    }

    else if (userState[chatId] && userState[chatId].step === 'WAITING_FOR_IMG_NAME') {
        const imgName = text;
        const newImg = { 
            name: imgName, 
            url: userState[chatId].link, 
            id: siteImages.length + 1, 
            maxViews: 100 
        };
        siteImages.push(newImg);
        bot.sendMessage(chatId, `✅ تم الحفظ!\nالاسم: ${imgName}\nرقم الصورة: ${newImg.id}`);
        delete userState[chatId];
    }

    // --- حذف الصور ---
    if (text === '🗑️ حذف صورة') {
        if (siteImages.length === 0) return bot.sendMessage(chatId, "⚠️ لا توجد صور حالياً.");
        let list = "أرسل رقم الصورة لحذفها:\n";
        siteImages.forEach(img => list += `${img.id}. ${img.name}\n`);
        userState[chatId] = { step: 'WAITING_FOR_DELETE_ID' };
        bot.sendMessage(chatId, list);
    }

    else if (userState[chatId] && userState[chatId].step === 'WAITING_FOR_DELETE_ID') {
        const id = parseInt(text);
        siteImages = siteImages.filter(img => img.id !== id);
        bot.sendMessage(chatId, "✅ تم حذف الصورة بنجاح.");
        delete userState[chatId];
    }
});

// --- معالجة الأزرار المدمجة (Inline) ---
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'clear_ads') {
        adsDatabase = [];
        bot.sendMessage(chatId, "🗑️ تم مسح جميع الإعلانات.");
    }
    if (query.data === 'set_ad_time') {
        bot.sendMessage(chatId, "أرسل وقت البداية والنهاية بالساعات (مثلاً: 08-22)");
        userState[chatId] = { step: 'WAITING_FOR_TIME_RANGE' };
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server is LIVE on port ${PORT}`); });
