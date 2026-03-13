/**
 * ⚔️ SUPREME JOJO ENGINE: JONATHAN VS TOORU
 * Logiciel de combat tactique avec gestion de flux et de Hamon.
 * Déployable sur Render.com
 */

const { 
    Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, 
    SlashCommandBuilder, REST, Routes, Colors 
} = require('discord.js');
const express = require('express');

// --- INITIALISATION DU SERVEUR DE MAINTIEN RENDER ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🛡️ Système de Combat Jojo Actif (Render)'));
app.listen(port, () => console.log(`[SERVER] Serveur web sur port ${port}`));

// --- CONFIGURATION ET SÉCURITÉ ---
const CONFIG = {
    TOKEN: process.env.TOKEN, // À configurer sur Render (Dashboard > Environment)
    CLIENT_ID: process.env.CLIENT_ID, // À configurer sur Render
    ID_JONATHAN: "1404076132890050571",
    ID_TOORU: "1320710402602172510",
    STATS: {
        MAX_HP: 600,
        MAX_ENERGY: 120,
        BASE_REGEN: 15
    }
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// --- MOTEUR DE JEU (LOGIQUE INTERNE) ---
const activeBattles = new Map();

class Fighter {
    constructor(name, id, color) {
        this.name = name;
        this.id = id;
        this.hp = CONFIG.STATS.MAX_HP;
        this.energy = 40;
        this.color = color;
        this.isGuarding = false;
        this.status = { name: "Normal", duration: 0 };
        this.stats = { crits: 0, dodges: 0, totalDmg: 0 };
    }

    applyDamage(amount) {
        if (this.isGuarding) {
            amount = Math.floor(amount * 0.4); // Réduction de 60%
            this.isGuarding = false;
        }
        this.hp = Math.max(0, this.hp - amount);
        this.stats.totalDmg += amount;
        return amount;
    }

    addEnergy(val) {
        this.energy = Math.min(CONFIG.STATS.MAX_ENERGY, this.energy + val);
    }
}

class BattleSession {
    constructor(channelId) {
        this.channelId = channelId;
        this.jonathan = new Fighter("Jonathan Joestar", CONFIG.ID_JONATHAN, Colors.Blue);
        this.tooru = new Fighter("Tooru", CONFIG.ID_TOORU, Colors.Purple);
        this.turn = CONFIG.ID_JONATHAN;
        this.round = 1;
        this.logs = ["Le destin commence."];
    }

    getCurrent() { return this.turn === this.jonathan.id ? this.jonathan : this.tooru; }
    getEnemy() { return this.turn === this.jonathan.id ? this.tooru : this.jonathan; }

    processMove(move) {
        const attacker = this.getCurrent();
        const defender = this.getEnemy();
        let dmg = 0; let heal = 0; let cost = 0; let msg = "";

        // --- ARBRE DE COMPÉTENCES JONATHAN (HAMON) ---
        if (attacker.id === CONFIG.ID_JONATHAN) {
            switch (move.toLowerCase()) {
                case 'overdrive': 
                    dmg = 85; cost = 35; msg = "☀️ **SUNLIGHT YELLOW OVERDRIVE !**"; break;
                case 'zoom': 
                    dmg = 40; msg = "👊 **ZOOM PUNCH !**"; break;
                case 'luck': 
                    heal = 70; msg = "⚔️ **LUCK & PLUCK !** Jonathan récupère."; break;
                case 'metal': 
                    dmg = 50; attacker.addEnergy(25); msg = "⛓️ **METAL SILVER OVERDRIVE !**"; break;
                case 'scarlet': 
                    dmg = 60; msg = "🔥 **SCARLET OVERDRIVE !** Brûle la garde."; break;
                case 'turquoise': 
                    dmg = 55; msg = "🌊 **TURQUOISE BLUE OVERDRIVE !** Imparable."; break;
                case 'barrage': 
                    dmg = 20 * 4; msg = "👊 **HAMON BARRAGE !** Une série de coups !"; break;
                default: return { error: "Technique inconnue." };
            }
        } 
        // --- ARBRE DE COMPÉTENCES TOORU (CALAMITÉ) ---
        else {
            switch (move.toLowerCase()) {
                case 'wonder': 
                    dmg = 100; cost = 45; msg = "🎭 **WONDER OF U.** La calamité frappe violemment."; break;
                case 'pursuit': 
                    dmg = 45; msg = "🏃 **POURSUITE.** S'approcher est une erreur."; break;
                case 'rokakaka': 
                    heal = 90; dmg = 30; msg = "🍎 **ROKAKAKA.** Échange équivalent."; break;
                case 'flow': 
                    dmg = 55; msg = "💧 **RAIN FLOW.** La pluie perfore tout."; break;
                case 'oblivion': 
                    dmg = 30; defender.energy -= 25; msg = "🧠 **OBLIVION.** Jonathan perd sa concentration."; break;
                case 'endless': 
                    dmg = 70; msg = "⚠️ **ENDLESS CALAMITY.** Débris mortels."; break;
                case '6251': 
                    heal = 40; attacker.isGuarding = true; msg = "🧪 **LOCACACA 6251.** Boost de défense."; break;
                default: return { error: "Technique inconnue." };
            }
        }

        if (attacker.energy < cost) return { error: `Énergie insuffisante (${cost} requis).` };
        
        attacker.energy -= cost;
        const finalDmg = defender.applyDamage(dmg);
        attacker.hp = Math.min(CONFIG.STATS.MAX_HP, attacker.hp + heal);
        attacker.addEnergy(CONFIG.STATS.BASE_REGEN);

        this.logs.push(`${msg} (${finalDmg} DMG)`);
        this.turn = defender.id;
        this.round++;
        return { success: true };
    }

    renderEmbed() {
        return new EmbedBuilder()
            .setTitle(`🏟️ COMBAT - ROUND ${this.round}`)
            .setDescription(`**Au tour de :** <@${this.turn}>`)
            .setColor(this.getCurrent().color)
            .addFields(
                { name: `🟦 J. Joestar`, value: `❤️ **${this.jonathan.hp}** HP\n⚡ **${this.jonathan.energy}** Hamon`, inline: true },
                { name: `🟪 Tooru`, value: `❤️ **${this.tooru.hp}** HP\n🎭 **${this.tooru.energy}** Stand`, inline: true },
                { name: `📜 Derniers évènements`, value: this.logs.slice(-3).join('\n') }
            )
            .setTimestamp();
    }
}

// --- INITIALISATION DES SLASH COMMANDS ---
const slashCommands = [
    new SlashCommandBuilder().setName('fight').setDescription('Crée un salon de combat').addUserOption(o => o.setName('cible').setDescription('Adversaire').setRequired(true)),
    new SlashCommandBuilder().setName('attaque').setDescription('Lancer une technique').addStringOption(o => o.setName('nom').setDescription('Nom de la technique').setRequired(true)),
    new SlashCommandBuilder().setName('guard').setDescription('Se protéger pour le prochain tour'),
    new SlashCommandBuilder().setName('help').setDescription('Affiche tes techniques secrètes')
].map(c => c.toJSON());

// --- GESTION DES ÉVÈNEMENTS ---
client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    // 1. COMMANDE HELP (DIFFERENCIÉE)
    if (i.commandName === 'help') {
        const isJ = i.user.id === CONFIG.ID_JONATHAN;
        const isT = i.user.id === CONFIG.ID_TOORU;
        if (!isJ && !isT) return i.reply({ content: "Seuls les élus peuvent voir ceci.", ephemeral: true });

        const embed = new EmbedBuilder().setTimestamp();
        if (isJ) {
            embed.setTitle("☀️ Techniques de Jonathan").setColor(Colors.Blue)
                 .addFields(
                    { name: "Attaques", value: "`overdrive`, `zoom`, `metal`, `scarlet`, `turquoise`, `barrage`" },
                    { name: "Soin", value: "`luck`" }
                 );
        } else {
            embed.setTitle("🎭 Capacités de Tooru").setColor(Colors.Purple)
                 .addFields(
                    { name: "Attaques", value: "`wonder`, `pursuit`, `flow`, `oblivion`, `endless`" },
                    { name: "Soin/Défense", value: "`rokakaka`, `6251`" }
                 );
        }
        return i.reply({ embeds: [embed], ephemeral: true });
    }

    // 2. COMMANDE FIGHT
    if (i.commandName === 'fight') {
        const target = i.options.getUser('cible');
        if (![i.user.id, target.id].includes(CONFIG.ID_JONATHAN) || ![i.user.id, target.id].includes(CONFIG.ID_TOORU)) {
            return i.reply({ content: "Combat refusé : Destins non liés.", ephemeral: true });
        }

        const channel = await i.guild.channels.create({
            name: `arena-${i.user.username}`,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: target.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        activeBattles.set(channel.id, new BattleSession(channel.id));
        await i.reply(`Arène prête : ${channel}`);
        await channel.send({ content: "Le duel commence !", embeds: [activeBattles.get(channel.id).renderEmbed()] });
    }

    // 3. COMMANDE ATTAQUE
    if (i.commandName === 'attaque') {
        const battle = activeBattles.get(i.channelId);
        if (!battle) return i.reply({ content: "Aucun combat ici.", ephemeral: true });
        if (i.user.id !== battle.turn) return i.reply({ content: "Ce n'est pas ton tour !", ephemeral: true });

        const res = battle.processMove(i.options.getString('nom'));
        if (res.error) return i.reply({ content: res.error, ephemeral: true });

        await i.reply({ embeds: [battle.renderEmbed()] });

        if (battle.jonathan.hp <= 0 || battle.tooru.hp <= 0) {
            const winner = battle.jonathan.hp > 0 ? "JONATHAN" : "TOORU";
            await i.followUp(`🏆 **VICTOIRE POUR ${winner} !** Le salon sera supprimé.`);
            activeBattles.delete(i.channelId);
            setTimeout(() => i.channel.delete().catch(() => {}), 60000);
        }
    }

    // 4. COMMANDE GUARD
    if (i.commandName === 'guard') {
        const battle = activeBattles.get(i.channelId);
        if (!battle || i.user.id !== battle.turn) return i.reply({ content: "Action impossible.", ephemeral: true });

        battle.getCurrent().isGuarding = true;
        battle.logs.push(`🛡️ ${battle.getCurrent().name} se concentre sur sa défense.`);
        battle.turn = battle.getEnemy().id;
        await i.reply({ embeds: [battle.renderEmbed()] });
    }
});

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
    await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: slashCommands });
    console.log(`[BOT] Connecté : ${client.user.tag}`);
});

client.login(CONFIG.TOKEN);
