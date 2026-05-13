import { serverTimeout, embedColor, maxServersPerBlock } from "../config/config.js";
import { EventEmitter } from "node:events";
import { EmbedBuilder } from "discord.js";
import { forceStringLength } from "./generic.js";
import { getAllServers } from "./servers.js";

class ServersCommandEmitter extends EventEmitter {}

export default class ServersCommand{

    constructor(discordChannel, servers){

        this.discordChannel = discordChannel;
        this.servers = servers;
        this.created = new Date(Date.now());
        this.responses = [];
        this.discordMessage = null;
        
        this.events = new ServersCommandEmitter();

        this.createEvents();

        setTimeout(() =>{

            this.updateMessage();
            this.events.emit("timeout");
        }, serverTimeout * 1000);
    }


    createEvents(){

        this.events.once("timeout", () =>{

            //edit message with timeout for missing servers

            this.events.emit("delete");
        })

        this.events.once("responses-created", async () =>{

            const embed = new EmbedBuilder().setColor(embedColor).setTitle("UT Server List").setTimestamp();

            this.discordMessage = await this.discordChannel.send({"embeds": [embed]});
        });
    }

    addResponse(response){

        
        for(let i = 0; i < this.servers.length; i++){

            const s = this.servers[i];

            if(s.real_ip === response.ip && s.port === response.port){

                response.serverIndex = s.current_index;
                response.alias = s.alias;
            }
        }

        this.responses.push(response);

        if(this.responses.length === this.servers.length){
            this.events.emit("responses-created");
        }
    }

    updateMessage(){

        let totalFinished = 0;

        for(let i = 0; i < this.responses.length; i++){
            const r = this.responses[i];

            if(r.bDelete || r.bSentMessage) totalFinished++;
        }

        const serverParts = this.createServerListParts(this.responses);

        const embed = new EmbedBuilder().setColor(embedColor).setTitle("edit test").setDescription(serverParts[0]);

        this.discordMessage.edit({"embeds": [embed]});
    }

    getMatchingResponse(ip, port){

        for(let i = 0; i < this.responses.length; i++){

            const r = this.responses[i];

            if(r.ip === ip && r.port === port) return r;
        }

        return null;
    }

    createServerString(server){

        const idLength = 2;
        const aliasLength = 25;
        const mapLength = 25;
        const playersLength = 7;

        const serverId = forceStringLength(server.serverIndex, idLength);
        const alias = forceStringLength(server.alias, aliasLength);
        
        let playerString = "";

        if(server.maxPlayers == "ers"){
            playerString = "Players";
        }else{
            playerString = server.totalPlayers+"/"+server.maxPlayers;
        }

        const map = forceStringLength(server.map, mapLength)+" "; 
        const players = forceStringLength(playerString, playersLength, true);

        return `\`${serverId} - ${alias} ${map} ${players}\``;

    }

    sendNoServers(bOnlyActive){

        const title =  "Unreal Tournament Server List";

        const desc = (bOnlyActive) ? `There are currently no active servers.` : "There aren't any servers added to the bot.";

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${(bOnlyActive) ? "Active" : ""} ${title}`)
        .setDescription(desc)
        .setTimestamp();

        return this.discordChannel.send({"embeds": [embed]});
    }


    sortResponsesByIndex(){

        this.responses.sort((a, b) =>{

            a = a.serverIndex;
            b = b.serverIndex;

            if(a > b){
                return 1;
            }else if(a < b){
                return -1;
            }

            return 0;
        });
    }

    createServerListParts(servers){

        const parts = [];

        let desc = this.createServerString({
            "serverIndex": "ID",
            "alias": "Alias", 
            "map": "Map", 
            "totalPlayers": 0,
            "maxPlayers": "ers"}
        );

        desc += `\n`;

        let currentCount = 0;

        this.sortResponsesByIndex();

        for(let i = 0; i < this.responses.length; i++){

            const response = this.responses[i];

            if(response.serverIndex === undefined){
                continue;
            }

            desc += this.createServerString({
                "serverIndex": response.serverIndex,
                "alias": response.alias,
                "map": response.mapName,
                "totalPlayers": response.totalPlayers,
                "maxPlayers": response.maxPlayers
            });
            if(i < servers.length - 1) desc += `\n`;

            currentCount++;

            if(currentCount >= maxServersPerBlock){
                currentCount = 0;
                parts.push(desc);
                desc = ``;
            }
        }

        if(parts.length === 0){
            parts.push(desc);
        }else if(desc !== ""){
            parts.push(desc);
        }

        return parts;
    }
}
