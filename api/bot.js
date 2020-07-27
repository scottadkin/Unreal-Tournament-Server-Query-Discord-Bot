const Promise = require('promise');
const Discord = require('discord.js');
const config = require('./config.json');
const UT99Query = require('./ut99query.js');
const db = require('./db');
const dns = require('dns');

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

                if(message.content.startsWith(config.commandPrefix)){

                    if(this.bUserAdmin(message)){
                       // console.log("user is an admin");

                        if(this.adminCommands(message)){
                            return;
                        }
                    }else{
                       // console.log("user is not an admin");
                    }

                    this.normalCommands(message);
                }
            }
        });

        this.client.login(config.token);
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
                const serverQueryReg = /^.q .+$/i;
                const listReg = /^.list/i;
                const activeReg = /^.active/i;

                if(helpReg.test(message.content)){

                    this.helpCommand(message);

                }else if(serverQueryReg.test(message.content)){

                    this.queryServer(message);

                }else if(listReg.test(message.content)){

                    this.listServers(message);

                }else if(activeReg.test(message.content)){

                    this.listServers(message, true);
                }


            }else{
                message.channel.send(`${this.failIcon} The bot is not enabled in this channel.`);
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
            {"name": `${p}list`, "content": `Lists all servers added to the database.`},
            {"name": `${p}q ip:port`, "content": `Query a Unreal Tournament server, if no port is specified 7777 is used. Domain names can also be used instead of an ip.`},
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

            return true;

        }else if(m.startsWith(`${p}removerole `)){

            this.removeRole(message);
            
            return true;

        }else if(m.startsWith(`${p}listroles`)){

            this.listRoles(message);

            return true;
            
        }else if(m.startsWith(`${p}allowchannel`)){

            this.allowChannel(message);

            return true;

        }else if(m.startsWith(`${p}blockchannel`)){

            this.blockChannel(message);

            return true;

        }else if(m.startsWith(`${p}listchannels`)){

            this.listChannels(message);

            return true;

        }else if(m.startsWith(`${p}addserver`)){

            this.addServer(message);

            return true;

        }else if(m.startsWith(`${p}removeserver`)){

            this.removeServer(message);

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

                        message.channel.send(`${this.passIcon} Users with the role **${roleData.name}** can no longer use the bots admin commands.`);

                    }else{
                        message.channel.send(`${this.failIcon} The role **${roleData.name}** has not been enabled to use admin commands.`);
                    }
                }else{
                    message.channel.send(`${this.failIcon} The role **${roleData.name}** does not exist in this server.`);
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

                message.channel.send(`${this.passIcon} User with the role **${roleName}** can now use admin commands.`);

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
                    message.channel.send(`${this.failIcon} **${role.name}** has already been allowed to use the bots admin commands.`);
                }

            }else{
                message.channel.send(`${this.failIcon} `);
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
            message.channel.send(`${this.failIcon} There is no role called **${result[1]}** in this channel.`);
        }

       /* if(channelRoles.some((r => r.name.toLowerCase() == result[1].toLowerCase()))){

            console.log("role exists");

            this.addRole(result[1], message);

        }else{
            message.channel.send(`${this.failIcon} There is no role called **${result[1]}** in this channel.`);
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

    async addServer(message){

        try{

            const reg = /^.addserver (.+?) ((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:(\d{1,5})|)|(.+?)(:(\d+)|))$/i;

            const result = reg.exec(message.content);

            if(result === null){

                message.channel.send(`${this.failIcon} Incorrect syntax for **addserver**`);
                return;

            }else{

                let port = 7777;
                let ip = 0;

                if(result[3] === undefined){

                    ip = dns.lookup(result[6], async (err, ipResult) =>{

                        if(err){
                            message.channel.send(`${this.failIcon} There is no matching ip for that domain address.`);
                            return;
                        }

                        /*if(ipResult === undefined){

                            message.channel.send(`${this.failIcon} There is no matching ip for that domain address.`);
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
                            message.channel.send(`${this.passIcon} Server added successfully.`);

                        }else{
                            message.channel.send(`${this.failIcon} Server with that ip and port has already added to database.`);
                        }
                    });   

                }else{

                    ip = result[3];

                    if(result[5] !== undefined){
                        port = parseInt(result[5]);
                    }

                    if(!await this.bServerAdded(ip, port)){

                        await this.insertServer(ip, ip, result[1], port);
                        message.channel.send(`${this.passIcon} Server added successfully.`);

                    }else{
                        message.channel.send(`${this.failIcon} Server with that ip and port has already added to database.`);
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

            db.get(query, [ip, port], (err, row) =>{

                if(err) reject(err);

                if(row !== undefined){

                    if(row.total_servers > 0){
                        console.log(`Total servers = ${row.total_servers}`);
                        resolve(true);
                    }
                }
                resolve(false);
            });
        });
    }

    insertServer(ip, realIp, alias, port){

        console.log(`${ip}, ${realIp}, ${alias}, ${port}`);

        return new Promise((resolve, reject) =>{

            const now = Math.floor(Date.now() * 0.001);

            const query = "INSERT INTO servers VALUES(NULL,?,?,?,?,?,0,0,'N/A','N/A',?,?)";

            const vars = [
                ip, 
                realIp, 
                port, 
                "Another UT Server",
                alias,
                now,
                now
            ];

            db.run(query, vars, (err) =>{

                if(err) reject(err);

                resolve();
            });
        });
    }

    deleteServer(id){

        return new Promise((resolve, reject) =>{

            const query = "DELETE FROM servers WHERE id=?";

            db.run(query, [id], (err) =>{

                if(err) reject(err);

                resolve();
            });
        });
    }


    getAllServers(){

        return new Promise((resolve, reject) =>{

            const servers = [];

            const query = "SELECT * FROM servers ORDER BY created ASC";

            db.each(query, (err, row) =>{

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

                    message.channel.send(`${this.failIcon} Incorrect syntax for ${config.commandPrefix}removeserver, id must be a valid integer.`);
                    return;

                }else if(id > servers.length || id < 1){

                    message.channel.send(`${this.failIcon} There are no servers with the id ${id}`);
                    return;

                }

                id = id - 1;

                const s = servers[id];

                await this.deleteServer(s.id);

                message.channel.send(`${this.passIcon} Deleted server successfully.`);        

            }else{

                message.channel.send(`${this.failIcon} Incorrect syntax for ${config.commandPrefix}removeserver.`);
            }


        }catch(err){
            console.trace(err);
        }
    }

    createServerString(id, server){

        const idLength = 2;
        const aliasLength = 20;
        const mapLength = 20;
        const playersLength = 7;

        const fixValue = (input, limit, bSpecial) =>{

            input = input.toString();

            if(input.length > limit){
                input.slice(0, limit);
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
        let map = fixValue(server.map, mapLength);

        let playerString = "";

        if(server.max_players == "ers"){
            playerString = "Players";
        }else{
            playerString = server.players+"/"+server.max_players;
        }

        let players = fixValue(playerString, playersLength, true);

        let string = `\`${serverId} - ${alias} ${map} ${players}\``;

        return string;
    }

    async listServers(message, bOnlyActive){

        try{

            const servers = await this.getAllServers();

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
            .setDescription(`Use ${config.commandPrefix}q serverid for easier server querying.`)
            .addField(this.createServerString("ID", {
                "alias": "Alias",
                "players": "Play",
                "max_players": "ers",
                "map": "Map"

            }), string ,false)
            .setTimestamp();
            //"`Id - alias - players - maxplayers`"
            message.channel.send(embed);

        }catch(err){
            console.trace(err);
        }


    }

    
}


module.exports = Bot;