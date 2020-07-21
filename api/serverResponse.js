class ServerResponse{

    constructor(ip, port, type, discordMessage){

        this.ip = ip;
        this.port = port - 1;
        this.timeStamp = Math.floor(Date.now() * 0.001);
        this.type = type;
        this.bReceivedFinal = false;
        this.bSentMessage = false;
        this.discordMessage = discordMessage;

        this.name = "Another UT Server";
        this.gametype = "Deathmatch";
        this.map = "DM-MapName";
        this.currentPlayers = 0;
        this.maxPlayers = 0;
        this.spectators = 0;
        this.players = [];

        this.teams = [
            {"score": 0, "size": 0},
            {"score": 0, "size": 0},
            {"score": 0, "size": 0},
            {"score": 0, "size": 0}
        ];

    }

    parsePacket(data){

        console.log(`${data}`);

        this.parseServerInfoData(data);
        this.parseMapData(data);
        this.parseTeamData(data);
        this.parsePlayerData(data);

        const finalReg = /\\final\\$/i;

        if(finalReg.test(data)){
            this.bReceivedFinal = true;

            this.discordMessage.channel.send("Got server response").then(() =>{

                this.bSentMessage = true;
            });
        }

        console.log(this);
    }

    parseServerInfoData(data){


        const regs = [
            /\\hostname\\(.+?)\\/i,
            /\\gametype\\(.+?)\\/i,
            /\\numplayers\\(\d+?)\\/i,
            /\\maxplayers\\(\d+?)\\/i,
            /\\maxteams\\(\d+?)\\/i,
            /\\gamever\\(\d+?)\\/i,
            /\\minnetver\\(\d+?)\\/i,
            /\\timelimit\\(\d+?)\\/i,
            /\\goalteamscore\\(\d+?)\\/i,
            /\\fraglimit\\(\d+?)\\/i,
            /\\mutators\\(.+?)\\/i,
        ];

        const keys = [
            "name",
            "gametype",
            "currentPlayers",
            "maxPlayers",
            "maxTeams",
            "serverVersion",
            "minClientVersion",
            "timeLimit",
            "goalscore",
            "goalscore",
            "mutators",

        ];

        let result = "";

        for(let i = 0; i < regs.length; i++){

            if(regs[i].test(data)){

                result = regs[i].exec(data);

                this[keys[i]] = result[1];

            }
        }
    }


    parseMapData(data){
        
        const mapTitleReg = /\\maptitle\\(.+?)\\/i;
        const mapNameReg = /\\mapname\\(.+?)\\/i;
        
        let result = mapTitleReg.exec(data);
        if(result !== null) this.mapTitle = result[1];

        result = mapNameReg.exec(data);
        if(result !== null) this.mapName = result[1];
        

    }


    parseTeamData(data){

        const teamScoreReg = /\\score_(\d)\\(\d+?)\\/ig;
        const teamSizeReg = /\\size_(\d)\\(\d+?)\\/ig;

        let result = "";
        
        while(result !== null){

            result = teamScoreReg.exec(data);  
            if(result !== null) this.teams[parseInt(result[1])].score = parseInt(result[2]);

            result = teamSizeReg.exec(data);
            if(result !== null) this.teams[parseInt(result[1])].size = parseInt(result[2]);
        }
    }

    updatePlayer(id, key, value){

        id = parseInt(id);

        for(let i = 0; i < this.players.length; i++){

            if(this.players[i].id === id){

                if(key === "mesh"){
                    if(value.toLowerCase() == "spectator"){
                        this.spectators++;
                    }
                }

                this.players[i][key] = value;
                return;
            }
        }

        this.players.push(
            {"id": id, "name": value}
        );
    }

    parsePlayerData(data){

        const nameReg = /\\player_(\d+)\\(.+?)\\/ig;
        const fragsReg = /\\frags_(\d+)\\(.+?)\\/ig;
        const teamReg = /\\team_(\d+)\\(.+?)\\/ig;
        const meshReg = /\\mesh_(\d+)\\(.+?)\\/ig;
        const faceReg = /\\face_(\d+)\\(.{0,}?)\\/ig;

        let result = "";

        while(result !== null){

            result = nameReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "name", result[2]);

            result = fragsReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "frags", result[2]);

            result = teamReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "team", result[2]);

            result = meshReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "mesh", result[2]);

            result = faceReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "face", result[2]);

        }

    }

}

module.exports = ServerResponse;