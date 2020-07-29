const config = require('./config.json');
const Promise = require('promise');
const dgram = require('dgram');
const ServerResponse = require('./serverResponse');
const dns = require('dns');
const Servers = require('./servers');



class UT99Query{

    constructor(db){

        this.db = db;
        this.server = null;

        this.responses = [];

        this.createClient();

        this.servers = new Servers(db);

        this.autoQueryLoop = null;

        
        this.init();
    }

    init(){

        setInterval(() =>{

            const now = Math.floor(Date.now() * 0.001);

            let r = 0;

            for(let i = 0; i < this.responses.length; i++){

                r = this.responses[i];

                
                if(now - r.timeStamp > config.serverTimout && !r.bSentMessage){

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

        }, config.serverTimout * 1000);


        this.initServerPingLoop();
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

    startAutoQueryLoop(){

        this.autoQueryLoop = setInterval(() =>{


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

            console.log(`${message}`);

            const matchingResponse = this.getMatchingResponse(rinfo.address, rinfo.port - 1);

            if(matchingResponse !== null){

                matchingResponse.parsePacket(message);

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

        this.server.bind();
    }

    getMatchingResponse(ip, port){

        //console.log(`Looking for ${ip}:${port}`);
        let r = 0;

        for(let i = 0; i < this.responses.length; i++){

            r = this.responses[i];

            if(r.ip == ip && r.port == port && !r.bSentMessage){
                return r;
            }
        }

        return null;

    }

    getFullServer(ip, port, message){

        try{

            port = parseInt(port);

            if(port !== port){
                throw new Error("Port must be a valid integer!");
            }

            port = port + 1;

            dns.lookup(ip, (err, address, family) =>{

                if(err) console.trace(err);

                //console.log('address: %j family: IPv%s', address, family);

                this.responses.push(new ServerResponse(address, port, "full", message, this.db));

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

                this.responses.push(new ServerResponse(address, port, "basic", null, this.db));

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
}


module.exports = UT99Query;