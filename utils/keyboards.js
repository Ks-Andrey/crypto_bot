const commands = {
    wallet: 'Профиль', 
    change_wallet: 'Изменить кошелек', 
    add_ref: 'Пригласить друзей',
    broadcast: 'Сделать рассылку',
    add_wallet: 'Добавить кошелек',
    library: 'Библиотека',
    tasks: 'Задания'
};

const authKeyboard = (wallet) => {
    return {
        reply_markup: {
            keyboard: [
                [commands.wallet, wallet ? commands.change_wallet : commands.add_wallet], [commands.add_ref, commands.library], [commands.tasks]
            ], 
            resize_keyboard: true
        }
    }
}

const adminKeyboard = (wallet) => {
    return {
        reply_markup: {
            keyboard: [
                [commands.wallet, wallet ? commands.change_wallet : commands.add_wallet], [commands.add_ref, commands.library], [commands.broadcast], [commands.tasks]
            ], 
            resize_keyboard: true
        }
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

module.exports = {tasksKeyboard, authKeyboard, adminKeyboard, commands }; 