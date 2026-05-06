import config from '../config/config.json' with {'type': 'json'}
import { sqliteGet, sqliteRun , sqliteGetAll} from './database.js';

export default class Roles{

    constructor(){}

    bUserAdmin(message){

        let passed = false;

        const userRoles = message.member.roles.cache;

        const adminRolesData = this.getAllAddedRoles();

        const adminRoleIds = [];

        for(let i = 0; i < adminRolesData.length; i++){

            const a = adminRolesData[i];

            if(adminRoleIds.indexOf(a.id) === -1){
                adminRoleIds.push(a.id);
            }
        }

        if(userRoles.some((r) =>{

            if(adminRoleIds.indexOf(r.id) !== -1 || r.name.toLowerCase() == config.defaultAdminRole.toLowerCase()){
            
                passed = true;
            }

        }));

        return passed;


    }

    bRoleAdded(role){

        const query = "SELECT COUNT(*) as total_roles FROM roles WHERE id=?";

        const result = sqliteGet(query, [role]);
        if(result === undefined) return null;

        return result.total_roles > 0;
    }


    async removeRole(message){

        try{

            const reg = /^.removerole (.+)$/i;

            const result = reg.exec(message.content);

            if(result !== null){

                const roleData = this.getRole(result[1], message);

                if(roleData !== null){

                    const bRoleExist = this.bRoleAdded(roleData.id);

                    if(bRoleExist){

                        this.deleteRole(roleData.id, message, roleData.name);

                        message.channel.send(`${config.passIcon} Users with the role **${roleData.name}** can no longer use the bots admin commands.`);

                    }else{
                        message.channel.send(`${config.failIcon} The role **${roleData.name}** has not been enabled to use admin commands.`);
                    }
                }else{
                    message.channel.send(`${config.failIcon} The role **${roleData.name}** does not exist in this server.`);
                }
            }

        }catch(err){

            if(err) console.trace(err);
        }
    }

    deleteRole(role, message, roleName){

        const query = "DELETE FROM roles WHERE id=?";

        return sqliteRun(query, [role]);

    }

    insertRole(role, message, roleName){

        const query = "INSERT INTO roles VALUES(?,?)";

        const now = Math.floor(Date.now() * 0.001);

        const result = sqliteRun(query, [role, now]);

        message.channel.send(`${config.passIcon} User with the role **${roleName}** can now use admin commands.`);

    }

    getRole(name, message){

        const roles = message.guild.roles.cache;

        for(let i = 0; i < roles.size; i++){

            if(roles.at(i).name.toLowerCase() == name.toLowerCase()){
                return roles.at(i);
            }
        }

        return null;
    }

    async addRole(role, message){

        try{

            const roleData = this.getRole(role, message);

            if(roleData !== null){

                const bRoleAdded = this.bRoleAdded(roleData.id);

                if(!bRoleAdded){

                    await this.insertRole(roleData.id, message, roleData.name);

                }else{
                    message.channel.send(`${config.failIcon} **${role.name}** has already been allowed to use the bots admin commands.`);
                }

            }else{
                message.channel.send(`${config.failIcon} `);
            }

        }catch(err){
            console.trace(err);
        }
    }

    allowRole(message){

        const reg = /^.allowrole (.+)$/i;

        const result = reg.exec(message.content);

        if(result === null){
            message.channel.send(`${config.failIcon} Wrong syntax for allowrole command.`);
            return;
        }

        const channelRoles = message.channel.guild.roles.cache;

        let c = 0;

        let bFound = false;

        for(let i = 0; i < channelRoles.size; i++){

            c = channelRoles.at(i);

            if(c.name.toLowerCase() == result[1].toLowerCase()){

                bFound = true;
                this.addRole(c.name, message);
                break;
            }
        }

        if(!bFound){
            message.channel.send(`${config.failIcon} There is no role called **${result[1]}** in this channel.`);
        }

    }

    getAllAddedRoles(){

        return sqliteGetAll("SELECT * FROM roles");
 
    }


    async listRoles(message){

        try{

            const roles = this.getAllAddedRoles();

            const discordRoles = message.guild.roles.cache;

            let string = ``;

            let r = 0;
            let added = 0;

            let currentRole = 0;

            for(let i = 0; i < roles.length; i++){

                r = roles[i];

                added = new Date(r.added * 1000);

                currentRole = discordRoles.get(r.id);

                if(currentRole !== undefined){
                    string += `:small_blue_diamond: **${currentRole.name}** Added ${added}\n`;
                }else{
                    string += `:no_entry: This role no longer exists in this server, removing it from database.\n`;

                    this.deleteRole(r.id, message, "DELETED");
                }
            }

            if(string == ""){
                string = "There are currently no roles allowed to use the bots admin commands.";
            }
            
            string = `:large_orange_diamond: **User roles that have admin privileges**\n`+string;

            message.channel.send(string);

        }catch(err){
            console.trace(err);
        }
    }
}