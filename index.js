require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');

const bot = require('./utils/bot');
const UserHandler = require('./handlers/user.handler');
const userRouter = require('./routers/user.router');
const taskRouter = require('./routers/task.router');
const lessonRouter = require('./routers/lesson.router');
const { commands } = require('./utils/keyboards'); 

const { userRepository, taskRepository, lessonRepository } = require('./repositories/index');

const app = express();

const port = process.env.PORT || 3000;
const adminId = process.env.ADMIN_ID;

app.use(fileUpload());
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'build')));
app.use('/upload', express.static(path.join(__dirname, 'upload')));

const userHandler = new UserHandler(bot, userRepository, taskRepository, lessonRepository, adminId);

bot.onText(/\/start/, msg => userHandler.startMessage(msg));
bot.onText(new RegExp(commands.wallet), msg => userHandler.getUserWallet(msg.chat.id));
bot.onText(new RegExp(commands.add_ref), msg => userHandler.getReferralLink(msg.chat.id));
bot.onText(new RegExp(commands.broadcast), msg => userHandler.sendBroadcastMessagePrompt(msg.chat.id));  
bot.onText(new RegExp(commands.library), msg => userHandler.openLibrary(msg.chat.id));
bot.onText(new RegExp(commands.tasks), msg => userHandler.openTasks(msg.chat.id));
bot.onText(new RegExp(commands.statistics), msg => userHandler.openStatistics(msg.chat.id));

app.use('/api', userRouter);
app.use('/api', taskRouter);
app.use('/api', lessonRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});
