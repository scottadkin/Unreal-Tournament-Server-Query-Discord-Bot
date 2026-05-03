import sqlite from 'node:sqlite';
import config from '../config/config.json' with {'type': 'json'};
import { DatabaseSync } from 'node:sqlite';
const database = new DatabaseSync(config.databaseFile);


export function createTable(query){

    const prepare = database.prepare(query);
    const result = prepare.run();
}

export function sqliteGet(query, vars){

    const prepare = database.prepare(query);

    if(vars !== undefined){
        return prepare.get(vars);
    }else{
        return prepare.get();
    }
}