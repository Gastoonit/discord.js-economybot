const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const eco = require(`${process.cwd()}/src/helpers/economyDB.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tienda")
        .setDescription(") Compra artículos en la tienda!")
        .addSubcommand((subcommand) =>
            subcommand
            .setName("lista")
            .setDescription(") ¡Ve la lista de artículos en la tienda!")
                      )
        .addSubcommand((subcommand) =>
            subcommand
            .setName("añadir")
            .setDescription(") ¡Agrega un artículo a la tienda!")
            .addStringOption((option) =>
                option
                .setName(`nombre`)
                .setDescription(`Nombre del artículo!`)
                .setRequired(true)
                            )
            .addNumberOption((option) =>
                option
                .setName("precio")
                .setDescription("Precio del artículo!")
                .setRequired(true)
                            )
            .addRoleOption((option) =>
                option
                .setName(`otorgar_rol`)
                .setDescription(`Rol que se otorgara al comprar un artículo!`)
                .setRequired(false)
                          )
            .addStringOption((option) =>
                option
                .setName(`mensaje_descriptivo`)
                .setDescription(`Mensaje descriptivo del artículo!`)
                .setRequired(false)
                            )
            .addStringOption((option) =>
                option
                .setName(`mensaje_uso`)
                .setDescription(`Mensaje de uso del artículo!`)
                .setRequired(false)
                            ))
        .addSubcommand((subcommand) =>
            subcommand
            .setName("comprar")
            .setDescription(") ¡Compra un artículo de la tienda!")
            .addIntegerOption((option) =>
                option
                .setName(`artículo_id`)
                .setDescription(`ID del artículo`)
                .setRequired(true)
                             )
            .addIntegerOption((option) =>
                option
                .setName("cantidad")
                .setDescription("Ingresa una cantidad")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(99)
                             )
                      )
        .addSubcommand((subcommand) =>
            subcommand
            .setName("ver_artículo")
            .setDescription(") ¡Ve un artículo de la tienda!")
            .addNumberOption((option) =>
                option
                .setName(`artículo_id`)
                .setDescription(`ID del artículo`)
                .setRequired(true)
                            )),
    run: async (client, interaction) => {
        const { guild, member } = interaction;
        const embedUtil = new EmbedBuilder()

        const user = eco.cache.users.get({
            memberID: member.id,
            guildID: guild.id
        });

        const sub = interaction.options.getSubcommand();

        const shop =
            eco.cache.shop.get({
                guildID: interaction.guild.id,
            }) || [];

        function nWc(x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        if (sub === "lista") {
            const guildShop = shop.filter((item) => !item.custom.hidden);

            if (!guildShop.length) {
                return interaction.reply(
                    `(!) ¡Actualmente no hay artículos en la tienda!.`
                );
            }

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                    .setTitle(`⛺️ ${interaction.guild.name} (${guildShop.length} artículos)`)
                    .setDescription(`${guildShop.map(
                        (item, index) =>
                            `- #${index + 1}  ${item.custom.locked ? " 🔒 | " : " "}` +
                            `\`${item.name}\` (ID: \`${item.id}\`) \`$\` \`${nWc(item.price)}\` monedas de oro`
                    ).join("\n")}`)
                    .setColor('Gold')
                ]
            })
        }

        if (sub === "ver_artículo") {
            const itemID = interaction.options.getNumber('artículo_id')

            const item = shop.find(
                (item) => item.id == parseInt(itemID) || item.name == itemID);

            if (!itemID) {
                return interaction.reply(
                    `(!) No puede encontrar el artículo, ingresa una ID correcta.`
                );
            }

            if (!item || item?.custom?.hidden) {
                return interaction.reply(`(!) artículo no encontrado, pon una ID correcta.`);
            }

            const EmbedShop = new EmbedBuilder()
                .setColor('Gold')
                .setTitle('(i) Infromación: '+item.name)
                .setDescription(`:identification_card: ID: ${item.id}\n:outbox_tray: Precio: ${nWc(item.price)}\n:speech_balloon: Descripción:\n'${item.description.length > 299 ? data.substr(0, 299) + "...": item.description}'\n:incoming_envelope: Mensaje de uso:\n'${item.message.length > 299 ? data.substr(0, 299) + "...": item.message}'\n${item.role ? `:coral: Otorga el rol:` : '' }\n${item.role ? `[**<@&${item.role}>**]` : '' }\n:beverage_box: Cantidad maxima en el inventario: ${item.maxAmount ? item.maxAmount : '+99'}\n${item.custom.hidden ? ":bangbang: Artículo oculto:" : ""} ${item.custom.hidden ? "Esta oculto" : ""}\n:date: Creado el día:\n${item.date}`)


            await interaction.reply({
                embeds: [EmbedShop]
            })
        }

        if (sub === "añadir") {
            const name = interaction.options.getString("nombre");
            const price = interaction.options.getNumber("precio");
            const mensaje_descriptivo = interaction.options.getString("mensaje_descriptivo");

            const mensaje_uso = interaction.options.getString("mensaje_uso");

            const rolCustom = interaction.options.getRole("otorgar_rol")?.id || null;

            let guild = eco.cache.guilds.get({
                guildID: interaction.guild.id,
            });

            const newItem = await guild.shop.addItem({
                name,
                price,
                description: mensaje_descriptivo || "¡Averigua comprando el artículo!",
                message: mensaje_uso || "Artículo muy épico.",
                role: rolCustom,
                custom: {
                    hidden: false,
                    locked: false,
                    hiddenSince: null,
                    lockedSince: null,
                },
            });

            await interaction.reply({
                embeds: [embedUtil.setDescription(`<:fun:910207291339448401> ¡El artículo ha sido creado con éxito!\nNombre: '${newItem.name}', Precio: '${nWc(newItem.price)}'\nDescripción: '${newItem.description}'\nUso: '${newItem.message}'`).setFooter({ text: interaction.user.username }).setColor('1dff00')]
            })
        }

        if (sub === "comprar") {
            const quantity = parseInt(interaction.options.getInteger("cantidad")) || 1;
            const itemID = interaction.options.getInteger("artículo_id");

            if (isNaN(quantity) || parseInt(quantity) < 1 || parseInt(quantity) > 99) {
                return interaction.reply(`(!) Por favor ingresa una cantidad válida de artículos.`);
            }
            const item = shop.find(
                (item) => item.id == parseInt(itemID) || item.name == itemID
            );

            if (!item || item?.custom?.hidden) {
                return interaction.reply(`(!) No encontre resultados del artículo en la tienda!`);
            }

            if (item.custom.locked) {
                return interaction.reply(
                    `(!) Este artículo esta bloqueado en la tienda, no lo puedes comprar por ahora.`
                );
            }

            if (!await item.isEnoughMoneyFor(user.id, quantity)) {
                return interaction.reply(`(!) ¡No tienes suficientes monedas para comprar \`x${quantity}\` de \`${item.name}\`!`
                                        );
            }

            const buyingResult = await user.item.buy(item.id, quantity);

            if (!buyingResult.status) {
                return interaction.reply(
                    `(!) No se pudo comprar el artículo. vuelve a intentarlo y reportalo con los dueños del servidor. **${buyingResult.message}**`
                );
            }

            return interaction.reply(
                `:chart_with_downwards_trend: ${interaction.user.username}, compraste x${buyingResult.quantity} de:\n- **${item.name}** por $${nWc(buyingResult.totalPrice)} monedas de oro.`
            );

        }
    },
};
