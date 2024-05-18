require('dotenv').config();
const TonWeb = require("tonweb");
const { tasksKeyboard, authKeyboard, adminKeyboard, commands } = require('../utils/keyboards');
const ErrorHandler = require('../utils/error.handler'); 

class UserHandler {
  constructor(bot, userRepository, adminId) {
    this.adminId = adminId;
    this.bot = bot;
    this.userRepository = userRepository;
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
          await this.processBroadcastMessage(chatId, messageText);
          break;
        default:
          // Handle other messages or ignore
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
      } else if (data == 'back') {
        await this.openTasks(chatId, callbackQuery.message.message_id);
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

      const keyboard = chatId.toString() === this.adminId ? adminKeyboard(wallet) : authKeyboard(wallet);

      this.bot.sendMessage(chatId, 'Добро пожаловать в бота!', keyboard);
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async addWallet(chatId) {
    this.clearUserState(chatId);
    this.bot.sendMessage(chatId, 'Введите свой кошелек!');
    this.userState[chatId] = 'addWallet';
  }

  async getUserWallet(chatId) {
    this.clearUserState(chatId);

    try {
      const user = await this.userRepository.getUserById(chatId);

      if (user[0]?.task_points !== null && user[0]?.lesson_points !== null && user[0]?.ref_points !== null) {
        const totalPoints = user[0]?.task_points + user[0]?.lesson_points + user[0]?.ref_points;
        const wallet = user[0]?.wallet ? user[0]?.wallet : 'не установлен.';

        this.bot.sendMessage(chatId, `Текущий кошелек:\n<code>${wallet}</code>\n\nВыполнение заданий: ${user[0].task_points}\nОткрытие уроков: ${user[0].lesson_points}\nПриглашение друзей: ${user[0].ref_points}\nВсего очков: ${totalPoints}`, { parse_mode: "HTML" });
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

      this.bot.sendMessage(chatId, `Перешлите данную ссылку другу:\n${refLink}\n\nОбщее количество рефералов: ${referrals.length}`);
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async sendBroadcastMessagePrompt(chatId) {
    this.clearUserState(chatId);
    this.bot.sendMessage(chatId, 'Введите сообщение для рассылки');
    this.userState[chatId] = 'broadcast';
  }

  async openLibrary(chatId) {
    this.bot.sendMessage(chatId, 'Текст уроков!');
  }

  async openTasks(chatId, messageId = null) {
    if (messageId) {
      this.bot.editMessageText('Выберите: ', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: tasksKeyboard
      });
    }else{
      this.bot.sendMessage(chatId, 'Выберите: ', {
        reply_markup: tasksKeyboard
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

      const keyboard = chatId.toString() === this.adminId ? adminKeyboard(wallet) : authKeyboard(wallet);
      this.bot.sendMessage(chatId, 'Кошелек успешно установлен!', keyboard);
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async processBroadcastMessage(chatId, message) {
    try {
      await this.broadcastMessage(message);
      this.clearUserState(chatId);
      this.bot.sendMessage(chatId, 'Рассылка прошла успешно!');
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async processTaskSelection(chatId, data, messageId) {
    const taskId = parseInt(data.split('_')[1], 10);
    try {
      const task = await this.userRepository.getTaskById(taskId);

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
            [{ text: 'Назад', callback_data: `back` }]
          ],
          resize_keyboard: true
        }
      });
    } catch (error) {
      ErrorHandler.handleError(error, chatId, this.bot);
    }
  }

  async processArchiveSelection(chatId, data, messageId) {
    const taskId = parseInt(data.split('_')[1], 10);
    try {
      const task = await this.userRepository.getTaskById(taskId);

      if (task.length === 0) {
        this.bot.sendMessage(chatId, 'Такого задания не существует!');
        return;
      }

      this.bot.editMessageText(task[0].text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Назад', callback_data: `back` }]
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
      const isAccept = await this.userRepository.acceptTask(chatId, taskId);

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
      reply_markup: { inline_keyboard: [[{ text: 'Да', callback_data: `confirm_${taskId}`}, { text: 'Нет', callback_data: 'back'}]] }
    })
  }

  async openArchiveList(chatId, messageId) {
    try {
      const tasks = await this.userRepository.getCompletedTasks(chatId);

      if (tasks.length === 0) {
        this.bot.editMessageText('Архив заданий пуст!', {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: 'Назад', callback_data: `back` }]] }
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
      const tasks = await this.userRepository.getUserTasks(chatId);

      if (tasks.length === 0) {
        this.bot.editMessageText('Список заданий пуст!', {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: 'Назад', callback_data: `back` }]] }
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

  async broadcastMessage(message) {
    try {
      const allUsers = await this.userRepository.getAllUsers();
      allUsers
        .filter(user => user.id.toString() !== this.adminId)
        .forEach(user => this.bot.sendMessage(user.id, message));
    } catch (error) {
      ErrorHandler.handleError(error, this.adminId, this.bot);
    }
  }

  clearUserState(chatId) {
    delete this.userState[chatId];
  }
}

module.exports = UserHandler;