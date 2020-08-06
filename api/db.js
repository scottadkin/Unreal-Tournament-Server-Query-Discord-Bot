const sqlite = require('sqlite3').verbose();
const config = require('./config.json');



class Database{

    constructor(){

        this.sqlite = new sqlite.Database(config.databaseFile, (err) =>{

            if(err) console.trace(err);
            
        });

    }
}


module.exports = Database;