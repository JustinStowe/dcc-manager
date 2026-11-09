# Shared campaign setup — superseded by the Host / Join lobby

Follow [LOBBY_SETUP.md](LOBBY_SETUP.md) for the current installation and validation
steps. It supports both a fresh database and an existing shared-campaign database.

The lobby replaces manual GM provisioning, player account-ID entry, and the
single-campaign restriction. Do not run the old `bootstrap_campaign.sql`.
Hosting a new game assigns the signed-in account as that game's GM. Players join
using its Game Code. Existing campaigns and crawlers are preserved by the lobby
migration.

Players still see only their own crawler in a game; its GM sees everyone.
