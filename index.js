#!/usr/bin/env node

const Discord = require('discord.js');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

client.on("ready", () => {
  console.log("Logged in as " + client.user.tag + "!");
});

client.on("guildMemberAdd", member => {
  const compRole = member.guild.roles.cache.get("826846965114339419");
  const botRole = member.guild.roles.cache.get("826871012724441158");
  if (member.bot) {
    member.roles.add(botRole).catch(console.error);
  } else {
    member.roles.add(compRole).catch(console.error);
  }
});

client.on('messageDelete', message => {
  const deleteEmbed = new Discord.MessageEmbed()
    .setTitle('Message Deleted')
    .addField('Author', message.author.tag)
    .addField('Message', message.content)
    .setThumbnail(message.author.avatarURL())
    .setFooter("ID: " + message.id)
    .setTimestamp()
    .setColor('ff0000');
  client.guilds.cache.get("826506878976000030").channels.cache.get("826876551756513314").send(deleteEmbed).catch(console.error);
});

client.on('messageUpdate', (originalMessage, editedMessage) => {
  if (editedMessage.author.bot) {
    return;
  }
  const editEmbed = new Discord.MessageEmbed()
    .setTitle("Message Edited")
    .addField("Author", editedMessage.author.tag)
    .addField("Message", `<< ${originalMessage}\n>> ${editedMessage}`)
    .setThumbnail(editedMessage.author.avatarURL())
    .setFooter("ID: " + editedMessage.id)
    .setTimestamp()
    .setColor('006699');
  client.guilds.cache.get("826506878976000030").channels.cache.get("826876551756513314").send(editEmbed).catch(console.error);
});

client.on('channelCreate', channel => {
  if (channel.guild.id = "826506878976000030") {
    const channelCreateEmbed = new Discord.MessageEmbed()
      .setTitle("Channel Created #️⃣")
      .addField("Name", channel.name)
      .addField("Category", channel.category)
      .setFooter("ID: " + channel.id)
      .setTimestamp()
      .setColor('006699');
    client.guilds.cache.get("826506878976000030").channels.cache.get("826876551756513314").send(channelCreateEmbed).catch(console.error);
  }
});

client.login(process.env.BOT_TOKEN);
