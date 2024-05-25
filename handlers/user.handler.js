require('dotenv').config();
const TonWeb = require("tonweb");
const { tasksKeyboard, authKeyboard, adminKeyboard, commands, lessonsKeyboard } = require('../utils/keyboards');
const ErrorHandler = require('../utils/error.handler'); 

class UserHandler {
  constructor(bot, userRepository, taskRepository, lessonRepository, adminId) {
    this.adminId = adminId;
    this.bot = bot;

    this.userRepository = userRepository;
    this.taskRepository = taskRepository;
    this.lessonRepository = lessonRepository;

    this.userState = {};

    this.initializeBotHandlers();
  }

  initializeBotHandlers() {
    this.bot.on('message', this.handleMessage.bind(this));
    this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
  }

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (Object.values(commands).includes(messageText)) return;

    try {
      switch (this.userState[chatId]) {
        case 'addWallet':
          await this.processWallet(chatId, messageText);
          break;
        case 'broadcast':
          await this.processBroadcastMessage(chatId, msg.message_id);
          break;
        default:
          break;
      }
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    try {
      if (data.startsWith('task_')) {
        await this.processTaskSelection(chatId, data, callbackQuery.message.message_id);
      } else if (data.startsWith('done_')) {
        await this.proccessConfirmTask(chatId, data, callbackQuery.message.message_id);
      } else if (data.startsWith('confirm_')){
        await this.processTaskCompletion(chatId, data, callbackQuery.message.message_id);
      } else if (data.startsWith('archive_')) {
        await this.processArchiveSelection(chatId, data, callbackQuery.message.message_id); 
      } else if (data == 'tasks') {
        await this.openTaskList(chatId, callbackQuery.message.message_id);
      } else if (data == 'archive') {
        await this.openArchiveList(chatId, callbackQuery.message.message_id);
      } else if (data == 'back_task') {
        await this.openTasks(chatId, callbackQuery.message.message_id);
      } else if (data == 'back_lesson') {
        await this.openLibrary(chatId, callbackQuery.message.message_id);
      } else if (data == 'default_lessons') {
        await this.openLessonList(chatId, callbackQuery.message.message_id, 0);
      } else if (data == 'extended_lessons') {
        await this.openLessonList(chatId, callbackQuery.message.message_id, 1);
      } else if (data.startsWith('lesson_')) {
        await this.processLessonSelection(chatId, data, callbackQuery.message.message_id);
      } else if (data == 'add_wallet') {
        await this.addWallet(chatId, callbackQuery.id);
      }
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async startMessage(msg) {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    const referralCode = msg.text.includes(' ') ? msg.text.split(' ')[1] : this.adminId;

    this.clearUserState(chatId);

    try {
      const user = await this.userRepository.getUserById(chatId);
      const wallet = user[0]?.wallet;
      
      if (user.length === 0) {
        await this.userRepository.addUser(chatId, username, '', referralCode);
      }

      const keyboard = chatId.toString() === this.adminId ? adminKeyboard : authKeyboard;

      this.bot.sendMessage(chatId, 'Добро пожаловать в бота!', keyboard);
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async addWallet(chatId, queryId) {
    this.clearUserState(chatId);

    this.bot.sendMessage(chatId, 'Введите свой кошелек!');
    this.userState[chatId] = 'addWallet';

    this.bot.answerCallbackQuery(queryId);
  }

  async getUserWallet(chatId) {
    this.clearUserState(chatId);

    try {
      const user = await this.userRepository.getUserById(chatId);

      if (user[0]?.task_points !== null && user[0]?.lesson_points !== null && user[0]?.ref_points !== null) {
        const totalPoints = user[0]?.task_points + user[0]?.lesson_points + user[0]?.ref_points;
        const wallet = user[0]?.wallet ? user[0]?.wallet : 'не установлен.';

        this.bot.sendMessage(chatId, `Текущий кошелек:\n<code>${wallet}</code>\n\nВсе начисления:\nВыполнение заданий: ${user[0].task_points}★\nОткрытие уроков: ${user[0].lesson_points}★\nПриглашение друзей: ${user[0].ref_points}★\nВсего очков: ${totalPoints}★`, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{text: user[0]?.wallet ? 'Изменить кошелек' : 'Добавить кошелек', callback_data: 'add_wallet'}]
            ]
          }
        });
      } else {
        this.bot.sendMessage(chatId, 'Ошибка получения кошелька.');
      }
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async getReferralLink(chatId) {
    this.clearUserState(chatId);

    try {
      const botLink = process.env.BOT_REF_LINK;
      const refLink = `${botLink}?start=${chatId}`;
      const referrals = await this.userRepository.getUserReferrals(chatId);

      this.bot.sendMessage(chatId, `Пригласите друзей и получайте 500 XP за каждого. Реферал засчитывается после того, как друг добавит свой кошелек в бота\n\nСсылка для приглашения:\n${refLink}\n\nОбщее количество рефералов: ${referrals.length}`);
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async sendBroadcastMessagePrompt(chatId) {
    this.clearUserState(chatId);
    this.bot.sendMessage(chatId, 'Введите сообщение для рассылки');
    this.userState[chatId] = 'broadcast';
  }

  async openStatistics(chatId) {
    try {
      const topUsers = await this.userRepository.getTopUsers(chatId);

      let message = '🏆 <b>Активные пользователи:</b>\n\n';
  
      topUsers.forEach(user => {
        message += `${user.place}. ${user.name}: ${user.total_points}★\n`;
      });
  
      const specificUser = topUsers.find(user => user.user_id == chatId);
  
      if (specificUser.place > 10) {
        message += `\nВаше место: ${specificUser.place}\nОчки: ${specificUser.total_points}★`;
      }
  
      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Ошибка при открытии статистики:', error);
    }
  }

  async openLibrary(chatId, messageId = null) {
    const text = 'Для получения знаний используйте библиотеку. Сейчас доступен только базовый курс. За изучение уроков вы получаете внутренние очки';

    if (messageId) {
      this.bot.sendMessage(chatId, text, {
          reply_markup: lessonsKeyboard
      });

      this.bot.deleteMessage(chatId, messageId);
    } else {
      this.bot.sendMessage(chatId, text, {
          reply_markup: lessonsKeyboard
      });
    }
  }

  async openTasks(chatId, messageId = null) {
    const text = 'Для достижения прогресса в обучении обязательно выполняйте задания. Мы сделали их максимально простыми. За выполнение заданий вы получаете внутренние очки.';

    if (messageId) {
      this.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: tasksKeyboard
      });
    }else{
      this.bot.sendMessage(chatId, text, {
        reply_markup: tasksKeyboard
      });
    }
  }

  async openLessonList(chatId, messageId, typeId) {
    try {
        const lessons = await this.lessonRepository.getUserLessons(typeId);

        if (lessons.length === 0) {
            this.bot.editMessageText('Скоро..', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: { inline_keyboard: [[{ text: 'Назад', callback_data: `back_lesson` }]] }
            });
            return;
        }

        const lessonButtons = lessons.map(({ id, name }) => [{ text: name, callback_data: `lesson_${id}` }]);
        this.bot.editMessageText('Скоро..', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: lessonButtons,
                resize_keyboard: true
            }
        });
    } catch (error) {
        ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async processWallet(chatId, wallet) {
    if (!TonWeb.utils.Address.isValid(wallet)) {
      this.bot.sendMessage(chatId, 'Неверный формат кошелька, попробуйте еще раз!');
      return;
    }

    try {
      await this.userRepository.updateUserWallet(chatId, wallet);
      this.clearUserState(chatId);

      const keyboard = chatId.toString() === this.adminId ? adminKeyboard : authKeyboard;
      this.bot.sendMessage(chatId, 'Кошелек успешно установлен!', keyboard);
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async processBroadcastMessage(chatId, messageId) {
    try {
      await this.broadcastMessage(chatId, messageId);
      this.clearUserState(chatId);
      this.bot.sendMessage(chatId, 'Рассылка прошла успешно!');
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async processTaskSelection(chatId, data, messageId) {
    const taskId = parseInt(data.split('_')[1], 10);
    try {
      const task = await this.taskRepository.getTaskById(taskId);

      if (task.length === 0) {
        this.bot.sendMessage(chatId, 'Такого задания не существует!');
        return;
      }

      this.bot.editMessageText(task[0].text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Выполнено!', callback_data: `done_${task[0].id}` }],
            [{ text: 'Назад', callback_data: `back_task` }]
          ],
          resize_keyboard: true
        }
      });
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async processLessonSelection(chatId, data, messageId) {
    const lessonId = parseInt(data.split('_')[1], 10);
    try {
      const lesson = await this.lessonRepository.getLessonById(lessonId);
  
      if (lesson.length === 0) {
        this.bot.sendMessage(chatId, 'Такого урока не существует!');
        return;
      }
  
      await this.lessonRepository.acceptLesson(chatId, lessonId);
  
      if (lesson[0]?.photo_path) {
        await this.bot.sendPhoto(chatId, __dirname + lesson[0].photo_path, {
          caption: lesson[0].text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Назад', callback_data: `back_lesson` }]
            ],
            resize_keyboard: true
          }
        });
      } else {
        await this.bot.sendMessage(chatId, lesson[0].text, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Назад', callback_data: `back_lesson` }]
            ],
            resize_keyboard: true
          }
        });
      }
  
      await this.bot.deleteMessage(chatId, messageId);
  
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }  

  async processArchiveSelection(chatId, data, messageId) {
    const taskId = parseInt(data.split('_')[1], 10);
    try {
      const task = await this.taskRepository.getTaskById(taskId);

      if (task.length === 0) {
        this.bot.sendMessage(chatId, 'Такого задания не существует!');
        return;
      }

      this.bot.editMessageText(task[0].text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Назад', callback_data: `back_task` }]
          ],
          resize_keyboard: true
        }
      });
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async processTaskCompletion(chatId, data, messageId) {
    const taskId = parseInt(data.split('_')[1], 10);
    
    try {
      const isAccept = await this.taskRepository.acceptTask(chatId, taskId);

      if (!isAccept) {
        this.bot.editMessageText('Ошибка подтверждения, попробуйте позже.', {
          chat_id: chatId,
          message_id: messageId
        });
        
        return;
      }

      this.bot.editMessageText('Задание выполнено!', {
        chat_id: chatId,
        message_id: messageId
      });
 
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async proccessConfirmTask(chatId, data, messageId) {
    const taskId = parseInt(data.split('_')[1], 10);

    this.bot.editMessageText('Вы уверены?', {
      chat_id: chatId, 
      message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: 'Да', callback_data: `confirm_${taskId}`}, { text: 'Нет', callback_data: 'back_task'}]] }
    })
  }

  async openArchiveList(chatId, messageId) {
    try {
      const tasks = await this.taskRepository.getCompletedTasks(chatId);

      if (tasks.length === 0) {
        this.bot.editMessageText('Архив заданий пуст!', {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: 'Назад', callback_data: `back_task` }]] }
        });
        return;
      }

      const tasksButtons = tasks.map(({ id, name }) => [{ text: name, callback_data: `archive_${id}` }]);
      this.bot.editMessageText('Архив заданий:', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: tasksButtons,
          resize_keyboard: true
        }
      });
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async openTaskList(chatId, messageId) {
    try {
      const tasks = await this.taskRepository.getUserTasks(chatId);

      if (tasks.length === 0) {
        this.bot.editMessageText('Список заданий пуст!', {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: 'Назад', callback_data: `back_task` }]] }
        });
        return;
      }

      const taskButtons = tasks.map(({ id, name }) => [{ text: name, callback_data: `task_${id}` }]);
      this.bot.editMessageText('Список заданий:', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: taskButtons,
          resize_keyboard: true
        }
      });
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async broadcastMessage(chatId, messageId) {
    try {
      const allUsers = await this.userRepository.getAllUsers();

      allUsers
          .filter(user => user.id.toString() !== this.adminId)
          .forEach(user => {
              this.bot.copyMessage(user.id, chatId, messageId);
          });
    } catch (error) {
        ErrorHandler.handleError(error, this.adminId, this.bot);
    }
  }

  clearUserState(chatId) {
    delete this.userState[chatId];
  }
}

module.exports = UserHandler;