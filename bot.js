const { Client, GatewayIntentBits, Partials, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events, InteractionType } = require('discord.js');
require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ضع هنا ID الروم الصوتي المطلوب لاحقاً
const TARGET_VOICE_CHANNEL_ID = '123456789012345678'; // عدله لاحقاً

// أضف في الأعلى تعريف آيدي الأونر/المطور:
const BOT_OWNERS = [
  '1070609053065154631', // آيدي المطور الأول
  '1291805249815711826', // آيدي المطور الثاني
  // يمكنك إضافة أكثر من آيدي مطور
];

// تحميل الإعدادات من الملف عند بدء التشغيل
let persistentSettings = {};
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    persistentSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  }
} catch (e) {
  persistentSettings = {};
}
// تحديث دوال التخزين المؤقت لتستخدم التخزين الدائم
const radioVoiceChannels = persistentSettings.radioVoiceChannels || {};
const radioCenterEmojis = persistentSettings.radioCenterEmojis || {};
const radioLogChannels = persistentSettings.radioLogChannels || {};
const radioActiveWaves = persistentSettings.radioActiveWaves || {};
const radioGovWaves = persistentSettings.radioGovWaves || {};
const radioMainImage = persistentSettings.radioMainImage || 'https://media.discordapp.net/attachments/1369683177068560476/1390121600774443160/2.png?ex=68671b20&is=6865c9a0&hm=bd54f740fd630e338b39482b9904da0648267c38b08fd060e627ed31b46f4cf8&=&format=webp&quality=lossless';
const embedDefaultImage = persistentSettings.embedDefaultImage || 'https://media.discordapp.net/attachments/1303476251746504726/1388435070141861918/Clean_20250626_130356_.png?ex=68678fec&is=68663e6c&hm=74f78ec37b2ca8b1c8d82f32008df770b691b210e9cf8d770fd572631b30c643&=&format=webp&quality=lossless';
function saveSettings() {
  // تنظيف البيانات الفارغة قبل الحفظ
  const cleanSettings = {
    radioVoiceChannels: Object.fromEntries(
      Object.entries(radioVoiceChannels).filter(([_, data]) => data && data.id)
    ),
    radioCenterEmojis: Object.fromEntries(
      Object.entries(radioCenterEmojis).filter(([_, emoji]) => emoji)
    ),
    radioLogChannels: Object.fromEntries(
      Object.entries(radioLogChannels).filter(([_, id]) => id)
    ),
    radioActiveWaves: Object.fromEntries(
      Object.entries(radioActiveWaves).filter(([_, data]) => data && data.channelId)
    ),
    radioGovWaves: Object.fromEntries(
      Object.entries(radioGovWaves).filter(([_, waves]) => Object.keys(waves).length > 0)
    ),
    radioMainImage: radioMainImage,
    embedDefaultImage: embedDefaultImage
  };
  
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cleanSettings, null, 2));
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // تحقق من حالة البوت في بداية كل تفاعل (إلا إذا كان المستخدم أونر)
  if (interaction.guild && botStatusPerGuild[interaction.guild.id] === 'off' && !BOT_OWNERS.includes(interaction.user.id)) {
    return interaction.reply({ content: `البوت حاليا متوقف من قبل المطور تواصلو مع المطور <@${BOT_OWNERS[0]}>`, ephemeral: true });
  }

  // أمر /راديو
  if (interaction.isChatInputCommand() && interaction.commandName === 'راديو') {
    // تحقق صلاحية الأدمن
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ هذا الأمر فقط للأدمن.', ephemeral: true });
    }

    // الإيمبيد
    const embed = new EmbedBuilder()
      .setImage(persistentSettings.radioMainImage || 'https://media.discordapp.net/attachments/1369683177068560476/1390121600774443160/2.png?ex=68671b20&is=6865c9a0&hm=bd54f740fd630e338b39482b9904da0648267c38b08fd060e627ed31b46f4cf8&=&format=webp&quality=lossless');

    // الأزرار
    const centerEmoji = radioCenterEmojis[interaction.guild.id] || '🔊';
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('radio-left')
          .setLabel('⧀')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('radio-center')
          .setEmoji(centerEmoji)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('radio-right')
          .setLabel('⧁')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

    await interaction.reply({ files: [persistentSettings.radioMainImage || 'https://media.discordapp.net/attachments/1369683177068560476/1390121600774443160/2.png?ex=68671b20&is=6865c9a0&hm=bd54f740fd630e338b39482b9904da0648267c38b08fd060e627ed31b46f4cf8&=&format=webp&quality=lossless'], components: [row] });
  }

  // عند الضغط على زر تعيين الروم الصوتي للراديو
  if (interaction.isButton() && interaction.customId === 'set-radio-voice') {
    // تحقق من صلاحية الأدمن
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ هذا الأمر فقط للأدمن.', ephemeral: true });
    }
    const modal = new ModalBuilder()
      .setCustomId('set-voice-modal')
      .setTitle('تعيين الروم الصوتي للراديو');
    const inputId = new TextInputBuilder()
      .setCustomId('voice-id-input')
      .setLabel('قم بادخال ايدي الروم')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    const inputLink = new TextInputBuilder()
      .setCustomId('voice-link-input')
      .setLabel('ادخل رابط الروم')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
          modal.addComponents(
        new ActionRowBuilder().addComponents(inputId),
        new ActionRowBuilder().addComponents(inputLink)
      );
    await interaction.showModal(modal);
  }
  // استقبال ايدي الروم الصوتي والرابط من المودال
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'set-voice-modal') {
    const voiceId = interaction.fields.getTextInputValue('voice-id-input').trim();
    const voiceLink = interaction.fields.getTextInputValue('voice-link-input').trim();
    // تحقق أن الايدي رقم فقط
    if (!/^\d+$/.test(voiceId)) {
      return interaction.reply({ content: '❌ يرجى إدخال ايدي صالح (أرقام فقط).', ephemeral: true });
    }
    // تحقق من صحة الرابط
    if (!voiceLink.startsWith('http')) {
      return interaction.reply({ content: '❌ يرجى إدخال رابط صالح للروم الصوتي (يبدأ بـ http).', ephemeral: true });
    }
    // حفظ الايدي والرابط في التخزين المؤقت حسب السيرفر
    radioVoiceChannels[interaction.guild.id] = { id: voiceId, link: voiceLink };
    saveSettings();
    await interaction.reply({ content: `✅ تم تعيين الروم الصوتي والرابط بنجاح!`, ephemeral: true });
  }

  // الضغط على زر الراديو الأوسط
  if (interaction.isButton() && interaction.customId === 'radio-center') {
    const member = interaction.member;
    const voice = member.voice;
    // جلب ايدي الروم والرابط من التخزين المؤقت أو القيمة الافتراضية
    const radioData = radioVoiceChannels[interaction.guild.id] || { id: TARGET_VOICE_CHANNEL_ID, link: null };
    const targetVoiceId = radioData.id;
    const targetVoiceLink = radioData.link || `https://discord.com/channels/${interaction.guild.id}/${targetVoiceId}`;
    // تحقق من وجود العضو في الروم الصوتي المحدد
    if (!voice.channel || voice.channel.id !== targetVoiceId) {
      return interaction.reply({ content: `❌ يجب أن تدخل بروم الصوتي المحدد أولاً: ${targetVoiceLink}`, ephemeral: true });
    }
    // فتح modal لإدخال الموجة وكلمة السر
    const modal = new ModalBuilder()
      .setCustomId('radio-modal')
      .setTitle('ادخل رقم الموجة وكلمة السر');
    const inputWave = new TextInputBuilder()
      .setCustomId('wave-input')
      .setLabel('ادخل رقم الموجة')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    const inputPass = new TextInputBuilder()
      .setCustomId('pass-input')
      .setLabel('كلمة السر (4 أرقام)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    modal.addComponents(
      new ActionRowBuilder().addComponents(inputWave),
      new ActionRowBuilder().addComponents(inputPass)
    );
    await interaction.showModal(modal);
  }

  // استقبال قيمة الموجة من modal
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'radio-modal') {
    const value = interaction.fields.getTextInputValue('wave-input').trim();
    const pass = interaction.fields.getTextInputValue('pass-input').trim();
    const validWave = /^\d{1,2}(\.\d{1,2})?$/.test(value);
    const validPass = /^\d{4}$/.test(pass) || pass === '';
    if (!validWave || (!validPass && pass !== '')) {
      return interaction.reply({ content: 'يجب ادخال ارقام صحيحة و ليست احرف او رموز', ephemeral: true });
    }
    // تحقق من موجة حكومية
    const guildId = interaction.guild.id;
    const govWaves = radioGovWaves[guildId] || {};
    const isGovWave = govWaves[value] || (parseInt(value) >= 1 && parseInt(value) <= 10 && govWaves[value]);
    if (isGovWave) {
      // تحقق من الرتبة فقط، ولا تتحقق من كلمة السر إطلاقاً
      const govRoleId = govWaves[value];
      if (interaction.member.roles.cache.has(govRoleId)) {
        // صاحب الرتبة الحكومية يدخل مباشرة بدون كلمة سر
        // تحقق من وجود موجة بنفس الرقم
        const waveKey = `${guildId}_${value}`;
        const waveData = radioActiveWaves[waveKey];
        if (waveData) {
          const channel = interaction.guild.channels.cache.get(waveData.channelId);
          if (channel) {
            if (interaction.member.voice.channelId !== channel.id) {
              await interaction.member.voice.setChannel(channel);
            }
            await interaction.reply({ content: `✅ تم نقلك إلى موجتك الحكومية بنجاح!`, ephemeral: true });
          } else {
            delete radioActiveWaves[waveKey];
            saveSettings();
            return interaction.reply({ content: 'حدث خطأ: الروم غير موجود، حاول مجدداً.', ephemeral: true });
          }
        } else {
          // إنشاء روم جديد حكومي
          const channelEmoji = '⚪';
          const channelNameStr = `${channelEmoji} | ${value} Hz`;
          const channel = await interaction.guild.channels.create({
            name: channelNameStr,
            type: 2,
            permissionOverwrites: [
              { id: interaction.guild.roles.everyone, deny: ['ViewChannel', 'Connect'] },
              { id: interaction.user.id, allow: ['ViewChannel', 'Connect', 'Speak'] },
              { id: govRoleId, allow: ['ViewChannel', 'Connect', 'Speak'] }
            ]
          });
          radioActiveWaves[waveKey] = {
            channelId: channel.id,
            password: '',
            createdBy: interaction.user.id,
            wave: value,
            emoji: channelEmoji
          };
          saveSettings();
          await interaction.member.voice.setChannel(channel);
          const logId = radioLogChannels[guildId];
          if (logId) {
            const logChannel = interaction.guild.channels.cache.get(logId);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setTitle('تسجيل موجة راديو')
                .setDescription(`قام ${interaction.user} بإنشاء موجة رقم **${value}** (حكومية)`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setImage(persistentSettings.embedDefaultImage || 'https://media.discordapp.net/attachments/1303476251746504726/1388435070141861918/Clean_20250626_130356_.png?ex=68678fec&is=68663e6c&hm=74f78ec37b2ca8b1c8d82f32008df770b691b210e9cf8d770fd572631b30c643&=&format=webp&quality=lossless')
                .setTimestamp();
              logChannel.send({ embeds: [logEmbed] });
            }
          }
          await interaction.reply({ content: `✅ تم إنشاء موجة حكومية ونقلك إليها!`, ephemeral: true });
        }
        return;
      } else {
        // ليس لديه الرتبة الحكومية
        return interaction.reply({ content: 'هذه موجات حكومية يرجى اختيار موجات اخرى', ephemeral: true });
      }
    }
    // تحقق من وجود موجة بنفس الرقم
    const waveKey = `${guildId}_${value}`;
    const waveData = radioActiveWaves[waveKey];
    if (waveData) {
      if (waveData.password !== pass) {
        return interaction.reply({ content: 'يوجد بالفعل شخص ب الموجة و كلمة سر اخرى', ephemeral: true });
      }
      // نقل العضو للروم الموجود
      const channel = interaction.guild.channels.cache.get(waveData.channelId);
      if (channel) {
        if (interaction.member.voice.channelId !== channel.id) {
          await interaction.member.voice.setChannel(channel);
        }
        await interaction.reply({ content: `✅ تم نقلك إلى موجتك الصوتية بنجاح!`, ephemeral: true });
      } else {
        // الروم غير موجود فعلياً، احذفه من البيانات
        delete radioActiveWaves[waveKey];
        saveSettings();
        return interaction.reply({ content: 'حدث خطأ: الروم غير موجود، حاول مجدداً.', ephemeral: true });
      }
    } else {
      // إنشاء روم جديد
      const channelEmoji = '⚪';
      const channelNameStr = `${channelEmoji} | ${value} Hz`;
      const channel = await interaction.guild.channels.create({
        name: channelNameStr,
        type: 2, // GUILD_VOICE
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: ['ViewChannel', 'Connect']
          },
          {
            id: interaction.user.id,
            allow: ['ViewChannel', 'Connect', 'Speak']
          },
          // إضافة الرتبة الحكومية إذا كانت موجة حكومية
          ...(isGovWave ? [{ id: govWaves[value], allow: ['ViewChannel', 'Connect', 'Speak'] }] : [])
        ]
      });
      // حفظ بيانات الموجة
      radioActiveWaves[waveKey] = {
        channelId: channel.id,
        password: pass,
        createdBy: interaction.user.id,
        wave: value,
        emoji: channelEmoji
      };
      saveSettings();
      // نقل العضو للروم الجديد
      await interaction.member.voice.setChannel(channel);
      // إرسال رسالة في اللوق إذا كان معرف
      const logId = radioLogChannels[guildId];
      if (logId) {
        const logChannel = interaction.guild.channels.cache.get(logId);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle('تسجيل موجة راديو')
            .setDescription(`قام ${interaction.user} بإنشاء موجة رقم **${value}**${isGovWave ? ' (حكومية)' : ''}${!isGovWave && pass ? ` بكلمة سر: ${pass}` : ''}`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setImage(persistentSettings.embedDefaultImage || 'https://media.discordapp.net/attachments/1303476251746504726/1388435070141861918/Clean_20250626_130356_.png?ex=68678fec&is=68663e6c&hm=74f78ec37b2ca8b1c8d82f32008df770b691b210e9cf8d770fd572631b30c643&=&format=webp&quality=lossless')
            .setTimestamp();
          logChannel.send({ embeds: [logEmbed] });
        }
      }
      await interaction.reply({ content: `✅ تم إنشاء موجة صوتية جديدة ونقلك إليها!`, ephemeral: true });
    }
  }

  // أمر /موجة
  if (interaction.isChatInputCommand() && interaction.commandName === 'موجة') {
    // تحقق من صلاحية الأدمن
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ هذا الأمر فقط للأدمن.', ephemeral: true });
    }
    // الإيمبيد الفخم
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('اعدادات الراديو ⚙️')
      .setDescription('من هنا تدير إعدادات الراديو وتبرمجه براحتك')
      .setImage(persistentSettings.embedDefaultImage || 'https://media.discordapp.net/attachments/1303476251746504726/1388435070141861918/Clean_20250626_130356_.png?ex=68678fec&is=68663e6c&hm=74f78ec37b2ca8b1c8d82f32008df770b691b210e9cf8d770fd572631b30c643&=&format=webp&quality=lossless');
    // القائمة المنسدلة (تحتوي خيار تعيين الروم)
    const selectMenu = new ActionRowBuilder().addComponents(
      new (require('discord.js').StringSelectMenuBuilder)()
        .setCustomId('radio-settings')
        .setPlaceholder('اختر من القائمة')
        .addOptions([
          {
            label: 'تعيين الروم الصوتي للراديو',
            value: 'set-radio-voice',
            description: 'اضغط هنا لتعيين روم الراديو'
          },
          {
            label: 'تعيين روم اللوق للراديو',
            value: 'set-radio-log',
            description: 'تعيين روم لوق خاص بالراديو'
          },
          {
            label: 'رؤيه التعديلات',
            value: 'view-radio-settings',
            description: 'عرض إعدادات الراديو الحالية'
          },
          {
            label: 'تعيين موجة حكومية',
            value: 'set-gov-wave',
            description: 'تعيين موجة حكومية وربطها برتبة'
          },
          {
            label: 'تغيير ايموجي الراديو الزر الاوسط',
            value: 'set-radio-emoji',
            description: 'تغيير الايموجي الخاص بزر الراديو الأوسط'
          },
          {
            label: 'اعادة تعيين',
            value: 'reset-radio-menu',
            description: 'تحديث القائمة لاختيار جديد'
          }
        ])
    );
    // زر الحقوق فقط
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('حقوق Wonder Radio')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/SSCZBysE')
    );
    await interaction.reply({ embeds: [embed], components: [selectMenu, row], ephemeral: true });
  }

  // عند اختيار خيار من القائمة المنسدلة
  if (interaction.isStringSelectMenu() && interaction.customId === 'radio-settings') {
    const selected = interaction.values[0];
    if (selected === 'set-radio-voice') {
      // تحقق من صلاحية الأدمن
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ هذا الأمر فقط للأدمن.', ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId('set-voice-modal')
        .setTitle('تعيين الروم الصوتي للراديو');
      const inputId = new TextInputBuilder()
        .setCustomId('voice-id-input')
        .setLabel('قم بادخال ايدي الروم')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      const inputLink = new TextInputBuilder()
        .setCustomId('voice-link-input')
        .setLabel('ادخل رابط الروم')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(
        new ActionRowBuilder().addComponents(inputId),
        new ActionRowBuilder().addComponents(inputLink)
      );
      await interaction.showModal(modal);
    } else if (selected === 'set-radio-log') {
      // تحقق من صلاحية الأدمن
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ هذا الأمر فقط للأدمن.', ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId('set-radio-log-modal')
        .setTitle('تعيين روم اللوق للراديو');
      const inputLog = new TextInputBuilder()
        .setCustomId('log-id-input')
        .setLabel('ادخل ايدي روم اللوق')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(inputLog));
      await interaction.showModal(modal);
    } else if (selected === 'view-radio-settings') {
      // إعدادات السيرفر الحالية
      const radioData = radioVoiceChannels[interaction.guild.id] || { id: null, link: null };
      const logId = radioLogChannels[interaction.guild.id] || null;
      const emoji = '🔊';
      const govWaves = radioGovWaves[interaction.guild.id] || {};
      let govWavesText = '';
      for (let i = 1; i <= 10; i++) {
        const roleId = govWaves[i] ? `<@&${govWaves[i]}>` : 'غير محددة';
        govWavesText += `\nموجة ${i}: ${roleId}`;
      }
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle('إعدادات الراديو الحالية')
        .setDescription(`
**روم الصوتي المحدد:** ${radioData.id ? `\n<#${radioData.id}>` : 'غير محدد'}
**رابط الروم الصوتي:** ${radioData.link ? radioData.link : 'غير محدد'}
**روم اللوق للراديو:** ${logId ? `<#${logId}>` : 'غير محدد'}
**ايموجي الزر الأوسط:** ${emoji ? emoji : 'غير محدد'}
**الموجات الحكومية:**${govWavesText}
        `)
        .setImage(persistentSettings.embedDefaultImage || 'https://media.discordapp.net/attachments/1303476251746504726/1388435070141861918/Clean_20250626_130356_.png?ex=68678fec&is=68663e6c&hm=74f78ec37b2ca8b1c8d82f32008df770b691b210e9cf8d770fd572631b30c643&=&format=webp&quality=lossless');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (selected === 'reset-radio-menu') {
      // إعادة إرسال نفس القائمة والأزرار بدون أي تغيير
      try {
        await interaction.update({ components: [interaction.message.components[0], interaction.message.components[1]] });
      } catch (error) {
        // إذا فشل، أعد إنشاء القائمة
        const selectMenu = new ActionRowBuilder().addComponents(
          new (require('discord.js').StringSelectMenuBuilder)()
            .setCustomId('radio-settings')
            .setPlaceholder('اختر من القائمة')
            .addOptions([
              {
                label: 'تعيين الروم الصوتي للراديو',
                value: 'set-radio-voice',
                description: 'اضغط هنا لتعيين روم الراديو'
              },
              {
                label: 'تعيين روم اللوق للراديو',
                value: 'set-radio-log',
                description: 'تعيين روم لوق خاص بالراديو'
              },
              {
                label: 'رؤيه التعديلات',
                value: 'view-radio-settings',
                description: 'عرض إعدادات الراديو الحالية'
              },
              {
                label: 'تعيين موجة حكومية',
                value: 'set-gov-wave',
                description: 'تعيين موجة حكومية وربطها برتبة'
              },
              {
                label: 'تغيير ايموجي الراديو الزر الاوسط',
                value: 'set-radio-emoji',
                description: 'تغيير الايموجي الخاص بزر الراديو الأوسط'
              },
              {
                label: 'اعادة تعيين',
                value: 'reset-radio-menu',
                description: 'تحديث القائمة لاختيار جديد'
              }
            ])
        );
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('حقوق Wonder Radio')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/SSCZBysE')
        );
        await interaction.update({ components: [selectMenu, row] });
      }
    } else if (selected === 'set-gov-wave') {
      // تحقق من صلاحية الأدمن
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ هذا الأمر فقط للأدمن.', ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId('set-gov-wave-modal')
        .setTitle('تعيين موجة حكومية');
      const inputRole = new TextInputBuilder()
        .setCustomId('gov-role-id')
        .setLabel('ايدي الرتبة الحكومية')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      const inputWave = new TextInputBuilder()
        .setCustomId('gov-wave-num')
        .setLabel('رقم الموجة')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(
        new ActionRowBuilder().addComponents(inputRole),
        new ActionRowBuilder().addComponents(inputWave)
      );
      await interaction.showModal(modal);
    } else if (selected === 'set-radio-emoji') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ هذا الأمر فقط للأدمن.', ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId('set-radio-emoji-modal')
        .setTitle('تغيير ايموجي الراديو الزر الاوسط');
      const inputEmoji = new TextInputBuilder()
        .setCustomId('center-emoji-input')
        .setLabel('يرجى وضع ايموجي (نظامي أو سيرفر)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(inputEmoji));
      await interaction.showModal(modal);
    } else {
      await interaction.reply({ content: `تم اختيار: ${selected}`, ephemeral: true });
    }
  }

  // استقبال ايدي روم اللوق من المودال
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'set-radio-log-modal') {
    const logId = interaction.fields.getTextInputValue('log-id-input').trim();
    if (!/^\d+$/.test(logId)) {
      return interaction.reply({ content: '❌ يرجى إدخال ايدي صالح (أرقام فقط).', ephemeral: true });
    }
    radioLogChannels[interaction.guild.id] = logId;
    saveSettings();
    await interaction.reply({ content: `✅ تم تعيين روم اللوق للراديو بنجاح: \`${logId}\``, ephemeral: true });
  }

  // استقبال بيانات موجة حكومية من المودال
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'set-gov-wave-modal') {
    const roleId = interaction.fields.getTextInputValue('gov-role-id').trim();
    const waveNum = interaction.fields.getTextInputValue('gov-wave-num').trim();
    if (!/^\d+$/.test(roleId) || !/^\d{1,2}$/.test(waveNum)) {
      return interaction.reply({ content: 'يرجى إدخال ايدي الرتبة ورقم موجة صحيحين (أرقام فقط)', ephemeral: true });
    }
    // السماح فقط من 1 إلى 10
    const waveInt = parseInt(waveNum);
    if (waveInt < 1 || waveInt > 10) {
      return interaction.reply({ content: 'يمكنك تعيين موجة حكومية من 1 إلى 10 فقط.', ephemeral: true });
    }
    // حفظ الموجة الحكومية
    if (!radioGovWaves[interaction.guild.id]) radioGovWaves[interaction.guild.id] = {};
    radioGovWaves[interaction.guild.id][waveNum] = roleId;
    saveSettings();
    await interaction.reply({ content: `✅ تم تعيين موجة حكومية رقم ${waveNum} للرتبة <@&${roleId}>`, ephemeral: true });
  }

  // أعِد منطق حفظ الإيموجي عند استقبال المودال:
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'set-radio-emoji-modal') {
    const emoji = interaction.fields.getTextInputValue('center-emoji-input').trim();
    if (!emoji || emoji.length < 1) {
      return interaction.reply({ content: '❌ يرجى إدخال ايموجي صالح.', ephemeral: true });
    }
    radioCenterEmojis[interaction.guild.id] = emoji;
    saveSettings();
    await interaction.reply({ content: `✅ تم تعيين الايموجي الجديد للزر الأوسط: ${emoji}`, ephemeral: true });
  }

  // أضف أمر /الاونر:
  if (interaction.isChatInputCommand() && interaction.commandName === 'الاونر') {
    // تحقق من صلاحية الأونر أو المطور
    if (!BOT_OWNERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الأمر فقط للأونر أو مطور البوت.', ephemeral: true });
    }
    // إمبيد بنفس ستايل /موجة
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('لوحة تحكم الأونر 👑')
      .setDescription('اختر من القائمة أدناه ما تريد فعله')
      .setImage(persistentSettings.embedDefaultImage || 'https://media.discordapp.net/attachments/1303476251746504726/1388435070141861918/Clean_20250626_130356_.png?ex=68678fec&is=68663e6c&hm=74f78ec37b2ca8b1c8d82f32008df770b691b210e9cf8d770fd572631b30c643&=&format=webp&quality=lossless');
    // قائمة منسدلة (سيتم تفعيل الخيارات لاحقاً)
    const selectMenu = new ActionRowBuilder().addComponents(
      new (require('discord.js').StringSelectMenuBuilder)()
        .setCustomId('owner-menu')
        .setPlaceholder('اختر من القائمة')
        .addOptions([
          {
            label: 'رؤية السيرفرات',
            value: 'list-servers',
            description: 'عرض جميع السيرفرات التي يوجد فيها البوت'
          },
          {
            label: 'اخراج البوت من سيرفر',
            value: 'leave-server',
            description: 'اخراج البوت من سيرفر عبر آيدي'
          },
          {
            label: 'إيقاف/تشغيل البوت',
            value: 'power-menu',
            description: 'إدارة حالة البوت في السيرفرات'
          },
          {
            label: 'تغيير الحقوق',
            value: 'change-assets',
            description: 'تغيير صورة الراديو أو صور الإيمبيد'
          },
          {
            label: 'اعادة تعيين',
            value: 'reset-owner-menu',
            description: 'تحديث القائمة لاختيار جديد'
          }
        ])
    );
    await interaction.reply({ embeds: [embed], components: [selectMenu], ephemeral: true });
  }

  // عند اختيار خيار من القائمة المنسدلة الخاصة بالأونر:
  if (interaction.isStringSelectMenu() && interaction.customId === 'owner-menu') {
    const selected = interaction.values[0];
    if (!BOT_OWNERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الأمر فقط للأونر أو مطور البوت.', ephemeral: true });
    }
    if (selected === 'list-servers') {
      // جلب السيرفرات
      const guilds = [...interaction.client.guilds.cache.values()];
      let desc = '';
      for (const guild of guilds) {
        desc += `**${guild.name}**\nالأعضاء: ${guild.memberCount} | آيدي: \`${guild.id}\`\n\n`;
      }
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle('قائمة السيرفرات التي يوجد فيها البوت')
        .setDescription(desc || 'لا يوجد سيرفرات حالياً.')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (selected === 'leave-server') {
      // إمبيد فيه قائمة السيرفرات مع قائمة منسدلة لاختيار السيرفر
      const guilds = [...interaction.client.guilds.cache.values()];
      if (guilds.length === 0) {
        return interaction.reply({ content: 'البوت ليس في أي سيرفرات حالياً.', ephemeral: true });
      }
      const selectGuild = new ActionRowBuilder().addComponents(
        new (require('discord.js').StringSelectMenuBuilder)()
          .setCustomId('select-leave-guild')
          .setPlaceholder('اختر السيرفر لإخراج البوت منه')
          .addOptions(guilds.map(g => ({
            label: g.name.length > 80 ? g.name.slice(0, 80) : g.name,
            value: g.id,
            description: `ID: ${g.id}`
          })))
      );
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle('اختر السيرفر لإخراج البوت منه')
        .setDescription('اختر السيرفر من القائمة أدناه')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setTimestamp();
      return interaction.reply({ embeds: [embed], components: [selectGuild], ephemeral: true });
    } else if (selected === 'power-menu') {
      // إمبيد فيه قائمة السيرفرات مع قائمة منسدلة لاختيار سيرفر لإدارة حالته
      const guilds = [...interaction.client.guilds.cache.values()];
      if (guilds.length === 0) {
        return interaction.reply({ content: 'البوت ليس في أي سيرفرات حالياً.', ephemeral: true });
      }
      const selectGuild = new ActionRowBuilder().addComponents(
        new (require('discord.js').StringSelectMenuBuilder)()
          .setCustomId('select-power-guild')
          .setPlaceholder('اختر السيرفر لإدارة حالة البوت')
          .addOptions(guilds.map(g => ({
            label: g.name.length > 80 ? g.name.slice(0, 80) : g.name,
            value: g.id,
            description: `ID: ${g.id}`
          })))
      );
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle('إدارة حالة البوت في السيرفرات')
        .setDescription('اختر السيرفر من القائمة أدناه')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setTimestamp();
      return interaction.reply({ embeds: [embed], components: [selectGuild], ephemeral: true });
    } else if (selected === 'change-assets') {
      // افتح modal فيه اختيار نوع التغيير ورابط الصورة
      const modal = new ModalBuilder()
        .setCustomId('change-assets-modal')
        .setTitle('تغيير الحقوق');
      const inputType = new TextInputBuilder()
        .setCustomId('asset-type')
        .setLabel('1: صورة الراديو | 2: صور الإيمبيد')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      const inputUrl = new TextInputBuilder()
        .setCustomId('asset-url')
        .setLabel('رابط الصورة الجديدة (اختياري)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
      modal.addComponents(
        new ActionRowBuilder().addComponents(inputType),
        new ActionRowBuilder().addComponents(inputUrl)
      );
      return await interaction.showModal(modal);
    } else if (selected === 'reset-owner-menu') {
      // إعادة إرسال نفس القائمة المنسدلة
      try {
        await interaction.update({ components: [interaction.message.components[0]] });
      } catch (error) {
        // إذا فشل، أعد إنشاء القائمة
        const selectMenu = new ActionRowBuilder().addComponents(
          new (require('discord.js').StringSelectMenuBuilder)()
            .setCustomId('owner-menu')
            .setPlaceholder('اختر من القائمة')
            .addOptions([
              {
                label: 'رؤية السيرفرات',
                value: 'list-servers',
                description: 'عرض جميع السيرفرات التي يوجد فيها البوت'
              },
              {
                label: 'اخراج البوت من سيرفر',
                value: 'leave-server',
                description: 'اخراج البوت من سيرفر عبر آيدي'
              },
              {
                label: 'إيقاف/تشغيل البوت',
                value: 'power-menu',
                description: 'إدارة حالة البوت في السيرفرات'
              },
              {
                label: 'تغيير الحقوق',
                value: 'change-assets',
                description: 'تغيير صورة الراديو أو صور الإيمبيد'
              },
              {
                label: 'اعادة تعيين',
                value: 'reset-owner-menu',
                description: 'تحديث القائمة لاختيار جديد'
              }
            ])
        );
        await interaction.update({ components: [selectMenu] });
      }
    }
  }

  // عند اختيار سيرفر من قائمة الإخراج:
  if (interaction.isStringSelectMenu() && interaction.customId === 'select-leave-guild') {
    if (!BOT_OWNERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الأمر فقط للأونر أو مطور البوت.', ephemeral: true });
    }
    const guildId = interaction.values[0];
    const guild = interaction.client.guilds.cache.get(guildId);
    if (!guild) {
      return interaction.reply({ content: 'تعذر العثور على السيرفر.', ephemeral: true });
    }
    const invite = guild.systemChannel ? `https://discord.com/channels/${guild.id}/${guild.systemChannel.id}` : 'لا يوجد رابط مباشر';
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`معلومات السيرفر: ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }) || interaction.client.user.displayAvatarURL())
      .addFields(
        { name: 'عدد الأعضاء', value: `${guild.memberCount}`, inline: true },
        { name: 'آيدي السيرفر', value: guild.id, inline: true },
        { name: 'رابط السيرفر', value: invite, inline: false }
      )
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm-leave-${guild.id}`)
        .setLabel('اخراج البوت من هذا السيرفر')
        .setStyle(ButtonStyle.Danger)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // عند الضغط على زر إخراج البوت:
  if (interaction.isButton() && interaction.customId.startsWith('confirm-leave-')) {
    if (!BOT_OWNERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الأمر فقط للأونر أو مطور البوت.', ephemeral: true });
    }
    const guildId = interaction.customId.replace('confirm-leave-', '');
    const guild = interaction.client.guilds.cache.get(guildId);
    if (!guild) {
      return interaction.reply({ content: 'تعذر العثور على السيرفر.', ephemeral: true });
    }
    await guild.leave();
    return interaction.reply({ content: `✅ تم إخراج البوت من السيرفر: ${guild.name} (${guild.id})`, ephemeral: true });
  }

  // عند اختيار سيرفر من قائمة power:
  if (interaction.isStringSelectMenu() && interaction.customId === 'select-power-guild') {
    if (!BOT_OWNERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الأمر فقط للأونر أو مطور البوت.', ephemeral: true });
    }
    const guildId = interaction.values[0];
    const guild = interaction.client.guilds.cache.get(guildId);
    if (!guild) {
      return interaction.reply({ content: 'تعذر العثور على السيرفر.', ephemeral: true });
    }
    const status = botStatusPerGuild[guildId] || 'on';
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`إدارة البوت في السيرفر: ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }) || interaction.client.user.displayAvatarURL())
      .addFields(
        { name: 'عدد الأعضاء', value: `${guild.memberCount}`, inline: true },
        { name: 'آيدي السيرفر', value: guild.id, inline: true },
        { name: 'حالة البوت', value: status === 'off' ? 'متوقف' : status === 'restart' ? 'ريستارت' : 'يعمل', inline: true }
      )
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`stop-bot-${guild.id}`).setLabel('إيقاف البوت').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`start-bot-${guild.id}`).setLabel('تشغيل البوت').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`restart-bot-${guild.id}`).setLabel('ريستارت البوت').setStyle(ButtonStyle.Primary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // عند الضغط على زر إيقاف/تشغيل/ريستارت:
  if (interaction.isButton() && interaction.customId.startsWith('stop-bot-')) {
    if (!BOT_OWNERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الأمر فقط للأونر أو مطور البوت.', ephemeral: true });
    }
    const guildId = interaction.customId.replace('stop-bot-', '');
    const guild = interaction.client.guilds.cache.get(guildId);
    if (!guild) return interaction.reply({ content: 'تعذر العثور على السيرفر.', ephemeral: true });
    if (botStatusPerGuild[guildId] === 'off') {
      return interaction.reply({ content: 'البوت بالفعل متوقف في هذا السيرفر.', ephemeral: true });
    }
    botStatusPerGuild[guildId] = 'off';
    await guild.members.me.setNickname(`${guild.members.me.user.username} (متوقف)`);
    return interaction.reply({ content: 'تم إيقاف البوت في هذا السيرفر.', ephemeral: true });
  }
  if (interaction.isButton() && interaction.customId.startsWith('start-bot-')) {
    if (!BOT_OWNERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الأمر فقط للأونر أو مطور البوت.', ephemeral: true });
    }
    const guildId = interaction.customId.replace('start-bot-', '');
    const guild = interaction.client.guilds.cache.get(guildId);
    if (!guild) return interaction.reply({ content: 'تعذر العثور على السيرفر.', ephemeral: true });
    if (botStatusPerGuild[guildId] !== 'off') {
      return interaction.reply({ content: 'البوت بالفعل غير متوقف في هذا السيرفر.', ephemeral: true });
    }
    botStatusPerGuild[guildId] = 'on';
    await guild.members.me.setNickname(null);
    return interaction.reply({ content: 'تم تشغيل البوت في هذا السيرفر.', ephemeral: true });
  }
  if (interaction.isButton() && interaction.customId.startsWith('restart-bot-')) {
    if (!BOT_OWNERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الأمر فقط للأونر أو مطور البوت.', ephemeral: true });
    }
    const guildId = interaction.customId.replace('restart-bot-', '');
    const guild = interaction.client.guilds.cache.get(guildId);
    if (!guild) return interaction.reply({ content: 'تعذر العثور على السيرفر.', ephemeral: true });
    botStatusPerGuild[guildId] = 'restart';
    await guild.members.me.setNickname(`${guild.members.me.user.username} (ريستارت)`);
    await interaction.reply({ content: 'جاري عمل ريستارت للبوت في هذا السيرفر...', ephemeral: true });
    setTimeout(async () => {
      botStatusPerGuild[guildId] = 'on';
      await guild.members.me.setNickname(null);
    }, 5000); // 5 ثواني ريستارت وهمي
  }

  // استقبال بيانات modal تغيير الحقوق
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'change-assets-modal') {
    const type = interaction.fields.getTextInputValue('asset-type').trim();
    const url = interaction.fields.getTextInputValue('asset-url').trim();
    if (type !== '1' && type !== '2') {
      return interaction.reply({ content: 'يرجى اختيار 1 أو 2 فقط في الخانة الأولى.', ephemeral: true });
    }
    if (!url) {
      return interaction.reply({ content: 'يرجى وضع رابط صورة جديد في الخانة الثانية.', ephemeral: true });
    }
    if (type === '1') {
      persistentSettings.radioMainImage = url;
      global.radioMainImage = url;
      saveSettings();
      return interaction.reply({ content: '✅ تم تغيير صورة الراديو بنجاح!', ephemeral: true });
    } else if (type === '2') {
      persistentSettings.embedDefaultImage = url;
      global.embedDefaultImage = url;
      saveSettings();
      return interaction.reply({ content: '✅ تم تغيير جميع صور الإيمبيد بنجاح!', ephemeral: true });
    }
  }

});

// تسجيل أمر /راديو و /موجة و /الاونر (مرة واحدة فقط عند أول تشغيل)
if (process.env.TOKEN && process.env.CLIENT_ID) {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  (async () => {
    try {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: [
          new SlashCommandBuilder()
            .setName('راديو')
            .setDescription('افتح جهاز الراديو')
            .toJSON(),
          new SlashCommandBuilder()
            .setName('موجة')
            .setDescription('تخصيص وبرمجة الراديو (Admins only)')
            .toJSON(),
          new SlashCommandBuilder()
            .setName('الاونر')
            .setDescription('لوحة تحكم الأونر/المطور (Owner only)')
            .toJSON()
        ] }
      );
      console.log('✅ تم تسجيل أوامر /راديو و /موجة و /الاونر');
    } catch (error) {
      console.error(error);
    }
  })();
}

// مؤقت لفحص الرومات الصوتية كل 5 ثواني وحذف الفارغ منها
setInterval(async () => {
  for (const key in radioActiveWaves) {
    const { channelId } = radioActiveWaves[key];
    for (const guild of client.guilds.cache.values()) {
      const channel = guild.channels.cache.get(channelId);
      if (channel && channel.members.size === 0) {
        try {
          await channel.delete('حذف تلقائي لروم موجة الراديو الفارغ');
        } catch (e) {}
        delete radioActiveWaves[key];
        saveSettings();
      }
    }
  }
}, 5000);

// متغير لتخزين حالة البوت في كل سيرفر
const botStatusPerGuild = {};

// تحسينات لتقليل استهلاك الرام
// تنظيف الذاكرة كل 30 دقيقة
setInterval(() => {
  global.gc && global.gc(); // تنظيف الذاكرة إذا كان متاحاً
}, 30 * 60 * 1000);

// تنظيف البيانات القديمة كل ساعة
setInterval(() => {
  // حذف السيرفرات التي لم تعد موجودة
  for (const guildId in botStatusPerGuild) {
    if (!client.guilds.cache.has(guildId)) {
      delete botStatusPerGuild[guildId];
    }
  }
  
  // حذف الرومات الصوتية القديمة
  for (const key in radioActiveWaves) {
    const [guildId] = key.split('_');
    if (!client.guilds.cache.has(guildId)) {
      delete radioActiveWaves[key];
    }
  }
}, 60 * 60 * 1000);

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

client.login(process.env.TOKEN); 