const Promise = require('promise');
const Discord = require('discord.js');
const config = require('./config.json');
const UT99Query = require('./ut99query.js');

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
                    this.query.getFullServer('139.162.235.20', 7777, message);
                }
            }
        });


        this.client.login(config.token);
    }
}


module.exports = Bot;