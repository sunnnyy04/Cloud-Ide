FROM ubuntu:22.04
        ENV DEBIAN_FRONTEND=noninteractive
        RUN apt-get update && apt-get install -y             build-essential cmake g++ gcc gdb vim git             && rm -rf /var/lib/apt/lists/*
        WORKDIR /app
        COPY . /app