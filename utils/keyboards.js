const commands = {
    statistics: 'Статистика',
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
            [commands.wallet, commands.add_ref,], [commands.library, commands.tasks], [commands.statistics]
        ], 
        resize_keyboard: true
    }
}

const adminKeyboard = {
    reply_markup: {
        keyboard: [
            [commands.wallet, commands.add_ref], [commands.tasks, commands.library], [commands.broadcast, commands.statistics]
        ], 
        resize_keyboard: true
    }
}

const tasksKeyboard = {
    inline_keyboard: [
      [
        { text: 'Задания', callback_data: `tasks` },
        { text: 'Архив', callback_data: `archive` }
      ]
    ],
    resize_keyboard: true
}

const lessonsKeyboard = {
    inline_keyboard: [
      [
        { text: 'Базовый курс', callback_data: `default_lessons` },
        { text: 'Расширенный курс', callback_data: `extended_lessons` }
      ]
    ],
    resize_keyboard: true
}

module.exports = {lessonsKeyboard, tasksKeyboard, authKeyboard, adminKeyboard, commands }; 