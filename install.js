const db = require('./api/db');

const queries = [
    `CREATE TABLE IF NOT EXISTS roles(
        name TEXT NOT NULL,
        added INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS channels(
        name TEXT NOT NULL,
        added INTEGER NOT NULL
    )`
];


db.serialize(() =>{

    
    for(let i = 0; i < queries.length; i++){

        db.run(queries[i], (err) =>{

            if(err) console.trace(err);
        });
    }
});

