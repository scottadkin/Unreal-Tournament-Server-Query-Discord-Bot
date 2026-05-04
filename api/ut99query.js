import config from '../config/config.json' with {'type': 'json'};
import dgram from 'node:dgram';
import dns from 'node:dns';
import ServerResponse from './serverResponse.js';
import Servers from './servers.js';
import Channels from './channels.js';

export default class UT99Query{

    constructor(discord, bAuto){

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

            //console.log(`Total Responses = ${this.responses.length} (${this.bAuto})`);

            const now = Math.floor(Date.now() * 0.001);

            for(let i = 0; i < this.responses.length; i++){

                const r = this.responses[i];
      
                if(now - r.timeStamp > config.serverTimeout && !r.bSentMessage){

                    r.bReceivedFinal = true;
                    r.bTimedOut = true;

                    if(r.type !== "basic"){
                        r.sendFullServerResponse(this.channels, this.servers, config.embedColor);
                    }else{

                        r.bSentMessage = true;
                    }

                    continue;
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


    deleteAllBasic(){

        const potatoes = [];

        for(let i = 0; i < this.responses.length; i++){

            const r = this.responses[i];

            if(r.type !== "basic"){

                potatoes.push(r);
            }
        }

        this.responses = potatoes;
    }


    async pingAllServers(){

        try{

            this.deleteAllBasic();

            const servers = await this.servers.getAllServers();
            
            for(let i = 0; i < servers.length; i++){

                await this.getBasicServer(servers[i].ip, servers[i].port);
              
            }

        }catch(err){
            console.trace(err);
        }
    }


    updateAutoQueryMessage(channel, messageId, serverInfo){

        return new Promise((resolve, reject) =>{

            if(messageId !== '-1'){

                channel.messages.fetch(messageId).then(() =>{

                    this.getFullServer(serverInfo.ip, serverInfo.port, channel, true, messageId);

                    resolve();

                }).catch((err) =>{
                    
                   // console.log(`Message has been deleted ${err}`);
                    
                    this.getFullServer(serverInfo.ip, serverInfo.port, channel);

                    resolve();
                });
       
            }else{

                this.getFullServer(serverInfo.ip, serverInfo.port, channel);
               // console.log("Message doesn't exist");
            }

        });
    }

    startAutoQueryLoop(){

        this.autoQueryLoop = setInterval(async () =>{

            const queryChannelId = this.channels.getAutoQueryChannel();

            if(queryChannelId !== null){

                this.discord.channels.fetch(queryChannelId).then(async (channel) =>{

                    const servers = await this.servers.getAllServers();  
 
                    for(let i = 0; i < servers.length; i++){

                        await this.updateAutoQueryMessage(channel, servers[i].last_message, servers[i]);
                          
                    }
                    
                }).catch((err) =>{
                    console.trace(err);
                });



            }else{

                //console.log(`AutoqueryChannel is not SET!`);
            }

        }, config.autoQueryInterval * 1000);
    }


    async initServerPingLoop(){

        try{

            await this.pingAllServers();

        }catch(err){
            console.trace(err);
        }

        this.pingLoop = setInterval(async () =>{

            try{
                await this.pingAllServers();
            }catch(err){
                console.trace(err);
            }

        }, config.serverInfoPingInterval * 1000);


    }

    createClient(){

        this.server = dgram.createSocket("udp4");

        this.server.on('message', (message, rinfo) =>{

            const matchingResponse = this.getMatchingResponse(rinfo.address, rinfo.port - 1);

            if(matchingResponse !== null){

                this.parsePacket(message, matchingResponse);

            }

        });

        this.server.on('listening', () =>{
            const address = this.server.address();
            console.log(`${this.bAuto ? "[Auto] ": ""}QueryPort listening on ${address.port}`);
        });

        this.server.on('error', (err) =>{
            console.trace(err);
        });

       // console.log(`this.bAuto = ${this.bAuto}`);
        if(!this.bAuto){
            this.server.bind(config.udpPort);
        }else{
            this.server.bind(config.udpPortAuto);
        }
    }

    async parsePacket(data, response){

        try{

            const unrealCheckReg = /\\(shortname|mapfilename)\\.*?\\/i;

            if(unrealCheckReg.test(data)){

                const typeResult = unrealCheckReg.exec(data);

                if(typeResult[1].toLowerCase() === 'mapfilename'){
                    response.bHaveUnrealMutators = true;
                }
                
                response.bUnreal = true;
            }

            this.parseServerInfoData(data, response);

            this.parseMapData(data, response);

            if(response.type !== "basic"){

                this.parseTeamData(data, response);
                this.parseMutators(data, response);
                this.parsePlayerData(data, response);
            }

            const finalReg = /\\final\\$/i;

            //unreal queries don;t end with /final/ so we have to do different checks
            if(response.bUnreal){

                if(response.type === 'basic'){

                   // response.bHaveUnrealBasic = true;
                    response.bSentMessage = true;

                    const potato = {
                        "name": response.name,
                        "currentPlayers": response.currentPlayers,
                        "maxPlayers": response.maxPlayers,
                        "gametype": response.gametype,
                        "mapName": response.mapName,
                        "ip": response.ip,
                        "port": response.port
                    };

                    return this.servers.updateInfo(potato);

                }else if(response.type === 'players'){

                   // console.log(response);

                    if(response.bFetchedAllPlayers()){
                        response.sendPlayersResponse();
                    }

                    return;

                }else if(response.type === 'extended' && response.bHaveUnrealMutators){
                    
                    response.sendExtendedResponse();

                    return;

                }else if(response.type === 'full' && response.bFetchedAllPlayers() && response.bHaveUnrealMutators){
                    response.sendFullServerResponse(this.channels, this.servers, config.embedColor);
                    return;
                }

            }

            if(finalReg.test(data)){

                if(response.type == "full"){

                    response.sendFullServerResponse(this.channels, this.servers, config.embedColor);
                    return true;

                }else if(response.type == "basic"){

                    response.bSentMessage = true;
                   
                    //data.name, data.currentPlayers, data.maxPlayers, data.gametype, data.mapName, now, data.ip, data.port
                    const potato = {
                        "name": response.name,
                        "currentPlayers": response.currentPlayers,
                        "maxPlayers": response.maxPlayers,
                        "gametype": response.gametype,
                        "mapName": response.mapName,
                        "ip": response.ip,
                        "port": response.port
                    };

                    this.servers.updateInfo(potato);
                    
                    return true;

                }else if(response.type == "players"){

                    response.sendPlayersResponse();
                    return true;

                }else if(response.type == "extended"){

                    response.sendExtendedResponse();
                    return true;
                }
            }

            return false;

        }catch(err){
            console.trace(err);
        }
    }

    parseServerInfoData(data, response){


        const regs = [
            /\\hostname\\(.+?)\\/i,
            /\\gametype\\(.+?)\\/i,
            /\\numplayers\\(\d+?)\\/i,
            /\\maxplayers\\(\d+?)\\/i,
            /\\maxteams\\(\d+?)\\/i,
            /\\gamever\\(.+?)\\/i,
            /\\minnetver\\(.+?)\\/i,
            /\\mingamever\\(.+?)\\/i,
            /\\timelimit\\(\d+?)\\/i,
            /\\goalteamscore\\(\d+?)\\/i,
            /\\fraglimit\\(\d+?)\\/i,
            /\\mutators\\(.+?)\\/i,
            /\\timelimit\\(.+?)\\/i,
            /\\remainingtime\\(.+?)\\/i,
            /\\protection\\(.+?)\\/i,
            /\\listenserver\\(.+?)\\/i,
            /\\changelevels\\(.+?)\\/i,
            /\\balanceteams\\(.+?)\\/i,
            /\\playersbalanceteams\\(.+?)\\/i,
            /\\friendlyfire\\(.+?)\\/i,
            /\\tournament\\(.+?)\\/i,
            /\\gamestyle\\(.+?)\\/i,
            /\\password\\(.+?)\\/i,
            /\\adminname\\(.+?)\\/i,
            /\\adminemail\\(.+?)\\/i,
            /\\countrys\\(.+?)\\/i,
        ];

        const keys = [
            "name",
            "gametype",
            "currentPlayers",
            "maxPlayers",
            "maxTeams",
            "serverVersion",
            "minClientVersion",
            "minClientVersion",
            "timeLimit",
            "goalscore",
            "goalscore",
            "mutators",
            "timeLimit",
            "remainingTime",
            "protection",
            "dedicated",
            "changeLevels",
            "balancedTeams",
            "playersBalanceTeams",
            "friendlyFire",
            "tournament",
            "gamestyle",
            "password",
            "adminName",
            "adminEmail",
            "country",

            "shortname"
        ];

        let result = "";


        const tOrF = [
            "dedicated",
            "changeLevels",
            "balancedTeams",
            "playersBalanceTeams",
            "tournament",
            "password",
        ];

        for(let i = 0; i < regs.length; i++){

            if(regs[i].test(data)){

                result = regs[i].exec(data);

                if(tOrF.indexOf(keys[i]) == -1){

                    response[keys[i]] = result[1];

                }else{

                    result[1] = result[1].toLowerCase();

                    if(result[1] == "false"){
                        response[keys[i]] = false;
                    }else if(result[1] == "true"){
                        response[keys[i]] = true;
                    }             
                }
            }
        }
    }

    parseMapData(data, response){
        
        const mapTitleReg = /\\maptitle\\(.+?)\\/i;
        const mapNameReg = /\\mapname\\(.+?)\\/i;
        
        let result = mapTitleReg.exec(data);
        if(result !== null) response.mapTitle = result[1];

        result = mapNameReg.exec(data);
        if(result !== null) response.mapName = result[1];
        
    }

    parseTeamData(data, response){

        const teamScoreReg = /\\score_(\d)\\(.+?)\\/ig;
        const teamSizeReg = /\\size_(\d)\\(\d+?)\\/ig;

        let result = "";
        
        while(result !== null){

            result = teamScoreReg.exec(data);  
            if(result !== null) response.teams[parseInt(result[1])].score = parseInt(result[2]);

            result = teamSizeReg.exec(data);
            if(result !== null) response.teams[parseInt(result[1])].size = parseInt(result[2]);
        }
    }

    parseMutators(message, response){


        if(!response.bUnreal){

            const reg = /\\mutators\\(.+?)\\/i;

            if(reg.test(message)){
                
                const result = reg.exec(message);

                response.mutators = result[1].split(', ');
            }     

        }else{

            const uReg = /\\mutator\\(.+?)\\/ig;

            let result = '';

            while(result !== null){

                result = uReg.exec(message);

                if(result !== null){

                    response.mutators.push(result[1]);
                }
            }

        }
    }

    parsePlayerData(data, response){

        const nameReg = /\\player_(\d+?)\\(.+?)\\/ig;
        const fragsReg = /\\frags_(\d+?)\\(.+?)\\/ig;
        const teamReg = /\\team_(\d+?)\\(\d+?)\\/ig;
        const meshReg = /\\mesh_(\d+?)\\(.*?)\\/ig;
        const faceReg = /\\face_(\d+?)\\(.*?)\\/ig;
        const countryReg = /\\countryc_(\d+?)\\(.*?)\\/ig;
        const pingReg = /\\ping_(\d+?)\\(.*?)\\/ig;
        const timeReg = /\\time_(\d+?)\\(.*?)\\/ig;
        const deathsReg = /\\deaths_(\d+?)\\(.*?)\\/ig;
        const healthReg = /\\health_(\d+?)\\(.*?)\\/ig;
        const spreeReg = /\\spree_(\d+?)\\(.*?)\\/ig;

        let result = "";
        let currentMesh = "";

        while(true){

            currentMesh = "";

            result = nameReg.exec(data);

            if(result !== null){
                response.updatePlayer(result[1], "name", result[2]);
            
            }else{
                //console.table(this.players);
                return;
            }

            result = teamReg.exec(data);
            if(result !== null) response.updatePlayer(result[1], "team", result[2]);

            result = meshReg.exec(data);

            if(result !== null){
                currentMesh = result[2].toLowerCase();
                response.updatePlayer(result[1], "mesh", result[2]);
            }

            result = faceReg.exec(data);
            if(result !== null) response.updatePlayer(result[1], "face", result[2]);


            result = countryReg.exec(data);
            if(result !== null) response.updatePlayer(result[1], "country", result[2]);


            result = fragsReg.exec(data);

            if(result !== null) response.updatePlayer(result[1], "frags", parseInt(result[2]));

            result = pingReg.exec(data);

            if(result !== null) response.updatePlayer(result[1], "ping", parseInt(result[2]));

            result = timeReg.exec(data);

            if(result !== null) response.updatePlayer(result[1], "time", parseInt(result[2]));

            result = deathsReg.exec(data);

            if(result !== null) response.updatePlayer(result[1], "deaths", parseInt(result[2]));

            result = healthReg.exec(data);

            if(result !== null) response.updatePlayer(result[1], "health", parseInt(result[2]));

            result = spreeReg.exec(data);

            if(result !== null) response.updatePlayer(result[1], "spree", parseInt(result[2]));
            
        }
    }

    getMatchingResponse(ip, port, ignoreTimeStamp){

        for(let i = 0; i < this.responses.length; i++){

            const r = this.responses[i];

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

        return new Promise((resolve, reject) =>{

            port = parseInt(port);

            if(port !== port){
                reject("port must be a valid integer.");
            }

            port = port + 1;

            dns.lookup(ip, (err, address) =>{

                if(err) reject(err);

                this.responses.push(new ServerResponse(address, port, "basic"));

                this.server.send('\\info\\xserverquery\\', port, address, (err) =>{

                    if(err){
                        reject(err);
                    }

                    resolve();
                });
            });

        });
       
        

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