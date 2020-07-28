const config = require('./config.json');
const db = require('./db');

class Servers{

    constructor(db){

        this.db = db;
    }

    async addServer(message){

        try{

            const reg = /^.addserver (.+) ((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:(\d{1,5})|)|(.+?)(:(\d+)|))$/i;

            const result = reg.exec(message.content);

            if(result === null){

                message.channel.send(`${config.failIcon} Incorrect syntax for **addserver**`);
                return;

            }else{

                let port = 7777;
                let ip = 0;

                if(result[3] === undefined){

                    ip = dns.lookup(result[6], async (err, ipResult) =>{

                        if(err){
                            message.channel.send(`${config.failIcon} There is no matching ip for that domain address.`);
                            return;
                        }

                        /*if(ipResult === undefined){

                            message.channel.send(`${config.failIcon} There is no matching ip for that domain address.`);
                            return;
                        }*/

                        if(result[8] !== undefined){

                            if(result[8] !== ''){
                                port = parseInt(result[8]);
                            }
                        }

                        //console.log(await this.bServerAdded(ipResult));
                        //ip, realIp, alias, port

                        if(!await this.bServerAdded(ipResult, port)){

                            await this.insertServer(result[6], ipResult, result[1], port);
                            message.channel.send(`${config.passIcon} Server added successfully.`);

                        }else{
                            message.channel.send(`${config.failIcon} Server with that ip and port has already added to database.`);
                        }
                    });   

                }else{

                    ip = result[3];

                    if(result[5] !== undefined){
                        port = parseInt(result[5]);
                    }

                    if(!await this.bServerAdded(ip, port)){

                        await this.insertServer(ip, ip, result[1], port);
                        message.channel.send(`${config.passIcon} Server added successfully.`);

                    }else{
                        message.channel.send(`${config.failIcon} Server with that ip and port has already added to database.`);
                    }
                }
            }

        }catch(err){
            console.trace(err);
        }

    }

    bServerAdded(ip, port){

        return new Promise((resolve, reject) =>{

            const query = "SELECT COUNT(*) as total_servers FROM servers WHERE real_ip=? AND port=?";

            this.db.get(query, [ip, port], (err, row) =>{

                if(err) reject(err);

                if(row !== undefined){

                    if(row.total_servers > 0){
                        console.log(`Total servers = ${row.total_servers}`);
                        resolve(true);
                    }
                }
                resolve(false);
            });
        });
    }

    insertServer(ip, realIp, alias, port){

        console.log(`${ip}, ${realIp}, ${alias}, ${port}`);

        return new Promise((resolve, reject) =>{

            const now = Math.floor(Date.now() * 0.001);

            const query = "INSERT INTO servers VALUES(NULL,?,?,?,?,?,0,0,'N/A','N/A',?,?)";

            const vars = [
                ip, 
                realIp, 
                port, 
                "Another UT Server",
                alias,
                now,
                now
            ];

            this.db.run(query, vars, (err) =>{

                if(err) reject(err);

                resolve();
            });
        });
    }

    deleteServer(id){

        return new Promise((resolve, reject) =>{

            const query = "DELETE FROM servers WHERE id=?";

            this.db.run(query, [id], (err) =>{

                if(err) reject(err);

                resolve();
            });
        });
    }


    getAllServers(){

        return new Promise((resolve, reject) =>{

            const servers = [];

            const query = "SELECT * FROM servers ORDER BY created ASC";

            this.db.each(query, (err, row) =>{

                if(err) reject(err);

                servers.push(row);

            }, (err) =>{

                if(err) reject(err);

                resolve(servers);
            });
        });
    }



    async removeServer(message){

        try{

            const reg = /^.removeserver (\d+)$/i;

            const result = reg.exec(message.content);

            if(result !== null){

                const servers = await this.getAllServers();

                //console.table(servers);

                let id = parseInt(result[1]);

                if(id !== id){

                    message.channel.send(`${config.failIcon} Incorrect syntax for ${config.commandPrefix}removeserver, id must be a valid integer.`);
                    return;

                }else if(id > servers.length || id < 1){

                    message.channel.send(`${config.failIcon} There are no servers with the id ${id}`);
                    return;

                }

                id = id - 1;

                const s = servers[id];

                await this.deleteServer(s.id);

                message.channel.send(`${config.passIcon} Deleted server successfully.`);        

            }else{

                message.channel.send(`${config.failIcon} Incorrect syntax for ${config.commandPrefix}removeserver.`);
            }


        }catch(err){
            console.trace(err);
        }
    }


    updateInfo(data){

        return new Promise((resolve, reject) =>{

            const now = Math.floor(Date.now() * 0.001);

            const query = `UPDATE servers 
            SET name=?, players=?, max_players=?, gametype=?, map=?, modified=?
            WHERE real_ip=? AND port=?`;

            const vars = [data.name, data.currentPlayers, data.maxPlayers, data.gametype, data.mapName, now, data.ip, data.port];

            this.db.run(query, vars, (err) =>{

                if(err) reject(err);

                resolve();
            });
        });
    }

}


module.exports = Servers;