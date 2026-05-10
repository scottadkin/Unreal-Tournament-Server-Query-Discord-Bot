import { Client,  EmbedBuilder, Events, GatewayIntentBits, Partials } from "discord.js";
import { commandPrefix, failIcon, passIcon, token, bDisplayNotEnabledMessage, embedColor, bSkipAdminHelpToNonAdmins } from "../config/config.js";
import UT99Query from "./ut99query.js";
import Servers from "./servers.js";
import Channels from "./channels.js";
import Roles from "./roles.js";
import diagnosticsChannel from 'node:diagnostics_channel';

const USER_COMMANDS = [
    {"name": `servers`, "content": `Lists all servers added to the database.`},
    {"name": `active`, "content": `Lists all servers added to the database that have at least one player.`},
    {"name": `q ip:port`, "content": `Query an Unreal Tournament server, if no port is specified 7777 is used. Domain names can also be used instead of an ip.`},
    {"name": `q serverID`, "content": `Query an Unreal Tournament server by just using the server's id. Use the ${commandPrefix}servers command to find a server's id.`},
    {"name": `ip serverID`, "content": `Displays the specified server's address.`},
    {"name": `players serverID`, "content": `Displays extended information about players on the server.`},
    {"name": `players ip:port`, "content": `Displays extended information about players on the server, domain address also work, if no port specified 7777 is used.`},
    {"name": `extended serverID`, "content": `Displays extended information about the server.`},
    {"name": `help`, "content": `Shows this command.`},
    {
        "name": "Bot Github", 
        "content": `<https://github.com/scottadkin/Unreal-Tournament-Server-Query-Discord-Bot>`,
        "bSkipPrefix": true
    }
];

const ADMIN_COMMANDS = [

    {"name": `allowchannel`, "content": `Enables the bot to be used in the current channel.`},
    {"name": `blockchannel`, "content": `Disables the bot in the current channel.`},
    {"name": `listchannels`, "content": `Displays a list of channels the bot can be used in.`},
    {"name": `allowrole role`, "content": `Allows users with specified role to use admin bot commands.`},
    {"name": `removerole role`, "content": `Stops users with specified role being able to use admin bot commands.`},
    {"name": `listroles`, "content": `Displays a list of roles that can use the bots admin commands.`},
    {"name": `addserver alias ip:port`, "content": `Adds the specified server details into the database.`},
    {"name": `removeserver serverID`, "content": `Removes the specified server from the database.`},
    {"name": `setauto`, "content": `Sets the current channel as the auto query and display channel where the posts are updated in regualr intervals with the latest information from the server.`},
    {"name": `stopauto`, "content": `Disables autoquery channel from updating.`},
    {"name": `editserver id type value`, "content": `Edit selected server's value type. Types:**(alias,ip,country,port)**`}

];



export default class Bot{

    constructor(){

        this.client = null;

        this.validEdits = [
            "alias",
            "ip",
            "country",
            "port"
        ];
        
        this.servers = new Servers();
        this.channels = new Channels();
        this.roles = new Roles();

        this.createClient();
    }

    createClient(name){

        this.name = name;

        this.client = new Client({
            "messageCacheMaxSize": 1,
            "messageCacheLifetime": 10,
            "messageSweepInterval": 30,
            "messageEditHistoryMaxSize": 0,
            "partials": [Partials.Channel],
            "intents": [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ],

        });

        this.client.on('clientReady', () =>{

            this.query = new UT99Query(this.client, false);
            this.queryAuto = new UT99Query(this.client, true);
            console.log(`I'm in the discord server...`);
       
        });

        this.client.on('error', (err) =>{

            if(err){
                console.trace(err);
            }

        });

        this.client.on('messageCreate', (message) =>{

            if(message.author.bot) return;
            
            try{

                this.checkCommand(message);

            }catch(err){
                console.trace(err);
            }
            
        });


        this.client.rest.on('rateLimited', (a) =>{
            console.log(a);
            console.log("I Have been rate LIMITED")
        }); 

        this.client.login(token);
    }

    checkCommand(message){

        if(!message.content.startsWith(commandPrefix) || message.content.length === 1){
            return;
        }

        //ignore double in case someone wants to show another user how to use a command like ..q1
        if(message.content[0] == commandPrefix && message.content[1] == commandPrefix){
            return;
        }

        if(this.roles.bUserAdmin(message)){

            if(this.adminCommands(message)){
                return;
            }
            
        }else{

            if(this.adminCommands(message, true)){
                return;
            }
        }

        this.normalCommands(message);

    }

    normalCommands(message){

        if(!this.channels.bBotCanCommentInChannel(message)){

            if(bDisplayNotEnabledMessage){
                message.channel.send(`${failIcon} The bot is not enabled in this channel.`);
            }

            return;
        }

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
        
            this.servers.listServers(message);

        }else if(activeReg.test(message.content)){
           
            this.servers.listServers(message, true);

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
    }

    createHelpEmbed(message, bAdmin){

        const p = commandPrefix;
        const commands = (bAdmin) ? ADMIN_COMMANDS : USER_COMMANDS;

        const fields = commands.map((c) =>{
            return {
                "name": `${(c.bSkipPrefix === undefined) ? p : "" }${c.name}`, 
                "value": c.content, 
                "inline": false
            }
        });

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${(bAdmin) ? "Admin Commands" : "User Commands"}`)
        .setFields(fields);


        message.channel.send({"embeds": [embed]});

    }

    helpCommand(message){

        this.createHelpEmbed(message, false);

        if(!this.roles.bUserAdmin(message) && bSkipAdminHelpToNonAdmins){
            return;
        }

        this.createHelpEmbed(message, true);
    }

    adminCommands(message, bFailed){

        const m = message.content;
        const p = commandPrefix;

        const commands = [
            `${p}allowrole`,
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
                    message.channel.send(`${failIcon} Only users with an admin role can use that command.`);
                    return true;
                }
            } 
        }

        if(m.startsWith(commands[0])){

            this.roles.allowRole(message);

        }else if(m.startsWith(commands[1])){

            this.roles.removeRole(message);

        }else if(m.startsWith(commands[2])){

            this.roles.listRoles(message);

        }else if(m.startsWith(commands[3])){

            this.channels.allowChannel(message);

        }else if(m.startsWith(commands[4])){

            this.channels.blockChannel(message);

        }else if(m.startsWith(commands[5])){

            this.channels.listChannels(message);

        }else if(m.startsWith(commands[6])){

            this.servers.addServer(message);

        }else if(m.startsWith(commands[7])){

            this.servers.removeServer(message);

        }else if(m.startsWith(commands[8])){

            this.channels.enableAutoQuery(message, this.servers);

        }else if(m.startsWith(commands[9])){

            this.channels.disableAutoQuery(message, this.servers);

        }else if(m.startsWith(commands[10])){

            this.editServer(message);

        }else{

            return false;
        }

        return true;
    }

    shortQueryServer(message){

        const reg = /^.q(\d+)$/i;

        const result = reg.exec(message.content);

        if(result === null){
            return message.channel.send(`${failIcon} Incorrect syntax for ${commandPrefix}q serverid.`);
        }

        const server = this.servers.getServerById(result[1]);

        if(server === null){
            return message.channel.send(`${failIcon} There is no server with the id of ${parseInt(result[1])}.`);
        }


        this.query.getFullServer(server.ip, server.port, message.channel);
    }

    queryServer(message){

        const reg = /^.q (((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(.{0,}))|((.+?)(.{0}|:\d{1,})))$/i;

        const result = reg.exec(message.content);

        if(result === null) return;

        //check if an ip or domain name
        if(result[2] === undefined){

            const domainName = result[6];

            let port = 7777;

            if(result[7] !== ''){

                port = parseInt(result[7].replace(':',''));            

            }

            this.query.getFullServer(domainName, port, message.channel);

        }else{

            const ip = result[3];

            let port = 7777;

            if(result[4] !== ''){      
                port = parseInt(result[4].replace(':',''));
            }

            this.query.getFullServer(ip, port, message.channel);
        }
        
    }


    queryServerExtended(message){

        const reg = /^.extended (\d+)$/i;

        const result = reg.exec(message.content);

        if(result === null){
            return message.channel.send(`${failIcon} There is no server with that id.`);
        }

        const server = this.servers.getServerById(result[1]);

        if(server != null){

            let id = parseInt(result[1]);

            id--;

            this.query.getExtended(server.ip, server.port, message.channel);
            
        }else{
        
            message.channel.send(`${failIcon} There is no server with that id.`);
        }
    }

    queryServerExtendedAlt(message){

        const reg = /^.extended (((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+|))|(.+?(:\d+|)))$/i;

        const result = reg.exec(message.content);

        if(result === null){
            return message.channel.send(`${failIcon} Incorrect syntax for queryServerExtended.`);
        }

        let port = 7777;

        if(result[3] === undefined) return;
        if(result[3] === "") return;

        const ip = result[3];

        if(result[4] !== undefined && result[4] !== ""){

            port = result[4].replace(':','');
            port = parseInt(port);

            if(port !== port){
                message.channel.send(`${failIcon} Port must be a valid integer`);
                return;
            }
        }

        this.query.getExtended(ip, port, message.channel);
        
    }


    queryPlayers(message){

        const reg = /^.players (\d+)$/i;

        const result = reg.exec(message.content);

        if(result === null){
            return message.channel.send(`${failIcon} Incorrect syntax for ${commandPrefix}players.`);
        }

        const server = this.servers.getServerById(result[1]);

        if(server !== null){

            this.query.getPlayers(server.ip, server.port, message.channel);

        }else{
            message.channel.send(`${failIcon} A server with id ${parseInt(result[1])} does not exist.`);
        }

    }

    queryPlayersAlt(message){

        const reg = /^.players ((\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(:\d+|)|(.+?)(:\d+|))$/i;

        const result = reg.exec(message.content);

        if(result === null){
            return message.channel.send(`${failIcon} Incorrect syntax for ${commandPrefix}players command.`);
        }

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
    }

    editServer(message){

        const editReg = /^.editserver (\d+) (.+?) (.+)$/i;
        
        const result = editReg.exec(message.content);

        if(result === null){
            return message.channel.send(`${failIcon} Incorrect syntax for edit server.`);
        }

        const serverId = parseInt(result[1]);

        const server = this.servers.getServerById(serverId); 
        
        if(server === null){
            return message.channel.send(`${failIcon} A server with id ${serverId} does not exist.`);
        }

        const editType = result[2].toLowerCase();

        if(editType == 'country'){

            if(result[3].length !== 2){
                return message.channel.send(`${failIcon} Server country code must be 2 characters long.`);      
            }

        }else if(editType == 'ip'){
            
            if(result[3].includes(':')){
                return message.channel.send(`${failIcon} Server ip can not include the port.`);     
            }

        }else if(editType == 'port'){

            result[3] = result[3].replace(/\D/ig, '');
            
            if(result[3] < 1 || result[3] > 65535){
                return message.channel.send(`${failIcon} Server port must be a interger between 1 and 65535`);             
            }     
        }


        if(this.validEdits.indexOf(editType) !== -1){

            this.servers.editServerValue(server.ip, server.port, result[2], result[3]);

            message.channel.send(`${passIcon} Server **${serverId}** updated, **${result[2]}** changed to **${result[3]}**.`);
            
        }else{
            message.channel.send(`${failIcon} **${result[2]}** is not a valid edit type for servers.`);
        }
    }
    
}
