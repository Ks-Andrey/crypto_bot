const commands = {
    statistics: 'Рейтинг',
    wallet: 'Профиль', 
    add_ref: 'Пригласить друзей',
    broadcast: 'Сделать рассылку',
    add_wallet: 'Добавить кошелек',
    library: 'Библиотека',
    tasks: 'Задания',
};

const authKeyboard = {
    reply_markup: {
        keyboard: [
            [commands.wallet, commands.add_ref,], [commands.statistics, commands.tasks], [commands.library]
        ], 
        resize_keyboard: true
    }
}

const adminKeyboard = {
    reply_markup: {
        keyboard: [
            [commands.wallet, commands.add_ref], [commands.tasks, commands.statistics], [commands.broadcast, commands.library]
        ], 
        resize_keyboard: true
    }
}

const tasksKeyboard = {
    inline_keyboard: [
      [
        { text: 'Архив', callback_data: `archive` },
        { text: 'Задания', callback_data: `tasks` }
      ]
    ],
    resize_keyboard: true
}

const lessonsKeyboard = {
    inline_keyboard: [
      [
        { text: 'Расширенный курс', callback_data: `extended_lessons` },
        { text: 'Базовый курс', callback_data: `default_lessons` }
      ]
    ],
    resize_keyboard: true
}

module.exports = {lessonsKeyboard, tasksKeyboard, authKeyboard, adminKeyboard, commands }; 