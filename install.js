const db = require('./api/db');

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
        ip TEXT NOT NULL,
        real_ip TEXT NOT NULL,
        port INTEGER NOT NULL,
        name TEXT NOT NULL,
        alias TEXT NOT NULL,
        players INTEGER NOT NULL,
        max_players INTEGER NOT NULL,
        gametype TEXT NOT NULL,
        map TEXT NOT NULL,
        created INTEGER NOT NULL,
        modified INTEGER NOT NULL
    )`
];


db.serialize(() =>{

    
    for(let i = 0; i < queries.length; i++){

        db.run(queries[i], (err) =>{

            if(err) console.trace(err);
        });
    }
});

