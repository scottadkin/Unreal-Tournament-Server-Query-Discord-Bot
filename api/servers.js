import config from '../config/config.json' with {'type': 'json'};
import { sqliteGet, sqliteGetAll, sqliteRun } from './database.js';
import dns from 'node:dns';
import Channels from './channels.js';
import { EmbedBuilder } from 'discord.js';

export default class Servers{

    constructor(){
        
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

                        if(!this.bServerAdded(ipResult, port)){

                            this.insertServer(result[6], ipResult, result[1], port);
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

                    if(!this.bServerAdded(ip, port)){

                        this.insertServer(ip, ip, result[1], port);
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

        const query = "SELECT COUNT(id) as total_servers FROM servers WHERE real_ip=? AND port=?";

        const result = sqliteGet(query, [ip, port]);

        return result.total_servers > 0;
    
    }

    insertServer(ip, realIp, alias, port){

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

        return sqliteRun(query, vars);
    }

    deleteServer(id){

        const query = "DELETE FROM servers WHERE id=?";
        return sqliteRun(query, [id]);

    }


    getAllServers(){

        const query = "SELECT * FROM servers ORDER BY created ASC";

        return sqliteGetAll(query);
    }



    async removeServer(message){

        try{

            const reg = /^.removeserver (\d+)$/i;

            const result = reg.exec(message.content);

            if(result !== null){

                const servers = this.getAllServers();

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

        return sqliteRun(query, vars);
 
    }

    async updateInfo(data){

        try{

            const bCountryOverride = this.bCountryOverride(data.ip, data.port);

            //console.log(bCountryOverride);

            if(!bCountryOverride){
                this.updateQuery(data);
            }else{
                this.updateQuery(data, true);
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

    limitStringLength(input, limit, bSpecial){

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

    createServerString(id, server){

        const idLength = 2;
        const aliasLength = 25;
        const mapLength = 25;
        const playersLength = 7;

        const now = Math.floor(Date.now() * 0.001);
        const diff = now - server.modified;

        const serverId = this.limitStringLength(id, idLength);
        const alias = this.limitStringLength(server.alias, aliasLength);
        
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

        const map = this.limitStringLength(server.map, mapLength)+" ";
      
        const players = this.limitStringLength(playerString, playersLength, true);

        return `\`${serverId} - ${alias} ${map} ${players}\``;

    }

    sendNoServers(message, bOnlyActive){

        const title =  "Unreal Tournament Server List";

        const desc = (bOnlyActive) ? `There are currently no active servers.` : "There aren't any servers added to the bot.";

        const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`${(bOnlyActive) ? "Active" : ""} ${title}`)
        .setDescription(desc)
        .setTimestamp();

        return message.channel.send({"embeds": [embed]});
    }

    async listServers(message, bOnlyActive){

        try{

            const servers = this.getAllServers();

            console.log(servers);
            
            const maxPerBlock = config.maxServersPerBlock;

            if(servers.length !== 0){

                return this.sendNoServers(message, bOnlyActive);
            }



            /*let string = "";

            let currentBlockSize = 0;
            const serverBlocks = [];

            for(let i = 0; i < servers.length; i++){

                const s = servers[i];

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

            let title = "Unreal Tournament Server List";


            if(string !== ''){
                serverBlocks.push(string);
            }

            let fields = [];

            if(servers.length > 0){

                fields.push({
                    "name": this.createServerString("ID", {
                        "alias": "Alias",
                        "players": "Play",
                        "max_players": "ers",
                        "map": "Map"
                    }),
                    "value": serverBlocks[0],
                    "inline": false
                });

            }else{

                fields.push({
                    "name": serverBlocks[0],
                    "value": '\u200B',
                    "inline": false
                });
            }

            console.log(serverBlocks);

            if(serverBlocks.length === 1){

                fields.push({
                    "name": "Shorter server query command",
                    "value": `Type **${config.commandPrefix}q id** to query a server instead of ip:port.`,
                    "inline": false
                });
            }


            const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(title)
            .setFields(fields);

            
            await message.channel.send({ "embeds": [embed] });


            
            for(let i = 1; i < serverBlocks.length; i++){

                fields = [];


                for(let x = 0; x < serverBlocks.length; x++){

                    fields.push({
                        "name": serverBlocks[0],
                        "value": '\u200B',
                        "inline": false
                    });
                }
                
                const embed = new EmbedBuilder()
                .setColor(config.embedColor)
                .setFields(fields)
          

                if(i === serverBlocks.length - 1){
                    embed.addFields("Shorter server query command", `Type **${config.commandPrefix}q id** to query a server instead of ip:port.` ,false);
                }

                await message.channel.send({ embeds: [embed] });
            }*/

        }catch(err){
            console.trace(err);
        }
    }


    setLastMessageId(ip, port, id){

        const query = "UPDATE servers SET last_message=? WHERE real_ip=? AND port=?";
        return sqliteRun(query, [id, ip, port]);
    }


    resetLastMessages(){

        const query = "UPDATE servers SET last_message=-1";

        return sqliteRun(query);
    }

    async bValidServerId(id){

        try{

            id = parseInt(id);

            if(id !== id) throw new Error("Id must be a valid integer.");

            id--;

            if(id < 0) throw new Error("Id must be a positive integer.");

            const servers = this.getAllServers();

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

                const servers = this.getAllServers();

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
        
        const query = `UPDATE servers SET ${key}=? WHERE ip=? AND port=?`;

        if(key === 'country' && value === 'uk'){
            value = 'gb';
        }

        sqliteRun(query, [value, ip, port]);

        if(key !== 'country') return;

        const countryQuery = `UPDATE servers SET override_country=1 WHERE ip=? AND port=?`;

        sqliteRun(countryQuery, [ip, port]);
    }

    bCountryOverride(ip, port){

        const query = `SELECT override_country FROM servers WHERE ip=? AND port=?`;

        const result = sqliteGet(query, [ip, port]);
        
        if(result === undefined){
            console.log(`TODO: Need to add support so domain names can get the correct country`);
            return false;
        }

        return result.override_country > 0;

    }

    

}
