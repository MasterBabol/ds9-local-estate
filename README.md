# ds9-local-estate
A local estate client for deepspace9 factorio mod



## Building & Installation

```sh
pacman -S nodejs npm
npm install
cp config.json.example config.json # Modify this config file
npm run build
npm run download # This will download a factorio headless server
cp -r deploy_pack.example deploy_pack
# Before below step, you can change server settings and add some mods
# At first, they are/will be located in ./deploy_pack/config and ./deploy_pack/mods
# and "npm run deploy" will copy the files to a factorio game instance
npm run deploy # This will deploy setting and mod files and create a new game
npm run start
```



## Updating

```sh
git pull
# Updating ds9 mod
rm deploy_pack/mods/deepspace*.zip
cp deploy_pack.example/mods/deepspace*.zip deploy_pack/mods/
npm run depmods
npm run build
npm run start
```



## TODO: add optional instructions

