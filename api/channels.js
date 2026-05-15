import { failIcon, passIcon, embedColor, autoQueryInterval } from '../config/config.js';
import { sqliteGet, sqliteRun, sqliteGetAll } from './database.js';
import { EmbedBuilder } from 'discord.js';
import { getAllServers, setServerLastMessageId } from './servers.js';

export default class Channels{

    constructor(){

    }

    bBotCanCommentInChannel(message){

        const query = "SELECT COUNT(*) as total_channels from channels WHERE id=?";

        const result = sqliteGet(query, [message.channel.id]);

        return result.total_channels > 0;
    }

    bChannelExist(message, channelId){

        const channels = message.guild.channels.cache;

        for(let i = 0; i < channels.size; i++){

            const c = channels.at(i);

            if(c.id == channelId){
                return true;
            }
        }

        return false;
    }

    bChannelAdded(id){

        const query = "SELECT COUNT(*) as total_channels FROM channels WHERE id=?";
        const result = sqliteGet(query, [id]);
        return result.total_channels > 0;        
    }

    insertChannel(id){

        const query = "INSERT INTO channels VALUES(?,?)";

        const now = Math.floor(Date.now() * 0.001);

        return sqliteRun(query, [id, now]);
    }

    allowChannel(message){

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`Allow Channel`);

        if(!this.bChannelExist(message, message.channelId)){

            embed.setDescription(`${failIcon} There is no channel called **${message.channel.name}** in this server.`);
            return message.channel.send({"embeds": [embed]});
        }
   
        const exists = this.bChannelAdded(message.channel.id);

        if(!exists){

            this.insertChannel(message.channel.id);

            embed.setDescription(`${passIcon} The bot can now be used in this channel.`);

            return message.channel.send({"embeds": [embed]});
        
        }else{

            embed.setDescription(`${failIcon} This channel has already been enabled for bot use.`);
            
            return message.channel.send({"embeds": [embed]});
        }
    }


    deleteChannel(id){

        const query = "DELETE FROM channels WHERE id=?";

        return sqliteRun(query, [id]);
    }

    blockChannel(message){

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`Block Channel`);

        if(!this.bChannelExist(message, message.channel.id)){
            embed.setDescription(`${failIcon} The channel specified doesn't exist.`);
            return message.channel.send({"embeds": [embed]});
        }

        const exists = this.bChannelAdded(message.channel.id);

        if(exists){

            this.deleteChannel(message.channel.id);

            embed.setDescription(`${passIcon} Users can no longer use the bot in this channel.`);
            return message.channel.send({"embeds": [embed]});

        }else{

            embed.setDescription(`${failIcon} This channel has not been enabled for bot use.`);
            return message.channel.send({"embeds": [embed]});
        }
    }

    getAllAllowedChannels(){

        return sqliteGetAll("SELECT * FROM channels");
    }


    listChannels(message){

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle("Channels that the bot will respond to users");

        const channels = this.getAllAllowedChannels();

        const fields = [];

        const discordChannels = message.guild.channels.cache;

        for(let i = 0; i < channels.length; i++){

            const c = channels[i];

            const currentChannel = discordChannels.get(c.id)

            const added = new Date(c.added * 1000);

            if(currentChannel !== undefined){

                fields.push({
                    "name": currentChannel.name, 
                    "value": `Enabled at ${added.toString()}`, 
                    "inline": false
                });

            }else{

                fields.push({
                    "name": c.id, 
                    "value": `:no_entry: Channel no longer exists, deleting it from database!`, 
                    "inline": false
                });

                this.deleteChannel(c.id);
            }
        }

        if(fields.length === 0){

            fields.push({
                "name": "No channels", 
                "value": `There are currently no channels enabled for bot use.`,
                "inline": false
            });
        }

        embed.addFields(fields);

        message.channel.send({"embeds": [embed]});

    
    }

    deleteAutoChannel(){

        return sqliteRun("DELETE FROM auto_query");

    }

    setAutoChannel(message){

        const query = "INSERT INTO auto_query VALUES(?)";

        return sqliteRun(query, [message.channel.id]);

    }


    async delayedCreateMessage(delay, realIp, port, channel, embed, servers){

        return new Promise((resolve, reject) =>{

            setTimeout(async () =>{
               
                    try{
                        const currentMessage = await channel.send({ "embeds": [embed] });
                        setServerLastMessageId(realIp, port, currentMessage.id);
                    
                        resolve();
                        
                    }catch(err){
                        console.log(`Failed to create message`);
                        reject(err);
                    }
              
            }, delay * 1000);

        });

    }

    async enableAutoQuery(message, servers, ut99AutoQuery){

        try{


            clearInterval(ut99AutoQuery.autoQueryLoop);
            this.deleteAutoChannel();

            servers.resetLastMessages();

            this.setAutoChannel(message);
            let string = `:arrow_right: :arrow_right: :arrow_right: **This channel is the autoquery channel.** :arrow_left: :arrow_left: :arrow_left:
    The server status posts will be updated every **${autoQueryInterval} seconds.**`;

            const autoQueryMessage = await message.channel.send(string);
            this.setAutoQueryMessageInfoId(autoQueryMessage.id);

            const currentServers = getAllServers();       

            for(let i = 0; i < currentServers.length; i++){

                const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setDescription(`Waiting for data from server **${currentServers[i].name}** id (${i+1})`);

                await this.delayedCreateMessage(1, currentServers[i].real_ip, currentServers[i].port, message.channel, embed, servers);
                //const currentMessage = await message.channel.send({ "embeds": [embed] });
                //servers.setLastMessageId(currentServers[i].real_ip, currentServers[i].port, currentMessage.id);

            }


            ut99AutoQuery.startAutoQueryLoop();

        }catch(err){
            console.trace(err);
        }
    }

    disableAutoQuery(message, servers, ut99AutoQuery){

     
        clearInterval(ut99AutoQuery.autoQueryLoop);
        this.deleteAutoChannel();

        servers.resetLastMessages();

        message.channel.send(`${passIcon} Autoquery has been disabled.`);

       
    }

    deleteOldAutoMessageInfoId(){

        return sqliteRun("DELETE FROM auto_query_info");

    }

    insertAutoMessageInfoId(id){

        const query = "INSERT INTO auto_query_info VALUES(?)";
        return sqliteRun(query, [id]);
    }

    async setAutoQueryMessageInfoId(id){

   
        this.deleteOldAutoMessageInfoId();

        this.insertAutoMessageInfoId(id);

        console.log(`New auto query message set. (${id})`);

    
    }

    getAutoQueryMessageId(){

        const query = "SELECT id FROM auto_query_info";

        const result = sqliteGet(query);

        if(result === undefined) return null;

        return result.id;
    }
}


export function getAutoQueryChannel(){

    const query = `SELECT id FROM auto_query`;

    const result = sqliteGet(query);

    if(result === undefined) return null;

    return result.id;

}