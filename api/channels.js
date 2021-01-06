const config = require('./config.json');
const Database = require('./db');

class Channels{

    constructor(){

        this.db = new Database();
        this.db = this.db.sqlite;
    }

    bBotCanCommentInChannel(message){

        return new Promise((resolve, reject) =>{

            const channelId = message.channel.id;

            const query = "SELECT COUNT(*) as total_channels from channels WHERE id=?";

            this.db.get(query, [channelId], (err, row) =>{

                if(err) reject(err);

                if(row.total_channels > 0){

                    resolve(true);
                }

                resolve(false);
            });
        });
    }

    bChannelExist(message, channelId){

        const channels = message.guild.channels.cache.array();

        let c = 0;

        for(let i = 0; i < channels.length; i++){

            c = channels[i];

            if(c.id == channelId){
                return true;
            }
        }

        return false;
    }

    bChannelAdded(id){

        return new Promise((resolve, reject) =>{

            const query = "SELECT COUNT(*) as total_channels FROM channels WHERE id=?";

            this.db.get(query, [id], (err, row) =>{

                if(err) reject(err);

                if(row !== undefined){

                    if(row.total_channels > 0){
                        resolve(true);
                    }
                }

                resolve(false);
            });

        });
        
    }

    insertChannel(id){

        return new Promise((resolve, reject) =>{

            const query = "INSERT INTO channels VALUES(?,?)";

            const now = Math.floor(Date.now() * 0.001)

            this.db.run(query, [id, now], (err) =>{

                if(err) reject(err);

                resolve();
            });

        });
    }

    async allowChannel(message){

        try{

            if(!this.bChannelExist(message, message.channel.id)){

                message.channel.send(`${config.failIcon} There is no channel called **${message.channel.name}** in this server.`);

            }else{

                const exists = await this.bChannelAdded(message.channel.id);

                if(!exists){

                    await this.insertChannel(message.channel.id);

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

        return new Promise((resolve, reject) =>{

            const query = "DELETE FROM channels WHERE id=?";

            this.db.run(query, [id], (err) =>{

                if(err) reject(err);

                resolve();
            });
        });
    }

    async blockChannel(message){


        try{

            if(this.bChannelExist(message, message.channel.id)){

                const exists = this.bChannelAdded(message.channel.id);

                if(exists){

                    await this.deleteChannel(message.channel.id);

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

        return new Promise((resolve, reject) =>{

            const channels = [];

            const query = "SELECT * FROM channels";

            this.db.each(query, (err, row) =>{

                if(err) reject(err);

                channels.push(row);

            }, (err, totalRows) =>{

                if(err) reject(err);

                resolve(channels);
            });
        });
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
                    await this.deleteChannel(c.id);
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

        return new Promise((resolve, reject) =>{

            const query = "DELETE FROM auto_query";

            this.db.run(query, (err) =>{

                if(err) reject(err);

                resolve();

            });
        });
    }

    setAutoChannel(message){

        return new Promise((resolve, reject) =>{

            const query = "INSERT INTO auto_query VALUES(?)";

            this.db.run(query, [message.channel.id], (err) =>{

                if(err) reject(err);

                resolve();
            });
        });
    }


    getAutoQueryChannel(){

        return new Promise((resolve, reject) =>{

            const query = "SELECT * FROM auto_query LIMIT 1";

            this.db.get(query, (err, row) =>{

                if(err) reject(err);

                if(row !== undefined){
                    resolve(row.id);
                }

                resolve(null);
            });
        });
    }

    async enableAutoQuery(message, servers, Discord){

        try{

            await this.deleteAutoChannel();
            console.log("Deleted old autoquery channel from database.");

            await servers.resetLastMessages();
            console.log("Reset all servers last_message ids");

            await this.setAutoChannel(message);
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

            let embed = 0;

            for(let i = 0; i < currentServers.length; i++){

                embed = new Discord.MessageEmbed()
                .setColor(config.embedColor)
                .setDescription(`Waiting for data for server **${currentServers[i].name}** id (${i+1})`);

                await message.channel.send(embed).then((message) =>{
          
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

            await this.deleteAutoChannel();

            await servers.resetLastMessages();

            message.channel.send(`${config.passIcon} Autoquery has been disabled.`);

        }catch(err){
            console.trace(err);
        }
    }

    deleteOldAutoMessageInfoId(){

        return new Promise((resolve, reject) =>{

            const query = "DELETE FROM auto_query_info";

            this.db.run(query, (err) =>{

                if(err) reject(err);

                resolve();
            });
        });
    }

    insertAutoMessageInfoId(id){

        return new Promise((resolve, reject) =>{

            const query = "INSERT INTO auto_query_info VALUES(?)";

            this.db.run(query, [id], (err) =>{

                if(err) reject(err);

                resolve();

            });
        });
    }

    async setAutoQueryMessageInfoId(id){

        try{

            await this.deleteOldAutoMessageInfoId();

            await this.insertAutoMessageInfoId(id);

            console.log(`New auto query message set. (${id})`);

        }catch(err){
            console.trace(err);
        }   
    }

    getAutoQueryMessageId(){

        return new Promise((resolve, reject) =>{

            const query = "SELECT * FROM auto_query_info LIMIT 1";

            this.db.get(query, (err, row) =>{

                if(err) reject(err);

                if(row !== undefined){

                    resolve(row.id);
                }

                resolve(null);
            });
        });
    }

}


module.exports = Channels;