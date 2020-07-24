const Promise = require('promise');
const Discord = require('discord.js');
const config = require('./config.json');
const UT99Query = require('./ut99query.js');
const db = require('./db');

class Bot{

    constructor(){

        this.client = null;
        this.query = new UT99Query();

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
                }
            }
        });

        this.client.login(config.token);
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

        if(message.content.startsWith(`${config.commandPrefix}allowrole `)){
            this.allowRole(message);
        }
    }


    addRole(role){

        return new Promise((resolve, reject) =>{

        });
    }

    async allowRole(message){

        const reg = /^.allowrole (.+)$/i;

        const result = reg.exec(message.content);

        if(result === null){
            message.channel.send(`Wrong syntax for allowrole command.`);
            return;
        }
        console.log(result);

        const channelRoles = message.channel.guild.roles.cache;

        console.log(channelRoles);

        if(channelRoles.some((r => r.name.toLowerCase() == result[1].toLowerCase()))){

            console.log("role exists");

            await this.addRole(result[1]);
        }else{
            message.channel.send(`There is no role called **${result[1]}** in this channel.`);
        }
    }
}


module.exports = Bot;