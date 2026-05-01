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

// قواعد البيانات المؤقتة (ستحفظ الصور في الذاكرة أثناء عمل السيرفر)
let adsDatabase = []; 
let siteImages = [
    { id: 1, name: "وظيفة المستقبل", url: "https://images.unsplash.com/photo-1581094288338-2314dddb7e8c?w=400" },
    { id: 2, name: "بيت الزوجية", url: "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=400" }
];
let userState = {};

// --- تشغيل الواجهة الرئيسية للموقع ---
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// إرسال الإعلانات والصور للموقع (API)
app.get('/api/config', (req, res) => {
    res.json({ ads: adsDatabase, images: siteImages });
});

// استقبال السجلات من الموقع وإرسالها لك
app.post('/api/log', (req, res) => {
    bot.sendMessage(myId, req.body.message);
    res.sendStatus(200);
});

// --- لوحة التحكم في التلجرام ---
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

bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    if (chatId !== myId) return;
    const text = msg.text;

    // 1. إدارة الإعلانات (الشريط المتحرك)
    if (text === '➕ إضافة إعلان جديد') {
        userState[chatId] = { step: 'WAITING_FOR_AD_PHOTO' };
        bot.sendMessage(chatId, "📸 أرسل صورة الإعلان الآن لتظهر في الشريط العلوي:");
    }

    // 2. خيارات أكثر (إدارة شاشة النتائج)
    if (text === '🖼️ خيارات أكثر') {
        const opts = {
            reply_markup: {
                keyboard: [
                    ['📤 إضافة/تعديل صورة الموقع', '🗑️ حذف صورة'],
                    ['🔙 العودة للرئيسية']
                ],
                resize_keyboard: true
            }
        };
        bot.sendMessage(chatId, "🖼️ إدارة صور شاشة النتائج:", opts);
    }

    if (text === '🔙 العودة للرئيسية') { showMainMenu(); }

    // --- معالجة الصور المرسلة ---
    if (msg.photo && userState[chatId]) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const link = await bot.getFileLink(fileId);

        if (userState[chatId].step === 'WAITING_FOR_AD_PHOTO') {
            adsDatabase.push({ image: link, id: Date.now() });
            bot.sendMessage(chatId, `✅ تم رفع الإعلان! سيتحرك في الموقع مع بقية الإعلانات.`);
            delete userState[chatId];
        } 
        else if (userState[chatId].step === 'WAITING_FOR_SITE_IMG') {
            userState[chatId].link = link;
            userState[chatId].step = 'WAITING_FOR_IMG_NAME';
            bot.sendMessage(chatId, "📝 أدخل الآن اسم القسم الذي ستظهر فيه الصورة (مثلاً: سيارة الأحلام):");
        }
    } 

    // --- إدارة صور الموقع (إضافة وحذف) ---
    else if (text === '📤 إضافة/تعديل صورة الموقع') {
        userState[chatId] = { step: 'WAITING_FOR_SITE_IMG' };
        bot.sendMessage(chatId, "📸 أرسل الصورة التي تريدها أن تظهر في شاشة النتائج:");
    }

    else if (userState[chatId] && userState[chatId].step === 'WAITING_FOR_IMG_NAME') {
        siteImages.push({ 
            id: Date.now(),
            name: text, 
            url: userState[chatId].link 
        });
        bot.sendMessage(chatId, `✅ تم الحفظ! قسم "${text}" سيظهر الآن للمستخدمين.`);
        delete userState[chatId];
    }

    if (text === '🗑️ حذف صورة') {
        if (siteImages.length === 0) return bot.sendMessage(chatId, "⚠️ لا توجد صور.");
        let list = "أرسل رقم الصورة لحذفها من شاشة النتائج:\n\n";
        siteImages.forEach((img, index) => list += `${index + 1}. ${img.name}\n`);
        userState[chatId] = { step: 'WAITING_FOR_DELETE_ID' };
        bot.sendMessage(chatId, list);
    }

    else if (userState[chatId] && userState[chatId].step === 'WAITING_FOR_DELETE_ID') {
        const index = parseInt(text) - 1;
        if (siteImages[index]) {
            const deletedName = siteImages[index].name;
            siteImages.splice(index, 1);
            bot.sendMessage(chatId, `✅ تم حذف "${deletedName}" من الموقع.`);
        } else {
            bot.sendMessage(chatId, "⚠️ رقم غير صحيح.");
        }
        delete userState[chatId];
    }

    if (text === '⚙️ إعدادات أخرى') {
        bot.sendMessage(chatId, "🗑️ لتفريغ جميع الإعلانات أرسل كلمة: (تصفير الإعلانات)");
    }
    
    if (text === 'تصفير الإعلانات') {
        adsDatabase = [];
        bot.sendMessage(chatId, "✅ تم مسح جميع الإعلانات من السيرفر.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server is Running on port ${PORT}`); });
