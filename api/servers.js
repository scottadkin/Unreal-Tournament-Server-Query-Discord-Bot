const config = require('./config.json');
const Database = require('./db');
const dns = require('dns');
//const Discord = require('discord.js');
const Channels = require('./channels');

class Servers{

    constructor(){

        this.db = new Database();
        this.db = this.db.sqlite;
        
        this.channels = new Channels();
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
                        //console.log(`Total servers = ${row.total_servers}`);
                        resolve(true);
                    }
                }
                resolve(false);
            });
        });
    }

    insertServer(ip, realIp, alias, port){

        //console.log(`${ip}, ${realIp}, ${alias}, ${port}`);

        return new Promise((resolve, reject) =>{

            const now = Math.floor(Date.now() * 0.001);

            const query = "INSERT INTO servers VALUES(NULL,?,?,?,?,'None',?,0,0,'N/A','N/A',?,?,-1,0)";

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


    updateQuery(data, bAlt){

        return new Promise((resolve, reject) =>{

            const now = Math.floor(Date.now() * 0.001);

            let query = `UPDATE servers 
            SET name=?, country=?, players=?, max_players=?, gametype=?, map=?, modified=?
            WHERE real_ip=? AND port=?`;


            let vars = [];
            

            if(bAlt !== undefined){

                query = `UPDATE servers 
                SET name=?, players=?, max_players=?, gametype=?, map=?, modified=?
                WHERE real_ip=? AND port=?`;

                vars = [data.name, data.currentPlayers, data.maxPlayers, data.gametype, data.mapName, now, data.ip, data.port];
                
            }else{

                let country = "";

                if(data.country != undefined){

                    if(data.country != '' && data.country != "none"){
                        country = data.country;
                    }
                }
            
                vars = [data.name, country, data.currentPlayers, data.maxPlayers, data.gametype, data.mapName, now, data.ip, data.port];
            }

                 
            this.db.run(query, vars, (err) =>{

                if(err){
                   // console.log(vars);
                    reject(err);
                }

                resolve();
            });
        });

    }

    async updateInfo(data){

        try{

            const bCountryOverride = await this.bCountryOverride(data.ip, data.port);

            //console.log(bCountryOverride);

            if(!bCountryOverride){
                await this.updateQuery(data);
            }else{
                await this.updateQuery(data, true);
            }

        }catch(err){
            console.trace(err);
        }
        
    }


    async getIp(message){

        try{

            const reg = /^.ip(\d+)$/i;

            const result = reg.exec(message.content);

            if(result !== null){

                const server = await this.getServerById(result[1]);


                if(server === null){

                   // throw new Error("");
                    message.channel.send(`${config.failIcon} A server with that id does not exist.`);
                    return;

                }else{

                    let flag = server.country;

                    if(flag == '' || flag == 'none'){
                        flag = ':video_game:';
                    }else{
                        flag = `:flag_${flag.toLowerCase()}:`;
                    }

                    flag = `${flag} `;

                    let string = `${flag}**${server.name}**\n**<unreal://${server.ip}:${server.port}>**`;

                    message.channel.send(string);
                    
                }

            }else{
                message.channel.send(`${config.failIcon} Incorrect syntax for ${config.commandPrefix}ip command.`);
            }



        }catch(err){
            console.trace(err);
        }
    }


    createServerString(id, server){

        const idLength = 2;
        const aliasLength = 25;
        const mapLength = 25;
        const playersLength = 7;

        const now = Math.floor(Date.now() * 0.001);
        const diff = now - server.modified;

        

        const fixValue = (input, limit, bSpecial) =>{

            input = input.toString();

            if(input.length > limit){
                input = input.substring(0, limit);
            }

            while(input.length < limit){

                if(bSpecial === undefined){
                    input += " ";
                }else{
                    input = " "+input;
                }
           
            }

            return input;
        }


        let serverId = fixValue(id, idLength);
        let alias = fixValue(server.alias, aliasLength);
        

        let playerString = "";

        if(server.max_players == "ers"){
            playerString = "Players";
        }else{
            playerString = server.players+"/"+server.max_players;
        }

        if(diff >= config.serverInfoPingInterval * 2 && server.modified !== undefined){
            server.map = "Timed Out!";
            playerString = "N/A";
        }

        let map = fixValue(server.map, mapLength)+" ";
      

        let players = fixValue(playerString, playersLength, true);

        let string = `\`${serverId} - ${alias} ${map} ${players}\``;

        return string;
    }


    async listServers(Discord, message, bOnlyActive){

        try{

            const servers = await this.getAllServers();
            
            const maxPerBlock = config.maxServersPerBlock;

            let string = "";

            let s = 0;

           // let currentBlock = '';
            let currentBlockSize = 0;
            const serverBlocks = [];

            for(let i = 0; i < servers.length; i++){

                s = servers[i];

                if(currentBlockSize >= maxPerBlock){
                    serverBlocks.push(string);
                    currentBlockSize = 0;
                    string = '';
                }

                if(bOnlyActive === undefined){
                    currentBlockSize++;
                    string += this.createServerString(i + 1, s)+"\n";
                }else{

                    if(s.players > 0){
                        currentBlockSize++;
                        string += this.createServerString(i + 1, s)+"\n";
                    }
                }
                
            }

            

            let embed = new Discord.MessageEmbed();

            let title = "Unreal Tournament Server List";

            if(bOnlyActive !== undefined){

                title = "Active Unreal Tournament Server List";

                if(string == "" && serverBlocks.length === 0){
                    string = "There are currently no active servers.";
                }

            }else{

                if(string == "" && serverBlocks.length === 0){
                    string = "There are currently no servers added.";
                }
            }

            if(string !== ''){
                serverBlocks.push(string);
            }

           // console.log(serverBlocks);

            embed.setColor(config.embedColor)
            .setTitle(title)

            if(servers.length > 0){
                embed.addField(this.createServerString("ID", {
                    "alias": "Alias",
                    "players": "Play",
                    "max_players": "ers",
                    "map": "Map"

                }), serverBlocks[0] ,false);
            }else{
                embed.addField(serverBlocks[0], '\u200B',false);
            }

            if(serverBlocks.length == 1){
                embed.addField("Shorter server query command", `Type **${config.commandPrefix}q id** to query a server instead of ip:port.` ,false);
            }
            
            await message.channel.send(embed);

            for(let i = 1; i < serverBlocks.length; i++){

                embed = new Discord.MessageEmbed()
                .setColor(config.embedColor)
                .setDescription(serverBlocks[i]);

                if(i === serverBlocks.length - 1){
                    embed.addField("Shorter server query command", `Type **${config.commandPrefix}q id** to query a server instead of ip:port.` ,false);
                }

                await message.channel.send(embed);
            }

        }catch(err){
            console.trace(err);
        }
    }


    setLastMessageId(ip, port, id){

        return new Promise((resolve, reject) =>{

            const query = "UPDATE servers SET last_message=? WHERE real_ip=? AND port=?";

            this.db.run(query, [id, ip, port], (err) =>{

                if(err) reject(err);

               // console.log(`Set message_id = ${id} WHERE address is ${ip}:${port}`);
                resolve();
            });
        });
    }


    resetLastMessages(){

        return new Promise((resolve, reject) =>{

            const query = "UPDATE servers SET last_message=-1";

            this.db.run(query, (err) =>{

                if(err) reject(err);

                resolve();
            });
        });
    }

    async bValidServerId(id){

        try{

            id = parseInt(id);

            if(id !== id) throw new Error("Id must be a valid integer.");

            id--;

            if(id < 0) throw new Error("Id must be a positive integer.");

            const servers = await this.getAllServers();

            if(id < servers.length){

                return true;
            }

            return false;

        }catch(err){
            console.trace(err);
        }

    }

    async getServerById(id){

        try{

            if(await this.bValidServerId(id)){

                const servers = await this.getAllServers();

                id = parseInt(id);

                id--;

                return servers[id];
                
            }else{
                return null;
            }

        }catch(err){
            console.trace(err);
        }
    }

    editServerValue(ip, port, key, value){
        
        return new Promise((resolve, reject) =>{

            const query = `UPDATE servers SET ${key}=? WHERE ip=? AND port=?`;

            if(key === 'country' && value === 'uk'){
                value = 'gb';
            }

            this.db.run(query, [value, ip, port], (err) =>{

                if(err) reject(err);

                if(key === 'country'){

                    const countryQuery = `UPDATE servers SET override_country=1 WHERE ip=? AND port=?`;

                    this.db.run(countryQuery, [ip, port], (err) =>{

                        if(err) reject(err);

                        resolve();
                    });

                }else{
                    resolve();
                }
            });
        });
    }

    bCountryOverride(ip, port){

        return new Promise((resolve, reject) =>{

            const query = `SELECT override_country FROM servers WHERE ip=? AND port=?`;

            this.db.get(query, [ip, port], (err, result) =>{

                if(err) reject(err);

                if(result !== undefined){
                    if(result.override_country > 0) resolve(true);
                    
                }
                
                resolve(false);
                
            });
        });
    }

    

}


module.exports = Servers;