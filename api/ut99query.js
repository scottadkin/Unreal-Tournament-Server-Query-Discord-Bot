const config = require('./config.json');
const Promise = require('promise');
const dgram = require('dgram');
const ServerResponse = require('./serverResponse');
const dns = require('dns');
const Servers = require('./servers');
const Channels = require('./channels');
const Discord = require('discord.js');
const Database = require('./db');



class UT99Query{

    constructor(discord, bAuto){

        this.db = new Database();
        this.db = this.db.sqlite;
        this.server = null;

        this.responses = [];

        this.bAuto = false;

        if(bAuto !== undefined){
            this.bAuto = true;
        }

        this.createClient();

        this.servers = new Servers();
        this.channels = new Channels();
        this.discord = discord;

        this.autoQueryLoop = null;

        this.init();
    }

    init(){

        setInterval(() =>{

            const now = Math.floor(Date.now() * 0.001);

            let r = 0;

            for(let i = 0; i < this.responses.length; i++){

                r = this.responses[i];
      
                if(now - r.timeStamp > config.serverTimeout && !r.bSentMessage){

                    r.bReceivedFinal = true;
                    r.bTimedOut = true;
                    r.sendFullServerResponse();
                }
            }

            this.responses = this.responses.filter((a) =>{

                if(!a.bSentMessage){
                    return true;
                }
            });

        }, (config.serverTimeout * 2) * 1000);


        if(this.bAuto){
            this.startAutoQueryLoop();
        
            this.initServerPingLoop();
        }
    }


    async pingAllServers(){

        try{

            const servers = await this.servers.getAllServers();

            for(let i = 0; i < servers.length; i++){
        
                setTimeout(() =>{

                    const s = servers[i];

                    this.getBasicServer(s.ip, s.port);

                },500);                
            }

        }catch(err){
            console.trace(err);
        }
    }


    updateAutoQueryMessage(channel, messageId, serverInfo){

        return new Promise((resolve, reject) =>{

            if(messageId !== '-1'){

                channel.messages.fetch(messageId).then((message) =>{

                    this.getFullServer(serverInfo.ip, serverInfo.port, channel, true, messageId);

                    resolve();

                }).catch((err) =>{
                    
                    console.log(`Message has been deleted ${err}`);
                    
                    this.getFullServer(serverInfo.ip, serverInfo.port, channel);

                    resolve();
                });
       
            }else{

                this.getFullServer(serverInfo.ip, serverInfo.port, channel);
                console.log("Message doesn't exist");
            }

        });
    }

    startAutoQueryLoop(){

        this.autoQueryLoop = setInterval(async () =>{

            const queryChannelId = await this.channels.getAutoQueryChannel();

            if(queryChannelId !== null){

                this.discord.channels.fetch(queryChannelId).then(async (channel) =>{

                    if(config.bAutoQueryMessagesOnly){

                        const servers = await this.servers.getAllServers();  

                        const serverMessageIds = [];
                        
                        for(let i = 0; i < servers.length; i++){

                            if(serverMessageIds.indexOf(servers[i].last_message) === -1){
                                serverMessageIds.push(servers[i].last_message);
                            }
                        }


                        const autoQueryInfoPostId = await this.channels.getAutoQueryMessageId();

                        let messages = await channel.messages.fetch({"limit": 20});

                        messages = messages.array();

                        for(let i = 0; i < messages.length; i++){


                            //console.log(i);
                            //console.log(`autoQueryInfoPostId = ${autoQueryInfoPostId}`);
                            if(autoQueryInfoPostId !== null){

                                if(messages[i].id == autoQueryInfoPostId){
                                    //console.log("FOUND AUTO QUERY MESSAGE ID");
                                    continue;
                                }
                            }

                            if(!messages[i].author.bot || serverMessageIds.indexOf(messages[i].id) === -1){

                                await messages[i].delete().then(() =>{

                                    console.log("Old message deleted");

                                }).catch((err) =>{
                                    console.trace(err);
                                });
                            }
                        }

                        for(let i = 0; i < servers.length; i++){

                            setTimeout(async () =>{
                                await this.updateAutoQueryMessage(channel, servers[i].last_message, servers[i]);
                            }, 500);
                            
                            
                        }
                    }  
                    
                }).catch((err) =>{
                    console.trace(err);
                });



            }else{

                console.log(`AutoqueryChannel is not SET!`);
            }

        }, config.autoQueryInterval * 1000);
    }


    initServerPingLoop(){

        this.pingAllServers();

        setInterval(() =>{

            this.pingAllServers();

        }, config.serverInfoPingInterval * 1000);
    }

    createClient(){

        this.server = dgram.createSocket("udp4");

        this.server.on('message', (message, rinfo) =>{

            //console.log(`*******************************************************`);
            //console.log(`${message}`);
            //console.log(`-------------------------------------------------------`);

            const matchingResponse = this.getMatchingResponse(rinfo.address, rinfo.port - 1);

            if(matchingResponse !== null){

                if(!matchingResponse.parsePacket(message)){

                    this.getMatchingResponse(rinfo.address, rinfo.port - 1, matchingResponse.timeStamp);
                }

            }else{
                console.log("There is no matching data for this server");
            }

        });

        this.server.on('listening', () =>{
            console.log("Meow Im a horse");
        });

        this.server.on('error', (err) =>{
            console.trace(err);
        });

        console.log(`this.bAuto = ${this.bAuto}`);
        if(!this.bAuto){
            this.server.bind(config.udpPort);
        }else{
            this.server.bind(config.udpPortAuto);
        }
    }

    getMatchingResponse(ip, port, ignoreTimeStamp){

        //console.log(`Looking for ${ip}:${port}`);
        let r = 0;

        for(let i = 0; i < this.responses.length; i++){

            r = this.responses[i];

            if(r.ip == ip && r.port == port && !r.bSentMessage){

                if(ignoreTimeStamp === undefined){
                    return r;
                }else{

                    if(r.timeStamp !== ignoreTimeStamp){
                        return r;
                    }
                }
            }
        }

        return null;

    }

    getFullServer(ip, port, message, bEdit, messageId){

        try{

            //console.log(arguments);
            port = parseInt(port);

            if(port !== port){
                throw new Error("Port must be a valid integer!");
            }

            port = port + 1;

            dns.lookup(ip, (err, address) =>{

                if(err) console.trace(err);

                //console.log('address: %j family: IPv%s', address, family);


                if(bEdit === undefined){
                    this.responses.push(new ServerResponse(address, port, "full", message));
                }else{
                    this.responses.push(new ServerResponse(address, port, "full", message, true, messageId));
                }

                this.server.send('\\info\\xserverquery\\\\players\\xserverquery\\\\rules\\xserverquery\\\\teams\\xserverquery\\', port, address, (err) =>{

                    if(err){
                        console.trace(err);
                    }

                });
            });


        }catch(err){
            console.trace(err);
        }
    }

    getBasicServer(ip, port){

        try{

            port = parseInt(port);

            if(port !== port){
                throw new Error("port must be a valid integer.");
            }

            port = port + 1;

            dns.lookup(ip, (err, address, family) =>{

                if(err) console.trace(err);

                this.responses.push(new ServerResponse(address, port, "basic", null));

                this.server.send('\\info\\xserverquery\\', port, address, (err) =>{

                    if(err){
                        console.log(err);
                    }
                });
            });
            
        }catch(err){
            console.trace(err);
        }
    }

    getPlayers(ip, port, message){

        dns.lookup(ip, (err, address) =>{

            if(err) console.trace(err);

            this.responses.push(new ServerResponse(address, port + 1, "players", message));

            this.server.send('\\info\\xserverquery\\\\players\\xserverquery\\', port + 1, address, (err) =>{

                if(err){
                    console.log(err);
                }
            });
        });
    }

    getExtended(ip, port, message){

        dns.lookup(ip, (err, address, family) =>{

            if(err) console.trace(err);

            this.responses.push(new ServerResponse(address, port + 1, "extended", message));

            this.server.send('\\info\\xserverquery\\\\rules\\xserverquery\\', port + 1, address, (err) =>{

                if(err){
                    console.log(err);
                }
            });
        });
    }
}


module.exports = UT99Query;