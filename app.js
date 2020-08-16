const Bot = require('./api/bot.js');

new Bot();


/*setInterval(() =>{

    //console.log(process.memoryUsage());

    const toMb = (input) =>{

        return `${(input / 1024 / 1024).toFixed(2)}MB`;
    }

    const m = process.memoryUsage();

    console.clear();
    console.log(`RSS ${toMb(m.rss)} heapTotal ${toMb(m.heapTotal)} heapUsed ${toMb(m.heapUsed)} external ${toMb(m.external)}`);

}, 1000);*/