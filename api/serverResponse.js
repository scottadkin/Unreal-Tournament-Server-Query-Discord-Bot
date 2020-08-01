const Discord = require('discord.js');
const geoip = require('geoip-lite');
const countryList = require('country-list');
const config = require('./config.json');
const Servers = require('./servers');
const Channels = require('./channels');

class ServerResponse{

    constructor(ip, port, type, discordMessage, db, bEdit, messageId){

        //console.log(geoip.lookup(ip));
        this.geo = geoip.lookup(ip);
        //console.log(this.geo);
        this.ip = ip;
        this.port = port - 1;
        this.timeStamp = Math.floor(Date.now() * 0.001);
        this.type = type;
        this.bReceivedFinal = false;
        this.bTimedOut = false;
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

        this.servers = new Servers(db);
        this.channels = new Channels(db);

        this.bEdit = false;
        this.messageId = -1;

        if(bEdit !== undefined){
            this.bEdit = true;
        }

        if(messageId !== undefined){
            this.messageId = messageId;
        }


    }

    async parsePacket(data){

        //console.log(`${data}`);

        try{

            this.parseServerInfoData(data);
            this.parseMapData(data);
            this.parseTeamData(data);
            this.parsePlayerData(data);

            const finalReg = /\\final\\$/i;

            if(finalReg.test(data)){

                if(this.type == "full"){

                    this.sendFullServerResponse();

                }else if(this.type == "basic"){
                    await this.servers.updateInfo(this);
                    this.bSentMessage = true;
                }
            }

        }catch(err){
            console.trace(err);
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

                if(p.country.toLowerCase() == "none"){
                    currentFlag = ":video_game:";
                }

            }

            if(!bSpectator){

                if(team == -99){

                    if(p.frags !== undefined){
                        string += `${currentFlag} ${p.name} **${p.frags}**\n`;
                    }

                }else{

                    if(parseInt(p.team) == team){

                        if(p.mesh.toLowerCase() != "spectator"){
                            string += `${currentFlag} ${p.name} **${p.frags}**\n`;
                        }
                    }
                }

            }else if(bSpectator){
                    
                if(p.mesh.toLowerCase() == "spectator" || p.frags === undefined){

                    if(string != ""){
                        string += ", ";
                    }

                    if(currentFlag == ":video_game:"){
                        currentFlag = ":eyes:";
                    }
                    string += `${currentFlag} ${p.name}`;
                }
            }
        }

        if(string == ""){
            if(!bSpectator){
                string = ":zzz: No players.";
            }else{
                string = ":zzz: There are currently no spectators.";
            }
        }

        return string;
    }

    createPlayerFields(){

        const fields = [];

        const teamNames = [
            `:red_square: Red Team ${this.teams[0].score}`,
            `:blue_square: Blue Team ${this.teams[1].score}`,
            `:green_square: Green Team ${this.teams[2].score}`,
            `:yellow_square: Yellow Team ${this.teams[3].score}`
        ];

        this.maxTeams = parseInt(this.maxTeams);


        if(this.maxTeams === this.maxTeams){

            for(let i = 0; i < this.maxTeams; i++){

                fields.push(
                    {"name": teamNames[i], "value": this.createPlayersString(i, false), "inline": true }
                );
            }

        }else{
            fields.push(
                {"name": ":wrestling: Players", "value":this.createPlayersString(-99, false), "inline": false}
            );
        }

        fields.push({
            "name": ":eye: Spectators", "value": `${this.createPlayersString(-1, true)}`, "inline": false}
        );


        //console.table(fields);

        return fields;
    }

    getMMSS(input){

        let seconds = Math.floor(input % 60);
        let minutes = Math.floor(input / 60);

        if(seconds < 10){
            seconds = "0"+seconds;
        }

        if(minutes < 10){
            minutes = "0"+minutes;
        }

        return minutes+":"+seconds;
        
    }

    sendFullServerResponse(){

        if(this.type != "full"){
            return;
        }

        if(this.bTimedOut){

            if(!this.bEdit){
                let string = `:no_entry: **${this.ip}:${this.port}** has timedout!`;

                if(this.ip === undefined){
                    string = `:no_entry: That ip does not exist!`;
                }

                this.discordMessage.send(string);
                return;
            }
            

            this.bSentMessage = true;
            return;
        }

        this.players.sort((a, b) =>{

            if(a.frags === undefined){
                a = -Infinity;
            }else{
                a = a.frags;
            }

            if(b.frags === undefined){
                b = -Infinity;
            }else{
                b = b.frags;
            }


            if(a < b){
                return 1;
            }else if(a > b){
                return -1;
            }

            return 0;
        });

       // console.table(this.players);

        this.bReceivedFinal = true;

        let city = "";

        if(this.geo.city !== ''){
            city = this.geo.city+", "
        }

        let description = `**:flag_${this.geo.country.toLowerCase()}: ${city}${countryList.getName(this.geo.country)}**
:wrestling: Players **${this.totalPlayers}/${this.maxPlayers}
:pushpin: ${this.gametype}
:map: ${this.mapName}**
:goal: Target Score **${this.goalscore}**
`;

        /*description = :stopwatch: Time Limit ${this.timeLimit} Minutes
        :stopwatch: Time Remaining ${this.getMMSS(this.remainingTime)} Minutes*/

        if(this.timeLimit !== undefined){
            description += `:stopwatch: Time Limit **${this.timeLimit} Minutes**
            `;
        }

        if(this.remainingTime !== undefined){
            description += `:stopwatch: Time Remaining **${this.getMMSS(this.remainingTime)} Minutes**
            `;
        }

        if(this.protection !== undefined){
            description += `:shield: ${this.protection}`;
        }
       // console.table(this.players);

        const fields = this.createPlayerFields();

        
        const embed = new Discord.MessageEmbed()
        .setTitle(`:flag_${this.geo.country.toLowerCase()}: ${this.name}`)
        .setColor(config.embedColor)
        .setDescription(`${description}`)
        .addFields(fields)
        .addField("Join Server",`**<unreal://${this.ip}:${this.port}>**`,false)
        .setTimestamp();


        if(!this.bEdit){

            console.log("NOT AN EDIT POST");
            this.discordMessage.send(embed).then(async (m) =>{

                try{

                    const autoQueryChannelId = await this.channels.getAutoQueryChannel();

                    if(autoQueryChannelId !== null){

                        if(autoQueryChannelId === m.channel.id){
                            
                            this.servers.setLastMessageId(this.ip, this.port, m.id);

                        }else{
                            console.log("posted in a normal channel");
                        }
                    }

                    this.bSentMessage = true;

                }catch(err){
                    console.trace(err);
                }
                
            });

        }else{

            this.discordMessage.messages.fetch(this.messageId).then((message) =>{

                message.edit(embed).then(() =>{

                   // console.log("Updated message");

                    this.bSentMessage = true;

                }).catch((err) =>{
                    console.trace(err);
                });

            }).catch((err) =>{

                console.trace(err);
            });
        }
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
            /\\timelimit\\(.+?)\\/i,
            /\\remainingtime\\(.+?)\\/i,
            /\\protection\\(.+?)\\/i,
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
            "timeLimit",
            "remainingTime",
            "protection"

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

        const teamScoreReg = /\\score_(\d)\\(.+?)\\/ig;
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
            {"id": id, "name": value.toString().replace(/`/ig,'') }
        );
    }

    parsePlayerData(data){

        const nameReg = /\\player_(\d+?)\\(.+?)\\/ig;
        const fragsReg = /\\frags_(\d+?)\\(.+?)\\/ig;
        const teamReg = /\\team_(\d+?)\\(\d+?)\\/ig;
        const meshReg = /\\mesh_(\d+?)\\(.*?)\\/ig;
        const faceReg = /\\face_(\d+?)\\(.*?)\\/ig;
        const countryReg = /\\countryc_(\d+?)\\(.+?)\\/ig;

        let result = "";
        let oldResult = "";

        let currentMesh = "";

        while(true){

            currentMesh = "";

            result = nameReg.exec(data);

            if(result !== null){
                this.updatePlayer(result[1], "name", result[2]);
            
            }else{
                //console.table(this.players);
                return;
            }

            result = teamReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "team", result[2]);

            result = meshReg.exec(data);

           // console.log(result);
            if(result !== null){
                currentMesh = result[2].toLowerCase();
                this.updatePlayer(result[1], "mesh", result[2]);
            }

            result = faceReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "face", result[2]);


            result = countryReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "country", result[2]);


            result = fragsReg.exec(data);

            if(result !== null) this.updatePlayer(result[1], "frags", parseInt(result[2]));
            
        }
    }

}

module.exports = ServerResponse;