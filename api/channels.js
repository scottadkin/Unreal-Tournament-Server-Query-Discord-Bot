import config from '../config/config.json' with {'type': 'json'};
import { sqliteGet, sqliteRun, sqliteGetAll } from './database.js';
import { EmbedBuilder } from 'discord.js';

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

    async allowChannel(message){

        try{

            if(!this.bChannelExist(message, message.channelId)){

                message.channel.send(`${config.failIcon} There is no channel called **${message.channel.name}** in this server.`);

            }else{

                const exists = this.bChannelAdded(message.channel.id);

                if(!exists){

                    this.insertChannel(message.channel.id);

                    message.channel.send(`${config.passIcon} The bot can now be used in this channel.`);
                
                }else{
                    message.channel.send(`${config.failIcon} This channel has already been enabled for bot use.`);
                }
            }

        }catch(err){
            console.trace(err);
        }
    }


    deleteChannel(id){

        const query = "DELETE FROM channels WHERE id=?";

        return sqliteRun(query, [id]);
    }

    async blockChannel(message){


        try{

            if(this.bChannelExist(message, message.channel.id)){

                const exists = this.bChannelAdded(message.channel.id);

                if(exists){

                    this.deleteChannel(message.channel.id);

                    message.channel.send(`${config.passIcon} Users can no longer use the bot in this channel.`);

                }else{
                    message.channel.send(`${config.failIcon} This channel has not been enabled for bot use.`);
                }

            }else{
                message.channel.send(`${config.failIcon} The channel specified doesn't exist.`);
            }

        }catch(err){
            console.trace(err);
        }
    }

    getAllAllowedChannels(){

        return sqliteGetAll("SELECT * FROM channels");
    }


    async listChannels(message){

        try{

            const channels = await this.getAllAllowedChannels();

            //console.table(channels);

            let string = "";

            let c = 0;
            let added = 0;

            const discordChannels = message.guild.channels.cache;

            let currentChannel = 0;

            for(let i = 0; i < channels.length; i++){

                c = channels[i];

                currentChannel = discordChannels.get(c.id)

                added = new Date(c.added * 1000);

                if(currentChannel !== undefined){
                    string += `:small_blue_diamond: **${currentChannel.name}** Enabled at ${added.toString()}\n`;
                }else{
                    string += `:no_entry: Channel no longer exists, deleting it from database!\n`;
                    this.deleteChannel(c.id);
                }
            }

            if(string == ""){
                string = `There are currently no channels enabled for bot use.`;
            }

            string = `:large_orange_diamond: **Channels the bot is enabled in.\n**`+string;

            message.channel.send(string);

        }catch(err){
            console.trace(err);
        }
    }

    deleteAutoChannel(){

        return sqliteRun("DELETE FROM auto_query");

    }

    setAutoChannel(message){

        const query = "INSERT INTO auto_query VALUES(?)";

        return sqliteRun(query, [message.channel.id]);

    }


    getAutoQueryChannel(){

        const query = `SELECT id FROM auto_query`;

        const result = sqliteGet(query);

        if(result === undefined) return null;

        return result.id;

    }

    async enableAutoQuery(message, servers){

        try{

            this.deleteAutoChannel();
            console.log("Deleted old autoquery channel from database.");

            await servers.resetLastMessages();
            console.log("Reset all servers last_message ids");

            this.setAutoChannel(message);
            let string = `:arrow_right: :arrow_right: :arrow_right: **This channel is the autoquery channel.** :arrow_left: :arrow_left: :arrow_left:
The server status posts will be updated every **${config.autoQueryInterval} seconds.**`;

            /*if(config.bAutoQueryMessagesOnly){
                string += `\n:warning: **Posts that are not posted by the bot will be deleted.** :warning:`;
            }*/

            await message.channel.send(string).then((message) =>{

                this.setAutoQueryMessageInfoId(message.id);

            })

            const currentServers = await servers.getAllServers();

            let currentMessage = 0;


            for(let i = 0; i < currentServers.length; i++){

                const embed = new EmbedBuilder()
                    .setColor(config.embedColor)
                    .setDescription(`Waiting for data from server **${currentServers[i].name}** id (${i+1})`);

                await message.channel.send({ "embeds": [embed] }).then((message) =>{
          
                    currentMessage = message;
                });

                await servers.setLastMessageId(currentServers[i].real_ip, currentServers[i].port, currentMessage.id);
               // console.log(currentMessage.id);
            }


        }catch(err){
            console.trace(err);
        }   
    }

    async disableAutoQuery(message, servers){

        try{

            this.deleteAutoChannel();

            await servers.resetLastMessages();

            message.channel.send(`${config.passIcon} Autoquery has been disabled.`);

        }catch(err){
            console.trace(err);
        }
    }

    deleteOldAutoMessageInfoId(){

        return sqliteRun("DELETE FROM auto_query_info");

    }

    insertAutoMessageInfoId(id){

        const query = "INSERT INTO auto_query_info VALUES(?)";
        return sqliteRun(query, [id]);
    }

    async setAutoQueryMessageInfoId(id){

        try{

            this.deleteOldAutoMessageInfoId();

            await this.insertAutoMessageInfoId(id);

            console.log(`New auto query message set. (${id})`);

        }catch(err){
            console.trace(err);
        }   
    }

    getAutoQueryMessageId(){

        const query = "SELECT id FROM auto_query_info";

        const result = sqliteGet(query);

        if(result === undefined) return null;

        return result.id;
    }
}
