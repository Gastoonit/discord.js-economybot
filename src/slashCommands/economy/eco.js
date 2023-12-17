const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const eco = require(`${process.cwd()}/src/helpers/economyDB.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("economía")
        .setDescription("💶 ) ¡Todos los comandos de Economía!")
        .addSubcommand((subcommand) =>
            subcommand
            .setName("trabajar")
            .setDescription("🪙 ) Canjea tu recompensa laboral!"))
        .addSubcommand((subcommand) =>
            subcommand
            .setName("balance")
            .setDescription(") ¡Ve el balance anual de una persona!")
            .addUserOption((option) =>
                option
                .setName("miembro")
                .setDescription(`- Miembro`)
                .setRequired(false)
                          ))
        .addSubcommand((subcommand) =>
            subcommand
            .setName("depositar")
            .setDescription(") Desposita dinero en el banco.")
            .addStringOption((option) =>
                option
                .setName("cantidad")
                .setDescription(`- Cantidad, puedes usar "all", "max", "todo" o números.`)
                .setRequired(true)
                            ))
        .addSubcommand((subcommand) =>
            subcommand
            .setName("leaderboard")
            .setDescription(") Tabla de clasificación laboral!"))
        .addSubcommand((subcommand) =>
            subcommand
            .setName("inventario")
            .setDescription(") ¡Ve el inventario de una persona!")
            .addUserOption((option) =>
                option
                .setName("miembro")
                .setDescription(`- Miembro`)
                .setRequired(false)
                          ))
        .addSubcommand((subcommand) =>
            subcommand
            .setName("usar")
            .setDescription(") ¡Usa un artículo de la tienda!")
            .addNumberOption((option) =>
                option
                .setName(`artículo_id`)
                .setDescription(`ID del artículo`)
                .setRequired(true)
                            ))
        .addSubcommand((subcommand) =>
            subcommand
            .setName("historial")
            .setDescription(") ¡Ve el historial de los artículos comprados!"))
        .addSubcommand((subcommand) =>
            subcommand
            .setName("lanzar_moneda")
            .setDescription(") ¡Lanza una moneda y gana!")
            .addStringOption((option) =>
                option
                .setName("cantidad")
                .setDescription(`- Cantidad a apostar`)
                .setRequired(true)
                            ))
        .addSubcommand((subcommand) =>
            subcommand
            .setName("ruleta")
            .setDescription(") ¡Ve el inventario de una persona!")
            .addStringOption((option) =>
                option
                .setName("apostar_al")
                .setDescription(") Apuesta al rojo o al negro.")
                .addChoices(
                    { name: "Negro", value: "negro" },
                    { name: "Rojo", value: "rojo" }
                )
                .setRequired(true)
                            )
            .addStringOption((option) =>
                option
                .setName("cantidad")
                .setDescription(`- Cantidad a apostar`)
                .setRequired(true)
                            )),
    run: async (client, interaction) => {
        await interaction.deferReply();
        const { guild, member } = interaction;

        const sub = interaction.options.getSubcommand();

        const history = eco.cache.history.get({ guildID: guild.id, memberID: member.id }) || []
        const embedUtil = new EmbedBuilder()

        function randint(min, max) {
            return Math.round(Math.random() * (max - min + 1)) + min;
        }
        function nWc(x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }


        if (sub === "trabajar") {
            const work = await eco.rewards.getWork(member.id, guild.id);

            const timeFunction = (ms, style) => {
                return `<t:${Math.round(ms / 1000)}${style ? `:${style}>`: ">"}`;
            };

            if (!work.claimed) {
                const embedNoWork = new EmbedBuilder()
                    .setDescription(
                        `Ya reclamaste tu recompensa laboral. Vuelve ${timeFunction(Date.now() + work.cooldown.endTimestamp, "R")}!`
                    )
                    .setColor("Orange");
                await interaction.editReply({
                    embeds: [embedNoWork]
                });
            } else {
                const embedWork = new EmbedBuilder()
                    .setDescription(`Recibiste **$${work.reward}** monedas de oro, por tu enorme trabajo duro!`)
                    .setColor("Gold");
                await interaction.editReply({
                    embeds: [embedWork]
                });
            }
        }
        if (sub === "balance") {
            const memberUser = interaction.options.getUser("miembro") || member.user;

            const balanceData = eco.cache.balance.get({ memberID: memberUser.id, guildID: guild.id })

            const [balance, bank] = [balanceData?.money, balanceData?.bank]

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                    .setTitle(`(!) Balance de ${memberUser?.username}`)
                    .addFields(
                        {
                            name: `Monedas sueltas:`, value: `$${nWc(balance)}`
                        },
                        {
                            name: `Monedas en el banco:`, value: `$${nWc(bank)}`
                        }
                    )
                    .setColor('Grey')
                ]
            });
        }

        if (sub === "depositar") {
            const user = eco.cache.users.get({ memberID: member.id, guildID: guild.id })

            const userBalance = await user.balance.get();
            let amount = interaction.options.getString("cantidad");

            if (["all", "max", "todo"].includes(amount.toLowerCase())) {
                amount = userBalance
            } else {
                amount = parseInt(amount);
            }
            if (userBalance < amount) {
                return await interaction.editReply(`(!) ¡No tienes suficiente dinero para depositar tanto! actualmente tienen $${nWc(userBalance)}`);
            }
            else if (amount < 0) {
                return await interaction.editReply("(!) No puedes depositar dinero negativo!");
            }
            else if (amount < 1) {
                return await interaction.editReply(`(!) Necesitas depositar al menos  $1`);
            }
            else if (!userBalance) {
                return await interaction.editReply('(!) No.')
            }

            await user.balance.subtract(amount, `Depositaste $${nWc(amount)} monedas`)
            await user.bank.add(amount, `Depositaste $${nWc(amount)} monedas`)

            return await interaction.editReply(
                `¡${interaction.user.username}, Depositaste $${nWc(amount)} en el banco!`
            )
        }

        if (sub === "leaderboard") {
            let guildLb = eco.cache.guilds.get({ guildID: guild.id });
            const rawLeaderboard = await guildLb.leaderboards.money()

            const leaderboard = rawLeaderboard
                .filter(lb => !lb.userID?.bot)
                .filter(lb => !!lb.money)

            if (!leaderboard.length) {
                return interaction.editReply(`(!) ${interaction.user.tag}, No hay usuarios en la tabla de clasificación.`)
            }

            await interaction.editReply({ embeds: [embedUtil.setAuthor({ name: `${guild.name} | Tabla [${leaderboard.length}]`, iconURL: client.user.avatarURL() }).setColor('Gold').setDescription(`${leaderboard.map((lb, index) => `#${index + 1} <@${lb.userID}> | ${nWc(lb.money)} monedas`)
                                                                                                                                                                                                       .join('\n')}`)]
                                        })
        }

        if (sub === "inventario") {
            const memberInvData = interaction.options.getUser("miembro") || interaction.user;

            const shop = eco.cache.shop.get({ guildID: guild.id }) || []
            const inventory = eco.cache.inventory.get({ guildID: guild.id, memberID: memberInvData.id }) || []

            const userInventory = inventory.filter(item => !item.custom.hidden)

            if (!userInventory.length) {
                return interaction.editReply(` (!) No tienes ningún artículo en tu inventario.`)
            }

            const cleanInventory = [...new Set(userInventory.map(item => item.name))]
                .map(itemName => shop.find(shopItem => shopItem.name == itemName))
                .map(item => {
                    const quantity = userInventory.filter(invItem => invItem.name == item.name).length

                    return {
                        quantity,
                        totalPrice: item.price * quantity,
                        item
                    }
                })

            return interaction.editReply({ embeds: [embedUtil.setAuthor({ name: `(!) Inventario ${memberInvData.username}`, iconURL: memberInvData.avatarURL({ dynamic: true }) }).setColor('009821').setDescription(cleanInventory.map((data, index) => `**${data.item.name} (ID: ${data.item.id})**\nCantidad: x${data.quantity}, Precio: $${nWc(data.totalPrice)}`).join("\n"))] })

        }
        if (sub === "historial") {
            const userHistory = history.filter(item => !item.custom.hidden)

            if (!userHistory.length) {
                return interaction.editReply(`(!) No tienes ningún artículo en tu historial de compras.`)
            }

            await interaction.editReply(
                `Aquí está tu historial de compras [${userHistory.length}]:\n\n` +
                userHistory
                .map(
                    item => `**x${item.quantity} ${item.name}** - ` +
                        `**${item.price}** coins (**${item.date}**)`
                )
                .join('\n')
            )
        }
        if (sub === "usar") {
            const itemID = interaction.options.getNumber('artículo_id');

            const inventory = eco.cache.inventory.get({ guildID: guild.id, memberID: member.id }) || []

            const item = inventory.find(item => item.id == parseInt(itemID) || item.name == itemID)

            if (!item || item?.custom?.hidden) {
                return interaction.editReply(`(!) Artículo no encontrado en tu inventario.`)
            }

            if (item.custom.locked) {
                return interaction.editReply(`(!) Este artículo está bloqueado, no puedes usarlo.`)
            }

            const resultMessage = await item.use(client)
            return interaction.editReply(resultMessage)
        }
        if (sub === "lanzar_moneda") {

            let amount = interaction.options.getString("cantidad");

            let users = eco.cache.users.get({ memberID: member.id, guildID: guild.id })

            if (["all", "max", "todo"].includes(amount.toLowerCase())) {
                amount = users.money;
            } else {
                amount = parseInt(amount);
            }
            if (users.money < amount) {
                return interaction.editReply("(!) ¡No tienes suficiente dinero para apostar tanto! Tu Actualmente tienes $" + users.money);
            }
            else if (amount < 0) {
                return interaction.editReply("(!) No puedes apostar dinero negativo!");
            }
            else if (amount < 1) {
                return interaction.editReply(`(!) Necesitas apostar al menos $1`);
            }
            const reward = Math.floor(amount);

            const result = randint(0, 1);

            if (result != 0) {

                await users.balance.subtract(amount);
                return await interaction.editReply(`Perdiste $${nWc(amount)}`);
            }

            await users.balance.add(reward);
            await interaction.editReply(`Ganaste $${nWc(amount + reward)}`);
        }
        if (sub === 'ruleta') {

            const bet_on = interaction.options.getString("apostar_al", true);
            let amount = interaction.options.getString("cantidad", true);

            const users = eco.cache.users.get({ memberID: member.id, guildID: guild.id })
            if (["all", "max", "todo"].includes(amount.toLowerCase())) {
                amount = users.money;
            } else {
                amount = parseInt(amount);
            }
            if (users.money < amount) {
                return interaction.editReply(`(!) ¡No tienes suficiente dinero para apostar tanto! Tu Actualmente tienes ${nWc(users.money)}`);
            }
            else if (amount < 0) {
                return interaction.editReply("(!) No puedes apostar dinero negativo!");
            }
            else if (amount < 1) {
                return interaction.editReply(`(!) Necesitas apostar al menos $1`);
            }
            const reward = Math.round(amount);

            let coin = ["negro", "rojo"];
            const result = coin[randint(0, 1)];

            if (result != bet_on) {

                await users.balance.subtract(amount);
                return interaction.editReply(`Ganó ${result}, perdiste $${nWc(amount)}.`);
            }

            await users.balance.add(reward);

            return interaction.editReply(`Ganó ${result}, tu recompensa es de $${nWc(amount + reward)}`);
        }
    },
};
