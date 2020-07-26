const config = require('./config.json');
const Promise = require('promise');
const dgram = require('dgram');
const ServerResponse = require('./serverResponse');
const dns = require('dns');



class UT99Query{

    constructor(){

        this.server = null;
        console.log("New UT99Query instance.");

        this.responses = [];

        this.createClient();
        //139.162.235.20:7777

        //95.31.20.140:7977
       //this.getFullServer('139.162.235.20', 7777);
        //this.getFullServer('95.31.20.140', 7977);
        //this.getFullServer('66.85.80.155',7797);
        
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

        console.log(`Looking for ${ip}:${port}`);
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

                this.responses.push(new ServerResponse(address, port, "full", message));

                this.server.send('\\info\\xserverquery\\\\players\\xserverquery\\\\rules\\xserverquery\\\\teams\\xserverquery\\', port, address, (err) =>{

                    if(err){
                        throw new Error(err);
                    }

                });
            });


        }catch(err){
            console.trace(err);
        }


    }
}


module.exports = UT99Query;