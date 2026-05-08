import { passIcon, failIcon, commandPrefix, serverInfoPingInterval, embedColor, maxServersPerBlock } from '../config/config.js';
import { sqliteGet, sqliteGetAll, sqliteRun } from './database.js';
import dns from 'node:dns';
import Channels from './channels.js';
import { EmbedBuilder } from 'discord.js';
import { getIP4Address } from './generic.js';

export default class Servers{

    constructor(){
        
        this.channels = new Channels();
    }

    async addServer(message){

        const reg = /^.addserver (.+) ((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:(\d{1,5})|)|(.+?)(:(\d+)|))$/i;

        const result = reg.exec(message.content);

        if(result === null){
            return message.channel.send(`${failIcon} Incorrect syntax for **addserver**`);
        }

        let port = 7777;
        let ip = 0;

        if(result[3] === undefined){

            try{

                const address = await getIP4Address(result[6]);

                if(result[8] !== undefined){

                    if(result[8] !== ''){
                        port = parseInt(result[8]);
                    }
                }

                if(!this.bServerAdded(address, port)){

                    this.insertServer(result[6], address, result[1], port);
                    return message.channel.send(`${passIcon} Server added successfully.`);

                }else{
                    return message.channel.send(`${failIcon} Server with that ip and port has already added to database.`);
                }

            }catch(err){
                return message.channel.send(`${failIcon} ${err.message}`);
            }

 

        }else{

            ip = result[3];

            if(result[5] !== undefined){
                port = parseInt(result[5]);
            }

            if(!this.bServerAdded(ip, port)){

                this.insertServer(ip, ip, result[1], port);
                return message.channel.send(`${passIcon} Server added successfully.`);

            }else{
                return message.channel.send(`${failIcon} Server with that ip and port has already added to database.`);
            }
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


    getAllActiveServers(){
        return sqliteGetAll(`SELECT * FROM servers WHERE players>0 ORDER BY created ASC`);
    }

    getAllServers(){

        const query = "SELECT * FROM servers ORDER BY created ASC";

        return sqliteGetAll(query);
    }



    removeServer(message){

        const reg = /^.removeserver (\d+)$/i;

        const result = reg.exec(message.content);

        if(result === null){

            return message.channel.send(`${failIcon} Incorrect syntax for ${commandPrefix}removeserver.`);
        }

      
        const servers = this.getAllServers();

        let id = parseInt(result[1]);

        if(id !== id){

            return message.channel.send(`${failIcon} Incorrect syntax for ${commandPrefix}removeserver, id must be a valid integer.`);
            
        }else if(id > servers.length || id < 1){

            return message.channel.send(`${failIcon} There are no servers with the id ${id}`);
        }

        id = id - 1;

        const s = servers[id];

        this.deleteServer(s.id);

        return message.channel.send(`${passIcon} Deleted server successfully.`);        
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

        console.log("UPDATEINFO", data.ip, data.port);

        return sqliteRun(query, vars);
 
    }

    updateInfo(data){

        const bCountryOverride = this.bCountryOverride(data.ip, data.port);

        if(!bCountryOverride){
            this.updateQuery(data);
        }else{
            this.updateQuery(data, true);
        }
    }


    getIp(message){

        const reg = /^.ip(\d+)$/i;

        const result = reg.exec(message.content);

        if(result === null){
            return message.channel.send(`${failIcon} Incorrect syntax for ${commandPrefix}ip command.`);
        }
        const server = this.getServerById(result[1]);

        if(server === null){
            return message.channel.send(`${failIcon} A server with that id does not exist.`);
        }

        let flag = server.country;

        if(flag == '' || flag == 'none'){
            flag = ':video_game:';
        }else{
            flag = `:flag_${flag.toLowerCase()}:`;
        }

        let string = `${flag} **${server.name}**\n**unreal://${server.ip}:${server.port}**`;

        return message.channel.send(string);
        
    }

    forceStringLength(input, limit, bSpecial){

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

        const serverId = this.forceStringLength(id, idLength);
        const alias = this.forceStringLength(server.alias, aliasLength);
        
        let playerString = "";

        if(server.max_players == "ers"){
            playerString = "Players";
        }else{
            playerString = server.players+"/"+server.max_players;
        }

        if(diff >= serverInfoPingInterval * 2 && server.modified !== undefined){
            server.map = "Timed Out!";
            playerString = "N/A";
        }

        const map = this.forceStringLength(server.map, mapLength)+" ";
      
        const players = this.forceStringLength(playerString, playersLength, true);

        return `\`${serverId} - ${alias} ${map} ${players}\``;

    }

    sendNoServers(message, bOnlyActive){

        const title =  "Unreal Tournament Server List";

        const desc = (bOnlyActive) ? `There are currently no active servers.` : "There aren't any servers added to the bot.";

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${(bOnlyActive) ? "Active" : ""} ${title}`)
        .setDescription(desc)
        .setTimestamp();

        return message.channel.send({"embeds": [embed]});
    }


    createServerListParts(servers){

        const parts = [];

        let desc = this.createServerString("ID", {"alias": "Alias", "map": "Map", "players": 0, "max_players": "ers"}, );
        desc += `\n`;

        let currentCount = 0;

        for(let i = 0; i < servers.length; i++){

            const s = servers[i];

            desc += this.createServerString(i + 1, s);
            if(i < servers.length - 1) desc += `\n`;

            currentCount++;

            if(currentCount >= maxServersPerBlock){
                currentCount = 0;
                parts.push(desc);
                desc = ``;
            }
        }

        if(parts.length === 0){
            parts.push(desc);
        }else if(desc !== ""){
            parts.push(desc);
        }

        return parts;
    }

    async listServers(message, bOnlyActive){

        const servers = (bOnlyActive) ? this.getAllActiveServers() : this.getAllServers();

        if(servers.length === 0){
            return this.sendNoServers(message, bOnlyActive);
        }

        const parts = this.createServerListParts(servers);

        const infoField = {
            "name": "Shorter server query command",
            "value": `Type **${commandPrefix}q id** to query a server instead of ip:port.`,
            "inline": false
        };

        for(let i = 0; i < parts.length; i++){

            const embed = new EmbedBuilder().setColor(embedColor);

            if(i === 0){
                embed.setTitle(`:desktop: ${(bOnlyActive) ? "Active" : ""} UT Servers List`);
            }

            embed.setDescription(parts[i]);

            if(i === parts.length - 1){

                embed.addFields([infoField]).setTimestamp();
            }

            message.channel.send({embeds: [embed]});
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

        id = parseInt(id);

        if(id !== id) throw new Error("Id must be a valid integer.");

        id--;

        if(id < 0) throw new Error("Id must be a positive integer.");

        const servers = this.getAllServers();

        if(id < servers.length){

            return true;
        }

        return false;

    }

    getServerById(id){

        if(this.bValidServerId(id)){

            const servers = this.getAllServers();

            id = parseInt(id);

            id--;

            return servers[id];
            
        }else{
            return null;
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
