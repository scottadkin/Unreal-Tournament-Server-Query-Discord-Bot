const Database = require('./api/db');
let db = new Database();
db = db.sqlite;

const queries = [
    `CREATE TABLE IF NOT EXISTS roles(
        id TEXT NOT NULL,
        added INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS channels(
        id TEXT NOT NULL,
        added INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS servers(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL,
        real_ip TEXT NOT NULL,
        port INTEGER NOT NULL,
        country TEXT NOT NULL,
        name TEXT NOT NULL,
        alias TEXT NOT NULL,
        players INTEGER NOT NULL,
        max_players INTEGER NOT NULL,
        gametype TEXT NOT NULL,
        map TEXT NOT NULL,
        created INTEGER NOT NULL,
        modified INTEGER NOT NULL,
        last_message TEXT NOT NULL,
        override_country INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS auto_query(
        id TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS auto_query_info(
        id TEXT NOT NULL
    )`

];


db.serialize(() =>{

    
    for(let i = 0; i < queries.length; i++){

        db.run(queries[i], (err) =>{

            if(err) console.trace(err);
        });
    }
});

console.log("Database install completed.");

