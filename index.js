require('dotenv').config();
const bot = require('./utils/bot');
const UserHandler = require('./handlers/user.handler');
const UserRepository = require('./repositories/user.repository');
const express = require('express');
const path = require('path');
const cors = require('cors');
const userRouter = require('./routers/user.router');
const { commands } = require('./utils/keyboards'); 
const app = express();

const port = process.env.PORT || 3000;
const adminId = process.env.ADMIN_ID;
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbUserPassword = process.env.DB_USER_PASSWORD;
const dbName = process.env.DB_NAME;

app.use(express.json());
app.use(cors());

const userRepository = new UserRepository(dbUser, dbHost, dbName, dbUserPassword);
const userHandler = new UserHandler(bot, userRepository, adminId);

bot.onText(/\/start/, msg => userHandler.startMessage(msg))
bot.onText(new RegExp(`(${commands.add_wallet}|${commands.change_wallet})`), msg => userHandler.addWallet(msg.chat.id));
bot.onText(new RegExp(commands.wallet), msg => userHandler.getUserWallet(msg.chat.id));
bot.onText(new RegExp(commands.add_ref), msg => userHandler.getReferralLink(msg.chat.id));
bot.onText(new RegExp(commands.broadcast), msg => userHandler.sendBroadcastMessagePrompt(msg.chat.id));  
bot.onText(new RegExp(commands.library), msg => userHandler.openLibrary(msg.chat.id));
bot.onText(new RegExp(commands.tasks), msg => userHandler.openTasks(msg.chat.id));

app.use('/api', userRouter);

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});