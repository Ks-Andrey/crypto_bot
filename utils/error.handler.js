class ErrorHandler {
    static handleError(error, chatId, bot) {
        console.error('Error:', error);
        
        let errorMessage = 'Произошла ошибка. Попробуйте позже.';

        if (error?.code) {
            switch (error.code) {
                case 'P0001':
                    errorMessage = 'Такой адрес уже используется другим участником. Введите новый кошелек:';
                    break;
                case 'P0002':
                    errorMessage = 'Пользователь не существует';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
                    break;
            }
        }

        bot.sendMessage(chatId, errorMessage);
    }
}

module.exports = ErrorHandler;
