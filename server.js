const { Telegraf } = require('telegraf');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const BOT_TOKEN = '8741320185:AAE2Y5Xv70PJWm4k-GMUO6FYub07wozYI2A';
const ADMIN_ID = 8305841557; 

const app = express();
const bot = new Telegraf(BOT_TOKEN);

app.use(cors());
app.use(bodyParser.json());

let currentAd = {
    image: "https://via.placeholder.com/800x200?text=AD+SPACE",
    active: true
};

// أوامر البوت
bot.start((ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply("مرحباً بك! أرسل صورة لتغيير إعلان الموقع فوراً.");
});

bot.on('photo', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const link = await ctx.telegram.getFileLink(fileId);
    currentAd.image = link.href;
    ctx.reply("✅ تم تحديث الإعلان في الموقع!");
});

// API للموقع
app.get('/api/config', (req, res) => res.json({ ad: currentAd }));

app.post('/api/log', (req, res) => {
    bot.telegram.sendMessage(ADMIN_ID, req.body.message);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
bot.launch();
