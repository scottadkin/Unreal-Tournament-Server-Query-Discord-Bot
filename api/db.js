const sqlite = require('sqlite3').verbose();
const config = require('./config.json');

const db = new sqlite.Database(config.databaseFile);

module.exports = db;