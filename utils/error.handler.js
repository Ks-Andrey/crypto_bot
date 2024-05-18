class ErrorHandler {
    static handleError(error, chatId, bot) {
        console.error('Error:', error);
        const errorMessage = error?.message || 'Произошла ошибка. Попробуйте позже.';
        bot.sendMessage(chatId, `Ошибка: ${errorMessage}`);
    }
}

module.exports = ErrorHandler;
