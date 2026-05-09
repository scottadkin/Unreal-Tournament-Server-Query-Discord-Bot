import Bot from "./api/bot.js";

new Bot();

process.on('unhandledRejection', (error) => {
	console.error('Unhandled promise rejection:', error);
});