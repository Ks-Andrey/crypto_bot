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
      } else if (data.startsWith('confirm_')) {
        await this.processTaskCompletion(chatId, data, callbackQuery.message.message_id);
      } else if (data.startsWith('tasks_page_')) {
        await this.openTaskList(chatId, data, callbackQuery.message.message_id);
      } else if (data == 'back_lesson') {
        await this.openLibrary(chatId, callbackQuery.message.message_id);
      } else if (data.startsWith('default_page_')) {
        await this.openLessonList(chatId, data, callbackQuery.message.message_id, 0);
      } else if (data.startsWith('extended_page_')) {
        await this.openLessonList(chatId, data, callbackQuery.message.message_id, 1);
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
              [{ text: user[0]?.wallet ? 'Изменить кошелек' : 'Добавить кошелек', callback_data: 'add_wallet' }]
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

      this.bot.sendMessage(chatId, `Пригласите друзей и получайте 500★ за каждого. Реферал засчитывается после того, как друг добавит свой кошелек в бота\n\nСсылка для приглашения:\n${refLink}\n\nОбщее количество рефералов: ${referrals.length}`);
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
      this.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: lessonsKeyboard
      });
    } else {
      this.bot.sendMessage(chatId, text, {
        reply_markup: lessonsKeyboard
      });
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

  //page
  async processTaskSelection(chatId, data, messageId) {
    const taskId = parseInt(data.split('_')[1], 10);
    const page = parseInt(data.split('_')[2], 10);
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
            [{ text: 'Выполнено!', callback_data: `done_${task[0].id}_${page}` }],
            [{ text: 'Назад', callback_data: `tasks_page_${page}` }]
          ],
          resize_keyboard: true
        }
      });
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  //page
  async processLessonSelection(chatId, data, messageId) {
    const lessonId = parseInt(data.split('_')[1], 10);
    const page = parseInt(data.split('_')[2], 10);
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
              [{ text: 'Назад', callback_data: lesson[0].type_id == 0 ? `default_page_${page}` : `extended_page_${page}` }]
            ],
            resize_keyboard: true
          }
        });
      } else {
        await this.bot.sendMessage(chatId, lesson[0].text, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Назад', callback_data: lesson[0].type_id == 0 ? `default_page_${page}` : `extended_page_${page}` }]
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

      await this.openTaskList(chatId, 'tasks_page_1', messageId);
      await this.bot.sendMessage(chatId, 'Задание выполнено!');

    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  //page
  async proccessConfirmTask(chatId, data, messageId) {
    const taskId = parseInt(data.split('_')[1], 10);
    const page = parseInt(data.split('_')[2], 10);

    this.bot.editMessageText('Вы уверены?', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: 'Да', callback_data: `confirm_${taskId}` }, { text: 'Нет', callback_data: `tasks_page_${page}` }]] }
    })
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

  async generateList(chatId, data, messageId, elementGetter, emptyMessage, text, backButtonData, itemCallbackPrefix, typeId = null) {
    try {
      const page = parseInt(data.split('_')[2], 10);
      const limit = 5;
      const offset = (page - 1) * limit;
      const elements = typeId !== null ? await elementGetter(typeId, limit, offset) : await elementGetter(chatId, limit, offset);
      const elementsCount = elements[0]?.total_count || 1;
      const totalPages = Math.ceil(elementsCount / limit); 

      if (elements.length === 0) {
        this.bot.editMessageText(emptyMessage, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: 'Назад', callback_data: backButtonData }]] }
        });
        return;
      }

      const elementButtons = elements.map(({ id, name }) => [{ text: name, callback_data: `${itemCallbackPrefix}_${id}_${page}` }]);

      const paginationButtons = [];
      if (totalPages > 1) {
        if (page > 1) paginationButtons.push({ text: '<<', callback_data: `${data.split('_')[0]}_page_${page - 1}` });
        if (page < totalPages) paginationButtons.push({ text: '>>', callback_data: `${data.split('_')[0]}_page_${page + 1}` });
      } 

      if (elements.some(element => element?.photo_path) || messageId === null) {
        this.bot.sendMessage(chatId, `Страница ${page}/${totalPages}\n\n${text}`, {
          reply_markup: {
            inline_keyboard: [...elementButtons, paginationButtons, 
              ...(backButtonData ? [[{ text: 'Назад', callback_data: backButtonData }]] : [])],
            resize_keyboard: true
          }
        });

        messageId && await this.bot.deleteMessage(chatId, messageId);
      } else {
        this.bot.editMessageText(`Страница ${page}/${totalPages}\n\n${text}`, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [...elementButtons, paginationButtons, 
              ...(backButtonData ? [[{ text: 'Назад', callback_data: backButtonData }]] : [])],
            resize_keyboard: true
          }
        });
      }
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async openTaskList(chatId, data = 'tasks_page_1', messageId = null) {
    await this.generateList(
      chatId,
      data,
      messageId,
      this.taskRepository.getUserTasksRange.bind(this.taskRepository),
      'Список заданий пуст!',
      'Для достижения прогресса в обучении обязательно выполняйте задания. Мы сделали их максимально простыми. За выполнение заданий вы получаете внутренние очки',
      null,
      'task'
    );
  }

  async openLessonList(chatId, data, messageId, typeId) {
    await this.generateList(
        chatId,
        data,
        messageId,
        this.lessonRepository.getUserLessonsRange.bind(this.lessonRepository),
        'Скоро...',
        'После изучения уроков вы получите доступ к цифровой экономике, сможете быстро и безопасно обмениваться криптовалютой в Telegram на блокчейне TON',
        'back_lesson',
        'lesson',
        typeId
    );
  }
}

module.exports = UserHandler;