#!/bin/bash

set -e

# Ensure starting off from the home folder

cd

# Install and start Parity

wget https://get.parity.io -O get-parity.sh
sed -i -e 's/^VERSION_STABLE=\"[0-9.]*\"$/VERSION_STABLE=\"1.11.11\"/g' get-parity.sh
sed -i -e 's/^RELEASE=\"\w*\"$/RELEASE=\"stable\"/g' get-parity.sh
chmod +x get-parity.sh
./get-parity.sh

touch reserved.txt

cat > start-parity.sh << EOF
#!/bin/bash

parity \
  --chain ${CHAIN} \
  --log-file ~/parity.log \
  --reserved-peers ~/reserved.txt
EOF
chmod +x start-parity.sh

tmux new-session -d -s parity ./start-parity.sh

# Install and start remote_syslog2

wget https://github.com/papertrail/remote_syslog2/releases/download/v0.20/remote-syslog2_0.20_amd64.deb
sudo dpkg -i remote-syslog2_0.20_amd64.deb
sudo apt-get install -f

cat > log_files.yml << EOF
files:
  - path: /home/ubuntu/parity.log
    tag: metronome-${COIN}-parity-${CHAIN}-${ENV}
destination:
  host: ${PAPERTRAIL_HOST}
  port: ${PAPERTRAIL_PORT}
  protocol: tls
EOF
sudo mv log_files.yml /etc/log_files.yml

sudo remote_syslog
sudo update-rc.d remote_syslog defaults

# Install and start MongoDB

sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

sudo mkdir -p /etc/systemd/system/mongod.service.d
cat > override.conf << EOF
[Service]
LimitNOFILE=infinity
LimitNPROC=infinity
EOF
sudo mv override.conf /etc/systemd/system/mongod.service.d/
sudo systemctl daemon-reload

sudo service mongod start

# Install Node.js

wget -qO- https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs gcc g++ make

# Setup indexer

cd ethereum-blockchain-indexer/
npm install
cd -

cat > start-indexer.sh << EOF
#!/bin/bash

cd ethereum-blockchain-indexer

ENODE_IPC_PATH=/home/ubuntu/.local/share/io.parity.ethereum/jsonrpc.ipc \
LOGGER_CONSOLE_LEVEL=debug \
LOGGER_PAPERTRAIL_HOST=${PAPERTRAIL_HOST} \
LOGGER_PAPERTRAIL_PORT=${PAPERTRAIL_PORT} \
LOGGER_PAPERTRAIL_PROGRAM=metronome-${COIN}-indexer-${CHAIN}-${ENV} \
npm start
EOF
chmod +x start-indexer.sh

# Wait for Parity and Mongo to start and then start the indexer

sleep 240
tmux new-session -d -s indexer ./start-indexer.sh
