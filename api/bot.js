const Discord = require('discord.js');
const config = require('./config.json');
const UT99Query = require('./ut99query.js');
const Database = require('./db');
//const dns = require('dns');
const Servers = require('./servers');
const Channels = require('./channels');
const Roles = require('./roles');

class Bot{

    constructor(){

        this.client = null;

        this.validEdits = [
            "alias",
            "ip",
            "country",
            "port"
        ];
        
        this.db = new Database();
        this.db = this.db.sqlite;

        this.servers = new Servers();
        this.channels = new Channels();
        this.roles = new Roles();

        this.createClient();
    }

    createClient(){

        this.client = new Discord.Client({
            messageCacheMaxSize: 1,
            messageCacheLifetime: 10,
            messageSweepInterval: 30,
            messageEditHistoryMaxSize: 0

        });

        this.client.on('ready', () =>{

            this.query = new UT99Query(this.client);
            this.queryAuto = new UT99Query(this.client, true);
            console.log(`I'm In the discord server...`);
       
        });

        this.client.on('error', (err) =>{

            if(err){
                console.trace(err);
            }

        });

        this.client.on('message', (message) =>{

            if(!message.author.bot){

                this.checkCommand(message);
            }
        });

        this.client.login(config.token);
    }

    async checkCommand(message){

        try{

            if(message.content == "test"){

                this.query.pingAllServers();
                return;
            }

            if(message.content.startsWith(config.commandPrefix) && message.content.length > 1){

                if(message.content[0] == config.commandPrefix && message.content[1] == config.commandPrefix) return;

                if(await this.roles.bUserAdmin(message)){

                    //console.log("user is an admin");

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

    async normalCommands(message){

        try{

            if(await this.channels.bBotCanCommentInChannel(message)){

                const helpReg = /^.help$/i;
                const shortServerQueryReg = /^.q\d+$/i;
                const serverQueryReg = /^.q .+$/i;
                const listReg = /^.servers/i;
                const activeReg = /^.active/i;
                const ipReg = /^.ip\d+/i;
                const extendedReg = /^.extended \d+$/i;
                const altExtendedReg = /^.extended .+$/i;
                const playersReg = /^.players \d+$/i;
                const altPlayersReg = /^.players .+/i;

                if(helpReg.test(message.content)){

                    this.helpCommand(message);

                }else if(shortServerQueryReg.test(message.content)){
                    
                    this.shortQueryServer(message);
                    
                }else if(serverQueryReg.test(message.content)){

                    this.queryServer(message);

                }else if(listReg.test(message.content)){

                    this.servers.listServers(Discord, message);

                }else if(activeReg.test(message.content)){

                    this.servers.listServers(Discord, message, true);

                }else if(ipReg.test(message.content)){

                    this.servers.getIp(message);

                }else if(extendedReg.test(message.content)){

                    this.queryServerExtended(message);

                }else if(altExtendedReg.test(message.content)){

                    this.queryServerExtendedAlt(message);

                }else if(playersReg.test(message.content)){

                    this.queryPlayers(message);

                }else if(altPlayersReg.test(message.content)){

                    this.queryPlayersAlt(message);

                }


            }else{
                if(config.bDisplayNotEnabledMessage){
                    message.channel.send(`${config.failIcon} The bot is not enabled in this channel.`);
                }
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
            {"name": `${p}removeserver serverID`, "content": `Removes the specified server from the database.`},
            {"name": `${p}setauto`, "content": `Sets the current channel as the auto query and display channel where the posts are updated in regualr intervals with the latest information from the server. :no_entry: Do not enable in an existing channel, non autoquery messages are deleted by default.`},
            {"name": `${p}stopauto`, "content": `Disables autoquery channel from updating.`},
            {"name": `${p}editserver id type value`, "content": `Edit selected server's value type. Types:**(alias,ip,country,port)**`}

        ];

        const userCommands = [
            {"name": `${p}servers`, "content": `Lists all servers added to the database.`},
            {"name": `${p}active`, "content": `Lists all servers added to the database that have at least one player.`},
            {"name": `${p}q ip:port`, "content": `Query a Unreal Tournament server, if no port is specified 7777 is used. Domain names can also be used instead of an ip.`},
            {"name": `${p}q serverID`, "content": `Query a Unreal Tournament server by just using the server's id instead of it's ip and port. Use the ${config.commandPrefix}servers command to find a server's id.`},
            {"name": `${p}ip serverID`, "content": `Displays the specified server's name with a clickable link.`},
            {"name": `${p}players serverID`, "content": `Displays extended information about players on the server.`},
            {"name": `${p}players ip:port`, "content": `Displays extended information about players on the server, domain address also work, if no port specified 7777 is used.`},
            {"name": `${p}extended serverID`, "content": `Displays extended information about the server.`},
            {"name": `${p}help`, "content": `Shows this command.`}
        ];

        const icon = `:small_orange_diamond:`;

        let string = ` ${icon} ${icon} **Unreal Tournament Server Query Discord Bot Help** ${icon} ${icon}\n\n`;

        string += `${icon+icon} **User Commands** ${icon+icon}\n`;

        let c = 0;

        for(let i = 0; i < userCommands.length; i++){

            c = userCommands[i];

            string += `**${c.name}** ${c.content}\n`;
        }

        message.channel.send(string);

        string = "";
    
        string += `\n${icon+icon} **Admin Commands** ${icon+icon}\n`;

        for(let i = 0; i < adminCommands.length; i++){

            c = adminCommands[i];

            string += `**${c.name}** ${c.content}\n`;
        }

        string += `\n:orange_book: **Github Repo** <https://github.com/scottadkin/Unreal-Tournament-Server-Query-Discord-Bot>`;

        message.channel.send(string);
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
            `${p}removeserver`,
            `${p}setauto`,
            `${p}stopauto`,
            `${p}editserver`
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

            this.roles.allowRole(message);

            return true;

        }else if(m.startsWith(commands[1])){

            this.roles.removeRole(message);
            
            return true;

        }else if(m.startsWith(commands[2])){

            this.roles.listRoles(message);

            return true;
            
        }else if(m.startsWith(commands[3])){

            this.channels.allowChannel(message);

            return true;

        }else if(m.startsWith(commands[4])){

            this.channels.blockChannel(message);

            return true;

        }else if(m.startsWith(commands[5])){

            this.channels.listChannels(message);

            return true;

        }else if(m.startsWith(commands[6])){

            this.servers.addServer(message);

            return true;

        }else if(m.startsWith(commands[7])){

            this.servers.removeServer(message);

            return true;

        }else if(m.startsWith(commands[8])){

            this.channels.enableAutoQuery(message, this.servers, Discord);

            return true;

        }else if(m.startsWith(commands[9])){

            this.channels.disableAutoQuery(message, this.servers);
            return true;

        }else if(m.startsWith(commands[10])){

            this.editServer(message);

            return true;
        }

        return false;
    }

    async shortQueryServer(message){

        try{

            const reg = /^.q(\d+)$/i;

            const result = reg.exec(message.content);

            if(result !== null){
       
                const server = await this.servers.getServerById(result[1]);

                if(server !== null){

                    this.query.getFullServer(server.ip, server.port, message.channel);

                }else{
                    message.channel.send(`${config.failIcon} There is no server with the id of ${parseInt(result[1])}.`);
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

                this.query.getFullServer(domainName, port, message.channel);

                return;

            }else{

                const ip = result[3];

                let port = 7777;

                if(result[4] !== ''){      
                    port = parseInt(result[4].replace(':',''));
                }

                this.query.getFullServer(ip, port, message.channel);
            }
        }
    }


    async queryServerExtended(message){

        try{

            const reg = /^.extended (\d+)$/i;

            const result = reg.exec(message.content);

            if(result !== null){

                const server = await this.servers.getServerById(result[1]);

                if(server != null){

                    let id = parseInt(result[1]);

                    id--;

                    this.query.getExtended(server.ip, server.port, message.channel);
                 
                }else{
                
                    message.channel.send(`${config.failIcon} There is no server with that id.`);
                }
            }

        }catch(err){
            console.trace(err);
        }
    }

    async queryServerExtendedAlt(message){

        try{

            const reg = /^.extended (((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+|))|(.+?(:\d+|)))$/i;

            const result = reg.exec(message.content);

            if(result !== null){

                let ip = "";
                let port = 7777;

                if(result[3] !== ''){

                    ip = result[3];

                    if(result[4] !== ''){

                        port = result[4].replace(':','');
                        port = parseInt(port);

                        if(port !== port){
                            message.channel.send(`${config.failIcon} Port must be a valid integer`);
                            return;
                        }
                    }

                    this.query.getExtended(ip, port, message.channel);
                }

            }else{
                message.channel.send(`${config.failIcon} Incorrect syntax for queryServerExtended.`);
            }

        }catch(err){
            console.trace(err);
        }
    }


    async queryPlayers(message){

        try{

            const reg = /^.players (\d+)$/i;

            const result = reg.exec(message.content);

            if(result !== null){

                const server = await this.servers.getServerById(result[1]);

                if(server !== null){

                    this.query.getPlayers(server.ip, server.port, message.channel);

                }else{
                    message.channel.send(`${config.failIcon} A server with id ${parseInt(result[1])} does not exist.`);
                }

            }else{
                message.channel.send(`${config.failIcon} Incorrect syntax for ${config.commandPrefix}players.`);
            }

        }catch(err){
            console.trace(err);
        }
    }

    async queryPlayersAlt(message){

        try{

            const reg = /^.players ((\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(:\d+|)|(.+?)(:\d+|))$/i;

            const result = reg.exec(message.content);

            if(result !== null){

                let ip = "";
                let port = 7777;

                if(result[2] === undefined){

                    if(result[8] !== ''){

                        result[8] = result[8].replace(':','');

                        port = parseInt(result[8]);
                    }

                    this.query.getPlayers(result[7], port, message.channel);

                }else{

                    ip = `${result[2]}.${result[3]}.${result[4]}.${result[5]}`;

                    if(result[6] !== ''){

                        result[6] = result[6].replace(':','');

                        port = parseInt(result[6]);
                    }

                    this.query.getPlayers(ip, port, message.channel);
                }             

            }else{
                message.channel.send(`${config.failIcon} Incorrect syntax for ${config.commandPrefix}players command.`);
            }

        }catch(err){
            console.trace(err);
        }
    }

    async editServer(message){

        //this.servers.editServer(message.content);

        try{

            const editReg = /^.editserver (\d+) (.+?) (.+)$/i;
            
            const result = editReg.exec(message.content);

            if(result != null){

                const serverId = parseInt(result[1]);

                const server = await this.servers.getServerById(serverId);        

                if(server != null){

                    const editType = result[2].toLowerCase();

                    if(editType == 'country'){

                        if(result[3].length !== 2){
                            message.channel.send(`${config.failIcon} Server country code must be 2 characters long.`);
                            return;
                        }

                    }else if(editType == 'ip'){
                        
                        if(result[3].includes(':')){
                            message.channel.send(`${config.failIcon} Server ip can not include the port.`);
                            return;
                        }

                    }else if(editType == 'port'){

                        result[3] = result[3].replace(/\D/ig, '');
                        
                        if(result[3] < 1 || result[3] > 65535){
                            message.channel.send(`${config.failIcon} Server port must be a interger between 1 and 65535`);
                            return;
                        }
                        
                    }

                    //console.log(result);

                    if(this.validEdits.indexOf(editType) !== -1){

                        await this.servers.editServerValue(server.ip, server.port, result[2], result[3]);

                        message.channel.send(`${config.passIcon} Server **${serverId}** updated, **${result[2]}** changed to **${result[3]}**.`);
                        
                    }else{
                        message.channel.send(`${config.failIcon} **${result[2]}** is not a valid edit type for servers.`);
                    }

                }else{
                    message.channel.send(`${config.failIcon} A server with id ${serverId} does not exist.`);
                }

            }else{
                message.channel.send(`${config.failIcon} Incorrect syntax for edit server.`);
            }

        }catch(err){
            console.trace(err);
        }

    }
    
}


module.exports = Bot;