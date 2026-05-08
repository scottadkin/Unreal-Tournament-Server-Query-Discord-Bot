import { failIcon, passIcon, embedColor, autoQueryInterval } from '../config/config.js';
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

    allowChannel(message){

        if(!this.bChannelExist(message, message.channelId)){
            return message.channel.send(`${failIcon} There is no channel called **${message.channel.name}** in this server.`);
        }
   
        const exists = this.bChannelAdded(message.channel.id);

        if(!exists){

            this.insertChannel(message.channel.id);

            return message.channel.send(`${passIcon} The bot can now be used in this channel.`);
        
        }else{
            return message.channel.send(`${failIcon} This channel has already been enabled for bot use.`);
        }
        

       
    }


    deleteChannel(id){

        const query = "DELETE FROM channels WHERE id=?";

        return sqliteRun(query, [id]);
    }

    blockChannel(message){

        if(!this.bChannelExist(message, message.channel.id)){
            return message.channel.send(`${failIcon} The channel specified doesn't exist.`);
        }

        const exists = this.bChannelAdded(message.channel.id);

        if(exists){

            this.deleteChannel(message.channel.id);

            message.channel.send(`${passIcon} Users can no longer use the bot in this channel.`);

        }else{
            message.channel.send(`${failIcon} This channel has not been enabled for bot use.`);
        }
    }

    getAllAllowedChannels(){

        return sqliteGetAll("SELECT * FROM channels");
    }


    listChannels(message){

        const channels = this.getAllAllowedChannels();

        let string = "";

        const discordChannels = message.guild.channels.cache;

        for(let i = 0; i < channels.length; i++){

            const c = channels[i];

            const currentChannel = discordChannels.get(c.id)

            const added = new Date(c.added * 1000);

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

    enableAutoQuery(message, servers){

        this.deleteAutoChannel();

        servers.resetLastMessages();

        this.setAutoChannel(message);
        let string = `:arrow_right: :arrow_right: :arrow_right: **This channel is the autoquery channel.** :arrow_left: :arrow_left: :arrow_left:
The server status posts will be updated every **${autoQueryInterval} seconds.**`;


        message.channel.send(string).then((message) =>{

            this.setAutoQueryMessageInfoId(message.id);

        })

        const currentServers = servers.getAllServers();

        for(let i = 0; i < currentServers.length; i++){

            const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setDescription(`Waiting for data from server **${currentServers[i].name}** id (${i+1})`);

            message.channel.send({ "embeds": [embed] }).then((message) =>{

                servers.setLastMessageId(currentServers[i].real_ip, currentServers[i].port, message.id);
            });

        }


    }

    disableAutoQuery(message, servers){

     
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
