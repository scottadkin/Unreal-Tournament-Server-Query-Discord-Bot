const Discord = require('discord.js');

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
        this.totalPlayers = 0;

        this.teams = [
            {"score": 0, "size": 0},
            {"score": 0, "size": 0},
            {"score": 0, "size": 0},
            {"score": 0, "size": 0}
        ];

    }

    parsePacket(data){

        //console.log(`${data}`);

        this.parseServerInfoData(data);
        this.parseMapData(data);
        this.parseTeamData(data);
        this.parsePlayerData(data);

        const finalReg = /\\final\\$/i;

        if(finalReg.test(data)){

            this.sendFullServerResponse();
        }

        //console.log(this);
    }

    createPlayersString(team, bSpectator){

        let string = "";

        let p = 0;

        let currentFlag = "";

        for(let i = 0; i < this.players.length; i++){

            p = this.players[i];

            if(p.country === undefined){
                currentFlag = ":video_game:";
            }else{
                currentFlag = `:flag_${p.country}:`;
            }

           // :flag_${p.country}:

            if(!bSpectator){

                if(parseInt(p.team) == team){

                    if(p.mesh.toLowerCase() != "spectator"){
                        string += `${currentFlag} **${p.name}** ${p.frags}\n`;
                    }
                }

            }else if(bSpectator){
                    
                if(p.mesh.toLowerCase() == "spectator"){

                    if(string != ""){
                        string += ", ";
                    }

                    string += `${currentFlag} ${p.name}`;
                }
            }
            

        }

        if(string == ""){
            string = "No players.";
        }

        return string;
    }

    createPlayerFields(){

        const fields = [];

        const teamNames = [
            "Red Team",
            "Blue Team",
            "Green Team",
            "Yellow Team"
        ];

        this.maxTeams = parseInt(this.maxTeams);

        for(let i = 0; i < this.maxTeams; i++){

            fields.push(
                {"name": teamNames[i], "value": this.createPlayersString(i, false), "inline": (i < 2) ? true : false }
            );
        }

        fields.push({
            "name": "Spectators", "value": `${this.createPlayersString(-1, true)}`, "inline": false}
        );


        console.table(fields);

        return fields;
    }

    sendFullServerResponse(){


        this.players.sort((a, b) =>{

            a = a.frags;
            b = b.frags;

            if(a < b){
                return 1;
            }else if(a > b){
                return -1;
            }

            return 0;
        });

        this.bReceivedFinal = true;

        const description = `**:office: Unknown
:wrestling: Players ${this.totalPlayers}/${this.maxPlayers}
:pushpin: ${this.gametype}
:map: ${this.mapName}
:goal: Target Score ${this.goalscore}**
        `;

        console.table(this.players);

        const fields = this.createPlayerFields();

        const embed = new Discord.MessageEmbed()
        .setTitle(this.name)
        .setColor('#ff0000')
        .setDescription(description)
        .addFields(fields)
        .setTimestamp();

        this.discordMessage.channel.send(embed).then(() =>{

            this.bSentMessage = true;
            
        });
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
                    }else{

                        this.totalPlayers++;
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
        const teamReg = /\\team_(\d+)\\(\d+?)\\/ig;
        const meshReg = /\\mesh_(\d+)\\(.+?)\\/ig;
        const faceReg = /\\face_(\d+)\\(.{0,}?)\\/ig;
        const countryReg = /\\countryc_(\d+)\\(.+?)\\/ig;

        let result = "";
        let oldResult = "";

        while(result !== null){

            result = nameReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "name", result[2]);

            result = fragsReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "frags", parseInt(result[2]));

            result = teamReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "team", result[2]);

            result = meshReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "mesh", result[2]);

            result = faceReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "face", result[2]);


            oldResult = result;

            result = countryReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "country", result[2]);

            result = oldResult;

        }

    }

}

module.exports = ServerResponse;