import sqlite from 'node:sqlite';
import { databaseFile } from '../config/config';
import { DatabaseSync } from 'node:sqlite';
const database = new DatabaseSync(databaseFile);


export function createTable(query){

    const prepare = database.prepare(query);
    const result = prepare.run();
}

export function sqliteGet(query, vars){

    const prepare = database.prepare(query);

    if(vars !== undefined){
        return prepare.get(...vars);
    }else{
        return prepare.get();
    }
}


export function sqliteRun(query, vars){

    const prepare = database.prepare(query);

    if(vars !== undefined){
        return prepare.run(...vars);
    }else{
        return prepare.run();
    }
}

export function sqliteGetAll(query, vars){

    const prepare = database.prepare(query);

    let result = [];

    if(vars !== undefined){
        result = prepare.all(...vars);
    }else{
        result = prepare.all();
    }

    return result;
}