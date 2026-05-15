import { passIcon, failIcon, commandPrefix, embedColor } from '../config/config.js';
import { sqliteGet, sqliteGetAll, sqliteRun } from './database.js';
import dns from 'node:dns';
import Channels, { getAutoQueryChannel } from './channels.js';
import { EmbedBuilder } from 'discord.js';
import { getIP4Address, forceStringLength } from './generic.js';

export default class Servers{

    constructor(){
        
        this.channels = new Channels();
    }

    async addServer(message, ut99AutoQuery){

        const reg = /^.addserver (.+) ((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:(\d{1,5})|)|(.+?)(:(\d+)|))$/i;

        const result = reg.exec(message.content);


        const embed = new EmbedBuilder().setColor(embedColor).setTitle(`Add Server`);

        if(result === null){

            embed.setDescription(
                `${failIcon} Incorrect syntax for **addserver**.\n
                Correct syntax is \`${commandPrefix}addserver serverAlias IP|Domain:port\`\n
                If port is not specified the port will be set to 7777.\n
                **Examples:**
                ${commandPrefix}addserver example 1.2.3.4
                ${commandPrefix}addserver example 1.2.3.4:7777
                ${commandPrefix}addserver example example.com
                ${commandPrefix}addserver example example.com:7777`
            );

            return message.channel.send({"embeds": [embed]});
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
                    await message.channel.send(`${passIcon} Server added successfully.`);

                    if(ut99AutoQuery.autoQueryLoop !== null){

                        const newMessage = await ut99AutoQuery.addServerToAutoQuery(result[6], address, port);

                        setServerLastMessageId(address, port, newMessage.id);
                        ut99AutoQuery.restartAutoQueryLoop();
                    }

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
                await message.channel.send(`${passIcon} Server added successfully.`);

                if(ut99AutoQuery.autoQueryLoop !== null){
                    
                    const newMessage = await ut99AutoQuery.addServerToAutoQuery(ip, ip, port);

                    setServerLastMessageId(ip, port, newMessage.id);
                    ut99AutoQuery.restartAutoQueryLoop();
                }

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

    deleteServerFromDatabase(id){

        const query = "DELETE FROM servers WHERE id=?";
        return sqliteRun(query, [id]);
    }


    getAllActiveServers(){
        return sqliteGetAll(`SELECT * FROM servers WHERE players>0 ORDER BY created ASC`);
    }


    async deleteServer(message, ut99AutoQuery){

        const reg = /^.deleteserver (\d+)$/i;

        const result = reg.exec(message.content);

        if(result === null){


            return message.channel.send(`${failIcon} Incorrect syntax for ${commandPrefix}deleteserver.`);
        }

      
        const servers = getAllServers();

        let id = parseInt(result[1]);

        if(id !== id){

            return message.channel.send(`${failIcon} Incorrect syntax for ${commandPrefix}deleteserver, id must be a valid integer.`);
            
        }else if(id > servers.length || id < 1){

            return message.channel.send(`${failIcon} There are no servers with the id ${id}`);
        }

        id = id - 1;

        const s = servers[id];

        if(s.last_message !== "-1"){

            try{

                const autoMessage = await ut99AutoQuery.autoChannel.messages.fetch(s.last_message);

                await autoMessage.delete();

            }catch(err){
                //post may have been deleted by someone else or doesn't exist in the current channel
                console.trace(err);
            }

        }

        this.deleteServerFromDatabase(s.id);

        ut99AutoQuery.restartAutoQueryLoop();

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

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${flag} ${server.name}`);

        const fields = [];

        if(server.ip !== server.real_ip){

            fields.push({
                "name": "Domain Address",
                "value": `${server.ip}:${server.port}`,
                "inline": false
            });
        }

        fields.push({
                "name": "IP Address",
                "value": `${server.real_ip}:${server.port}`,
                "inline": false
            });

        embed.addFields(fields)

        return message.channel.send({"embeds": [embed]});
        
    }


    resetLastMessages(){

        const query = "UPDATE servers SET last_message=-1";

        return sqliteRun(query);
    }

    getServerById(id){


        const servers = getAllServers();

        id = parseInt(id);

        id--;

        if(servers[id] === undefined) return null;

        return servers[id];
            
       
    }

    editServerValue(ip, port, type, value){
        

        type = type.toLowerCase();


        const query = `UPDATE servers SET ${type}=? WHERE ip=? AND port=?`;

        if(type === 'country' && value === 'uk'){
            value = 'gb';
        }

        sqliteRun(query, [value, ip, port]);

        if(type !== 'country') return;

        const countryQuery = `UPDATE servers SET override_country=1 WHERE ip=? AND port=?`;

        sqliteRun(countryQuery, [ip, port]);
    }

    getServerByRealIpPort(realIp, port){


        const result = sqliteGet(`SELECT name,ip,real_ip,port,alias FROM servers WHERE real_ip=? AND port=?`, [realIp, port]);

        if(result === undefined){
            throw new Error("There was an issue getting server information by realIp and port");
        }

        return result;
    }

    changeServerAddress(serverRowId, newAddress, newRealIp, currentPort){

        const query = `UPDATE servers SET ip=?, real_ip=? WHERE id=?`;

        //need top check if same address and port already used

        if(this.bServerAdded(newRealIp, currentPort)){

            const duplicateServer = this.getServerByRealIpPort(newRealIp, currentPort);

            let errorMessage = `A server with that ip and port already exists as: `;

            errorMessage += `**${duplicateServer.alias}** ${duplicateServer.ip}:${duplicateServer.port}(${duplicateServer.real_ip})`;

            throw new Error(errorMessage);
        }

        sqliteRun(query, [newAddress, newRealIp, serverRowId]);
    }


    bCountryOverride(ip, port){

        const query = `SELECT override_country FROM servers WHERE ip=? AND port=?`;

        const result = sqliteGet(query, [ip, port]);
        
        if(result === undefined){
            //console.log(`TODO: Need to add support so domain names can get the correct country`);
            return false;
        }

        return result.override_country > 0;

    }
}

export function getAllServers(){

    const query = "SELECT * FROM servers ORDER BY created ASC";

    const result = sqliteGetAll(query);

    //set the current .q ids at this time
    for(let i = 0; i < result.length; i++){

        result[i].current_index = i + 1;
    }

    return result;
}

export function setServerLastMessageId(ip, port, id){

    const query = "UPDATE servers SET last_message=? WHERE real_ip=? AND port=?";
    return sqliteRun(query, [id, ip, port]);
}