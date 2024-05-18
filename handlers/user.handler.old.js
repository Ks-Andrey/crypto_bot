require('dotenv').config();
const TonWeb = require("tonweb");
const { startKeyboard, authKeyboard, adminKeyboard, commands } = require('../utils/keyboards');

class UserHandler {
  constructor(bot, userRepository, adminId) {
    this.adminId = adminId;
    this.bot = bot;
    this.userRepository = userRepository;

    this.userState = {};

    this.bot.on('message', this.listenWallet);
    this.bot.on('message', this.listenMessage);

    this.handlerInlineKeyboard();
  }

  async StartMessage(msg) {
    try {
      const chatId = msg.chat.id;
      const name = msg.from.username;
      const refferalCode = msg.text.includes(' ') ? msg.text.split(' ')[1] : this.adminId;

      this.сlearState(chatId);

      const user = await this.userRepository.getUserById(chatId);
      if (user.length === 0) {
        await this.userRepository.addUser(chatId, name, '', refferalCode);
      }

      if (user.length == 0 || user[0].wallet == '' || !user[0].wallet) {
        this.bot.sendMessage(chatId, 'Добро пожаловать в бота!', startKeyboard)
      } else {
        this.bot.sendMessage(chatId, 'Добро пожаловать в бота!', user[0]?.id == this.adminId ? adminKeyboard : authKeyboard)
      }

    } catch (error) {
      console.error('Error handling StartMessage:', error);
      this.bot.sendMessage(chatId, error.message);
    }
  }

  async AddWallet(chatId) {
    try {
      this.сlearState(chatId);

      this.bot.sendMessage(chatId, 'Введите свой кошелек!');

      this.userState[chatId] = 'addWallet';
    } catch (error) {
      console.error('Error handling AddWallet:', error);
      this.bot.sendMessage(chatId, error.message);
    }
  }

  async GetUserWallet(chatId) {
    try {
      this.сlearState(chatId);

      const user = await this.userRepository.getUserById(chatId);
      if (user[0]?.wallet) {
        const wallet = user[0].wallet;

        this.bot.sendMessage(chatId, `Текущий кошелек:\n<code>${wallet}</code>`, { parse_mode: "HTML" });
      } else {
        this.bot.sendMessage(chatId, 'Ошибка получения кошелька.');
      }
    } catch (error) {
      console.error('Error handling GetUserWallet:', error);
      this.bot.sendMessage(chatId, error.message);
    }
  }

  async GetReferralLink(chatId) {
    try {
      this.сlearState(chatId);

      const botLink = process.env.BOT_REF_LINK;

      const refLink = `${botLink}?start=${chatId}`;
      const referrals = await this.userRepository.getUserReferrals(chatId)

      this.bot.sendMessage(chatId, `Перешлите данную ссылку другу:\n${refLink}\n\nОбщее количество рефералов: ${referrals.length}`);
    } catch (error) {
      console.error('Error handling GetReferralLink:', error);
      this.bot.sendMessage(chatId, error.message);
    }
  }

  async SendBroadcastMessage(chatId) {
    try {
      this.сlearState(chatId);

      this.bot.sendMessage(chatId, 'Введите сообщение для рассылки');

      this.userState[chatId] = 'broadcast';
    } catch (error) {
      console.error('Error handling SendBroadcastMessage:', error);
      this.bot.sendMessage(chatId, error.message);
    }
  }

  async OpenLibrary(chatId) {
    this.bot.sendMessage(chatId, 'Текст уроков!');
  }

  async OpenTasks(chatId) {
    const tasks = await this.userRepository.getAllTasks();

    if (tasks.length === 0) {
      this.bot.sendMessage(chatId, 'Список заданий пуст!');
      return;
    }

    const taskButtons = tasks.map(({id, name}) => {
      return [{ text: name, callback_data: `task_${id}` }];
    });

    this.bot.sendMessage(chatId, 'Список заданий:', {
      reply_markup: {
        inline_keyboard: taskButtons,
        resize_keyboard: true
      }
    });
  }

  listenWallet = async msg => {
    const chatId = msg.chat.id;
    const wallet = msg.text;

    try {
      if (Object.values(commands).some(command => command == msg.text)) return;

      if (this.userState[chatId] == 'addWallet') {
        if (!TonWeb.utils.Address.isValid(wallet)) {
          this.bot.sendMessage(chatId, 'Неверный формат кошелька, попробуйте еще раз!');
          return;
        }

        await this.userRepository.updateUserWallet(chatId, wallet);
        delete this.userState[chatId];

        await this.bot.sendMessage(chatId, 'Кошелек успешно установлен!', chatId == this.adminId ? adminKeyboard : authKeyboard);
      }
    } catch (error) {
      this.bot.sendMessage(chatId, `Ошибка: ${error?.detail || error?.message}`);
    }
  }

  listenMessage = async msg => {
    const chatId = msg.chat.id;
    const message = msg.text;

    try {
      if (Object.values(commands).some(command => command == msg.text)) return;

      if (this.userState[chatId] == 'broadcast') {
        await this.sendBroadcastMessage(message);
        delete this.userState[chatId];

        await this.bot.sendMessage(chatId, 'Рассылка прошла успешно!');
      }
    } catch (error) {
      this.bot.sendMessage(chatId, `Ошибка: ${error?.message}`);
    }
  }

  async sendBroadcastMessage(message) {
    try {
      const allUsers = await this.userRepository.getAllUsers();
      allUsers.filter(({ id }) => id != this.adminId).forEach(({ id }) => {
        this.bot.sendMessage(id, message);
      });
    } catch (error) {
      console.error('Error sending broadcast message:', error);
      this.bot.sendMessage(this.adminChatId, error.message);
    }
  }

  handlerInlineKeyboard() {
    this.bot.on('callback_query', async (callbackQuery) => {
      const message = callbackQuery.message;
      const chatId = message.chat.id;
      const data = callbackQuery.data;

      if (data.startsWith('task_')) {
        const taskId = parseInt(data.split('_')[1], 10);
        const task = await this.userRepository.getTaskById(taskId);

        if (task.length === 0) {
          this.bot.sendMessage(chatId, 'Такого задания не существует!');
          return;
        }

        this.bot.editMessageText(task[0].text, {
          chat_id: chatId,
          message_id: message.message_id,
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Выполнено!', callback_data: `done_${task[0].id}` }]
            ],
            resize_keyboard: true
          }
        });
      } else if (data.startsWith('done_')) {
        this.bot.editMessageText(`Задание отправлено на проверку.`, {
          chat_id: chatId,
          message_id: message.message_id
        });
      }
    });
  }

  сlearState(chatId) {
    try {
      delete this.userState[chatId];
    } catch (error) {
      console.error('Error clearing user state:', error);
    }
  }
}

module.exports = UserHandler;