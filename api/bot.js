const Promise = require('promise');
const Discord = require('discord.js');
const config = require('./config.json');
const UT99Query = require('./ut99query.js');
const db = require('./db');

class Bot{

    constructor(){

        this.client = null;
        this.query = new UT99Query();

        this.passIcon = ":white_check_mark:";
        this.failIcon = ":no_entry:";

        this.createClient();
    }

    createClient(){

        this.client = new Discord.Client();

        this.client.on('ready', () =>{

            console.log(`I'm In the discord server...`);
       
        });

        this.client.on('error', (err) =>{

            if(err){
                console.trace(err);
            }

        });

        this.client.on('message', (message) =>{

            if(!message.author.bot){
                console.log(message.content);

                if(message.content == "test"){
                    //185.107.96.18:7777
                    //66.85.80.155:7797
                    //74.91.116.241:3529
                    //78.46.187.162:7777
                    //66.150.121.123:7777
                    //139.162.235.20:7777
                    //	66.150.121.125:7777
                    this.query.getFullServer('139.162.235.20', 7777, message);
                }

                if(message.content.startsWith(config.commandPrefix)){

                    if(this.bUserAdmin(message)){
                        console.log("user is an admin");
                        this.adminCommands(message);
                    }else{
                        console.log("user is not an admin");
                    }

                    this.normalCommands(message);
                }
            }
        });

        this.client.login(config.token);
    }

    normalCommands(message){

        const helpReg = /^.help$/i;

        if(helpReg.test(message.content)){

            this.helpCommand(message);
        }
    }

    helpCommand(message){

        const p = config.commandPrefix;

        const adminCommands = [

            {"name": `${p}allowchannel`, "content": `Enables the bot to be used in the current channel.`},
            {"name": `${p}blockchannel`, "content": `Disables the bot in the current channel.`},
            {"name": `${p}listchannels`, "content": `Displays a list of channels the bot can be used in.`},
            {"name": `${p}allowrole role`, "content": `Allows users with specified role to use admin bot commands.`},
            {"name": `${p}removerole role`, "content": `Stops users with specified role being able to use admin bot commands.`},
            {"name": `${p}listroles`, "content": `Displays a list of roles that can use the bots admin commands.`},
            {"name": `${p}`, "content": ``},
            {"name": `${p}`, "content": ``}

        ];

        const userCommands = [
            {"name": `${p}help`, "content": `Shows this command.`}
        ];

        const icon = `:small_orange_diamond:`;

        let string = `**Unreal Tournament Server Query Discord Bot Help**\n\n`;

        string += `${icon+icon} **User Commands** ${icon+icon}\n`;

        let c = 0;

        for(let i = 0; i < userCommands.length; i++){

            c = userCommands[i];

            string += `**${c.name}** ${c.content}\n`;
        }
    
        string += `\n${icon+icon} **Admin Commands** ${icon+icon}\n`;

        for(let i = 0; i < adminCommands.length; i++){

            c = adminCommands[i];

            string += `**${c.name}** ${c.content}\n`;
        }

        message.channel.send(string);
    }

    bUserAdmin(message){

        try{

            const userRoles = message.member.roles.cache;

            const testRoles = [config.defaultAdminRole.toLowerCase(), "fart", "fdfd", "hfjhidfj"];

            if(userRoles.some((r) =>{

                if(testRoles.indexOf(r.name.toLowerCase()) !== -1){
        
                    return true;
                }

                return false;

            })){

                return true;
            }
  
            return false;

        // console.log(this.client.channels.fetch(channelId));
        }catch(err){
            console.trace(err);
        }

    }

    adminCommands(message){

        const m = message.content;
        const p = config.commandPrefix;

        if(m.startsWith(`${p}allowrole `)){

            this.allowRole(message);

        }else if(m.startsWith(`${p}removerole `)){

            this.removeRole(message);

        }else if(m.startsWith(`${p}listroles`)){

            this.listRoles(message);
            
        }else if(m.startsWith(`${p}allowchannel`)){

            this.allowChannel(message);

        }else if(m.startsWith(`${p}blockchannel`)){

            this.blockChannel(message);

        }else if(m.startsWith(`${p}listchannels`)){

            this.listChannels(message);
        }
    }

    bRoleAdded(role){

        return new Promise((resolve, reject) =>{

            const query = "SELECT COUNT(*) as total_roles FROM roles WHERE name=?";

            db.get(query, [role], (err, row) =>{

                if(err) reject(err);

                if(row != undefined){

                    if(row.total_roles > 0){
                        resolve(true);
                    }
                }

                resolve(false);
            });
        });
    }


    async removeRole(message){

        try{

            const reg = /^.removerole (.+)$/i;

            const result = reg.exec(message.content);

            if(result !== null){

                const bRoleExist = await this.bRoleAdded(result[1].toLowerCase());

                if(bRoleExist){

                    await this.deleteRole(result[1].toLowerCase(), message);

                }else{
                    message.channel.send(`${this.failIcon} The role **${result[1]}** has not been enabled to use admin commands.`);
                }
            }

        }catch(err){

            if(err) console.trace(err);
        }
    }

    deleteRole(role, message){

        return new Promise((resolve, reject) =>{

            const query = "DELETE FROM roles WHERE name=?";

            db.run(query, [role], (err) =>{

                if(err) reject(err);

                message.channel.send(`${this.passIcon} Users with the role **${role}** can no longer use the bots admin commands.`);
                resolve();
            });

        });

    }

    insertRole(role, message){

        //role = role.toLowerCase();

        return new Promise((resolve, reject) =>{

            const query = "INSERT INTO roles VALUES(?,?)";

            const now = Math.floor(Date.now() * 0.001);

            db.run(query, [role, now], (err) =>{

                if(err) reject(err);

                message.channel.send(`${this.passIcon} User with the role **${role}** can now use admin commands.`);
                resolve();
            });
        });

    }

    async addRole(role, message){

        try{

            const bRoleExist = await this.bRoleAdded(role);

            if(!bRoleExist){

                console.log("doesnt exist");

                await this.insertRole(role, message);

            }else{
                message.channel.send(`${this.failIcon} **${role}** has already been allowed to use the bots admin commands.`);
            }

        }catch(err){
            console.trace(err);
        }
    }

    allowRole(message){

        const reg = /^.allowrole (.+)$/i;

        const result = reg.exec(message.content);

        if(result === null){
            message.channel.send(`${this.failIcon} Wrong syntax for allowrole command.`);
            return;
        }

        const channelRoles = message.channel.guild.roles.cache;

        if(channelRoles.some((r => r.name.toLowerCase() == result[1].toLowerCase()))){

            console.log("role exists");

            this.addRole(result[1], message);

        }else{
            message.channel.send(`${this.failIcon} There is no role called **${result[1]}** in this channel.`);
        }
    }

    getAllAddedRoles(){

        return new Promise((resolve, reject) =>{

            const roles = [];

            const query = "SELECT * FROM roles";

            db.each(query, (err, row) =>{

                if(err) reject(err);

                roles.push(row);

            }, (err) =>{

                if(err) reject(err);

                resolve(roles);
            });
        });
    }


    async listRoles(message){

        try{

            const roles = await this.getAllAddedRoles();

            let string = ``;

            let r = 0;
            let added = 0;

            for(let i = 0; i < roles.length; i++){

                r = roles[i];

                added = new Date(r.added * 1000);

                string += `:small_blue_diamond: **${r.name}** Added ${added}\n`
            }

            if(string == ""){
                string = "There are currently no roles allowed to use the bots admin commands.";
            }
            string = `:large_orange_diamond: **User roles that have admin privileges**\n`+string;
            message.channel.send(string);

        }catch(err){
            console.trace(err);
        }
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

            db.get(query, [id], (err, row) =>{

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

            db.run(query, [id, now], (err) =>{

                if(err) reject(err);

                resolve();
            });

        });
    }

    async allowChannel(message){

        try{

            if(!this.bChannelExist(message, message.channel.id)){

                message.channel.send(`${this.failIcon} There is no channel called **${message.channel.name}** in this server.`);

            }else{

                const exists = await this.bChannelAdded(message.channel.id);

                if(!exists){

                    await this.insertChannel(message.channel.id);

                    message.channel.send(`${this.passIcon} The bot can now be used in this channel.`);
                
                }else{
                    message.channel.send(`${this.failIcon} This channel has already been enabled for bot use.`);
                }
            }

        }catch(err){
            console.trace(err);
        }
    }


    deleteChannel(id){

        return new Promise((resolve, reject) =>{

            const query = "DELETE FROM channels WHERE id=?";

            db.run(query, [id], (err) =>{

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

                    message.channel.send(`${this.passIcon} Users can no longer use the bot in this channel.`);

                }else{
                    message.channel.send(`${this.failIcon} This channel has not been enabled for bot use.`);
                }

            }else{
                message.channel.send(`${this.failIcon} The channel specified doesn't exist.`);
            }

        }catch(err){
            console.trace(err);
        }
    }

    getAllAllowedChannels(){

        return new Promise((resolve, reject) =>{

            const channels = [];

            const query = "SELECT * FROM channels";

            db.each(query, (err, row) =>{

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

            console.table(channels);

            let string = "";

            let c = 0;
            let added = 0;

            const discordChannels = message.guild.channels.cache;

            let currentChannel = 0;

            for(let i = 0; i < channels.length; i++){

                c = channels[i];

                currentChannel = discordChannels.get(c.id)

                //console.log(discordChannels.get("fdsfds"));

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
}


module.exports = Bot;