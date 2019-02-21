FROM ubuntu:18.04

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get install -y nodejs

WORKDIR /usr/src/indexer
COPY package.json .
COPY package-lock.json .
COPY patches patches
RUN npm install --unsafe-perm 
# Install dependencies again to ensure all packages are installed (npm+git bug?)
RUN npm install
COPY . .

CMD ["npm", "start"]

EXPOSE 3005
