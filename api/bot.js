const Promise = require('promise');
const Discord = require('discord.js');
const config = require('./config.json');
const UT99Query = require('./ut99query.js');
const db = require('./db');
const dns = require('dns');
const Servers = require('./servers');

class Bot{

    constructor(){

        this.client = null;
        this.query = new UT99Query(db);

        

        this.servers = new Servers(db);

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

                //console.log(message.content);

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

                this.checkCommand(message);
            }
        });

        this.client.login(config.token);
    }

    async checkCommand(message){

        try{

            if(message.content.startsWith(config.commandPrefix)){

                if(await this.bUserAdmin(message)){

                    console.log("user is an admin");

                    if(this.adminCommands(message)){
                        return;
                    }
                    
                }else{
                    console.log("user is not an admin");
                    if(this.adminCommands(message, true)){
                        return;
                    }
                }

                this.normalCommands(message);
            }

        }catch(err){
            console.trace(err);
        }

    }

    bBotCanCommentInChannel(message){

        return new Promise((resolve, reject) =>{

            const channelId = message.channel.id;

            const query = "SELECT COUNT(*) as total_channels from channels WHERE id=?";

            db.get(query, [channelId], (err, row) =>{

                if(err) reject(err);

                if(row.total_channels > 0){

                    resolve(true);
                }

                resolve(false);
            });



        });
    }

    async normalCommands(message){

        try{

            if(await this.bBotCanCommentInChannel(message)){

                const helpReg = /^.help$/i;
                const shortServerQueryReg = /^.q\d+$/i;
                const serverQueryReg = /^.q .+$/i;
                const listReg = /^.servers/i;
                const activeReg = /^.active/i;
                const ipReg = /^.ip\d+/i;

                if(helpReg.test(message.content)){

                    this.helpCommand(message);

                }else if(shortServerQueryReg.test(message.content)){
                    
                    this.shortQueryServer(message);
                    
                }else if(serverQueryReg.test(message.content)){

                    this.queryServer(message);

                }else if(listReg.test(message.content)){

                    this.listServers(message);

                }else if(activeReg.test(message.content)){

                    this.listServers(message, true);

                }else if(ipReg.test(message.content)){

                    this.servers.getIp(message);
                }


            }else{
                message.channel.send(`${config.failIcon} The bot is not enabled in this channel.`);
            }

        }catch(err){
            console.trace(err);
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
            {"name": `${p}addserver alias ip:port`, "content": `Adds the specified server details into the database.`},
            {"name": `${p}removeserver serverid`, "content": `Removes the specified server from the database.`}

        ];

        const userCommands = [
            {"name": `${p}servers`, "content": `Lists all servers added to the database.`},
            {"name": `${p}active`, "content": `Lists all servers added to the database that have at least one player.`},
            {"name": `${p}q ip:port`, "content": `Query a Unreal Tournament server, if no port is specified 7777 is used. Domain names can also be used instead of an ip.`},
            {"name": `${p}q serverID`, "content": `Query a Unreal Tournament server by just using the server's id instead of it's ip and port. Use the ${config.commandPrefix}servers command to find a server's id.`},
            {"name": `${p}ip serverId`, "content": `Displays the specified server's name and a clickable link.`},
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

        string += `\n:orange_book: **Github Repo** <https://github.com/scottadkin/Unreal-Tournament-Server-Query-Discord-Bot>`;

        message.channel.send(string);
    }

    async bUserAdmin(message){

        try{

            let passed = false;

            const userRoles = message.member.roles.cache;

            const adminRolesData = await this.getAllAddedRoles();

            const adminRoleIds = [];

            let a = 0;

            //console.table(adminRolesData);

            for(let i = 0; i < adminRolesData.length; i++){

                a = adminRolesData[i];

                if(adminRoleIds.indexOf(a.id) === -1){
                    adminRoleIds.push(a.id);
                }
            }

            //console.table(adminRoleIds);

            if(userRoles.some((r) =>{

                if(adminRoleIds.indexOf(r.id) !== -1 || r.name.toLowerCase() == config.defaultAdminRole.toLowerCase()){
               
                    passed = true;
                }

            }));
  
            console.log(`passed ${passed}`);
            return passed;

        // console.log(this.client.channels.fetch(channelId));
        }catch(err){
            console.trace(err);
        }

    }

    adminCommands(message, bFailed){

        const m = message.content;
        const p = config.commandPrefix;

        const commands = [
            `${p}allowrole `,
            `${p}removerole `,
            `${p}listroles`,
            `${p}allowchannel`,
            `${p}blockchannel`,
            `${p}listchannels`,
            `${p}addserver`,
            `${p}removeserver`
        ];


        if(bFailed !== undefined){

            for(let i = 0; i < commands.length; i++){

                if(message.content.startsWith(commands[i])){
                    message.channel.send(`${config.failIcon} Only users with an admin role can use that command.`);
                    return true;
                }
            }

            
        }

        if(m.startsWith(commands[0])){

            this.allowRole(message);

            return true;

        }else if(m.startsWith(commands[1])){

            this.removeRole(message);
            
            return true;

        }else if(m.startsWith(commands[2])){

            this.listRoles(message);

            return true;
            
        }else if(m.startsWith(commands[3])){

            this.allowChannel(message);

            return true;

        }else if(m.startsWith(commands[4])){

            this.blockChannel(message);

            return true;

        }else if(m.startsWith(commands[5])){

            this.listChannels(message);

            return true;

        }else if(m.startsWith(commands[6])){

            this.servers.addServer(message);

            return true;

        }else if(m.startsWith(commands[7])){

            this.servers.removeServer(message);

            return true;
        }

        return false;
    }

    bRoleAdded(role){

        return new Promise((resolve, reject) =>{

            const query = "SELECT COUNT(*) as total_roles FROM roles WHERE id=?";

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

                const roleData = this.getRole(result[1], message);

                if(roleData !== null){

                    const bRoleExist = await this.bRoleAdded(roleData.id);

                    if(bRoleExist){

                        await this.deleteRole(roleData.id, message, roleData.name);

                        message.channel.send(`${config.passIcon} Users with the role **${roleData.name}** can no longer use the bots admin commands.`);

                    }else{
                        message.channel.send(`${config.failIcon} The role **${roleData.name}** has not been enabled to use admin commands.`);
                    }
                }else{
                    message.channel.send(`${config.failIcon} The role **${roleData.name}** does not exist in this server.`);
                }
            }

        }catch(err){

            if(err) console.trace(err);
        }
    }

    deleteRole(role, message, roleName){

        return new Promise((resolve, reject) =>{

            const query = "DELETE FROM roles WHERE id=?";

            db.run(query, [role], (err) =>{

                if(err) reject(err);

                resolve();
            });

        });

    }

    insertRole(role, message, roleName){

        return new Promise((resolve, reject) =>{

            const query = "INSERT INTO roles VALUES(?,?)";

            const now = Math.floor(Date.now() * 0.001);

            db.run(query, [role, now], (err) =>{

                if(err) reject(err);

                message.channel.send(`${config.passIcon} User with the role **${roleName}** can now use admin commands.`);

                resolve();
            });
        });

    }

    getRole(name, message){

        const roles = message.guild.roles.cache.array();

        for(let i = 0; i < roles.length; i++){

            if(roles[i].name.toLowerCase() == name.toLowerCase()){
                return roles[i];
            }
        }

        return null;
    }

    async addRole(role, message){

        try{

            const roleData = this.getRole(role, message);

            if(roleData !== null){

                const bRoleAdded = await this.bRoleAdded(roleData.id);

                if(!bRoleAdded){

                    await this.insertRole(roleData.id, message, roleData.name);

                }else{
                    message.channel.send(`${config.failIcon} **${role.name}** has already been allowed to use the bots admin commands.`);
                }

            }else{
                message.channel.send(`${config.failIcon} `);
            }

        }catch(err){
            console.trace(err);
        }
    }

    allowRole(message){

        const reg = /^.allowrole (.+)$/i;

        const result = reg.exec(message.content);

        if(result === null){
            message.channel.send(`${config.failIcon} Wrong syntax for allowrole command.`);
            return;
        }

        const channelRoles = message.channel.guild.roles.cache.array();

        let c = 0;

        let bFound = false;

        for(let i = 0; i < channelRoles.length; i++){

            c = channelRoles[i];

            if(c.name.toLowerCase() == result[1].toLowerCase()){

                bFound = true;
                this.addRole(c.name, message);
                break;
            }
        }

        if(!bFound){
            message.channel.send(`${config.failIcon} There is no role called **${result[1]}** in this channel.`);
        }

       /* if(channelRoles.some((r => r.name.toLowerCase() == result[1].toLowerCase()))){

            console.log("role exists");

            this.addRole(result[1], message);

        }else{
            message.channel.send(`${config.failIcon} There is no role called **${result[1]}** in this channel.`);
        }*/
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

            const discordRoles = message.guild.roles.cache;

            let string = ``;

            let r = 0;
            let added = 0;

            let currentRole = 0;

            for(let i = 0; i < roles.length; i++){

                r = roles[i];

                added = new Date(r.added * 1000);

                currentRole = discordRoles.get(r.id);

                if(currentRole !== undefined){
                    string += `:small_blue_diamond: **${currentRole.name}** Added ${added}\n`;
                }else{
                    string += `:no_entry: This role no longer exists in this server, removing it from database.\n`;

                    await this.deleteRole(r.id, message, "DELETED");
                }
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

    async shortQueryServer(message){

        try{

            const reg = /^.q(\d+)$/i;

            const result = reg.exec(message.content);

            if(result !== null){

                let id = parseInt(result[1]);

                const servers = await this.servers.getAllServers();

                id = id - 1;

                if(id < 0 || id > servers.length){

                    message.channel.send(`${config.failIcon} There is no server with the id of ${id + 1}.`);

                }else{

                    this.query.getFullServer(servers[id].ip, servers[id].port, message)
                }
                
            }else{

                message.channel.send(`${config.failIcon} Incorrect syntax for ${config.commandPrefix}q serverid.`);
            }

        }catch(err){
            console.trace(err);
        }
    }

    queryServer(message){

        const reg = /^.q (((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(.{0,}))|((.+?)(.{0}|:\d{1,})))$/i;

        const result = reg.exec(message.content);

        if(result !== null){

          
            //check if an ip or domain name
            if(result[2] === undefined){

                const domainName = result[6];
                let port = 7777;

                if(result[7] !== ''){

                    port = parseInt(result[7].replace(':',''));            

                }

                this.query.getFullServer(domainName, port, message);

                return;

            }else{

                const ip = result[3];

                let port = 7777;

                if(result[4] !== ''){      
                    port = parseInt(result[4].replace(':',''));
                }

                this.query.getFullServer(ip, port, message);
            }
        }
    }


    createServerString(id, server){

        const idLength = 2;
        const aliasLength = 28;
        const mapLength = 30;
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

        if(diff >= config.serverListTimeout && server.modified !== undefined){
            server.map = "Timed Out!";
            playerString = "N/A";
        }

        let map = fixValue(server.map, mapLength);
      

        let players = fixValue(playerString, playersLength, true);

        let string = `\`${serverId} - ${alias} ${map} ${players}\``;

        return string;
    }

    async listServers(message, bOnlyActive){

        try{

            const servers = await this.servers.getAllServers();

            let string = "";

            let s = 0;

            for(let i = 0; i < servers.length; i++){

                s = servers[i];

                if(bOnlyActive === undefined){
                    string += this.createServerString(i + 1, s)+"\n";
                }else{

                    if(s.players > 0){
                        string += this.createServerString(i + 1, s)+"\n";
                    }
                }
            }

            

            const embed = new Discord.MessageEmbed();

            let title = "Unreal Tournament Server List";

            if(bOnlyActive !== undefined){

                title = "Active Unreal Tournament Server List";

                if(string == ""){
                    string = "There are currently no active servers.";
                }

            }else{

                if(string == ""){
                    string = "There are currently no servers added.";
                }
            }

            embed.setColor(config.embedColor)
            .setTitle(title)
            .addField(this.createServerString("ID", {
                "alias": "Alias",
                "players": "Play",
                "max_players": "ers",
                "map": "Map"

            }), string ,false)
            .addField("Shorter server query command", `Type **${config.commandPrefix}q id** for easier command usage for servers added to the database.` ,false)
            .setTimestamp();
            //"`Id - alias - players - maxplayers`"
            message.channel.send(embed);

        }catch(err){
            console.trace(err);
        }
    }

    
}


module.exports = Bot;