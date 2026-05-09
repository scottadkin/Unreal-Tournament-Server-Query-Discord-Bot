import { udpPort, udpPortAuto, serverTimeout, embedColor, autoQueryInterval, serverInfoPingInterval } from '../config/config.js';
import dgram from 'node:dgram';
import ServerResponse from './serverResponse.js';
import Servers from './servers.js';
import Channels from './channels.js';
import { bValidPort, getIP4Address } from './generic.js';

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

    createClient(){

        this.server = dgram.createSocket("udp4");

        this.server.on('message', (message, rinfo) =>{

            try{

                const matchingResponse = this.getMatchingResponse(rinfo.address, rinfo.port - 1);

                if(matchingResponse === null){
                    return;
                }

                this.parsePacket(message, matchingResponse);

            }catch(err){
                console.trace(err);
            }
        });

        this.server.on('listening', () =>{
            const address = this.server.address();
            console.log(`${this.bAuto ? "[Auto] ": ""}QueryPort listening on ${address.port}`);
        });

        this.server.on('error', (err) =>{
            console.trace(err);
        });

        if(!this.bAuto){
            this.server.bind(udpPort);
        }else{
            this.server.bind(udpPortAuto);
        }
    }

    init(){

        setInterval(() =>{

            const now = Math.floor(Date.now() * 0.001);

            for(let i = 0; i < this.responses.length; i++){

                const r = this.responses[i];

                const age = now - r.timeStamp;


                if(age > serverTimeout && !r.bSentMessage){

                    r.bReceivedFinal = true;
                    r.bTimedOut = true;

                    if(r.type !== "basic"){
                        r.sendFullServerResponse(this.channels, this.servers, embedColor);
                    }else{
                        r.bSentMessage = true;
                    }
                }
            }

            this.responses = this.responses.filter((a) =>{

                //might actually want to delete the old responses if they timeout...
                if(a.bTimedOut){
                    return false;
                }

                if(!a.bSentMessage){
                    return true;
                }
            });

        }, 1000);


        if(!this.bAuto) return
        this.startAutoQueryLoop();   
        this.initServerPingLoop();
        
    }


    deleteAllBasic(){

        const responses = [];

        for(let i = 0; i < this.responses.length; i++){

            const r = this.responses[i];

            if(r.type !== "basic"){
                responses.push(r);
            }
        }

        this.responses = responses;
    }


    async pingAllServers(){

        this.deleteAllBasic();

        const servers = this.servers.getAllServers();

        const pings = [];

        for(let i = 0; i < servers.length; i++){
                   
            pings.push(this.getBasicServer(servers[i].ip, servers[i].port));
        }

        return await Promise.all(pings);

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
    
                throw new Error(`Autoquery message doesn't exist. ${serverInfo.ip} ${serverInfo.port}`);
            }

        });
    }

    startAutoQueryLoop(){

        this.autoQueryLoop = setInterval(() =>{

            const queryChannelId = this.channels.getAutoQueryChannel();

            if(queryChannelId === null){
                return;
            }

            this.discord.channels.fetch(queryChannelId).then(async (channel) =>{

                const servers = await this.servers.getAllServers();  

                for(let i = 0; i < servers.length; i++){

                    await this.updateAutoQueryMessage(channel, servers[i].last_message, servers[i]);               
                }
                
            }).catch((err) =>{
                console.trace(err);
            });

        }, autoQueryInterval * 1000);
    }


    initServerPingLoop(){

        setTimeout(async () =>{
        
            await this.pingAllServers();

            this.initServerPingLoop();

        }, serverInfoPingInterval * 1000);


    }

    parsePacket(data, response){

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

        if(response.type == "basic"){

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

            this.servers.updateInfo(potato);
        }

        //unreal queries don;t end with /final/ so we have to do different checks
        if(response.bUnreal){

            if(response.type === 'players'){

                if(response.bFetchedAllPlayers()){
                    response.sendPlayersResponse();
                }


            }else if(response.type === 'extended' && response.bHaveUnrealMutators){
                
                response.sendExtendedResponse();

            }else if(response.type === 'full' && response.bFetchedAllPlayers() && response.bHaveUnrealMutators){

                response.sendFullServerResponse(this.channels, this.servers, embedColor);       
            }

            return;
        }

        if(!finalReg.test(data)) return;

        if(response.type == "full"){
            response.sendFullServerResponse(this.channels, this.servers, embedColor);
        }else if(response.type == "players"){
            response.sendPlayersResponse();
        }else if(response.type == "extended"){
            response.sendExtendedResponse();
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

        const tOrF = [
            "dedicated",
            "changeLevels",
            "balancedTeams",
            "playersBalanceTeams",
            "tournament",
            "password",
        ];

        for(let i = 0; i < regs.length; i++){

            if(!regs[i].test(data)) continue;

            const result = regs[i].exec(data);

            if(tOrF.indexOf(keys[i]) == -1){

                response[keys[i]] = result[1];
                continue;
            }

            response[keys[i]] = result[1].toLowerCase() === "true";     
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
            return;
        }
        

        const uReg = /\\mutator\\(.+?)\\/ig;

        let result = '';

        while(result !== null){

            result = uReg.exec(message);

            if(result !== null){

                response.mutators.push(result[1]);
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

        while(true){

            let currentMesh = "";

            let result = nameReg.exec(data);

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

    getMatchingResponse(ip, port){

        for(let i = 0; i < this.responses.length; i++){

            const r = this.responses[i];

            if(r.ip == ip && r.port == port && !r.bSentMessage){

                return r;
            }
        }

        return null;

    }


    getQueryMessage(type){

        type = type.toLowerCase();

        if(type === "basic"){
            return `\\info\\xserverquery\\`;
        }else if(type === "players"){
            return `\\info\\xserverquery\\\\players\\xserverquery\\`;
        }else if(type === "extended"){
            return `\\info\\xserverquery\\\\rules\\xserverquery\\`;
        }else if(type === "full"){
            return `\\info\\xserverquery\\\\players\\xserverquery\\\\rules\\xserverquery\\\\teams\\xserverquery\\`;
        }


        throw new Error("Unknown Message Type");
        
    }

    udpSend(address, port, type, discordMessage, bEdit, messageId){

        return new Promise((resolve, reject) =>{

            port = parseInt(port);

            if(!bValidPort(port)) return reject("Not a valid port");

            port = port + 1;

            if(type === undefined) return reject("Message type is required");
            
            const message = this.getQueryMessage(type);
            
            this.responses.push(new ServerResponse(address, port, type, discordMessage, bEdit, messageId));

            this.server.send(message, port, address, (err) =>{

                if(err){
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    async getFullServer(ip, port, discordMessage, bEdit, messageId){

        try{
            const address = await getIP4Address(ip);

            await this.udpSend(address, port, "full", discordMessage, bEdit, messageId);
        }catch(err){
            console.trace(err);
        }

    }

    //catch errors here so pingAllServers doesn't stop before the last server
    async getBasicServer(ip, port){

        try{

            const started = new Date(Date.now());

            const address = await getIP4Address(ip);

            await this.udpSend(address, port, "basic");

        }catch(err){
            console.trace(err);
        }

    }

    async getPlayers(ip, port, discordMessage){

        try{
            const address = await getIP4Address(ip);

            await this.udpSend(address, port, "players", discordMessage);
        }catch(err){
            console.trace(err);
        }
    }

    async getExtended(ip, port, discordMessage){

        const address = await getIP4Address(ip);

        await this.udpSend(address, port, "extended", discordMessage);;
    }
}